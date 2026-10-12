import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readGlobalConfig, detectVaultRoot, detectProjectFromCwd } from '../core/config';
import {
  checkRegistryConsistency,
  hasErrors,
  VaultDoctorFinding
} from '../core/vault-doctor';
import { checkVaultIds } from '../core/vault-ids';
import { checkTddOrdering } from '../core/tdd-check';
import { checkRulesContract } from '../core/rules-contract';
import { detectAgentsMdDrift } from '../core/agents-md';
import { currentPalette, green, red, dim, bold } from '../util/ui';

export interface CheckOptions {
  registry?: boolean;
  ids?: boolean;
  tdd?: boolean;
  rules?: boolean;
  agents?: boolean;
  vaultRoot?: string;
  projectRoot?: string;
  cacheRoot?: string;
  /** Override the template root used for AGENTS.md drift (defaults to the install root). */
  templateRoot?: string;
}

/** Root of the installed Spectralis template (holds the canonical AGENTS.md). */
function templateRoot(): string {
  return join(__dirname, '..', '..');
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

  const noFlags = !opts.registry && !opts.ids && !opts.tdd && !opts.rules && !opts.agents;
  const doRegistry = opts.registry === true || noFlags;
  const doIds = opts.ids === true || noFlags;
  const doTdd = opts.tdd === true;
  const doRules = opts.rules === true;
  const doAgents = opts.agents === true;

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

  if (doTdd) {
    console.log(`\n  ${pal.bold('spectralis check --tdd')} · validación del orden TDD en tasks.md (changes activos)`);
    const findings = checkTddOrdering(projectRoot);
    printFindings(findings);
    if (hasErrors(findings)) exitCode = 1;
  }

  if (doRules) {
    console.log(`\n  ${pal.bold('spectralis check --rules')} · reglas del ciclo centralizadas (duplicación/contradicción)`);
    const findings = checkRulesContract(projectRoot);
    printFindings(findings);
    if (hasErrors(findings)) exitCode = 1;
  }

  if (doAgents) {
    console.log(`\n  ${pal.bold('spectralis check --agents')} · bloque gestionado de AGENTS.md`);
    const agentsFile = join(projectRoot, 'AGENTS.md');
    if (!existsSync(agentsFile)) {
      console.log(`  ${red('error', pal)}   AGENTS.md missing (managed block absent)`);
      console.log(`         -> ${dim('run "spectralis update" to create it', pal)}`);
      exitCode = 1;
    } else if (detectAgentsMdDrift(opts.templateRoot ?? templateRoot(), projectRoot)) {
      console.log(`  ${red('error', pal)}   AGENTS.md managed block is stale`);
      console.log(`         -> ${dim('run "spectralis update" (or --repair-agents) to refresh it', pal)}`);
      exitCode = 1;
    } else {
      console.log(`  ${pal.check} ${green('AGENTS.md managed block is in sync.', pal)}`);
    }
  }

  return exitCode;
}