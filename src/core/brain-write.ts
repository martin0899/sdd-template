import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSafeSegment } from './change-id';
import type { ChangeJson } from './change-json';

/**
 * Portable brain summary of a change.
 *
 * The file is written directly into the wiki of the vault (`05_wiki/<wiki>/`),
 * with the format established by the wiki of the harness: frontmatter with
 * the id, the tags, the state and the closure date, and the canonical
 * sections of a change summary.
 */
export interface BrainWriteOptions {
  /** Root of the vault. */
  vaultRoot: string;
  /** Id of the change: the name of the file. */
  changeId: string;
  /** Wiki folder of the summary (default: `Spectralis`). */
  wikiProject?: string;
  /** Metadata of the change (tolerated when absent). */
  change?: ChangeJson | null;
  /** Content of `proposal.md` (its "Why" section feeds the summary). */
  proposal?: string;
  /** Content of `design.md` (its "Decisions" section feeds the summary). */
  design?: string;
  /** Content of `tasks.md` (its tasks feed the verification section). */
  tasks?: string;
  /** Commits of the change. */
  commits?: string[];
  /** Closure date (`YYYY-MM-DD`). */
  fecha?: string;
  /** Project the change belongs to (frontmatter). */
  proyecto?: string;
  /** Overwrite an existing summary (default: the summary is never overwritten). */
  force?: boolean;
}

export interface BrainWriteResult {
  /** Absolute path of the file written (of the existing file when it is skipped). */
  path: string;
  /** Whether the file was written. */
  written: boolean;
  /** Whether the write was skipped because the summary already existed. */
  skipped?: boolean;
}

/** Sections of the summary, in order. */
export const WIKI_SECTIONS = [
  'Qué cambió',
  'Por qué',
  'Decisiones',
  'Verificación',
  'Estado y riesgos vivos',
  'Commits',
  'Enlaces'
] as const;

