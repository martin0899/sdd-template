import { checkPrereqs, installHint, realProbe } from '../core/prereqs';
import { currentPalette, dim, green, red } from '../util/ui';
import { resolveEffectivePhilosophy, detectProjectFromCwd } from '../core/config';

export function printDoctorReport(): boolean {
  const pal = currentPalette();
  const projectRoot = detectProjectFromCwd(process.cwd())?.root;
  const philosophy = resolveEffectivePhilosophy({}, projectRoot);
  const report = checkPrereqs(realProbe, process.platform, philosophy.value);
  console.log(`  ${pal.bold('spectralis doctor')} · host prerequisites (mode: ${philosophy.value})`);
  for (const r of report.results) {
    if (r.tool === 'openspec') {
      if (r.ok) {
        console.log(`  ${pal.check} ${green('openspec (requerido SDD)', pal)}${r.version ? dim(` (${r.version})`, pal) : ''}`);
      } else {
        console.log(`  ${pal.cross} ${red(`openspec (requerido SDD): ${r.problem}`, pal)}`);
        console.log(dim(`         -> ${installHint(r.tool, process.platform)}`, pal));
      }
      continue;
    }
    if (r.ok) {
      console.log(`  ${pal.check} ${green(r.tool, pal)}${r.version ? dim(` (${r.version})`, pal) : ''}`);
    } else {
      console.log(`  ${pal.cross} ${red(`${r.tool}: ${r.problem}`, pal)}`);
      console.log(dim(`         -> ${installHint(r.tool, process.platform)}`, pal));
    }
  }
  if (philosophy.value === 'odd') {
    console.log(`  ${pal.check} ${dim('openspec: opcional (ODD) — OpenSpec no es requisito en modo odd', pal)}`);
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
