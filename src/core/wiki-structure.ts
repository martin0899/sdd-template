import { join } from 'node:path';

/**
 * Single source of truth for the `05_wiki/<project>/` structure.
 *
 * This contract used to be spelled out by hand in five modules, with no cross
 * check between them. When `distill` migrated from one file per spec-id to the
 * four-aggregate scheme, `seed` and the two checks were left behind and kept
 * reporting with confidence against a layout that no longer existed. Nothing
 * caught it: the fixtures reproduced the old shape too.
 *
 * Every producer and consumer derives the structure from here. If the scheme
 * changes, it changes in this file, and the tests fail wherever a consumer
 * disagrees.
 */

/** Aggregate identifiers, in canonical order. Used as `_INDEX.json` categories. */
export const AGGREGATE_IDS = ['arquitectura', 'decisiones', 'operacion', 'historial'] as const;

/** Aggregate file names, in the same order as {@link AGGREGATE_IDS}. */
export const AGGREGATE_FILES = AGGREGATE_IDS.map((id) => `${id}.md`);

/** The `content` field written into `_INDEX.json` for every project. */
export function indexContent(): string[] {
  return [...AGGREGATE_IDS];
}

/**
 * Anchor of a distilled decision block: `### <spec-id>`.
 *
 * `generateDecisiones` emits one of these per decision, so the heading is the
 * key consumers correlate on. Anchored with ^/$ in multiline mode so a
 * spec-id merely *mentioned* in a block body is not mistaken for a decision.
 */
export const DECISION_BLOCK_RE = /^###\s+(\S.*?)\s*$/;

/** Extracts the spec-ids of every decision block in a `decisiones.md` document. */
export function extractSpecIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  for (const line of markdown.split('\n')) {
    const heading = line.match(DECISION_BLOCK_RE);
    if (heading) ids.add(heading[1]);
  }
  return ids;
}

/** Absolute path of the decisions aggregate for a project inside a vault. */
export function decisionesPath(vaultRoot: string, projectName: string): string {
  return join(vaultRoot, '05_wiki', projectName, 'decisiones.md');
}

/** Absolute path of the wiki project directory. */
export function wikiProjectPath(vaultRoot: string, projectName: string): string {
  return join(vaultRoot, '05_wiki', projectName);
}

/** File name of a given aggregate id, e.g. `aggregateFile('decisiones')` → `decisiones.md`. */
export function aggregateFile(id: string): string {
  return `${id}.md`;
}
