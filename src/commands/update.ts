import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest, writeManifest, type ManifestData } from '../core/manifest';
import { classifyFiles, countByStatus, hasChanges, type ClassifiedFile } from '../core/classify-update';
import { manageAgentsMd, detectAgentsMdDrift } from '../core/agents-md';
import { COMPOSED_STANDARDS } from '../core/copy-payload';
import { makeConfirm } from '../util/prompt';
import { readGlobalConfig } from '../core/config';
import { currentPalette, printBanner, promptMark } from '../util/ui';
import { runNotesInit, runNotesSync, isObsidianActive } from './notes';

export interface UpdateOptions {
  destino?: string;
  dryRun?: boolean;
  check?: boolean;
  yes?: boolean;
  auto?: boolean;
  repairAgents?: boolean;
  obsidian?: boolean;
  noObsidian?: boolean;
}

/** Special entries that must survive a manifest rewrite even when they are not
 * part of `classifyFiles` (AGENTS.md, openspec config and composed standards). */
const MANIFEST_SPECIAL_PATHS = ['AGENTS.md', 'openspec/config.yaml'];

function templateRoot(): string {
  return join(__dirname, '..', '..');
}

function pkgVersion(): string {
  const pkg = JSON.parse(
    require('node:fs').readFileSync(join(templateRoot(), 'package.json'), 'utf8')
  ) as { version: string };
  return pkg.version;
}

function formatPlan(files: ClassifiedFile[]): string[] {
  const lines: string[] = [];
  for (const f of files) {
    if (f.status === 'unchanged') continue;
    const icon = f.status === 'new' ? '+' : f.status === 'retired' ? '-' : f.status === 'conflict' ? '!' : '~';
    lines.push(`  [${icon}] ${f.rel} (${f.status})`);
  }
  return lines;
}

function backupFile(target: string, rel: string, backupRoot: string): string {
  const dest = join(target, backupRoot, rel);
  mkdirSync(join(target, backupRoot, rel.substring(0, rel.lastIndexOf('/'))), { recursive: true });
  copyFileSync(join(target, rel), dest);
  return join(backupRoot, rel);
}

function copyFromPlantilla(rel: string, target: string, templateRoot: string): void {
  const src = join(templateRoot, rel);
  const dest = join(target, rel);
  const dir = rel.substring(0, rel.lastIndexOf('/'));
  mkdirSync(join(target, dir), { recursive: true });
  copyFileSync(src, dest);
}

function preservedManifestPaths(target: string, manifest: ManifestData): string[] {
  const special = new Set([...MANIFEST_SPECIAL_PATHS, ...COMPOSED_STANDARDS]);
  return manifest.files
    .map((f) => f.path)
    .filter((rel) => special.has(rel) && existsSync(join(target, rel)));
}

interface AgentsStep {
  ok: boolean;
  status?: string;
}

/**
 * Runs manageAgentsMd without swallowing failures: a thrown exception or a
 * `failed-*` status is reported and marks the step as failed (the caller then
 * avoids rewriting the manifest).
 */
