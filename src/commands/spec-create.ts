import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTargetProjectRoot } from '../core/config';
import { isValidChangeId } from '../core/change-id';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { scaffoldChange } from '../core/change-scaffold';
import {
  initProgressFromTasksMd,
  readProgress,
  writeProgress
} from '../core/progress-registry';

export { isValidChangeId } from '../core/change-id';

/**
 * `spectralis spec create <change-id> [--nombre <text>]`.
 *
 * Creates the folder of a new change inside the resolved changes directory:
 * the minimal seeds (proposal, tasks, design), the `change.json` metadata and
 * the first entry of `spec/progress.json`.
 */
export interface SpecCreateOptions {
  /** Id of the change (the name of its folder). */
  changeId: string;
  /** Human readable name stored in `change.json`. */
  nombre?: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

/**
 * Creates a change.
 *
 * Exit codes: 0 success, 1 invalid id, 2 the change already exists.
 */
export async function runSpecCreate(opts: SpecCreateOptions): Promise<number> {
  const changeId = opts.changeId;
  if (!isValidChangeId(changeId)) {
    console.error(
      `[ERROR] change-id inválido: "${changeId}". Usa kebab-case en minúsculas y sin espacios (ej. spec-native-f2).`
    );
    return 1;
  }

  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const dir = join(changesDir, changeId);

  if (existsSync(dir)) {
    console.error(`[ERROR] el change ya existe: ${changeId} (${dir})`);
    return 2;
  }

  try {
    scaffoldChange(dir, changeId, opts.nombre ?? '');
  } catch (err: unknown) {
    console.error(`[ERROR] no se pudo crear el change ${changeId}: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  const registry = readProgress(projectRoot);
  if (!registry.change.some((change) => change.id === changeId)) {
    const tasksPath = join(dir, 'tasks.md');
    const tasksMd = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';
    registry.change.push({
      id: changeId,
      nombre: changeId,
      porcentaje: 0,
      estado: 'todo',
      updatedAt: new Date().toISOString(),
      task: initProgressFromTasksMd(tasksMd)
    });
    writeProgress(projectRoot, registry);
  }

  console.log(`[OK] change creado: ${dir}`);
  console.log('  - proposal.md, tasks.md, design.md, change.json');
  console.log(`  - entrada inicial en spec/progress.json`);
  return 0;
}
