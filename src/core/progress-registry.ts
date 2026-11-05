import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Progress registry: the structured record of how far each change is.
 *
 * The persisted schema is the one closed by the coordinator (briefing D1):
 *
 * ```json
 * {
 *   "change": [
 *     {
 *       "id": "spec-native-f1",
 *       "nombre": "Fase F1 del spec nativo",
 *       "porcentaje": 0,
 *       "estado": "todo",
 *       "updatedAt": "2026-11-05T10:00:00.000Z",
 *       "task": [
 *         { "id": "1.1", "descripcion": "Abstraer resolveChangesDir()", "porcentaje": null, "estatus": "todo" }
 *       ]
 *     }
 *   ]
 * }
 * ```
 *
 * The field names are the persisted ones (they are data, not API): the JSON
 * schema is fixed, so the TypeScript shape mirrors it one to one.
 */

/** Status of a change or of a task. */
export type ProgressStatus = 'todo' | 'in-progress' | 'done';

export interface ProgressTask {
  /** Task id as written in `tasks.md` (e.g. `1.1`). */
  id: string;
  descripcion: string;
  /** `null` means "derive it from the status"; a number is a partial advance. */
  porcentaje: number | null;
  estatus: ProgressStatus;
}

export interface ProgressChange {
  /** Change id: the name of the change folder. */
  id: string;
  /** Human readable title. */
  nombre: string;
  porcentaje: number;
  estado: ProgressStatus;
  /**
   * Additive optional field: ISO timestamp of the last write of this change.
   * It is absent when the entry has never been written by `spectralis task`.
   */
  updatedAt?: string;
  task: ProgressTask[];
}

export interface ProgressRegistry {
  change: ProgressChange[];
}

/** Base percentage contributed by a task whose percentage is not set. */
const STATUS_BASE: Record<ProgressStatus, number> = {
  todo: 0,
  'in-progress': 50,
  done: 100
};

/** Directory (relative to the project root) that holds the registry. */
export const PROGRESS_DIR = 'spec';
/** File name of the registry. */
export const PROGRESS_FILE = 'progress.json';

/** Absolute path of the registry file of a project. */
export function progressRegistryPath(projectRoot: string): string {
  return join(projectRoot, PROGRESS_DIR, PROGRESS_FILE);
}

function isStatus(value: unknown): value is ProgressStatus {
  return value === 'todo' || value === 'in-progress' || value === 'done';
}

function normalizeTask(raw: unknown): ProgressTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const task = raw as Record<string, unknown>;
  if (typeof task.id !== 'string' || task.id === '') return null;
  const porcentaje =
    typeof task.porcentaje === 'number' && Number.isFinite(task.porcentaje) ? task.porcentaje : null;
  return {
    id: task.id,
    descripcion: typeof task.descripcion === 'string' ? task.descripcion : '',
    porcentaje,
    estatus: isStatus(task.estatus) ? task.estatus : 'todo'
  };
}

function normalizeRegistry(raw: unknown): ProgressRegistry {
  if (!raw || typeof raw !== 'object') return { change: [] };
  const list = (raw as Record<string, unknown>).change;
  if (!Array.isArray(list)) return { change: [] };
  const change: ProgressChange[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string' || entry.id === '') continue;
    const task = Array.isArray(entry.task)
      ? entry.task.map(normalizeTask).filter((t): t is ProgressTask => t !== null)
      : [];
    change.push({
      id: entry.id,
      nombre: typeof entry.nombre === 'string' && entry.nombre !== '' ? entry.nombre : entry.id,
      porcentaje:
        typeof entry.porcentaje === 'number' && Number.isFinite(entry.porcentaje)
          ? entry.porcentaje
          : derivePercent(task),
      estado: isStatus(entry.estado) ? entry.estado : deriveEstado(task),
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
      task
    });
  }
  return { change };
}

/**
 * Reads the registry of a project.
 *
 * Tolerant read: a missing file, an invalid JSON or an unexpected shape never
 * throws, it returns an empty registry instead.
 */
