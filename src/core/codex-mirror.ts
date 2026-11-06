import { existsSync, readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, sep } from 'node:path';

/** Canonical source of the mirror: the shared Agent Skills directory. */
export const CODEX_SOURCE_DIR = '.agents/skills';
/** Target of the mirror: the directory Codex CLI reads in project mode. */
export const CODEX_MIRROR_DIR = '.codex/skills';

/**
 * Whether a project path belongs to the codex mirror.
 *
 * The mirror is managed outside the template payload, so the update flow
 * needs to recognize its paths to keep them out of the retired list.
 */
export function isCodexMirrorPath(rel: string): boolean {
  return rel === CODEX_MIRROR_DIR || rel.startsWith(`${CODEX_MIRROR_DIR}/`);
}

export type MirrorStatus = 'created' | 'updated' | 'unchanged' | 'conflict' | 'failed';

export interface MirrorFile {
  /** Path relative to the project root. */
  rel: string;
  status: MirrorStatus;
}

export interface MirrorResult {
  /** One entry per mirrored file. */
  files: MirrorFile[];
  /** Every path of the mirror: the managed paths of the manifest. */
  paths: string[];
  created: string[];
  updated: string[];
  unchanged: string[];
  conflicts: string[];
  failed: string[];
  /**
   * Whether the mirror is not in sync with the source: it has pending writes
   * (created/updated) or unresolved conflicts (hand-edited files the policy
   * preserved). A conflict alone must still surface as out of sync.
   */
  needsWrite: boolean;
}

export interface MirrorOptions {
  /** Project root (the destination of the installation). */
  target: string;
  /** Asked before a hand-edited mirror file is replaced. */
  confirmFn?: (question: string) => boolean;
  /**
   * What to do with a hand-edited mirror file: `ask` uses `confirmFn` (the
   * update flow's auto-confirm replaces it with a backup under `--yes`),
   * `keep` preserves it for callers that must never overwrite.
   */
  conflictPolicy?: 'ask' | 'keep';
  /**
   * Hashes recorded in the manifest. They tell an outdated mirror (the source
   * changed) from a hand-edited one (the user changed the mirror).
   */
  knownHashes?: Map<string, string>;
  /** Directory (relative to the target) where the replaced files are backed up. */
  backupRoot?: string;
  /** Read-only mode: the result is computed but nothing is written. */
  dryRun?: boolean;
}

function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Every file of a directory tree, recursively.
 *
 * Symlinks are dereferenced (their target is copied), never preserved: the
 * source tree is project-owned and platform portability wins over link fidelity.
 */
function walkFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else found.push(abs);
    }
  };
  walk(root);
  return found;
}

function defaultBackupRoot(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `.sdd-backup-${stamp}-${process.pid}`;
}

/**
 * Mirrors the shared skills into the directory Codex CLI reads.
 *
 * The mirror is a **copy**, never a symlink: Codex project mode must work on
 * Windows and on filesystems without symlink support. Only the skills (the
 * directories with a `SKILL.md`) are mirrored, and every file of the skill
 * tree travels with it.
 *
 * A file that differs from its source is replaced when the manifest proves it
 * was not touched by the user (an outdated mirror); otherwise it is a conflict
 * and the policy decides: `ask` asks for a confirmation, `keep` preserves it.
 */
export function mirrorCodexSkills(opts: MirrorOptions): MirrorResult {
  const target = opts.target;
  const sourceRoot = join(target, CODEX_SOURCE_DIR);
  const result: MirrorResult = {
    files: [],
    paths: [],
    created: [],
    updated: [],
    unchanged: [],
    conflicts: [],
    failed: [],
    needsWrite: false
  };
  if (!existsSync(sourceRoot)) return result;

  const policy = opts.conflictPolicy ?? 'ask';
  const backupRoot = opts.backupRoot ?? defaultBackupRoot();

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(sourceRoot, entry.name);
    // Only the skills travel to the mirror: a directory without a SKILL.md
    // is not a skill of the open standard.
    if (!existsSync(join(skillDir, 'SKILL.md'))) continue;

    for (const file of walkFiles(skillDir)) {
      const inner = relative(skillDir, file).split(sep).join('/');
      const rel = `${CODEX_MIRROR_DIR}/${entry.name}/${inner}`;
      const dest = join(target, rel);
      result.paths.push(rel);

      if (!existsSync(dest)) {
        if (!opts.dryRun) {
          try {
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(file, dest);
          } catch {
            result.files.push({ rel, status: 'failed' });
            result.failed.push(rel);
            continue;
          }
        }
        result.files.push({ rel, status: 'created' });
        result.created.push(rel);
        continue;
      }

      const source = readFileSync(file);
      const current = readFileSync(dest);
      if (source.equals(current)) {
        result.files.push({ rel, status: 'unchanged' });
        result.unchanged.push(rel);
        continue;
      }

      const known = opts.knownHashes?.get(rel);
      const outdated = known !== undefined && sha256(current) === known;
      if (!outdated) {
        // The mirror was edited by the user (or it is unknown to the
        // manifest): it is a conflict, never a silent overwrite.
        const replace =
          policy === 'ask' &&
          opts.confirmFn !== undefined &&
          opts.confirmFn(`Replace ${rel}? (the mirror was edited by hand)`);
        if (!replace || opts.dryRun) {
          result.files.push({ rel, status: 'conflict' });
          result.conflicts.push(rel);
          continue;
        }
      }

      if (!opts.dryRun) {
        try {
          const backup = join(target, backupRoot, rel);
          mkdirSync(dirname(backup), { recursive: true });
          copyFileSync(dest, backup);
          copyFileSync(file, dest);
        } catch {
          result.files.push({ rel, status: 'failed' });
          result.failed.push(rel);
          continue;
        }
      }
      result.files.push({ rel, status: 'updated' });
      result.updated.push(rel);
    }
  }

  result.needsWrite =
    result.created.length > 0 || result.updated.length > 0 || result.conflicts.length > 0;
  return result;
}
