import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export const AGENTS_MARKER_BEGIN = '<!-- BEGIN: SDD template rules (agregado por spectralis) -->';
export const AGENTS_MARKER_END = '<!-- END: SDD template rules -->';
export const AGENTS_SENTINEL = 'ALWAYS use graphify first';

export type AgentsMdStatus =
  | 'created'
  | 'appended'
  | 'refreshed'
  | 'synced'
  | 'kept'
  | 'skipped-duplicate'
  | 'skipped-incomplete'
  | 'skipped-sentinel'
  | 'repaired-duplicate'
  | 'repaired-incomplete'
  | 'repaired-legacy'
  | `failed-${string}`;

export interface AgentsMdResult {
  status: AgentsMdStatus;
  warnings: string[];
}

interface ManageOptions {
  confirmFn: (question: string) => boolean;
  dryRun?: boolean;
  /** Force reconstruction of skipped-* states (--repair-agents) with backup + confirmation. */
  repair?: boolean;
}

function managedBlock(templateContent: string): string {
  // Template's first line is its H1; the managed block carries the rest.
  const body = templateContent.split('\n').slice(1).join('\n');
  return `${AGENTS_MARKER_BEGIN}\n${body}\n${AGENTS_MARKER_END}`;
}

function extractBlock(content: string): string | undefined {
  const begin = content.indexOf(AGENTS_MARKER_BEGIN);
  const end = content.indexOf(AGENTS_MARKER_END);
  if (begin === -1 || end === -1 || end < begin) return undefined;
  return content.slice(begin, end + AGENTS_MARKER_END.length);
}

function backupAgentsMd(target: string): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + `-${process.pid}`;
  const dir = join(target, `.sdd-backup-${ts}`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(target, 'AGENTS.md'), join(dir, 'AGENTS.md'));
  return `.sdd-backup-${ts}/AGENTS.md`;
}

/**
 * Reports whether the destination's managed block differs from the template's.
 * Missing file, missing markers (legacy/no markers), incomplete markers and
 * duplicated markers all count as drift (the managed block is stale or absent).
 */
export function detectAgentsMdDrift(templateRoot: string, target: string): boolean {
  const templateFile = join(templateRoot, 'AGENTS.md');
  if (!existsSync(templateFile)) return true;
  const templateContent = readFileSync(templateFile, 'utf8');

  const destFile = join(target, 'AGENTS.md');
  if (!existsSync(destFile)) return true;
  const content = readFileSync(destFile, 'utf8');

  const beginCount = content.split(AGENTS_MARKER_BEGIN).length - 1;
  const endCount = content.split(AGENTS_MARKER_END).length - 1;
  if (beginCount !== 1 || endCount !== 1) return true;

  return extractBlock(content) !== managedBlock(templateContent);
}

export function manageAgentsMd(
  templateRoot: string,
  target: string,
  opts: ManageOptions
): AgentsMdResult {
  const warnings: string[] = [];
  const templateFile = join(templateRoot, 'AGENTS.md');
  if (!existsSync(templateFile)) {
    throw new Error(`Template AGENTS.md missing at ${templateFile}`);
  }
  const templateContent = readFileSync(templateFile, 'utf8');
  const destFile = join(target, 'AGENTS.md');

  if (!existsSync(destFile)) {
    if (!opts.dryRun) {
      // Fresh installs are born managed: H1 + wrapped block so future
      // updates can refresh the content in place.
      const h1 = templateContent.split('\n')[0];
      writeFileSync(destFile, `${h1}\n${managedBlock(templateContent)}\n`);
    }
    return { status: 'created', warnings };
  }

  const content = readFileSync(destFile, 'utf8');
  const beginCount = content.split(AGENTS_MARKER_BEGIN).length - 1;
  const endCount = content.split(AGENTS_MARKER_END).length - 1;

  if (beginCount === 1 && endCount === 1) {
    const tplBlock = managedBlock(templateContent);
    const destBlock = extractBlock(content);
    if (destBlock === tplBlock) {
      return { status: 'synced', warnings };
    }
    if (opts.dryRun) {
      return { status: 'refreshed', warnings };
    }
    backupAgentsMd(target);
    if (!opts.confirmFn('Replace the managed SDD rules block in AGENTS.md with the template version?')) {
      return { status: 'kept', warnings };
    }
    const before = content.slice(0, content.indexOf(AGENTS_MARKER_BEGIN));
    const after = content.slice(content.indexOf(AGENTS_MARKER_END) + AGENTS_MARKER_END.length);
    writeFileSync(destFile, `${before}${tplBlock}${after}`);
    return { status: 'refreshed', warnings };
  }

  if (beginCount > 1 || endCount > 1) {
    if (!opts.repair) {
      warnings.push('AGENTS.md has duplicated SDD markers: manual review required (not modified).');
      return { status: 'skipped-duplicate', warnings };
    }
    if (opts.dryRun) return { status: 'repaired-duplicate', warnings };
    if (!opts.confirmFn('AGENTS.md has duplicated SDD markers. Rebuild a single managed block? (backup created)')) {
      return { status: 'kept', warnings };
    }
    backupAgentsMd(target);
    const firstBegin = content.indexOf(AGENTS_MARKER_BEGIN);
    const lastEnd = content.lastIndexOf(AGENTS_MARKER_END) + AGENTS_MARKER_END.length;
    const before = content.slice(0, firstBegin);
    const after = content.slice(lastEnd);
    writeFileSync(destFile, `${before}${managedBlock(templateContent)}${after}`);
    return { status: 'repaired-duplicate', warnings };
  }

  if (beginCount === 1 || endCount === 1) {
    if (!opts.repair) {
      warnings.push('AGENTS.md has an incomplete SDD block (missing BEGIN or END): manual review required (not modified).');
      return { status: 'skipped-incomplete', warnings };
    }
    if (opts.dryRun) return { status: 'repaired-incomplete', warnings };
    if (!opts.confirmFn('AGENTS.md has an incomplete SDD block. Rebuild a complete managed block? (backup created)')) {
      return { status: 'kept', warnings };
    }
    backupAgentsMd(target);
    const tplBlock = managedBlock(templateContent);
    if (beginCount === 1) {
      const before = content.slice(0, content.indexOf(AGENTS_MARKER_BEGIN));
      writeFileSync(destFile, `${before}${tplBlock}\n`);
    } else {
      const after = content.slice(content.indexOf(AGENTS_MARKER_END) + AGENTS_MARKER_END.length);
      writeFileSync(destFile, `${tplBlock}${after}`);
    }
    return { status: 'repaired-incomplete', warnings };
  }

  if (content.includes(AGENTS_SENTINEL)) {
    if (!opts.repair) {
      warnings.push('AGENTS.md contains SDD rules without markers (legacy install): the block cannot be refreshed automatically.');
      return { status: 'skipped-sentinel', warnings };
    }
    if (opts.dryRun) return { status: 'repaired-legacy', warnings };
    if (!opts.confirmFn('AGENTS.md has legacy SDD rules without markers. Wrap them in managed markers? (backup created)')) {
      return { status: 'kept', warnings };
    }
    backupAgentsMd(target);
    const body = content.replace(/\n*$/, '');
    writeFileSync(destFile, `${AGENTS_MARKER_BEGIN}\n${body}\n${AGENTS_MARKER_END}\n`);
    return { status: 'repaired-legacy', warnings };
  }

  if (!opts.dryRun) {
    writeFileSync(destFile, `${content.replace(/\n*$/, '\n')}${managedBlock(templateContent)}\n`);
  }
  return { status: 'appended', warnings };
}