/** Default wiki folder of the summaries. */
export const DEFAULT_WIKI_PROJECT = 'Spectralis';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Content of the first section of a document that matches one of the headings. */
export function extractSection(content: string, headings: string[]): string {
  if (!content) return '';
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^#{2,3}\s+(.+)$/);
    if (!heading) continue;
    const title = heading[1].trim().toLowerCase();
    if (headings.some((candidate) => title === candidate.toLowerCase())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return '';
  const section: string[] = [];
  for (let i = start; i < lines.length; i++) {
    if (/^#{1,3}\s/.test(lines[i])) break;
    section.push(lines[i]);
  }
  return section.join('\n').trim();
}

/** Tasks of a `tasks.md` document: total and completed. */
export function countTasks(content: string): { total: number; done: number } {
  const matches = content.match(/^\s*-\s+\[([ xX])\]/gm) ?? [];
  const done = (content.match(/^\s*-\s+\[[xX]\]/gm) ?? []).length;
  return { total: matches.length, done };
}

function abstractOf(change: ChangeJson | null | undefined, changeId: string): string {
  const abstract = change?.resumen?.abstracto?.trim();
  if (abstract) return abstract;
  return `El change ${changeId} se completa y queda archivado.`;
}

function whyOf(proposal: string | undefined, changeId: string): string {
  const section = extractSection(proposal ?? '', ['Why', 'Por qué']);
  if (section) return section;
  return `Los artefactos del change ${changeId} pasan al layout nativo y al archivo de la wiki.`;
}

function decisionsOf(design: string | undefined): string {
  const section = extractSection(design ?? '', ['Decisions', 'Decisiones']);
  if (section) return section;
  return 'Sin decisiones registradas en `design.md`.';
}

function verificationOf(tasks: string | undefined, changeId: string): string {
  const content = tasks ?? '';
  const { total, done } = countTasks(content);
  const section = extractSection(content, ['Verificación', 'Verificacion']);
  const lines: string[] = [];
  if (total > 0) lines.push(`- Tareas completadas: ${done}/${total}.`);
  else lines.push('- El change no declara tareas en `tasks.md`.');
  if (section) lines.push('', section);
  lines.push(`- Archivado con \`spectralis spec archive ${changeId}\`.`);
  return lines.join('\n');
}

function stateOf(changeId: string, fecha: string, wikiProject: string): string {
  return [
    `- **Completado** el ${fecha}. Change movido a \`spec/_archived/${changeId}/\` y fila completada en el REGISTRY.`,
    `- Resumen publicado en la wiki (\`05_wiki/${wikiProject}/${changeId}.md\`).`
  ].join('\n');
}

function commitsOf(commits: string[]): string {
  if (commits.length === 0) return 'Sin commits registrados.';
  const rows = commits.map((commit) => `| \`${commit}\` | |`).join('\n');
  return ['| Commit | Alcance |', '| :--- | :--- |', rows].join('\n');
}

function linksOf(changeId: string, wikiProject: string): string {
  return [
    `- Change archivado: \`spec/_archived/${changeId}/\``,
    `- Resumen en la wiki: [[05_wiki/${wikiProject}/${changeId}|${changeId}]]`
  ].join('\n');
}

/**
 * Writes the portable summary of a change into the wiki of the vault.
 *
 * It never throws for a missing vault: the caller decides what to do when
 * the brain cannot be written. It does throw when the id or the wiki folder
 * would escape the folder that holds them.
 */
export function brainWrite(opts: BrainWriteOptions): BrainWriteResult {
  const wikiProject = opts.wikiProject && opts.wikiProject.trim() !== ''
    ? opts.wikiProject
    : DEFAULT_WIKI_PROJECT;
  const changeId = opts.changeId;
  if (!isSafeSegment(changeId)) {
    throw new Error(`invalid change id for the brain summary: "${changeId}"`);
  }
  if (!isSafeSegment(wikiProject)) {
    throw new Error(`invalid wiki folder for the brain summary: "${wikiProject}"`);
  }
  const fecha = opts.fecha ?? today();
  const commits = opts.commits ?? [];
  const change = opts.change ?? null;

  const dir = join(opts.vaultRoot, '05_wiki', wikiProject);
  const path = join(dir, `${changeId}.md`);
  // FAIL-safe: an existing summary is never overwritten silently. The caller
  // reports the existing file and decides what to do about it.
  if (existsSync(path) && !opts.force) {
    return { path, written: false, skipped: true };
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const title = change?.nombre?.trim() ? `${changeId} — ${change.nombre.trim()}` : changeId;
  const abstract = abstractOf(change, changeId);

  const frontmatter = [
    '---',
    `id: wiki-${changeId}`,
    'tags: [wiki, spectralis]',
    `proyecto: ${opts.proyecto ?? 'Spectralis'}`,
    `change: ${changeId}`,
    'estado: completado',
    `fecha_cierre: ${fecha}`,
    `commits: [${commits.join(', ')}]`,
    '---'
  ].join('\n');

  const body = [
    '',
    `# ${title}`,
    '',
    '> [!abstract] En una línea',
    `> ${abstract}`,
    '',
    '## Qué cambió',
    '',
    abstract,
    '',
    '## Por qué',
    '',
    whyOf(opts.proposal, changeId),
    '',
    '## Decisiones',
    '',
    decisionsOf(opts.design),
    '',
    '## Verificación',
    '',
    verificationOf(opts.tasks, changeId),
    '',
    '## Estado y riesgos vivos',
    '',
    stateOf(changeId, fecha, wikiProject),
    '',
    '## Commits',
    '',
    commitsOf(commits),
    '',
    '## Enlaces',
    '',
    linksOf(changeId, wikiProject),
    ''
  ].join('\n');

  writeFileSync(path, `${frontmatter}\n${body}`, 'utf8');
  return { path, written: true };
}
