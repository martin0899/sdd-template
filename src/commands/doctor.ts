import {
  checkPrereqs,
  checkTool,
  installHint,
  openspecCheck,
  realProbe,
  OPENSPEC_TOOL
} from '../core/prereqs';
import { currentPalette, dim, green, red } from '../util/ui';
import { resolveEffectivePhilosophy, detectProjectFromCwd } from '../core/config';
import { resolveEngine, type EngineResolution } from '../core/resolve-engine';

/**
 * Warning shown when the project declares the openspec engine but the binary
 * is not installed: the engine is explicit, so the host is not ready.
 */
export const OPENSPEC_ENGINE_WARNING =
  'engine: openspec pero el binario openspec no está en PATH';

export function printDoctorReport(): boolean {
  const pal = currentPalette();
  const projectRoot = detectProjectFromCwd(process.cwd())?.root;
  const philosophy = resolveEffectivePhilosophy(projectRoot);

  let engine: EngineResolution;
  try {
    engine = resolveEngine({ projectRoot: projectRoot ?? process.cwd() });
  } catch (err: unknown) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }

  const report = checkPrereqs(realProbe, process.platform, engine.value);
  console.log(
    `  ${pal.bold('spectralis doctor')} · host prerequisites (mode: ${philosophy.value}, engine: ${engine.value} [${engine.origin}])`
  );
  for (const r of report.results) {
    if (r.tool === OPENSPEC_TOOL) {
      // The engine declares the external CLI as required.
      if (r.ok) {
        console.log(`  ${pal.check} ${green('openspec (required)', pal)}${r.version ? dim(` (${r.version})`, pal) : ''}`);
      } else {
        console.log(`  ${pal.cross} ${red(`openspec (required): ${r.problem}`, pal)}`);
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

  if (engine.value === 'native') {
    // The native engine does not need the external CLI: it is reported as
    // optional and its absence never blocks the host.
    const optional = checkTool(realProbe, openspecCheck(), process.platform);
    if (optional.ok) {
      console.log(`  ${pal.check} ${green('openspec (optional)', pal)}${optional.version ? dim(` (${optional.version})`, pal) : ''}`);
    } else {
      console.log(`  ! ${dim(`openspec (optional): ${optional.problem}`, pal)}`);
      console.log(dim(`         -> ${installHint(optional.tool, process.platform)}`, pal));
    }
  } else {
    const openspec = report.results.find((r) => r.tool === OPENSPEC_TOOL);
    if (openspec && !openspec.ok) {
      console.log(`  ${pal.bold('[WARN]')} ${OPENSPEC_ENGINE_WARNING}`);
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
