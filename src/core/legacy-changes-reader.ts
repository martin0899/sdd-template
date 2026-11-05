import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reader of the legacy layout of the changes (`openspec/changes/`).
 *
 * The native layout of the harness is `spec/<id>/`; the legacy one is read
 * explicitly (never through `resolveChangesDir`) so the migration can move the
 * changes of a project that has not been migrated yet.
 */
export interface LegacyChange {
  /** Id of the change: the name of its folder, without the archive date prefix. */
  id: string;
  /** Absolute path of the folder of the change. */
  dir: string;
  /** True when the change lives in the archive: it is already closed. */
  archived: boolean;
}

/** Directory (relative to the project root) that holds the legacy changes. */
export const LEGACY_CHANGES_REL = join('openspec', 'changes');

/** Strips the `YYYY-MM-DD-` prefix of an archived change folder. */
export function stripArchiveDatePrefix(name: string): string {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/**
 * Every change of the legacy layout.
 *
 * The active ones come first (sorted by id) and the archived ones after:
 * they are reported, never migrated.
 */
export function readLegacyChanges(projectRoot: string): LegacyChange[] {
  const changesDir = join(projectRoot, LEGACY_CHANGES_REL);
  if (!existsSync(changesDir)) return [];

  const active: LegacyChange[] = [];
  const archived: LegacyChange[] = [];

  for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'archive') continue;
    active.push({ id: entry.name, dir: join(changesDir, entry.name), archived: false });
  }

  const archiveDir = join(changesDir, 'archive');
  if (existsSync(archiveDir)) {
    for (const entry of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      archived.push({
        id: stripArchiveDatePrefix(entry.name),
        dir: join(archiveDir, entry.name),
        archived: true
      });
    }
  }

  const byId = (a: LegacyChange, b: LegacyChange): number => a.id.localeCompare(b.id);
  return [...active.sort(byId), ...archived.sort(byId)];
}
