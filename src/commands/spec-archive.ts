import { existsSync, readFileSync, renameSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  detectVaultRoot,
  readGlobalConfig,
  resolveRoute,
  resolveTargetProjectRoot
} from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { isValidChangeId } from '../core/change-id';
import { readChangeJson } from '../core/change-json';
import { brainWrite } from '../core/brain-write';
import { completeRegistryRow, registerSpec } from '../core/spec-workflow';
import { parseTasksMd, readProgress, writeProgress } from '../core/progress-registry';

/**
 * `spectralis spec archive <change-id> [--force]`.
 *
 * Moves a finished change to `spec/_archived/`, completes its REGISTRY row
 * and writes the portable brain summary into the vault. The OpenSpec binary
 * is never invoked: the archive is native.
 */
export interface SpecArchiveOptions {
  /** Id of the change (the name of its folder). */
  changeId: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
  /** Vault root (default: from the configuration). */
  vaultRoot?: string;
  /** Archive even when tasks are pending. */
  force?: boolean;
  /** Wiki folder of the brain summary (default: `Spectralis`). */
  wikiProject?: string;
}

/** Directory (relative to the changes directory) that holds the archived changes. */
export const ARCHIVED_DIR = '_archived';

interface PendingTask {
  id: string;
  descripcion: string;
}

/**
 * Tasks that are not done yet.
 *
 * The progress registry is the primary source; `tasks.md` is consulted when
 * the change has no entry (or an entry without tasks) in the registry.
 */
export function pendingTasks(projectRoot: string, changeDir: string, changeId: string): PendingTask[] {
  const registry = readProgress(projectRoot);
  const entry = registry.change.find((change) => change.id === changeId);
  if (entry && entry.task.length > 0) {
    return entry.task
      .filter((task) => task.estatus !== 'done')
      .map((task) => ({ id: task.id, descripcion: task.descripcion }));
  }
  const tasksPath = join(changeDir, 'tasks.md');
  if (!existsSync(tasksPath)) return [];
  return parseTasksMd(readFileSync(tasksPath, 'utf8'))
    .filter((task) => !task.done)
    .map((task) => ({ id: task.id, descripcion: task.descripcion }));
}

/**
 * Resolves the root of the vault.
 *
 * Cascade: the explicit option, the route of the project (manifest or global
 * config), the global config and the detection of the vault. It returns null
 * when the vault cannot be resolved.
 */
export function resolveVaultRoot(opts: SpecArchiveOptions, projectRoot: string): string | null {
  if (opts.vaultRoot && opts.vaultRoot.trim() !== '') return resolve(opts.vaultRoot);
  const route = resolveRoute('vault_root', projectRoot);
  if (route && route.trim() !== '') return route;
  const global = readGlobalConfig().vault_root;
  if (global && global.trim() !== '') return global;
  return detectVaultRoot(projectRoot);
}

/**
 * Archives a change.
 *
 * Exit codes: 0 success, 2 the change id is invalid, the change does not
 * exist, the tasks are pending (without `--force`), the REGISTRY cannot be
 * written or the archived folder already exists.
 */
export async function runSpecArchive(opts: SpecArchiveOptions): Promise<number> {
  const changeId = opts.changeId;
  if (!isValidChangeId(changeId)) {
    console.error(
      `[ERROR] change-id inválido: "${changeId}". Usa kebab-case en minúsculas y sin espacios (ej. spec-native-f2).`
    );
    return 2;
  }
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const changeDir = join(changesDir, changeId);

  if (!existsSync(changeDir)) {
    console.error(`[ERROR] change no encontrado: ${changeId}`);
    return 2;
  }

  const pending = pendingTasks(projectRoot, changeDir, changeId);
  if (pending.length > 0) {
    const list = pending.map((task) => `  - ${task.id} ${task.descripcion}`.trimEnd()).join('\n');
    if (!opts.force) {
      console.error(`[ERROR] el change ${changeId} tiene tareas pendientes:`);
      console.error(list);
      console.error('Archívalo con --force si de verdad quieres forzar el cierre.');
      return 2;
    }
    console.warn(`[WARN] el change ${changeId} se archiva con tareas pendientes:`);
    console.warn(list);
  }

  const proposalPath = join(changeDir, 'proposal.md');
  const designPath = join(changeDir, 'design.md');
  const tasksPath = join(changeDir, 'tasks.md');
  const proposal = existsSync(proposalPath) ? readFileSync(proposalPath, 'utf8') : '';
  const design = existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
  const tasks = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';
  let change = null;
  try {
    change = readChangeJson(changeDir);
  } catch (err: unknown) {
    console.warn(`[WARN] change.json ausente o inválido, se usan valores por defecto: ${err instanceof Error ? err.message : String(err)}`);
  }

  const archiveDir = join(changesDir, ARCHIVED_DIR);
  const archivedChange = join(archiveDir, changeId);
  if (existsSync(archivedChange)) {
    console.error(`[ERROR] el change ya está archivado: ${archivedChange}`);
    return 2;
  }

  // The row of the REGISTRY is written BEFORE the move: a registry failure
  // aborts the archive with the local state untouched (the change stays in
  // its folder and no row is lost).
  const project = basename(projectRoot);
  try {
    registerSpec(projectRoot, changeId, project);
    completeRegistryRow(projectRoot, changeId);
  } catch (err: unknown) {
    console.error(
      `[ERROR] no se pudo escribir el REGISTRY de ${changeId}, el archive se aborta sin mover el change: ${err instanceof Error ? err.message : String(err)}`
    );
    return 2;
  }

  if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
  try {
    renameSync(changeDir, archivedChange);
  } catch (err: unknown) {
    console.error(
      `[ERROR] no se pudo mover el change a ${archivedChange}: ${err instanceof Error ? err.message : String(err)}`
    );
    return 2;
  }

  // The entry of the change is removed from the progress registry once it is
  // archived: `estado` is a closed enum, there is no `archived` state.
  try {
    const registry = readProgress(projectRoot);
    const remaining = registry.change.filter((entry) => entry.id !== changeId);
    if (remaining.length !== registry.change.length) {
      writeProgress(projectRoot, { change: remaining });
    }
  } catch (err: unknown) {
    console.warn(
      `[WARN] no se pudo actualizar el registro de progreso de ${changeId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const vaultRoot = resolveVaultRoot(opts, projectRoot);
  if (!vaultRoot) {
    console.warn('[WARN] vault root no disponible, brain-write omitido');
  } else {
    try {
      const result = brainWrite({
        vaultRoot,
        changeId,
        wikiProject: opts.wikiProject,
        change,
        proposal,
        design,
        tasks,
        proyecto: basename(projectRoot),
        force: opts.force
      });
      if (result.written) {
        console.log(`[OK] resumen en el cerebro: ${result.path}`);
      } else {
        console.warn(`[WARN] ya existe un resumen en el cerebro, no se sobrescribe: ${result.path}`);
      }
    } catch (err: unknown) {
      console.warn(`[WARN] no se pudo escribir el resumen en el cerebro: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (existsSync(changeDir)) {
    console.error(`[ERROR] el change sigue en su sitio: ${changeDir}`);
    return 2;
  }

  console.log(`[OK] change archivado: ${archivedChange}`);
  console.log(`[OK] fila del REGISTRY completada: ${changeId}`);
  return 0;
}