function manageAgentsStep(
  root: string,
  target: string,
  confirmFn: (question: string) => boolean,
  repair: boolean
): AgentsStep {
  try {
    const result = manageAgentsMd(root, target, { confirmFn, repair });
    console.log(`[OK] AGENTS.md managed: ${result.status}`);
    for (const w of result.warnings) console.log(`[WARN] ${w}`);
    return { ok: !result.status.startsWith('failed-'), status: result.status };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] AGENTS.md management failed: ${detail}`);
    return { ok: false };
  }
}

export async function runUpdate(opts: UpdateOptions = {}): Promise<number> {
  const root = templateRoot();
  const version = pkgVersion();
  const pal = currentPalette();
  console.log(printBanner(version, version, pal));

  const target = resolve(process.cwd(), opts.destino ?? '.');
  if (!existsSync(target)) {
    console.error(`[ERROR] Destination does not exist: ${target}`);
    return 2;
  }

  const manifest = readManifest(target);
  if (!manifest) {
    console.error('[ERROR] No .sdd-manifest.json found in the destination.');
    console.error('spectralis has not been installed here. Run spectralis init first.');
    return 2;
  }

  const { files } = classifyFiles(target, root, true);
  const counts = countByStatus(files);
  const changes = hasChanges(files);

  // AGENTS.md managed-block drift is independent of the classified file tree.
  let agentsDrift = false;
  try {
    agentsDrift = detectAgentsMdDrift(root, target);
  } catch (err) {
    // Inspection failure is not fatal here: manageAgentsMd will surface it later.
    console.error(`[ERROR] Could not inspect AGENTS.md: ${err instanceof Error ? err.message : String(err)}`);
  }

  const shouldAuto = opts.auto || opts.yes || readGlobalConfig().autoUpdate === true;
  const confirmFn = makeConfirm(shouldAuto);

  // Check mode: only report status, never write.
  if (opts.check) {
    console.log('\n== spectralis update --check ==');
    console.log(`  tools: ${(manifest.tools || []).join(', ') || 'none registered'}`);
    console.log('');

    if (!changes && !agentsDrift) {
      console.log('✓ Destination is up to date with the template.');
      return 0;
    }

    console.log('Updates available:');
    if (agentsDrift) console.log('  ~ AGENTS.md (managed block drift)');
    if (counts.new > 0) console.log(`  + ${counts.new} new file(s)`);
    if (counts.updatable > 0) console.log(`  ~ ${counts.updatable} updatable file(s)`);
    if (counts.conflict > 0) console.log(`  ! ${counts.conflict} conflict(s)`);
    if (counts.retired > 0) console.log(`  - ${counts.retired} retired file(s)`);
    console.log('');
    console.log('Run "spectralis update" to apply updates.');
    return 1;
  }

  // Nothing classified changed and AGENTS.md is fine (no repair requested):
  // still honor the "update ALWAYS manages AGENTS.md" contract (a no-op when
  // synced) before reporting success.
  if (!changes && !agentsDrift && !opts.repairAgents) {
    const agentsStep = manageAgentsStep(root, target, confirmFn, false);
    console.log('Destination is up to date with the template. Nothing to do.');
    return agentsStep.ok ? 0 : 1;
  }

  // Show plan when there are classified changes to apply.
  if (changes) {
    console.log('\n== spectralis update plan ==');
    console.log(`  unchanged: ${counts.unchanged}`);
    console.log(`  updatable: ${counts.updatable}`);
    console.log(`  new:       ${counts.new}`);
    console.log(`  conflict:  ${counts.conflict}`);
    console.log(`  retired:   ${counts.retired}`);
    console.log('');
    for (const line of formatPlan(files)) console.log(line);

    if (counts.retired > 0) {
      console.log('\nRetired files will be reported but NOT deleted automatically.');
    }
  }

  if (opts.dryRun) {
    console.log('\nDry-run complete. Nothing written.');
    return 0;
  }

  // Confirm applying the classified changes (nothing to confirm otherwise).
  if (changes && !shouldAuto && !confirmFn(promptMark('Apply this update?'))) {
    console.log('Update cancelled by the user.');
    return 0;
  }

  // Execute update: backup updatable/conflict, copy updatable/new, report retired.
  const backupRoot = `.sdd-backup-${new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)}-${process.pid}`;
  let partial = false;
  const updatedPaths: string[] = [];

  for (const f of files) {
    if (f.status === 'unchanged') continue;

    if (f.status === 'retired') {
      continue; // Report only, never delete.
    }

    if (f.status === 'new') {
      try {
        copyFromPlantilla(f.rel, target, root);
        updatedPaths.push(f.rel);
      } catch {
        console.error(`[ERROR] Failed to copy new file: ${f.rel}`);
        partial = true;
      }
      continue;
    }

    // updatable or conflict: backup first, then copy.
    const destFile = join(target, f.rel);
    if (existsSync(destFile)) {
      try {
        backupFile(target, f.rel, backupRoot);
      } catch {
        console.error(`[ERROR] Failed to backup: ${f.rel}`);
        partial = true;
        continue;
      }
    }

    if (f.status === 'conflict') {
      if (opts.yes) continue; // Conservative: keep conflict in --yes mode.
      if (!confirmFn(`Replace ${f.rel}? (conflict)`)) continue;
    }

    try {
      copyFromPlantilla(f.rel, target, root);
      updatedPaths.push(f.rel);
    } catch {
      console.error(`[ERROR] Failed to copy: ${f.rel}`);
      partial = true;
    }
  }

  // Manage AGENTS.md ALWAYS: independent of `partial` and of the copy result.
  const agentsStep = manageAgentsStep(root, target, confirmFn, opts.repairAgents === true);
  const agentsOk = agentsStep.ok;

  // Rewrite manifest only when nothing failed; preserve special entries.
  if (!partial && agentsOk) {
    const classified = files.filter((f) => f.status !== 'retired').map((f) => f.rel);
    const allManaged = Array.from(
      new Set([...classified, ...preservedManifestPaths(target, manifest)])
    );
    const projectFields: Record<string, unknown> = {};
    if (manifest.obsidianSync !== undefined) projectFields.obsidianSync = manifest.obsidianSync;
    if (manifest.philosophy !== undefined) projectFields.philosophy = manifest.philosophy;
    writeManifest(target, allManaged, manifest.projectVersion ?? '1.0.0', version, manifest.tools, projectFields);
    console.log(`\n[OK] Update complete. ${updatedPaths.length} file(s) updated.`);
  } else if (partial) {
    console.error(`\n[WARN] Partial update. Backups preserved in ${backupRoot}.`);
    if (!agentsOk) console.error('[ERROR] AGENTS.md management also failed.');
  } else {
    console.error('\n[ERROR] Update aborted: AGENTS.md management failed; the manifest was not rewritten.');
  }

  // Orchestration: notes init/sync when obsidianSync is active (only on success).
  if (!partial && agentsOk) {
    const obsidianActive = isObsidianActive({ obsidian: opts.obsidian, noObsidian: opts.noObsidian }, target);
    if (obsidianActive) {
      console.log('');
      console.log(`  [OK] obsidianSync active — syncing manuals to the brain`);
      await runNotesInit({ destino: target, templateRoot: root });
      await runNotesSync({ destino: target, templateRoot: root });
    }
  }

  return !partial && agentsOk ? 0 : 1;
}
