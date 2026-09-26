import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest, sha256File } from '../core/manifest';
import { classifyFiles, countByStatus, hasChanges, type ClassifiedFile } from '../core/classify-update';
import { makeConfirm } from '../util/prompt';
import { readGlobalConfig } from '../core/config';
import { currentPalette, phaseLine, printBanner, promptMark } from '../util/ui';
import { runNotesInit, runNotesSync, isObsidianActive } from './notes';

export interface UpdateOptions {
  destino?: string;
  dryRun?: boolean;
  check?: boolean;
  yes?: boolean;
  auto?: boolean;
  obsidian?: boolean;
  noObsidian?: boolean;
}

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

  // Check mode: only report status, never write
  if (opts.check) {
    console.log('\n== spectralis update --check ==');
    console.log(`  tools: ${(manifest.tools || []).join(', ') || 'none registered'}`);
    console.log('');
    
    if (!hasChanges(files)) {
      console.log('✓ Destination is up to date with the template.');
      return 0;
    }

    console.log('Updates available:');
    if (counts.new > 0) console.log(`  + ${counts.new} new file(s)`);
    if (counts.updatable > 0) console.log(`  ~ ${counts.updatable} updatable file(s)`);
    if (counts.conflict > 0) console.log(`  ! ${counts.conflict} conflict(s)`);
    if (counts.retired > 0) console.log(`  - ${counts.retired} retired file(s)`);
    console.log('');
    console.log('Run "spectralis update" to apply updates.');
    return 1;
  }

  if (!hasChanges(files)) {
    console.log('Destination is up to date with the template. Nothing to do.');
    return 0;
  }

  // Show plan.
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

  if (opts.dryRun) {
    console.log('\nDry-run complete. Nothing written.');
    return 0;
  }

  // Confirm.
  const shouldAuto = opts.auto || opts.yes || readGlobalConfig().autoUpdate === true;
  const confirmFn = makeConfirm(shouldAuto);
  if (!shouldAuto && !confirmFn(promptMark('Apply this update?'))) {
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

  // Rewrite manifest on success.
  if (!partial) {
    const allManaged = files.map((f) => f.rel).filter((r) => !files.some((f) => f.rel === r && f.status === 'retired'));
    const { writeManifest } = require('../core/manifest');
    writeManifest(target, allManaged, version, version, manifest.tools);
    console.log(`\n[OK] Update complete. ${updatedPaths.length} file(s) updated.`);

    // LLM detection (Ollama).
    const { detectOllama, configureLlm } = require('../core/ollama');
    const ollama = await detectOllama();
    if (ollama.available && ollama.models.length > 0) {
      const modelName = ollama.models[0].name;
      await configureLlm(modelName);
      console.log(`[OK] LLM: Ollama detected, model: ${modelName}`);
    } else {
      console.log('[--] LLM: Ollama not detected (LLM classification disabled)');
    }
  } else {
    console.error(`\n[WARN] Partial update. Backups preserved in ${backupRoot}.`);
  }

  // Orchestration: notes init/sync when obsidianSync is active (only on success).
  if (!partial) {
    const obsidianActive = isObsidianActive({ obsidian: opts.obsidian, noObsidian: opts.noObsidian }, target);
    if (obsidianActive) {
      console.log('');
      console.log(`  [OK] obsidianSync active — syncing manuals to the brain`);
      await runNotesInit({ destino: target, templateRoot: root });
      await runNotesSync({ destino: target, templateRoot: root });
    }
  }

  return partial ? 1 : 0;
}
