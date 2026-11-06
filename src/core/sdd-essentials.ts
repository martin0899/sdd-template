import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveChangesDir } from './resolve-changes-dir';

/**
 * Essential SDD artifacts a change must hold.
 *
 * The list is the contract of the native workflow: a change that misses one of
 * them is not ready to be implemented.
 */
export const SDD_ESSENTIALS = ['proposal.md', 'design.md', 'tasks.md'] as const;

/**
 * Essential SDD artifacts that are missing for a change.
 *
 * The changes are read from a single directory: the one it receives, or the
 * one `resolveChangesDir` resolves for the project. The legacy layout is never
 * inspected — migrating a project is the job of `spectralis spec migrate`.
 */
export function missingSddEssentials(
  projectRoot: string,
  changeId?: string,
  changesDir?: string
): string[] {
  if (!changeId) return ['changeId'];
  const dir = changesDir ?? resolveChangesDir({ projectRoot });
  const missing: string[] = [];
  for (const name of SDD_ESSENTIALS) {
    if (!existsSync(join(dir, changeId, name))) missing.push(name);
  }
  return missing;
}
