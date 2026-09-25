import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkPrereqs, realProbe, installHint } from '../core/prereqs';
import { detectStack, StackInfo } from '../core/detect-stack';
import { injectSpanishContext } from '../core/spanish-context';
import { manageAgentsMd } from '../core/agents-md';
import { manageGitignore } from '../core/gitignore';
import {
  copyPayload,
  listPayloadFiles,
  listDocsFiles,
  COMPOSED_STANDARDS
} from '../core/copy-payload';
import { fillPlaceholders, resolveVariantFile } from '../core/compose-standards';
import { writeManifest } from '../core/manifest';
import { runPostChecks } from '../core/post-checks';
import { installGitHooks } from '../core/git-hooks';
import { resolveAgent } from '../agents/profiles';
import { selectTools } from '../core/tool-selector';
import { buildInitPlan } from './plan';
import { makeConfirm } from '../util/prompt';
import { currentPalette, phaseLine, printBanner, promptMark, red as uiRed } from '../util/ui';

export interface InitOptions {
  destino?: string;
  agent?: string;
  dryRun?: boolean;
  yes?: boolean;
  confirmFactory?: typeof makeConfirm;
}

function templateRoot(): string {
  // dist/commands/init.js -> package root (three levels up in dev dist-test too)
  return join(__dirname, '..', '..');
}

function composeOneStandard(
  kind: 'backend' | 'frontend',
  variant: string,
  destRel: string,
  target: string,
  root: string,
  info: StackInfo,
  confirmFn: (q: string) => boolean,
  dryRun: boolean
): { composed: boolean; conflict: boolean; kept: boolean } {
  const src = resolveVariantFile(root, kind, variant);
  if (!existsSync(src)) {
    console.log(`  [WARN] Missing variant in template: docs-variants/${kind}/${variant}.md (not composed)`);
    return { composed: false, conflict: false, kept: false };
  }
  const dest = join(target, destRel);
  const rendered = fillPlaceholders(kind, readFileSync(src, 'utf8'), info);
  if (!existsSync(dest)) {
    console.log(`  -> ${destRel} (variant ${kind}/${variant})`);
    if (!dryRun) {
      mkdirSync(join(target, 'docs'), { recursive: true });
      writeFileSync(dest, rendered);
    }
    return { composed: true, conflict: false, kept: false };
  }
  if (!readFileSync(dest, 'utf8').includes(rendered) && readFileSync(dest, 'utf8') !== rendered) {
    console.log(`     [conflict] ${destRel} differs from variant ${kind}/${variant}`);
    if (dryRun) return { composed: false, conflict: true, kept: false };
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + `-${process.pid}`;
    const backupDir = join(target, `.sdd-backup-${ts}`);
    mkdirSync(backupDir, { recursive: true });
    copyFileSync(dest, join(backupDir, destRel));
    if (!confirmFn(`Replace ${destRel} with the detected stack variant (${kind}/${variant})?`)) {
      console.log(`     [kept] ${destRel} (destination version preserved)`);
      return { composed: false, conflict: true, kept: true };
    }
    writeFileSync(dest, rendered);
    return { composed: true, conflict: true, kept: false };
  }
  console.log(`  -> ${destRel} identical to variant (skipped)`);
  return { composed: true, conflict: false, kept: false };
}

