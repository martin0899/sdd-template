import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTargetProjectRoot } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import {
  changeNameFromTasksMd,
  deriveEstado,
  derivePercent,
  initProgressFromTasksMd,
  parseTasksMd,
  readProgress,
  setTaskCheckbox,
  writeProgress,
  type ProgressChange,
  type ProgressStatus
} from '../core/progress-registry';

export interface TaskOptions {
  /** Id of the change (the name of its folder). */
  change: string;
  /** Id of the task (unique prefix of the task id). */
  taskId: string;
  /** Mark the task as done. */
  done?: boolean;
  /** Mark the task as not done. */
  undone?: boolean;
  /** Explicit status: `todo`, `in-progress` or `done`. */
  estado?: string;
  /** Explicit percentage of the task (0-100). */
  porcentaje?: number;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

const STATUSES: ProgressStatus[] = ['todo', 'in-progress', 'done'];
const STATUS_BASE: Record<ProgressStatus, number> = { todo: 0, 'in-progress': 50, done: 100 };

/**
 * A task id matches when it starts with the requested one and the next
 * character is not a word character: `1.1` matches `1.1` but never `1.10`.
 */
function matchesTaskId(id: string, requested: string): boolean {
  if (!id.startsWith(requested)) return false;
  const next = id.charAt(requested.length);
  return next === '' || !/[A-Za-z0-9_]/.test(next);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function requestedStatus(opts: TaskOptions): { estatus: ProgressStatus; porcentaje: number } | null {
  if (opts.done && opts.undone) return null;
  if (opts.porcentaje !== undefined) {
    if (!Number.isFinite(opts.porcentaje) || opts.porcentaje < 0 || opts.porcentaje > 100) return null;
  }
  if (opts.done) return { estatus: 'done', porcentaje: opts.porcentaje ?? 100 };
  if (opts.undone) return { estatus: 'todo', porcentaje: opts.porcentaje ?? 0 };
  if (opts.estado !== undefined) {
    if (!STATUSES.includes(opts.estado as ProgressStatus)) return null;
    const estatus = opts.estado as ProgressStatus;
    const porcentaje = opts.porcentaje ?? STATUS_BASE[estatus];
    return { estatus, porcentaje };
  }
  return null;
}

/**
 * `spectralis task <change> <task-id>`: updates the progress registry and
 * refreshes the checkbox of `tasks.md` (active mirror between both).
 *
 * Exit codes: 0 success, 1 invalid usage, 2 change or task not found,
 * 3 ambiguous task id.
 */
// F1: active MIRROR state between the registry JSON and tasks.md (tdd-check keeps validating tasks.md); the detailed source remains tasks.md — final authority decision deferred to F2.
export async function runTask(opts: TaskOptions): Promise<number> {
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const changeDir = join(changesDir, opts.change);
  if (!existsSync(changeDir)) {
    console.error(`[ERROR] change no encontrado: ${opts.change}`);
    return 2;
  }

  const status = requestedStatus(opts);
  if (!status) {
    console.error(
      `[ERROR] estado no válido para ${opts.taskId}. Usa --done, --undone o --estado <${STATUSES.join('|')}>` +
        ` (--porcentaje admite un entero entre 0 y 100).`
    );
    return 1;
  }

  const tasksMdPath = join(changeDir, 'tasks.md');
  const tasksMd = existsSync(tasksMdPath) ? readFileSync(tasksMdPath, 'utf8') : null;
  const parsed = tasksMd ? parseTasksMd(tasksMd) : [];

  const registry = readProgress(projectRoot);
  const existing = registry.change.find((change) => change.id === opts.change);

  const knownIds = unique([
    ...(existing ? existing.task.map((task) => task.id) : []),
    ...parsed.map((task) => task.id).filter((id) => id !== '')
  ]);
  const matches = knownIds.filter((id) => matchesTaskId(id, opts.taskId));
  if (matches.length === 0) {
    console.error(`[ERROR] task no encontrado: ${opts.taskId} (en ${opts.change})`);
    return 2;
  }
  if (matches.length > 1) {
    console.error(
      `[ERROR] task-id ambiguo: "${opts.taskId}" coincide con ${matches.join(', ')}. Indica el id completo.`
    );
    return 3;
  }
  const matchedId = matches[0];
  const duplicates = parsed.filter((task) => task.id === matchedId);
  if (duplicates.length > 1) {
    console.error(
      `[ERROR] task-id ambiguo: "${matchedId}" aparece ${duplicates.length} veces en tasks.md.`
    );
    return 3;
  }

  const change: ProgressChange = existing ?? {
    id: opts.change,
    nombre: tasksMd ? changeNameFromTasksMd(tasksMd, opts.change) : opts.change,
    porcentaje: 0,
    estado: 'todo',
    updatedAt: new Date().toISOString(),
    task: initProgressFromTasksMd(tasksMd ?? '')
  };
  if (!existing) registry.change.push(change);

  let task = change.task.find((item) => item.id === matchedId);
  if (!task) {
    const source = parsed.find((item) => item.id === matchedId);
    task = {
      id: matchedId,
      descripcion: source ? source.descripcion : '',
      porcentaje: null,
      estatus: 'todo'
    };
    change.task.push(task);
  }
  task.estatus = status.estatus;
  task.porcentaje = status.porcentaje;
  change.porcentaje = derivePercent(change.task);
  change.estado = deriveEstado(change.task);
  change.updatedAt = new Date().toISOString();

  writeProgress(projectRoot, registry);

  if (tasksMd === null) {
    console.warn(
      `[WARN] ${opts.change} no tiene tasks.md: el registro se actualizó pero no hay espejo que refrescar.`
    );
  } else {
    const mirror = setTaskCheckbox(tasksMd, matchedId, status.estatus === 'done');
    if (mirror.updated === 0) {
      console.warn(
        `[WARN] el task ${matchedId} no aparece en tasks.md: el registro se actualizó pero el espejo no.`
      );
    } else {
      writeFileSync(tasksMdPath, mirror.content, 'utf8');
    }
  }

  console.log(
    `[OK] ${opts.change} · ${matchedId} → ${status.estatus} · ${change.porcentaje}% (${change.estado})`
  );
  return 0;
}
