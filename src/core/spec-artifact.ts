import { existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

/**
 * Shared notion of "spec artifact" in the brain.
 *
 * A spec folder `01_Proyectos/<Proyecto>/<spec-id>/` is satisfied by exactly
 * one of two layouts:
 * - **folder note**: `<spec-id>/<spec-id>.md` (filename == parent folder),
 *   the consolidated single artifact (Tipo: Especificación).
 * - **legacy**: the three files `briefing.md`, `tests.md`, `resumen.md`.
 *
 * Identity is structural (path-based, cost-free), never content-based, so the
 * ID-scan cache stays intact.
 */
export type SpecArtifactKind = 'spec' | 'legacy' | 'note' | 'organization';

export const LEGACY_SPEC_FILES = ['briefing.md', 'tests.md', 'resumen.md'] as const;

/** Classify a vault-relative `.md` path by its shape. */
export function classifyArtifact(relPath: string): SpecArtifactKind {
  const base = basename(relPath);
  if (base.startsWith('_')) return 'organization';
  if ((LEGACY_SPEC_FILES as readonly string[]).includes(base)) return 'legacy';
  if (relPath.includes('.sdd-registry/briefings/')) return 'legacy';
  const parent = basename(dirname(relPath));
  const name = base.replace(/\.md$/, '');
  // Folder note: file name equals its parent folder, only inside 01_Proyectos/.
  if (relPath.includes('01_Proyectos/') && parent === name) return 'spec';
  return 'note';
}

/** Generated/derived artifact (exempt from note-level checks). */
export function isGeneratedArtifact(relPath: string): boolean {
  return classifyArtifact(relPath) !== 'note';
}

/** A spec folder satisfies its artifact contract (folder note OR legacy trio). */
export function hasSpecArtifact(specDir: string, specId: string): boolean {
  if (existsSync(join(specDir, `${specId}.md`))) return true;
  return (LEGACY_SPEC_FILES as readonly string[]).every((file) => existsSync(join(specDir, file)));
}