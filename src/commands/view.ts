import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTargetProjectRoot } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { parseTasksMd, readProgress, type ProgressChange } from '../core/progress-registry';

export interface ViewOptions {
  /** Change to inspect. Without it the active changes are listed. */
  change?: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

/** Message shown for a change that has no entry in the registry. */
export const NO_REGISTRY = 'sin registro';

/** Active changes of a directory: every folder but the archive. */
function listChanges(changesDir: string): string[] {
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
    .map((entry) => entry.name)
    .sort();
}

/** `YYYY-MM-DD HH:MM` in UTC (stable whatever the timezone of the host is). */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}`;
}

function renderList(projectRoot: string, changesDir: string): number {
  const changes = listChanges(changesDir);
  if (changes.length === 0) {
    console.log('\n  no hay changes activos\n');
    return 0;
  }
  const registry = readProgress(projectRoot);
  console.log('\n  spectralis view · changes activos\n');
  console.log('  Change              | Percent | Estado      | Updated');
  console.log('  --------------------|---------|-------------|-------------------');
  for (const id of changes) {
    const entry: ProgressChange | undefined = registry.change.find((change) => change.id === id);
    const percent = entry ? `${entry.porcentaje}%` : '—';
    const estado = entry ? entry.estado : NO_REGISTRY;
    const updated = entry && entry.updatedAt ? formatTimestamp(entry.updatedAt) : '—';
    console.log(
      `  ${id.padEnd(20)}| ${percent.padStart(7)} | ${estado.padEnd(11)} | ${updated}`
    );
  }
  console.log('');
  return 0;
}

function renderDetail(projectRoot: string, changesDir: string, change: string): number {
  const changeDir = join(changesDir, change);
  if (!existsSync(changeDir)) {
    console.error(`[ERROR] change no encontrado: ${change}`);
    return 2;
  }
  const registry = readProgress(projectRoot);
  const entry = registry.change.find((item) => item.id === change);

  console.log(`\n  spectralis view · ${change}\n`);
  if (entry) {
    console.log(`  Estado: ${entry.estado} (${entry.porcentaje}%)`);
    console.log(`  Updated: ${entry.updatedAt ? formatTimestamp(entry.updatedAt) : '—'}`);
    console.log('\n  Tasks:');
    for (const task of entry.task) {
      console.log(`  [${task.estatus === 'done' ? 'x' : ' '}] ${task.id} ${task.descripcion}`.trimEnd());
    }
  } else {
    console.log(`  Estado: ${NO_REGISTRY}`);
    console.log('  Percent: —');
    const tasksPath = join(changeDir, 'tasks.md');
    const parsed = existsSync(tasksPath)
      ? parseTasksMd(readFileSync(tasksPath, 'utf8'))
      : [];
    if (parsed.length > 0) {
      console.log('\n  Tasks:');
      for (const task of parsed) {
        const id = task.id === '' ? '' : `${task.id} `;
        console.log(`  [${task.done ? 'x' : ' '}] ${id}${task.descripcion}`.trimEnd());
      }
    }
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
  if (!opts.change) return renderList(projectRoot, changesDir);
  return renderDetail(projectRoot, changesDir, opts.change);
}
