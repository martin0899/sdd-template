import { resolveTargetProjectRoot } from '../core/config';
import {
  runNativeStatus,
  type NativeChangeStatus,
  type NativeStatusReport
} from '../core/spec-native';

export interface SpecStatusOptions {
  /** Change to inspect. Without it every active change is listed. */
  changeId?: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

function renderList(report: NativeStatusReport): void {
  console.log('\n  spectralis spec status · changes activos\n');
  if (report.changes.length === 0) {
    console.log('  no hay changes activos\n');
    return;
  }
  console.log('  Change              | Percent | Estado      | Tasks   | Artifacts');
  console.log('  --------------------|---------|-------------|---------|----------------');
  for (const change of report.changes) {
    const percent = change.unregistered ? '—' : `${change.porcentaje}%`;
    const tasks = `${change.completed}/${change.completed + change.pending}`;
    const artifacts = change.artifacts.join(', ') || '—';
    console.log(
      `  ${change.id.padEnd(20)}| ${percent.padStart(7)} | ${change.label.padEnd(11)} | ${tasks.padStart(7)} | ${artifacts}`
    );
  }
  console.log('');
}

function renderDetail(change: NativeChangeStatus): void {
  console.log(`\n  spectralis spec status · ${change.id}\n`);
  console.log(`  Estado: ${change.estado} (${change.unregistered ? '—' : `${change.porcentaje}%`})`);
  console.log(`  Tareas: ${change.completed} completadas / ${change.pending} pendientes`);
  console.log(`  Artefactos: ${change.artifacts.join(', ') || '—'}`);
  console.log(`  Registro: ${change.label}`);
  console.log('');
}

/**
 * `spectralis spec status [changeId]`: read-only status of the native changes.
 *
 * It never writes anything: neither the progress registry, nor the REGISTRY,
 * nor the artifacts of a change.
 */
export async function runSpecStatus(opts: SpecStatusOptions = {}): Promise<number> {
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const report = runNativeStatus(projectRoot, opts.changeId, { specDir: opts.specDir });

  if (!opts.changeId) {
    renderList(report);
    return 0;
  }

  if (!report.detail) {
    console.error(`[ERROR] change no encontrado: ${opts.changeId}`);
    return 1;
  }
  renderDetail(report.detail);
  return 0;
}