export async function runInit(opts: InitOptions = {}): Promise<number> {
  const root = templateRoot();
  const version = pkgVersion();
  const pal = currentPalette();
  console.log(printBanner(version, version, pal));
  const profile = resolveAgent(opts.agent);
  const confirmFn = (opts.confirmFactory ?? makeConfirm)(Boolean(opts.yes));

  // Destination defaults to the current working directory (git init style).
  const target = resolve(process.cwd(), opts.destino ?? '.');
  if (!existsSync(target)) {
    console.error(`[ERROR] Destination does not exist: ${target}`);
    return 1;
  }

  // 1. Prerequisites gate: nothing is written when something is missing.
  let steps = 0;
  const step = (label: string, result: string) =>
    console.log(phaseLine(++steps, 11, label, result, pal));
  const prereqs = checkPrereqs(realProbe, process.platform);
  if (!prereqs.ok) {
    console.log(pal.bold('Missing prerequisites:'));
    for (const r of prereqs.results.filter((r) => !r.ok)) {
      console.log(`  ${pal.cross} ${uiRed(r.tool)}: ${r.problem}`);
      console.log(pal.dim(`         -> ${installHint(r.tool, process.platform)}`));
    }
    console.log('Aborting: nothing has been written to the destination.');
    return 1;
  }

  // 2. Read-only recognition.
  const stack = detectStack(target);

  // 3. Tool selection (interactive menu or flag-based).
  const toolSelection = await selectTools({ target, agentFlag: opts.agent, yes: opts.yes });
  const includeOpencode = toolSelection.selected.includes('opencode');

  if (opts.dryRun) {
    for (const line of buildInitPlan(target, stack, profile, root)) console.log(line);
    console.log(`  tools: ${toolSelection.selected.join(', ')} (via ${toolSelection.source})`);
    return 0;
  }

  console.log(`== spectralis init: ${target} ==`);
  console.log(`   tools: ${toolSelection.selected.join(', ')} (via ${toolSelection.source})`);
  console.log(`   backend: ${stack.backend}${stack.framework ? ` | ${stack.framework}` : ''} | frontend: ${stack.frontend}${stack.frameworkFe ? ` | ${stack.frameworkFe}` : ''}`);
  if (!confirmFn(promptMark('Continue with the installation?'))) {
    console.error('Installation cancelled by the user. Nothing was written.');
    return 1;
  }

  // 3. openspec init (non-interactive) when the root is missing.
  if (!existsSync(join(target, 'openspec'))) {
    console.log('[..] Running openspec init in the destination...');
    const result = spawnSync(
      'openspec',
      ['init', '--tools', profile.openspecTools, '--no-animation'],
      { cwd: target, stdio: 'inherit', shell: process.platform === 'win32' }
    );
    if (result.status !== 0) {
      console.error('[ERROR] openspec init failed. Check the CLI version and run again.');
      return 1;
    }
    console.log(`  ${pal.green('✔')} openspec init ...... created (tools: ${profile.openspecTools})`);
  } else {
    console.log(`  ${pal.check} openspec init ...... preserved`);
  }

  // 4. Spanish context injection (APPEND semantics).
  const configFile = join(target, 'openspec/config.yaml');
  if (existsSync(configFile)) {
    writeFileSync(configFile, injectSpanishContext(readFileSync(configFile, 'utf8')));
    console.log(`  ${pal.green('✔')} Spanish context ..... injected`);
  } else {
    console.error('[ERROR] openspec/config.yaml not found; cannot inject context.');
    return 1;
  }

  // 5. Managed blocks: AGENTS.md and .gitignore (idempotent).
  const agentsResult = manageAgentsMd(root, target, { confirmFn });
  console.log(`  ${pal.green('✔')} AGENTS.md managed block .: ${agentsResult.status}`);
  for (const w of agentsResult.warnings) console.log(`  [WARN] ${w}`);
  const giResult = manageGitignore(target, { confirmFn });
  console.log(`  ${pal.green('✔')} managed .gitignore ..: ${giResult.status}`);
  for (const w of giResult.warnings) console.log(`  [WARN] ${w}`);

  // 6. Payload + docs copy with anti-corruption policy.
  const copyReport = copyPayload({
    templateRoot: root,
    target,
    includeOpencode: includeOpencode,
    confirmFn
  });
  if (copyReport.failed.length > 0) {
    console.error(`[ERROR] Partial installation: ${copyReport.failed.length} file(s) failed. Backups preserved in ${String(copyReport.backupRoot)}`);
    return 1;
  }
  console.log(`  ${pal.green('✔')} payload copy ........ ${copyReport.created.length} new, ${copyReport.conflicts.length} conflicts, ${copyReport.kept.length} kept`);

  // 7. Standards composed from docs-variants per detected stack.
  let composedCount = 0;
  if (stack.backend !== 'none') {
    const r = composeOneStandard('backend', stack.backend, COMPOSED_STANDARDS[0], target, root, stack, confirmFn, Boolean(opts.dryRun));
    composedCount += r.composed ? 1 : 0;
  }
  if (stack.frontend !== 'none') {
    const r = composeOneStandard('frontend', stack.frontend, COMPOSED_STANDARDS[1], target, root, stack, confirmFn, Boolean(opts.dryRun));
    composedCount += r.composed ? 1 : 0;
  }

  // 8. Manifest.
  const managedPaths = Array.from(
    new Set([
      ...listPayloadFiles(root, includeOpencode),
      ...listDocsFiles(root),
      'AGENTS.md',
      'openspec/config.yaml',
      ...(stack.backend !== 'none' ? [COMPOSED_STANDARDS[0]] : []),
      ...(stack.frontend !== 'none' ? [COMPOSED_STANDARDS[1]] : [])
    ])
  );
  writeManifest(target, managedPaths, version, version, toolSelection.selected);
  console.log(`  ${pal.green('✔')} manifest ............ ${managedPaths.length} files hashed`);

  // 9. Git hooks (post-merge auto-rebuild).
  const hookResult = installGitHooks(target);
  if (hookResult.installed) {
    console.log(`  ${pal.green('✔')} git hooks ........... post-merge installed`);
  } else if (hookResult.skipped) {
    console.log(`  ${pal.check} git hooks ........... ${hookResult.skipped}`);
  }

  console.log(pal.bold(`Installed with spectralis ${version} (template ${version})`));

  // 10. Post checks + manual steps.
  const post = runPostChecks(target, {
    backendVariant: stack.backend,
    frontendVariant: stack.frontend,
    includeOpencode: includeOpencode
  });
  for (const w of post.warnings) console.log(`  [WARN] ${w}`);
  console.log('');
  console.log('Manual next steps in the destination:');
  for (const s of post.manualSteps) console.log(`  ${s}`);

  console.log('');
  console.log(`[OK] SDD installation completed in: ${target} (${composedCount} standards composed)`);
  return 0;
}

function pkgVersion(): string {
  const pkg = JSON.parse(readFileSync(join(templateRoot(), 'package.json'), 'utf8')) as { version: string };
  return pkg.version;
}
