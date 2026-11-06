import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTargetProjectRoot } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { parseTasksMd, readProgress, type ProgressChange } from '../core/progress-registry';
import { readChangeJson } from '../core/change-json';

export interface ViewOptions {
  /** Change to inspect. Without it the active changes are listed. */
  change?: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
  /** When true, list/inspect archived changes under spec/_archived. */
  archived?: boolean;
}

/** Message shown for a change that has no entry in the registry. */
export const NO_REGISTRY = 'sin registro';

/** Active changes of a directory: every folder but the archive. */
function listChanges(changesDir: string): string[] {
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && entry.name !== '_archived')
    .map((entry) => entry.name)
    .sort();
}

/** Archived changes: every folder under spec/_archived. */
function listArchivedChanges(projectRoot: string): string[] {
  const archivedDir = join(projectRoot, 'spec', '_archived');
  if (!existsSync(archivedDir)) return [];
  return readdirSync(archivedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** `YYYY-MM-DD HH:MM` in UTC (stable whatever the timezone of the host is). */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** Render a compact ASCII progress bar for a 0-100 percent value. */
function progressBar(percent: number, width = 18): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

/** Derive progress from a tasks.md document's checkboxes. */
function tasksMdProgress(content: string): { done: number; total: number; percent: number } {
  const parsed = parseTasksMd(content);
  const total = parsed.length;
  const done = parsed.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

function renderList(projectRoot: string, changesDir: string): number {
  const changes = listChanges(changesDir);
  if (changes.length === 0) {
    console.log('\n  no hay changes activos\n');
    return 0;
  }
  const registry = readProgress(projectRoot);
  console.log('\n  spectralis view · changes activos\n');
  for (const id of changes) {
    const entry: ProgressChange | undefined = registry.change.find((change) => change.id === id);
    const tasksPath = join(changesDir, id, 'tasks.md');
    const fallback = (!entry || entry.task.length === 0) && existsSync(tasksPath)
      ? tasksMdProgress(readFileSync(tasksPath, 'utf8'))
      : null;
    const percent = entry && entry.task.length > 0 ? entry.porcentaje : (fallback ? fallback.percent : (entry ? entry.porcentaje : 0));
    const percentText = (entry && entry.task.length > 0) || fallback ? `${percent}%` : '—';
    const bar = (entry && entry.task.length > 0) || fallback ? progressBar(percent) : `[${'.'.repeat(18)}]`;
    const updated = entry && entry.updatedAt ? formatTimestamp(entry.updatedAt) : (entry ? '—' : 'sin registro');
    console.log(
      `  ${id.padEnd(20)} ${bar} ${percentText.padStart(4)}  ${updated}`
    );
  }
  console.log('');
  return 0;
}

function renderArchivedList(projectRoot: string): number {
  const archived = listArchivedChanges(projectRoot);
  if (archived.length === 0) {
    console.log('\n  no hay changes archived\n');
    return 0;
  }
  const idWidth = Math.max(20, ...archived.map((id) => id.length));
  console.log('\n  spectralis view --archived · changes archivados\n');
  console.log(`  ${'Change'.padEnd(idWidth)}| Fecha       | Tareas  | Estado   | Nombre`);
  console.log(`  ${'-'.repeat(idWidth)}|-------------|---------|----------|-----------------------------`);
  for (const id of archived) {
    const dir = join(projectRoot, 'spec', '_archived', id);
    let meta: { fecha: string; estado: string; nombre: string } = { fecha: '—', estado: 'done', nombre: '—' };
    try {
      const cj = readChangeJson(dir);
      if (cj) {
        meta.fecha = cj.fecha || '—';
        meta.estado = cj.estado || 'done';
        meta.nombre = cj.nombre || '—';
      }
    } catch {
      /* malformed change.json → keep defaults */
    }
    const tasksPath = join(dir, 'tasks.md');
    const parsed = existsSync(tasksPath) ? parseTasksMd(readFileSync(tasksPath, 'utf8')) : [];
    const total = parsed.length;
    const done = parsed.filter((t) => t.done).length;
    const tasksText = total === 0 ? '—' : `${done}/${total}`;
    const nombre = meta.nombre.length > 46 ? meta.nombre.slice(0, 46) + '…' : meta.nombre;
    console.log(
      `  ${id.padEnd(idWidth)}| ${meta.fecha.padEnd(11)} | ${tasksText.padEnd(7)} | ${meta.estado.padEnd(8)} | ${nombre}`
    );
  }
  console.log('');
  return 0;
}

function renderDetail(projectRoot: string, changesDir: string, change: string, baseDir: string = changesDir): number {
  const changeDir = join(baseDir, change);
  if (!existsSync(changeDir)) {
    console.error(`[ERROR] change no encontrado: ${change}`);
    return 2;
  }
  const registry = readProgress(projectRoot);
  const entry = registry.change.find((item) => item.id === change);
  const tasksPath = join(changeDir, 'tasks.md');
  const parsed = existsSync(tasksPath) ? parseTasksMd(readFileSync(tasksPath, 'utf8')) : [];

  console.log(`\n  spectralis view · ${change}\n`);
  if (entry && entry.task.length > 0) {
    console.log(`  Progreso: ${progressBar(entry.porcentaje)} ${entry.porcentaje}%`);
    console.log(`  Updated: ${entry.updatedAt ? formatTimestamp(entry.updatedAt) : '—'}`);
    console.log('\n  Tasks:');
    for (const task of entry.task) {
      const pct = typeof task.porcentaje === 'number' ? task.porcentaje : task.estatus === 'done' ? 100 : task.estatus === 'in-progress' ? 50 : 0;
      console.log(`  ${progressBar(pct, 12)} ${String(pct).padStart(3)}% [${task.estatus === 'done' ? 'x' : ' '}] ${task.id} ${task.descripcion}`.trimEnd());
    }
  } else if (parsed.length > 0) {
    const total = parsed.length;
    const done = parsed.filter((t) => t.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    console.log(`  Progreso: ${progressBar(pct)} ${pct}%  (${done}/${total} tareas en tasks.md)  [sin registro]`);
    console.log('\n  Tasks:');
    for (const task of parsed) {
      const id = task.id === '' ? '' : `${task.id} `;
      console.log(`  [${task.done ? 'x' : ' '}] ${id}${task.descripcion}`.trimEnd());
    }
  } else {
    console.log(`  Estado: ${NO_REGISTRY}`);
    console.log('  Percent: —');
  }
  console.log('');
  return 0;
}

/**
 * `spectralis view [change]`: read-only view of the changes and their progress.
 *
 * It never writes anything: neither the registry, nor `tasks.md`, nor the
 * registry directory.
 */
export async function runView(opts: ViewOptions = {}): Promise<number> {
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  if (opts.archived && !opts.change) return renderArchivedList(projectRoot);
  if (opts.archived && opts.change) return renderDetail(projectRoot, changesDir, opts.change, join(projectRoot, 'spec', '_archived'));
  if (!opts.change) return renderList(projectRoot, changesDir);
  return renderDetail(projectRoot, changesDir, opts.change);
}