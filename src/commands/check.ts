import { basename, join } from 'node:path';
import { readGlobalConfig, detectVaultRoot, detectProjectFromCwd } from '../core/config';
import {
  checkRegistryConsistency,
  hasErrors,
  VaultDoctorFinding
} from '../core/vault-doctor';
import { checkVaultIds } from '../core/vault-ids';
import { currentPalette, green, red, dim, bold } from '../util/ui';

export interface CheckOptions {
  registry?: boolean;
  ids?: boolean;
  vaultRoot?: string;
  projectRoot?: string;
  cacheRoot?: string;
}

function printFindings(findings: VaultDoctorFinding[]): void {
  const pal = currentPalette();
  if (findings.length === 0) {
    console.log(`  ${pal.check} ${green('Sin hallazgos.', pal)}`);
    return;
  }
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  if (errors.length > 0) {
    console.log(`  ${pal.cross} ${red(`${errors.length} error(es)`, pal)}`);
    for (const f of errors) {
      console.log(`  ${red('error', pal)}   ${bold(f.artifact, pal)} (${dim(f.project, pal)})`);
      console.log(`         -> ${f.suggestion}`);
    }
  }
  if (warnings.length > 0) {
    console.log(`  ${pal.check} ${dim(`${warnings.length} warning(s)`, pal)}`);
    for (const f of warnings) {
      console.log(`  ${dim('warning', pal)} ${dim(f.artifact, pal)} (${dim(f.project, pal)})`);
      console.log(`         -> ${f.suggestion}`);
    }
  }
}

export async function runCheck(opts: CheckOptions = {}): Promise<number> {
  const pal = currentPalette();
  const config = readGlobalConfig();
  const detected = detectProjectFromCwd(process.cwd());
  const projectRoot = opts.projectRoot || detected?.root || config.current_project_root || process.cwd();
  const vaultRoot = opts.vaultRoot || config.vault_root || detectVaultRoot(projectRoot) || '';

  const noFlags = !opts.registry && !opts.ids;
  const doRegistry = opts.registry === true || noFlags;
  const doIds = opts.ids === true || noFlags;

  let exitCode = 0;

  if (doRegistry) {
    console.log(`\n  ${pal.bold('spectralis check --registry')} · consistencia del triángulo (${basename(projectRoot)})`);
    if (!vaultRoot) {
      console.log(`  ${dim('Sin vault resuelto; se omite la comparación con brain/wiki.', pal)}`);
    } else {
      const findings = checkRegistryConsistency({ projectRoot, vaultRoot });
      printFindings(findings);
      if (hasErrors(findings)) exitCode = 1;
    }
  }

  if (doIds) {
    console.log(`\n  ${pal.bold('spectralis check --ids')} · validación de IDs del vault`);
    if (!vaultRoot) {
      console.log(`  ${dim('Sin vault resuelto; no se puede validar IDs.', pal)}`);
      return 0;
    }
    const cacheRoot = opts.cacheRoot || join(projectRoot, '.spectralis');
    const { findings, reparsed } = checkVaultIds({ vaultRoot, cacheRoot });
    if (reparsed >= 0) {
      console.log(`  ${dim(`${reparsed} nota(s) re-parseada(s)`, pal)}`);
    }
    printFindings(findings);
    if (hasErrors(findings)) exitCode = 1;
  }

  return exitCode;
}