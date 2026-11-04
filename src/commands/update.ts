import { existsSync, readFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest, writeManifest, sha256File, type ManifestData } from '../core/manifest';
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
  prune?: boolean;
  repairAgents?: boolean;
  obsidian?: boolean;
  noObsidian?: boolean;
}

/** Outcome of the hash check performed on a retired file before pruning it. */
export type PruneDecision = 'prune' | 'modified' | 'missing' | 'unreadable';

export interface PruneCandidate {
  rel: string;
  decision: PruneDecision;
}

const PRUNE_REASON: Record<PruneDecision, string> = {
  prune: 'hash matches the manifest',
  modified: 'hash differs (edited after installation)',
  missing: 'not present on disk',
  unreadable: 'not readable'
};

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

/**
 * Decides, per retired file, whether it can be pruned.
 *
 * Only files whose current hash matches the hash recorded in the manifest are
 * prunable: a file edited after the installation has a different hash and is
 * preserved (never deleted, never backed up).
 */
function planPrune(
  target: string,
  manifest: ManifestData,
  retired: ClassifiedFile[]
): PruneCandidate[] {
  const referenceHashes = new Map(manifest.files.map((f) => [f.path, f.hash]));
  return retired.map((f) => {
    const destFile = join(target, f.rel);
    if (!existsSync(destFile)) return { rel: f.rel, decision: 'missing' as PruneDecision };
    const reference = referenceHashes.get(f.rel);
    let current: string;
    try {
      current = sha256File(destFile);
    } catch {
      return { rel: f.rel, decision: 'unreadable' as PruneDecision };
    }
    return {
      rel: f.rel,
      decision: reference && current === reference ? ('prune' as PruneDecision) : ('modified' as PruneDecision)
    };
  });
}

/** Prints the prune plan (report only: it never writes anything). */
function reportPrunePlan(plan: PruneCandidate[]): void {
  console.log('\n== prune plan (--prune) ==');
  if (plan.length === 0) {
    console.log('  No retired files to prune.');
    return;
  }
  for (const candidate of plan) {
    const icon = candidate.decision === 'prune' ? '-' : '~';
    console.log(`  [${icon}] ${candidate.rel} (${PRUNE_REASON[candidate.decision]})`);
  }
  const prunable = plan.filter((c) => c.decision === 'prune').length;
  console.log(`  ${prunable} file(s) would be deleted (backup first); ${plan.length - prunable} preserved.`);
}

export interface PruneOutcome {
  pruned: string[];
  failed: { rel: string; error: string }[];
}

/**
 * Backs up and deletes retired files (filesystem only, never git).
 *
 * A file is deleted only after its backup succeeded: when the backup fails the
 * file is reported and left untouched, so it stays in the manifest and can be
 * pruned in a later run.
 */
export function executePrune(
  target: string,
  candidates: PruneCandidate[],
  backupRoot: string
): PruneOutcome {
  const pruned: string[] = [];
  const failed: { rel: string; error: string }[] = [];

  for (const candidate of candidates) {
    const destFile = join(target, candidate.rel);
    try {
      backupFile(target, candidate.rel, backupRoot);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failed.push({ rel: candidate.rel, error });
      console.error(`[ERROR] Failed to backup retired file (not deleted): ${candidate.rel}: ${error}`);
      continue;
    }
    try {
      rmSync(destFile, { force: true });
      pruned.push(candidate.rel);
      console.log(`  [OK] pruned: ${candidate.rel}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failed.push({ rel: candidate.rel, error });
      console.error(`[ERROR] Failed to delete retired file: ${candidate.rel}: ${error}`);
    }
  }

  return { pruned, failed };
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

  // Retired files (in the manifest, no longer in the template) and the prune
  // plan: only files whose hash matches the manifest can be deleted.
  const retiredFiles = files.filter((f) => f.status === 'retired');
  const prunePlan = opts.prune ? planPrune(target, manifest, retiredFiles) : [];
  const prunableFiles = prunePlan.filter((c) => c.decision === 'prune');

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

    if (opts.prune) reportPrunePlan(prunePlan);

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
    if (opts.prune) reportPrunePlan(prunePlan);
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

    if (opts.prune) {
      reportPrunePlan(prunePlan);
    } else if (counts.retired > 0) {
      console.log('\nRetired files will be reported but NOT deleted automatically.');
    }
  }

  if (opts.dryRun) {
    console.log('\nDry-run complete. Nothing written.');
    return 0;
  }

  // Prune is destructive: it asks for an explicit confirmation unless the
  // caller opted in with --yes/--auto. The confirmation is asked before the
  // generic "apply this update?" prompt so the deletion list is fresh.
  let pruneApproved = false;
  if (opts.prune && prunableFiles.length > 0) {
    const pruneConfirm = makeConfirm(opts.yes === true || opts.auto === true);
    pruneApproved = pruneConfirm(
      promptMark(`Delete ${prunableFiles.length} retired file(s) (backup first)?`)
    );
    if (!pruneApproved) {
      console.log('Prune declined: the retired files are preserved.');
    }
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
      continue; // Retired files are never copied; only --prune can delete them.
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

  // Execute prune: backup first, then delete (fs only, never git).
  const prunedPaths: string[] = [];
  if (pruneApproved) {
    const outcome = executePrune(target, prunableFiles, backupRoot);
    prunedPaths.push(...outcome.pruned);
  }

  // Manage AGENTS.md ALWAYS: independent of `partial` and of the copy result.
  const agentsStep = manageAgentsStep(root, target, confirmFn, opts.repairAgents === true);
  const agentsOk = agentsStep.ok;

  // Rewrite manifest only when nothing failed; preserve special entries.
  if (!partial && agentsOk) {
    const classified = files.filter((f) => f.status !== 'retired').map((f) => f.rel);
    // With --prune, retired files that were not pruned (hash differs, backup
    // failed or the user declined) stay in the manifest, keeping their
    // reference hash so they are detected again — and never pruned — later.
    const retainedRetired = opts.prune
      ? retiredFiles.filter((f) => !prunedPaths.includes(f.rel)).map((f) => f.rel)
      : [];
    const hashOverrides: Record<string, string> = {};
    for (const rel of retainedRetired) {
      const reference = manifest.files.find((f) => f.path === rel)?.hash;
      if (reference) hashOverrides[rel] = reference;
    }
    const allManaged = Array.from(
      new Set([...classified, ...retainedRetired, ...preservedManifestPaths(target, manifest)])
    );
    const projectFields: Record<string, unknown> = {};
    if (manifest.obsidianSync !== undefined) projectFields.obsidianSync = manifest.obsidianSync;
    if (manifest.philosophy !== undefined) projectFields.philosophy = manifest.philosophy;
    writeManifest(
      target,
      allManaged,
      manifest.projectVersion ?? '1.0.0',
      version,
      manifest.tools,
      projectFields,
      hashOverrides
    );
    console.log(`\n[OK] Update complete. ${updatedPaths.length} file(s) updated.`);
    if (prunedPaths.length > 0) {
      console.log(`[OK] Pruned ${prunedPaths.length} retired file(s). Backups in ${backupRoot}.`);
    }
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
