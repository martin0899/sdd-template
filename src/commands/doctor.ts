import { checkPrereqs, installHint, realProbe } from '../core/prereqs';

export function printDoctorReport(): boolean {
  const report = checkPrereqs(realProbe, process.platform);
  console.log('== spectralis doctor: host prerequisites ==');
  for (const r of report.results) {
    if (r.ok) {
      console.log(`  [OK]   ${r.tool}${r.version ? ` (${r.version})` : ''}`);
    } else {
      console.log(`  [MISS] ${r.tool}: ${r.problem}`);
      console.log(`         -> ${installHint(r.tool, process.platform)}`);
    }
  }
  console.log(
    report.ok
      ? 'Host is ready. Run: spectralis init <destino>'
      : 'Fix the missing tools above before running: spectralis init'
  );
  return report.ok;
}

export async function runDoctor(): Promise<number> {
  return printDoctorReport() ? 0 : 1;
}
