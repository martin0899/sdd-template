import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

export const PAYLOAD_DIRS = ['.agents/skills', '.opencode/commands', '.opencode/skills'];
export const PAYLOAD_FILES = ['.opencode/package.json', '.opencode/package-lock.json', '.opencode/.gitignore'];
export const PAYLOAD_DOCS_EXCLUDE = ['graphify-out'];
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

function copyOne(rel: string, opts: CopyOptions, report: CopyReport, backupRoot: string): void {
  const { templateRoot, target, dryRun, confirmFn, failCopy } = opts;
  const src = join(templateRoot, rel);
  const dest = join(target, rel);
  if (!existsSync(dest)) {
    if (dryRun) return;
    if (failCopy?.(rel)) {
      report.failed.push(rel);
      return;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    report.created.push(rel);
    return;
  }
  if (readFileSync(src).equals(readFileSync(dest))) return; // identical -> skip
  report.conflicts.push(rel);
  if (dryRun) return;
  report.backups.push(backupFile(target, rel, backupRoot));
  if (!confirmFn(`Replace ${rel} with the template version?`)) {
    report.kept.push(rel);
    return;
  }
  if (failCopy?.(rel)) {
    report.failed.push(rel);
    return;
  }
  copyFileSync(src, dest);
}

export function copyPayload(opts: CopyOptions): CopyReport {
  const { templateRoot, target } = opts;
  const report: CopyReport = { created: [], conflicts: [], kept: [], backups: [], failed: [] };
  const rels = [...listPayloadFiles(templateRoot, opts.includeOpencode), ...listDocsFiles(templateRoot)];
  const backupRoot = `.sdd-backup-${new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)}-${process.pid}`;
  report.backupRoot = backupRoot;
  for (const rel of rels) {
    copyOne(rel, opts, report, backupRoot);
  }
  return report;
}
