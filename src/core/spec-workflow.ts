import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateProjectId } from './project-id';
import { hasSpecArtifact, LEGACY_SPEC_FILES } from './spec-artifact';

/**
 * Brain spec artifact: a single **folder note** `01_Proyectos/<Proyecto>/<spec-id>/<spec-id>.md`
 * with frontmatter `id: spec-<id>`, `Tipo: Especificación` and canonical
 * headings that the distiller already recognizes. The legacy layout
 * (briefing.md/tests.md/resumen.md) is still accepted wherever the artifact
 * contract is satisfied.
 */
export const CANONICAL_HEADINGS = [
  'Contexto',
  'Decisiones técnicas',
  'Impacto',
  'Lecciones aprendidas',
  'Cambios realizados',
  'Tests de regresión'
] as const;

const SECTION_TEMPLATE = CANONICAL_HEADINGS.map((h) => `## ${h}\n_Pendiente_\n`).join('\n');

function folderNoteTemplate(specId: string, projectId: string): string {
  return `---
id: spec-${specId}
Tipo: Especificación
Proyecto: ${projectId}
Fecha: ${new Date().toISOString().slice(0, 10)}
tags: [especificacion]
---

# ${specId}

${SECTION_TEMPLATE}`;
}

export interface SpecValidationResult {
  valid: boolean;
  emptyFiles: string[];
}

export interface SpecFolderResult {
  folderNotePath: string;
  specDir: string;
}

/** Create the brain spec folder with a single folder note. */
export function createSpecFolder(vaultRoot: string, project: string, specId: string): SpecFolderResult {
  const specDir = join(vaultRoot, '01_Proyectos', project, specId);
  if (existsSync(specDir)) {
    throw new Error(`Spec folder already exists: ${specDir}`);
  }
  const projectId = generateProjectId(project);
  mkdirSync(specDir, { recursive: true });
  const folderNotePath = join(specDir, `${specId}.md`);
  writeFileSync(folderNotePath, folderNoteTemplate(specId, projectId), 'utf8');
  return { folderNotePath, specDir };
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\s*/, '');
}

function meaningfulLength(text: string): number {
  return text.replace(/_Pendiente_/g, '').replace(/#+\s*.*/g, '').trim().length;
}

/** Content of a canonical section (`## Heading` until the next heading). */
export function sectionContent(content: string, heading: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  const section: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#+\s/.test(lines[i])) break;
    section.push(lines[i]);
  }
  return section.join('\n');
}

export function validateSpecComplete(
  vaultRoot: string,
  project: string,
  specId: string
): SpecValidationResult {
  const specDir = join(vaultRoot, '01_Proyectos', project, specId);
  const folderNote = join(specDir, `${specId}.md`);
  const emptyFiles: string[] = [];

  if (!hasSpecArtifact(specDir, specId)) {
    emptyFiles.push(`${specId}.md`);
    return { valid: false, emptyFiles };
  }

  if (existsSync(folderNote)) {
    // Folder note: every canonical section must have real content.
    const content = stripFrontmatter(readFileSync(folderNote, 'utf8'));
    const missing = CANONICAL_HEADINGS.filter((heading) => meaningfulLength(sectionContent(content, heading)) < 1);
    if (missing.length > 0) emptyFiles.push(`${specId}.md`);
  } else {
    // Legacy: each of the three files non-empty beyond placeholders.
    for (const file of LEGACY_SPEC_FILES) {
      const path = join(specDir, file);
      if (!existsSync(path)) {
        emptyFiles.push(file);
        continue;
      }
      if (meaningfulLength(stripFrontmatter(readFileSync(path, 'utf8'))) < 10) {
        emptyFiles.push(file);
      }
    }
  }
  return { valid: emptyFiles.length === 0, emptyFiles };
}

export function registerSpec(projectRoot: string, specId: string, project: string): void {
  const registryPath = join(projectRoot, '.sdd-registry', 'REGISTRY.md');
  const dir = join(projectRoot, '.sdd-registry');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let content = existsSync(registryPath)
    ? readFileSync(registryPath, 'utf8')
    : `# Requirements Registry\n\n| nota (ruta) | requerimiento | briefing | changes generados | estado |\n|-------------|---------------|----------|-------------------|--------|\n`;
  const row = `| ${project}/${specId} | ${specId} | ${project}/${specId}/${specId}.md | ${specId} | completada |\n`;
  if (!content.includes(specId)) {
    content += row;
    writeFileSync(registryPath, content, 'utf8');
  }
}