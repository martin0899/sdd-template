import { checkPrereqs, installHint, realProbe } from '../core/prereqs';
import { currentPalette, dim, green, red } from '../util/ui';

export function printDoctorReport(): boolean {
  const pal = currentPalette();
  const report = checkPrereqs(realProbe, process.platform);
  console.log(`  ${pal.bold('spectralis doctor')} · host prerequisites`);
  for (const r of report.results) {
    if (r.ok) {
      console.log(`  ${pal.check} ${green(r.tool, pal)}${r.version ? dim(` (${r.version})`, pal) : ''}`);
    } else {
      console.log(`  ${pal.cross} ${red(`${r.tool}: ${r.problem}`, pal)}`);
      console.log(dim(`         -> ${installHint(r.tool, process.platform)}`, pal));
    }
  }
  console.log(
    report.ok
      ? `\n${pal.check} ${pal.bold('Host is ready. Run:')} spectralis init`
      : `\n${pal.cross} Fix the missing tools above before running: spectralis init`
  );
  return report.ok;
}

export async function runDoctor(): Promise<number> {
  return printDoctorReport() ? 0 : 1;
}
