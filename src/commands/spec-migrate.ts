import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, copyFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveTargetProjectRoot } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { writeChangeJson, type ChangeJson } from '../core/change-json';
import {
  initProgressFromTasksMd,
  readProgress,
  writeProgress
} from '../core/progress-registry';

/**
 * `spectralis spec migrate [--dry-run]`.
 *
 * Moves the legacy changes of `openspec/changes/` into the native layout and
 * merges their progress entry into `spec/progress.json`.
 *
 * This command is the only one that reads the historical layout: the reader
 * below is migration-specific and is never used by the operational commands.
 */
export interface SpecMigrateOptions {
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
  /** List the plan without writing anything. */
  dryRun?: boolean;
}

/**
 * A change of the historical layout.
 */
export interface LegacyChange {
  /** Id of the change: the name of its folder, without the archive date prefix. */
  id: string;
  /** Absolute path of the folder of the change. */
  dir: string;
  /** True when the change lives in the archive: it is already closed. */
  archived: boolean;
}

/**
 * Directory (relative to the project root) that holds the legacy changes.
 *
 * MIGRATION-ONLY: the historical layout is read by this command and by
 * nothing else.
 */
export const LEGACY_CHANGES_REL = join('openspec', 'changes');

/** Strips the `YYYY-MM-DD-` prefix of an archived change folder. */
export function stripArchiveDatePrefix(name: string): string {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/**
 * Every change of the legacy layout.
 *
 * The active ones come first (sorted by id) and the archived ones after:
 * they are reported, never migrated.
 */
export function readLegacyChanges(projectRoot: string): LegacyChange[] {
  const changesDir = join(projectRoot, LEGACY_CHANGES_REL);
  if (!existsSync(changesDir)) return [];

  const active: LegacyChange[] = [];
  const archived: LegacyChange[] = [];

  for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'archive') continue;
    active.push({ id: entry.name, dir: join(changesDir, entry.name), archived: false });
  }

  const archiveDir = join(changesDir, 'archive');
  if (existsSync(archiveDir)) {
    for (const entry of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      archived.push({
        id: stripArchiveDatePrefix(entry.name),
        dir: join(archiveDir, entry.name),
        archived: true
      });
    }
  }

  const byId = (a: LegacyChange, b: LegacyChange): number => a.id.localeCompare(b.id);
  return [...active.sort(byId), ...archived.sort(byId)];
}

/** Files of a change that the migration moves. */
const MIGRATED_FILES = ['proposal.md', 'design.md', 'tasks.md'];

/** Name of the manifest that records the migrated changes. */
const MIGRATED_MANIFEST = 'migrated.json';

/** Directory (relative to the project root) that holds the registry. */
const REGISTRY_DIR = 'spec';

function manifestPath(projectRoot: string): string {
  return join(projectRoot, REGISTRY_DIR, MIGRATED_MANIFEST);
}

