import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveChangesDir } from './resolve-changes-dir';
import {
  deriveEstado,
  derivePercent,
  initProgressFromTasksMd,
  readProgress,
  type ProgressRegistry,
  type ProgressStatus
} from './progress-registry';
import { collectChangeRefs, readRegistry } from './vault-doctor';

/**
 * Native status of the changes of a project.
 *
 * The state of a change is derived from the progress registry
 * (`spec/progress.json`): a change that has no entry there is a legacy one and
 * its state is derived from its `tasks.md` instead. The REGISTRY of the project
 * is only cross-checked when it exists (the check is a single file read).
 *
 * The whole module is read-only: it never writes the progress registry, never
 * writes the REGISTRY and never touches the artifacts of a change.
 */

/** Artifacts a change of the native layout holds. */
export const SPEC_ARTIFACTS = ['proposal.md', 'design.md', 'tasks.md', 'change.json'] as const;

/** Label of a change without an entry in the progress registry. */
export const NO_REGISTRY_LABEL = 'sin registro';

/** Label of a change referenced by the REGISTRY of the project. */
export const ARCHIVED_LABEL = 'archivado';

export interface NativeChangeStatus {
  /** Id of the change: the name of its folder. */
  id: string;
  /** Absolute path of the folder of the change. */
  dir: string;
  /** State of the change (`todo`, `in-progress` or `done`). */
  estado: ProgressStatus;
  /** Percentage of the change, derived from its tasks. */
  porcentaje: number;
  /** Label shown to the user (`sin registro`, `archivado` or the state). */
  label: string;
  /** The change has no entry in the progress registry. */
  unregistered: boolean;
  /** The REGISTRY of the project references the change. */
  archived: boolean;
  /** Tasks already done. */
  completed: number;
  /** Tasks still pending. */
  pending: number;
  /** Artifacts present in the folder of the change. */
  artifacts: string[];
}

export interface NativeStatusReport {
  /** Directory the changes were read from. */
  changesDir: string;
  /** Every active change of the project. */
  changes: NativeChangeStatus[];
  /** The requested change (only when a change id was given). */
  detail?: NativeChangeStatus;
  /** Whether the REGISTRY could be read (the cross-check was performed). */
  registryChecked: boolean;
}

export interface NativeStatusOptions {
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

/** Active changes of a directory: every folder but the archive. */
function listChangeIds(changesDir: string): string[] {
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && entry.name !== '_archived')
    .map((entry) => entry.name)
    .sort();
}

/**
 * The change ids the REGISTRY of the project references.
 *
 * `null` means "there is no REGISTRY": the cross-check is skipped instead of
 * failing.
 */
function registryRefs(projectRoot: string): Set<string> | null {
  const path = join(projectRoot, '.sdd-registry', 'REGISTRY.md');
  if (!existsSync(path)) return null;
  return collectChangeRefs(readRegistry(projectRoot));
}

function buildChangeStatus(
  changesDir: string,
  id: string,
  progress: ProgressRegistry,
  refs: Set<string> | null
): NativeChangeStatus {
  const dir = join(changesDir, id);
  const entry = progress.change.find((change) => change.id === id);
  const tasksPath = join(dir, 'tasks.md');
  const tasksMd = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : '';

  // A registered change derives its state from the tasks of the registry; a
  // legacy one (no entry) derives it from the checkboxes of its tasks.md.
  const tasks = entry ? entry.task : initProgressFromTasksMd(tasksMd);
  const estado = entry && entry.task.length === 0 ? entry.estado : deriveEstado(tasks);
  const porcentaje = entry && entry.task.length === 0 ? entry.porcentaje : derivePercent(tasks);
  const completed = tasks.filter((task) => task.estatus === 'done').length;
  const pending = tasks.length - completed;

  const unregistered = !entry;
  const archived = refs ? refs.has(id) : false;
  // Label precedence: 'sin registro' (no registry entry) > 'archivado' (REGISTRY row exists) > derived estado.
  const label = unregistered ? NO_REGISTRY_LABEL : archived ? ARCHIVED_LABEL : estado;

  return {
    id,
    dir,
    estado,
    porcentaje,
    label,
    unregistered,
    archived,
    completed,
    pending,
    artifacts: SPEC_ARTIFACTS.filter((artifact) => existsSync(join(dir, artifact)))
  };
}

/**
 * Status of the changes of a project.
 *
 * Without a change id it reports every active change of the resolved changes
 * directory; with one it reports the detail of that change.
 */
export function runNativeStatus(
  projectRoot: string,
  changeId?: string,
  opts: NativeStatusOptions = {}
): NativeStatusReport {
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const progress = readProgress(projectRoot);
  const refs = registryRefs(projectRoot);
  const changes = listChangeIds(changesDir).map((id) =>
    buildChangeStatus(changesDir, id, progress, refs)
  );
  const detail = changeId ? changes.find((change) => change.id === changeId) : undefined;
  return { changesDir, changes, detail, registryChecked: refs !== null };
}
