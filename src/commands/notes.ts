import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { resolveNotesDir, resolveObsidianSync, type NotesDirResolution } from '../core/config';
import { makeConfirm } from '../util/prompt';
import { currentPalette, dim } from '../util/ui';

export interface NotesOptions {
  destino?: string;
  dryRun?: boolean;
  yes?: boolean;
  templateRoot?: string;
}

/**
 * Decide whether obsidian orchestration is active:
 * explicit --no-obsidian wins, then --obsidian, then the config switch.
 */
export function isObsidianActive(opts: { obsidian?: boolean; noObsidian?: boolean }, target: string): boolean {
  if (opts.noObsidian) return false;
  if (opts.obsidian) return true;
  return resolveObsidianSync(target).value === 1;
}

const SUBDIRS = ['git-workflow', 'local-ai', 'manual-installation', 'spec-from-note', 'spectralis-cli'];

function templateRoot(): string {
  return join(__dirname, '..', '..');
}

function notesTemplateRoot(opts?: NotesOptions): string {
  return join(opts?.templateRoot ?? templateRoot(), 'notes');
}

function walkFiles(root: string, base: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(relative(base, full).split('\\').join('/'));
    }
  }
  return out;
}

function backupFile(target: string, rel: string, backupRoot: string): string {
  const dest = join(target, backupRoot, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(target, rel), dest);
  return join(backupRoot, rel);
}

function reportTarget(res: NotesDirResolution): void {
  const pal = currentPalette();
  if (res.origin === 'info') {
    console.log(`  ${pal.red('!')} No second brain connection detected. Using fallback:`);
    console.log(`    ${dim(res.dir, pal)}`);
    console.log(`    ${dim('(info folder inside the project; configure resources_dir to fix)', pal)}`);
  } else {
    console.log(`  ${pal.green('✔')} notes target (${res.origin}): ${res.dir}`);
  }
}

export async function runNotesInit(opts: NotesOptions = {}): Promise<number> {
  const pal = currentPalette();
  const target = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
  const res = resolveNotesDir(target);

  console.log('== spectralis notes init ==');
  reportTarget(res);

  const subdirs = SUBDIRS;

  if (opts.dryRun) {
    console.log('  [DRY RUN] Would create subfolders:');
    for (const s of subdirs) console.log(`    ${join(res.dir, s)}`);
    return 0;
  }

  try {
    for (const s of subdirs) {
      mkdirSync(join(res.dir, s), { recursive: true });
    }
  } catch {
    console.error('[ERROR] Cannot create the notes root folder.');
    console.error('No storage root folder is available. No files were created.');
    return 1;
  }

  const indexFile = join(res.dir, 'README.md');
  if (!existsSync(indexFile)) {
    const lines = [
      '# Notes — Manuales',
      '',
      'Estructura de manuales del arnés SDD en subcarpetas por tema.',
      'Sincroniza el contenido con `spectralis notes sync` desde el repo plantilla.',
      ''
    ];
    for (const s of subdirs) lines.push(`- [ ] ${s}/manual.md`);
    try {
      writeFileSync(indexFile, lines.join('\n') + '\n', 'utf8');
    } catch {
      console.error('[ERROR] Cannot write the notes index file.');
      return 1;
    }
  }

  console.log(`  ${pal.green('✔')} created ${subdirs.length} subfolder(s) under ${res.dir}`);
  return 0;
}

export async function runNotesSync(opts: NotesOptions = {}): Promise<number> {
  const pal = currentPalette();
  const target = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
  const res = resolveNotesDir(target);
  const confirmFn = makeConfirm(Boolean(opts.yes));

  console.log('== spectralis notes sync ==');
  reportTarget(res);

  const srcRoot = notesTemplateRoot(opts);
  const rels = walkFiles(srcRoot, notesTemplateRoot(opts)).filter((r) => r !== 'README.md');

  if (opts.dryRun) {
    console.log('  [DRY RUN] Would sync the following manuals:');
    for (const r of rels) console.log(`    ${r}`);
    return 0;
  }

  try {
    mkdirSync(res.dir, { recursive: true });
  } catch {
    console.error('[ERROR] Cannot create the notes root folder.');
    console.error('No storage root folder is available. No files were created.');
    return 1;
  }

  const backupRoot = `.sdd-backup-${new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)}-${process.pid}`;

  let created = 0;
  let conflicts = 0;
  let kept = 0;
  let identical = 0;
  let backups = 0;

  for (const rel of rels) {
    const src = join(srcRoot, rel);
    const dest = join(res.dir, rel);

    if (!existsSync(dest)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      created++;
      continue;
    }

    if (readFileSync(src).equals(readFileSync(dest))) {
      identical++;
      continue;
    }

    // Conflict: backup then ask.
    try {
      backupFile(res.dir, rel, backupRoot);
      backups++;
    } catch {
      console.error(`[ERROR] Failed to backup: ${rel}`);
      continue;
    }

    conflicts++;
    if (!opts.yes && !confirmFn(`Replace ${rel}? (conflict)`)) {
      kept++;
      continue;
    }
    copyFileSync(src, dest);
  }

  console.log(`  ${pal.green('✔')} synced to ${res.dir}`);
  console.log(`    created: ${created} · identical: ${identical} · conflicts: ${conflicts} · kept: ${kept} · backups: ${backups}`);
  if (backups > 0) console.log(`    backups: ${dim(backupRoot, pal)}`);
  return 0;
}