function readMigratedManifest(projectRoot: string): string[] {
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { changes?: unknown };
    if (!Array.isArray(raw.changes)) return [];
    return raw.changes.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function writeMigratedManifest(projectRoot: string, ids: string[]): void {
  const path = manifestPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  const changes = [...new Set(ids)].sort();
  writeFileSync(path, JSON.stringify({ changes }, null, 2) + '\n', 'utf8');
}

/** Moves a file, falling back to copy + delete when the rename is not possible. */
function moveFile(from: string, to: string): void {
  try {
    renameSync(from, to);
  } catch {
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

/** Title of the change, taken from the heading of its proposal. */
function changeName(legacy: LegacyChange): string {
  const proposal = join(legacy.dir, 'proposal.md');
  if (existsSync(proposal)) {
    const heading = readFileSync(proposal, 'utf8').match(/^#\s+(.+)$/m);
    if (heading) {
      const title = heading[1].trim().replace(/^Propuesta:\s*/i, '').trim();
      if (title !== '') return title;
    }
  }
  return legacy.id;
}

function buildChangeJson(legacy: LegacyChange): ChangeJson {
  return {
    id: legacy.id,
    nombre: changeName(legacy),
    fecha: new Date().toISOString().slice(0, 10),
    estado: 'open',
    resumen: { abstracto: '' },
    enlaces: []
  };
}

/**
 * Migrates one legacy change into the native layout.
 *
 * The change is moved as a whole: when one of its files cannot be moved, the
 * files already moved go back to their place and the error names the change.
 */
function migrateChange(
  projectRoot: string,
  legacy: LegacyChange,
  changeDir: string
): { tasks: number } {
  mkdirSync(changeDir, { recursive: true });
  const moved: Array<{ from: string; to: string }> = [];
  try {
    for (const name of MIGRATED_FILES) {
      const from = join(legacy.dir, name);
      if (!existsSync(from)) continue;
      const to = join(changeDir, name);
      moveFile(from, to);
      moved.push({ from, to });
    }
  } catch (err: unknown) {
    for (const file of moved.reverse()) {
      try {
        moveFile(file.to, file.from);
      } catch {
        // The rollback is best effort: the error of the migration is the one
        // that matters.
      }
    }
    throw new Error(
      `la migración del change ${legacy.id} falló: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!existsSync(join(changeDir, 'change.json'))) {
    writeChangeJson(changeDir, buildChangeJson(legacy));
  }

  const tasksPath = join(changeDir, 'tasks.md');
  const tasksMd = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';
  const registry = readProgress(projectRoot);
  if (!registry.change.some((change) => change.id === legacy.id)) {
    registry.change.push({
      id: legacy.id,
      nombre: changeName(legacy),
      porcentaje: 0,
      estado: 'todo',
      updatedAt: new Date().toISOString(),
      task: initProgressFromTasksMd(tasksMd)
    });
  }
  writeProgress(projectRoot, registry);
  return { tasks: initProgressFromTasksMd(tasksMd).length };
}

/**
 * Migrates every legacy change of a project.
 *
 * The migration is idempotent (a change that already has an entry in the
 * registry, or that is recorded in the manifest, is skipped) and atomic per
 * change: the changes migrated before a failure stay migrated.
 */
export async function runSpecMigrate(opts: SpecMigrateOptions): Promise<number> {
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const legacyChanges = readLegacyChanges(projectRoot);

  for (const archived of legacyChanges.filter((change) => change.archived)) {
    console.log(`[INFO] ${archived.id}: ya cerrados (archive), no se migran`);
  }

  const active = legacyChanges.filter((change) => !change.archived);
  if (active.length === 0) {
    console.log('no hay changes legacy para migrar');
    return 0;
  }

  const registry = readProgress(projectRoot);
  const migrated = readMigratedManifest(projectRoot);
  let moved = 0;

  for (const legacy of active) {
    const target = join(changesDir, legacy.id);
    const alreadyRegistered = registry.change.some((change) => change.id === legacy.id);
    if (alreadyRegistered || migrated.includes(legacy.id)) {
      console.log(`[SKIP] ${legacy.id}: ya migrado`);
      continue;
    }

    try {
      if (existsSync(target)) {
        if (statSync(target).isDirectory()) {
          console.warn(
            `[WARN] ${legacy.id} existe en ambos layouts, se usa ${changesDir} como fuente de verdad`
          );
          continue;
        }
        throw new Error(`${target} ya existe y no es una carpeta`);
      }

      if (opts.dryRun) {
        const tasksPath = join(legacy.dir, 'tasks.md');
        const tasks = existsSync(tasksPath)
          ? initProgressFromTasksMd(readFileSync(tasksPath, 'utf8')).length
          : 0;
        console.log(`[DRY-RUN] ${legacy.id}: se migraría a ${target} (${tasks} tareas)`);
        moved++;
        continue;
      }

      const result = migrateChange(projectRoot, legacy, target);
      migrated.push(legacy.id);
      writeMigratedManifest(projectRoot, migrated);
      moved++;
      console.log(`[OK] ${legacy.id}: migrado a ${target} (${result.tasks} tareas)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] la migración del change ${legacy.id} falló: ${message}`);
      return 1;
    }
  }

  if (moved === 0) {
    console.log('no hay changes legacy para migrar');
    return 0;
  }
  console.log(`[OK] ${moved} change(s) migrados`);
  return 0;
}
