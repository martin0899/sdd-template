import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export const GITIGNORE_MARKER_BEGIN =
  '# BEGIN: SDD managed gitignore (agregado por install.sh; no editar a mano)';
export const GITIGNORE_MARKER_END = '# END: SDD managed gitignore';
export const GITIGNORE_SENTINEL = 'SDD managed gitignore';
export const GITIGNORE_ENTRIES = [
  'graphify-out/',
  '.sdd-backup-*/',
  '.agents/',
  '.opencode/',
  'skills-lock.json',
  'openspec/',
  '.claude/'
];

export type GitignoreStatus = 'created' | 'appended' | 'refreshed' | 'synced' | 'kept';

export interface GitignoreResult {
  status: GitignoreStatus;
  warnings: string[];
}

interface ManageOptions {
  confirmFn: (question: string) => boolean;
  dryRun?: boolean;
}

function extractBlock(content: string): string | undefined {
  const begin = content.indexOf(GITIGNORE_MARKER_BEGIN);
  const end = content.indexOf(GITIGNORE_MARKER_END);
  if (begin === -1 || end === -1 || end < begin) return undefined;
  return content.slice(begin, end + GITIGNORE_MARKER_END.length);
}

function linesOutsideBlock(content: string): string[] {
  const block = extractBlock(content);
  const rest = block ? content.replace(block, '') : content;
  return rest.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

function missingEntries(content: string): string[] {
  const covered = new Set(linesOutsideBlock(content));
  const block = extractBlock(content);
  if (block) {
    for (const line of block.split('\n').map((l) => l.trim())) {
      if (GITIGNORE_ENTRIES.includes(line)) covered.add(line);
    }
  }
  return GITIGNORE_ENTRIES.filter((entry) => !covered.has(entry));
}

function buildBlock(entries: string[]): string {
  return `${GITIGNORE_MARKER_BEGIN}\n${entries.join('\n')}\n${GITIGNORE_MARKER_END}`;
}

function backupGitignore(target: string): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + `-${process.pid}`;
  const dir = join(target, `.sdd-backup-${ts}`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(target, '.gitignore'), join(dir, '.gitignore'));
  return `.sdd-backup-${ts}/.gitignore`;
}

export function manageGitignore(target: string, opts: ManageOptions): GitignoreResult {
  const warnings: string[] = [];
  const giFile = join(target, '.gitignore');

  if (existsSync(giFile) && readFileSync(giFile, 'utf8').includes(GITIGNORE_SENTINEL)) {
    const content = readFileSync(giFile, 'utf8');
    const missing = missingEntries(content);
    if (missing.length === 0) {
      return { status: 'synced', warnings };
    }
    if (opts.dryRun) {
      return { status: 'refreshed', warnings };
    }
    backupGitignore(target);
    if (!opts.confirmFn(`Refresh the managed .gitignore block with: ${missing.join(' ')}?`)) {
      return { status: 'kept', warnings };
    }
    const block = extractBlock(content);
    if (!block) {
      // Unreachable: sentinel implies block, but stay safe.
      return { status: 'synced', warnings };
    }
    // Preserve entries already inside the old block that are still valid.
    const keptInBlock = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && l !== GITIGNORE_MARKER_BEGIN && l !== GITIGNORE_MARKER_END);
    const merged = Array.from(new Set([...keptInBlock, ...missing]));
    writeFileSync(giFile, content.replace(block, buildBlock(merged)));
    return { status: 'refreshed', warnings };
  }

  const content = existsSync(giFile) ? readFileSync(giFile, 'utf8') : undefined;
  const missing = missingEntries(content ?? '');
  if (missing.length === 0) {
    return { status: 'synced', warnings };
  }
  if (opts.dryRun) {
    return { status: content ? 'appended' : 'created', warnings };
  }
  if (!content) {
    writeFileSync(
      giFile,
      `# Tooling de agente y artefactos generados (gestionado por install.sh)\n${buildBlock(missing)}\n`
    );
    return { status: 'created', warnings };
  }
  backupGitignore(target);
  writeFileSync(giFile, `${content.replace(/\n*$/, '\n')}${buildBlock(missing)}\n`);
  return { status: 'appended', warnings };
}
