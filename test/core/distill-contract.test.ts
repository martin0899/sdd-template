import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(process.cwd(), 'test/fixtures/distill-contract');

interface Frontmatter {
  id?: string;
  tags?: string[];
  [key: string]: unknown;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatter: Frontmatter = {};
  const fmLines = match[1].split('\n');
  for (const line of fmLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key === 'tags') {
        frontmatter[key] = value.replace(/^\[|\]$/g, '').split(',').map(t => t.trim());
      } else {
        frontmatter[key] = value;
      }
    }
  }
  return { frontmatter, body: match[2] };
}

function validateArquitectura(content: string): { valid: boolean; error?: string } {
  const { frontmatter, body } = parseFrontmatter(content);
  
  if (frontmatter.id !== 'arquitectura') {
    return { valid: false, error: 'ID debe ser "arquitectura"' };
  }
  if (!frontmatter.tags?.includes('arquitectura')) {
    return { valid: false, error: 'Debe tener tag "arquitectura"' };
  }
  if (!body.includes('# Arquitectura')) {
    return { valid: false, error: 'Debe tener header # Arquitectura' };
  }
  if (!body.includes('## Estado actual')) {
    return { valid: false, error: 'Debe tener sección ## Estado actual' };
  }
  if (!body.includes('## Componentes')) {
    return { valid: false, error: 'Debe tener sección ## Componentes' };
  }
  if (!body.includes('## Stack')) {
    return { valid: false, error: 'Debe tener sección ## Stack' };
  }
  
  return { valid: true };
}

function validateDecisiones(content: string): { valid: boolean; error?: string } {
  const { frontmatter, body } = parseFrontmatter(content);
  
  if (frontmatter.id !== 'decisiones') {
    return { valid: false, error: 'ID debe ser "decisiones"' };
  }
  if (!frontmatter.tags?.includes('decision')) {
    return { valid: false, error: 'Debe tener tag "decision"' };
  }
  if (!body.includes('# Decisiones')) {
    return { valid: false, error: 'Debe tener header # Decisiones' };
  }
  
  // Debe tener al menos una sección ### con spec-id
  if (!body.match(/^###\s+\w+/m)) {
    return { valid: false, error: 'Debe tener al menos una sección ### <spec-id>' };
  }
  // Cada sección debe tener "Fuente:" y "Estado:"
  if (!body.includes('Fuente:')) {
    return { valid: false, error: 'Cada decisión debe tener "Fuente:"' };
  }
  if (!body.includes('Estado:')) {
    return { valid: false, error: 'Cada decisión debe tener "Estado:"' };
  }
  
  return { valid: true };
}

function validateOperacion(content: string): { valid: boolean; error?: string } {
  const { frontmatter, body } = parseFrontmatter(content);
  
  if (frontmatter.id !== 'operacion') {
    return { valid: false, error: 'ID debe ser "operacion"' };
  }
  if (!frontmatter.tags?.includes('operacion')) {
    return { valid: false, error: 'Debe tener tag "operacion"' };
  }
  if (!body.includes('# Operación')) {
    return { valid: false, error: 'Debe tener header # Operación' };
  }
  if (!body.includes('## Errores conocidos')) {
    return { valid: false, error: 'Debe tener sección ## Errores conocidos' };
  }
  if (!body.includes('## Restricciones')) {
    return { valid: false, error: 'Debe tener sección ## Restricciones' };
  }
  
  return { valid: true };
}

function validateHistorial(content: string): { valid: boolean; error?: string } {
  const { frontmatter, body } = parseFrontmatter(content);
  
  if (frontmatter.id !== 'historial') {
    return { valid: false, error: 'ID debe ser "historial"' };
  }
  if (!frontmatter.tags?.includes('historial')) {
    return { valid: false, error: 'Debe tener tag "historial"' };
  }
  if (!body.includes('# Historial')) {
    return { valid: false, error: 'Debe tener header # Historial' };
  }
  
  // Debe tener al menos una sección ## YYYY-MM
  if (!body.match(/^##\s+\d{4}-\d{2}/m)) {
    return { valid: false, error: 'Debe tener al menos una sección ## YYYY-MM' };
  }
  
  return { valid: true };
}

function validateIndexJson(content: string): { valid: boolean; error?: string } {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(content);
  } catch {
    return { valid: false, error: 'JSON inválido' };
  }
  
  const project = json['Spectralis'] as Record<string, unknown> | undefined;
  if (!project) {
    return { valid: false, error: 'Debe tener clave "Spectralis"' };
  }
  if (typeof project.id !== 'string') {
    return { valid: false, error: '"id" debe ser string' };
  }
  if (typeof project.name !== 'string') {
    return { valid: false, error: '"name" debe ser string' };
  }
  if (typeof project.path !== 'string') {
    return { valid: false, error: '"path" debe ser string' };
  }
  if (!Array.isArray(project.content)) {
    return { valid: false, error: '"content" debe ser array' };
  }
  const expected = ['arquitectura', 'decisiones', 'operacion', 'historial'];
  for (const c of project.content as unknown[]) {
    if (!expected.includes(c as string)) {
      return { valid: false, error: `Contenido inválido: ${c}` };
    }
  }
  if (!Array.isArray(project.stack)) {
    return { valid: false, error: '"stack" debe ser array' };
  }
  if (typeof project.updated !== 'string') {
    return { valid: false, error: '"updated" debe ser string' };
  }
  
  return { valid: true };
}

test('arquitectura.md cumple el esquema R-02', () => {
  const content = readFileSync(join(FIXTURE_DIR, 'arquitectura.md'), 'utf-8');
  const result = validateArquitectura(content);
  assert.equal(result.valid, true, result.error);
});

test('decisiones.md cumple el esquema R-03', () => {
  const content = readFileSync(join(FIXTURE_DIR, 'decisiones.md'), 'utf-8');
  const result = validateDecisiones(content);
  assert.equal(result.valid, true, result.error);
});

test('operacion.md cumple el esquema R-04', () => {
  const content = readFileSync(join(FIXTURE_DIR, 'operacion.md'), 'utf-8');
  const result = validateOperacion(content);
  assert.equal(result.valid, true, result.error);
});

test('historial.md cumple el esquema R-05', () => {
  const content = readFileSync(join(FIXTURE_DIR, 'historial.md'), 'utf-8');
  const result = validateHistorial(content);
  assert.equal(result.valid, true, result.error);
});

test('_INDEX.json cumple el esquema R-06', () => {
  const content = readFileSync(join(FIXTURE_DIR, 'index.json'), 'utf-8');
  const result = validateIndexJson(content);
  assert.equal(result.valid, true, result.error);
});
