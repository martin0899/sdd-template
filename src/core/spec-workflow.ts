import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateProjectId } from './project-id';

export interface SpecValidationResult {
  valid: boolean;
  emptyFiles: string[];
}

const FILE_TEMPLATES: Record<string, (specId: string, projectId: string) => string> = {
  'briefing.md': (id, projectId) => `---
id: brief-${id}
Tipo: Briefing
Proyecto: ${projectId}
Fecha: ${new Date().toISOString().slice(0, 10)}
tags: [briefing]
---

# Briefing: ${id}

## Contexto
_Pendiente_

## Decisiones técnicas
_Pendiente_

## Impacto
_Pendiente_
`,
  'tests.md': (id, projectId) => `---
id: test-${id}
Tipo: Tests
Proyecto: ${projectId}
Fecha: ${new Date().toISOString().slice(0, 10)}
tags: [tests]
---

# Tests: ${id}

## Tests de regresión
_Pendiente_

## Cobertura
_Pendiente_
`,
  'resumen.md': (id, projectId) => `---
id: res-${id}
Tipo: Resumen
Proyecto: ${projectId}
Fecha: ${new Date().toISOString().slice(0, 10)}
tags: [resumen]
---

# Resumen: ${id}

## Qué se hizo
_Pendiente_

## Cambios realizados
_Pendiente_

## Lecciones aprendidas
_Pendiente_
`
};

export function createSpecFolder(vaultRoot: string, project: string, specId: string): string {
  const specDir = join(vaultRoot, '01_Proyectos', project, specId);
  if (existsSync(specDir)) {
    throw new Error(`Spec folder already exists: ${specDir}`);
  }
  const projectId = generateProjectId(project);
  mkdirSync(specDir, { recursive: true });
  for (const [name, template] of Object.entries(FILE_TEMPLATES)) {
    writeFileSync(join(specDir, name), template(specId, projectId), 'utf8');
  }
  return specDir;
}

export function validateSpecComplete(vaultRoot: string, project: string, specId: string): SpecValidationResult {
  const specDir = join(vaultRoot, '01_Proyectos', project, specId);
  const emptyFiles: string[] = [];
  for (const name of Object.keys(FILE_TEMPLATES)) {
    const path = join(specDir, name);
    if (!existsSync(path)) {
      emptyFiles.push(name);
      continue;
    }
    const raw = readFileSync(path, 'utf8');
    const content = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
    const withoutPlaceholders = content.replace(/_Pendiente_/g, '').replace(/#+\s*.*/g, '').trim();
    if (withoutPlaceholders.length < 10) {
      emptyFiles.push(name);
    }
  }
  return { valid: emptyFiles.length === 0, emptyFiles };
}

export function registerSpec(projectRoot: string, specId: string, project: string): void {
  const registryPath = join(projectRoot, 'docs', 'requirements', 'REGISTRY.md');
  const dir = join(projectRoot, 'docs', 'requirements');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let content = existsSync(registryPath) ? readFileSync(registryPath, 'utf8') : `# Requirements Registry\n\n| nota (ruta) | requerimiento | briefing | changes generados | estado |\n|-------------|---------------|----------|-------------------|--------|\n`;
  const row = `| ${project}/${specId} | ${specId} | ${project}/${specId}/briefing.md | ${specId} | completada |\n`;
  if (!content.includes(specId)) {
    content += row;
    writeFileSync(registryPath, content, 'utf8');
  }
}
