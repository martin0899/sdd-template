import { checkPrereqs, realProbe, installHint } from '../core/prereqs';
import { currentPalette, dim, green, printLogo, red } from '../util/ui';
import { resolveEffectivePhilosophy, detectProjectFromCwd } from '../core/config';

/**
 * Doctor report: the prerequisites of the host.
 *
 * The harness has a single native mode: no external spec engine is probed, so
 * the report only lists the tools the harness really needs (git, node and
 * graphify).
 */
export function printDoctorReport(): boolean {
  const pal = currentPalette();
  const projectRoot = detectProjectFromCwd(process.cwd())?.root;
  const philosophy = resolveEffectivePhilosophy(projectRoot);

  const report = checkPrereqs(realProbe, process.platform);
  console.log(printLogo('doctor', pal));
  console.log(
    `  ${pal.bold('spectralis doctor')} · host prerequisites (mode: ${philosophy.value})`
  );
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
