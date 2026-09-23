import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

export const PAYLOAD_DIRS = ['.agents/skills', '.opencode/commands', '.opencode/skills'];
export const PAYLOAD_FILES = ['.opencode/package.json', '.opencode/package-lock.json', '.opencode/.gitignore'];
export const PAYLOAD_DOCS_EXCLUDE = ['graphify-out', 'manuals'];
export const COMPOSED_STANDARDS = ['docs/backend-standards.md', 'docs/frontend-standards.md'];

export function isExcludedPath(rel: string): boolean {
  const segments = rel.split('/');
  const last = segments[segments.length - 1];
  if (last === 'skills-lock.json' || last === '.env' || last.startsWith('.env.')) return true;
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === '.opencode' && segments[i + 1] === 'plugins') return true;
    const seg = segments[i];
    if (
      seg === 'graphify-out' ||
      seg === 'node_modules' ||
      seg === 'dist' ||
      seg === 'build' ||
      seg.startsWith('.sdd-backup-')
    ) {
      return true;
    }
  }
  return false;
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

export function listPayloadFiles(templateRoot: string, includeOpencode: boolean): string[] {
  const rels: string[] = [];
  for (const dir of PAYLOAD_DIRS) {
    if (dir.startsWith('.opencode') && !includeOpencode) continue;
    rels.push(...walkFiles(join(templateRoot, dir), templateRoot));
  }
  for (const file of PAYLOAD_FILES) {
    if (file.startsWith('.opencode') && !includeOpencode) continue;
    if (existsSync(join(templateRoot, file))) rels.push(file);
  }
  return rels.filter((r) => !isExcludedPath(r) && !COMPOSED_STANDARDS.includes(r));
}

export function listDocsFiles(templateRoot: string): string[] {
  if (!existsSync(join(templateRoot, 'docs'))) return [];
  return walkFiles(join(templateRoot, 'docs'), templateRoot).filter((rel) => {
    if (isExcludedPath(rel)) return false;
    if (COMPOSED_STANDARDS.includes(rel)) return false;
    return !PAYLOAD_DOCS_EXCLUDE.some((ex) => rel === `docs/${ex}` || rel.startsWith(`docs/${ex}/`));
  });
}

export interface CopyOptions {
  templateRoot: string;
  target: string;
  includeOpencode: boolean;
  confirmFn: (question: string) => boolean;
  dryRun?: boolean;
  failCopy?: (rel: string) => boolean;
}

export interface CopyReport {
  created: string[];
  conflicts: string[];
  kept: string[];
  backups: string[];
  failed: string[];
  backupRoot?: string;
}

function backupFile(target: string, rel: string, backupRoot: string): string {
  const dest = join(target, backupRoot, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(target, rel), dest);
  return join(backupRoot, rel);
}

export function copyPayload(opts: CopyOptions): CopyReport {
  const { templateRoot, target, dryRun, confirmFn, failCopy } = opts;
  const report: CopyReport = { created: [], conflicts: [], kept: [], backups: [], failed: [] };
  const rels = [...listPayloadFiles(templateRoot, opts.includeOpencode), ...listDocsFiles(templateRoot)];
  const backupRoot = `.sdd-backup-${new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)}-${process.pid}`;
  report.backupRoot = backupRoot;

  // Phase 1: Classify without copying.
  const newFiles: string[] = [];
  const conflictFiles: string[] = [];
  const identicalFiles: string[] = [];

  for (const rel of rels) {
    const src = join(templateRoot, rel);
    const dest = join(target, rel);
    if (!existsSync(dest)) {
      newFiles.push(rel);
    } else if (readFileSync(src).equals(readFileSync(dest))) {
      identicalFiles.push(rel);
    } else {
      conflictFiles.push(rel);
    }
  }

  // Phase 2: Copy new files (no confirmation needed).
  for (const rel of newFiles) {
    if (dryRun) continue;
    if (failCopy?.(rel)) {
      report.failed.push(rel);
      continue;
    }
    mkdirSync(dirname(join(target, rel)), { recursive: true });
    copyFileSync(join(templateRoot, rel), join(target, rel));
    report.created.push(rel);
  }

  // Phase 3: Handle conflicts (single summary, per-file decision).
  if (conflictFiles.length > 0) {
    report.conflicts = [...conflictFiles];

    if (!dryRun) {
      // Backup all conflicts first.
      for (const rel of conflictFiles) {
        try {
          report.backups.push(backupFile(target, rel, backupRoot));
        } catch {
          report.failed.push(rel);
        }
      }

      // Ask once if there are conflicts, then per-file.
      if (conflictFiles.length > 0) {
        const proceed = confirmFn(
          `${conflictFiles.length} file(s) conflict with the template. Replace them? (y/n per file follows)`
        );
        if (proceed) {
          for (const rel of conflictFiles) {
            if (failCopy?.(rel)) {
              report.failed.push(rel);
              continue;
            }
            if (!confirmFn(`  Replace ${rel}?`)) {
              report.kept.push(rel);
              continue;
            }
            copyFileSync(join(templateRoot, rel), join(target, rel));
          }
        } else {
          report.kept.push(...conflictFiles);
        }
      }
    }
  }

  return report;
}