export function readProgress(projectRoot: string): ProgressRegistry {
  const path = progressRegistryPath(projectRoot);
  if (!existsSync(path)) return { change: [] };
  try {
    return normalizeRegistry(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return { change: [] };
  }
}

/**
 * Writes the registry of a project atomically.
 *
 * The change level percentage and status are always derived from the tasks
 * before writing: they are never written by hand. The write goes through a
 * temporary file in the same directory followed by a rename, so a crash can
 * never leave a partially written registry.
 */
export function writeProgress(projectRoot: string, registry: ProgressRegistry): void {
  const path = progressRegistryPath(projectRoot);
  const derived: ProgressRegistry = {
    change: registry.change.map((change) => ({
      ...change,
      porcentaje: derivePercent(change.task),
      estado: deriveEstado(change.task)
    }))
  };
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(derived, null, 2) + '\n', 'utf8');
  renameSync(tmpPath, path);
}

/** Percentage a task contributes: its own value, or the base of its status. */
export function deriveTaskPercentage(task: ProgressTask): number {
  if (typeof task.porcentaje === 'number' && Number.isFinite(task.porcentaje)) {
    return Math.min(100, Math.max(0, Math.round(task.porcentaje)));
  }
  return STATUS_BASE[task.estatus];
}

/** Percentage of a change: the rounded average of its tasks (0 without tasks). */
export function derivePercent(tasks: ProgressTask[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((acc, task) => acc + deriveTaskPercentage(task), 0);
  return Math.round(total / tasks.length);
}

/**
 * Status of a change:
 * - every task done -> `done`
 * - at least one task in progress -> `in-progress`
 * - anything else (including no tasks) -> `todo`
 */
export function deriveEstado(tasks: ProgressTask[]): ProgressStatus {
  if (tasks.length === 0) return 'todo';
  if (tasks.every((task) => task.estatus === 'done')) return 'done';
  if (tasks.some((task) => task.estatus === 'in-progress')) return 'in-progress';
  return 'todo';
}

export interface ParsedTask {
  /** Task id (`''` when the line carries none). */
  id: string;
  descripcion: string;
  done: boolean;
  /** Position of the line inside the document. */
  lineIndex: number;
}

const TASK_LINE = /^\s*-\s+\[([ xX])\]\s+(.*)$/;
const TASK_ID = /^(\d+(?:\.\d+)*)\s+(.*)$/;

/** Parses the task lines of a `tasks.md` document. */
export function parseTasksMd(content: string): ParsedTask[] {
  const parsed: ParsedTask[] = [];
  const lines = content.split('\n');
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const match = lines[lineIndex].match(TASK_LINE);
    if (!match) continue;
    const done = match[1].toLowerCase() === 'x';
    const rest = match[2].trim();
    const idMatch = rest.match(TASK_ID);
    parsed.push({
      id: idMatch ? idMatch[1] : '',
      descripcion: idMatch ? idMatch[2].trim() : rest,
      done,
      lineIndex
    });
  }
  return parsed;
}

/**
 * Builds the task list of a change from its `tasks.md`.
 *
 * Only the lines that carry a task id become tasks: a line without an id
 * cannot be addressed by `spectralis task`.
 */
export function initProgressFromTasksMd(content: string): ProgressTask[] {
  return parseTasksMd(content)
    .filter((task) => task.id !== '')
    .map((task) => ({
      id: task.id,
      descripcion: task.descripcion,
      porcentaje: null,
      estatus: task.done ? 'done' : 'todo'
    }));
}

/** Readable title of a change, taken from the heading of its `tasks.md`. */
export function changeNameFromTasksMd(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  if (!heading) return fallback;
  const title = heading[1].trim().replace(/^Tasks:\s*/i, '').trim();
  return title === '' ? fallback : title;
}

/**
 * Refreshes the checkbox of a task inside a `tasks.md` document.
 *
 * The line is located by the *whole* task id: the id must be followed by a
 * non word character, so `1.1` never touches the line of `1.10`. Every line
 * carrying that exact id is refreshed and the number of updated lines is
 * returned (0 means the task is not in the document).
 */
export function setTaskCheckbox(
  content: string,
  taskId: string,
  done: boolean
): { content: string; updated: number } {
  const lines = content.split('\n');
  let updated = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(TASK_LINE);
    if (!match) continue;
    const idMatch = match[2].trim().match(TASK_ID);
    if (!idMatch || idMatch[1] !== taskId) continue;
    lines[i] = lines[i].replace(/\[([ xX])\]/, done ? '[x]' : '[ ]');
    updated++;
  }
  return { content: lines.join('\n'), updated };
}
