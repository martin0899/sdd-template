import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyByHeaders, classifyByKeywords, classifyByFrontmatter, deterministicExtract, deterministicClassification, hybridExtract, SourceFile } from '../../src/core/distill';

test('classifyByHeaders detects Decisiones', () => {
  const content = '## Decisiones\nSome text';
  assert.equal(classifyByHeaders(content), 'ADR');
});

test('classifyByHeaders detects Bug', () => {
  const content = '## Bug\nSome bug description';
  assert.equal(classifyByHeaders(content), 'post-mortem');
});

test('classifyByHeaders detects Errores', () => {
  const content = '## Errores\nSome error log';
  assert.equal(classifyByHeaders(content), 'log');
});

test('classifyByHeaders returns null for no matching header', () => {
  const content = '## Other\nSome text';
  assert.equal(classifyByHeaders(content), null);
});

test('classifyByKeywords detects causa raíz', () => {
  const content = 'La causa raíz del problema es...';
  assert.equal(classifyByKeywords(content), 'post-mortem');
});

test('classifyByKeywords detects alternativas descartadas', () => {
  const content = 'Alternativas descartadas: opción A, opción B';
  assert.equal(classifyByKeywords(content), 'ADR');
});

test('classifyByKeywords detects lección aprendida', () => {
  const content = 'Lección aprendida: siempre verificar...';
  assert.equal(classifyByKeywords(content), 'log');
});

test('classifyByKeywords returns null for no matching keyword', () => {
  const content = 'No hay keywords aquí';
  assert.equal(classifyByKeywords(content), null);
});

test('classifyByFrontmatter classifies by Tipo (mayúscula, como lo produce el vault)', () => {
  const fm = { Tipo: 'adr' };
  assert.equal(classifyByFrontmatter(fm), 'ADR');
  const fm2 = { Tipo: 'bug' };
  assert.equal(classifyByFrontmatter(fm2), 'post-mortem');
  const fm3 = { Tipo: 'log' };
  assert.equal(classifyByFrontmatter(fm3), 'log');
});

test('Tipo "Especificación" → null (decisión deliberada D1: no mapea a ninguna clase, no es un forgot)', () => {
  assert.equal(classifyByFrontmatter({ Tipo: 'Especificación' }), null);
});

test('Tipo fuera de la whitelist (Briefing) → null sin alterar la cascada', () => {
  assert.equal(classifyByFrontmatter({ Tipo: 'Briefing' }), null);
  // Leer Tipo no rompe el fallback por status ni el resto de la cascada.
  assert.equal(classifyByFrontmatter({ Tipo: 'Briefing', status: 'aprobada' }), 'ADR');
});

test('classifyByFrontmatter classifies by status', () => {
  const fm = { status: 'aprobada' };
  assert.equal(classifyByFrontmatter(fm), 'ADR');
  const fm2 = { status: 'resuelto' };
  assert.equal(classifyByFrontmatter(fm2), 'post-mortem');
  const fm3 = { status: 'registrado' };
  assert.equal(classifyByFrontmatter(fm3), 'log');
});

test('classifyByFrontmatter returns null when no match', () => {
  const fm = { other: 'value' };
  assert.equal(classifyByFrontmatter(fm), null);
});

test('deterministicExtract classifies files correctly', () => {
  const files: SourceFile[] = [
    {
      path: 'briefing.md',
      content: '## Decisiones\nWe decided X',
      frontmatter: {},
    },
    {
      path: 'resumen.md',
      content: 'La causa raíz del bug...',
      frontmatter: {},
    },
    {
      path: 'unknown.md',
      content: 'Some random content',
      frontmatter: {},
    },
  ];
  const result = deterministicExtract(files);
  assert.equal(result.classified.length, 2);
  assert.equal(result.ambiguous.length, 1);
  assert.equal(result.classified[0].classification, 'ADR');
  assert.equal(result.classified[1].classification, 'post-mortem');
});
test('deterministicClassification identifies ADR entries', () => {
  assert.equal(deterministicClassification('Elegimos SQLite para persistencia'), 'ADR');
  assert.equal(deterministicClassification('Decisión técnica: usar X'), 'ADR');
  assert.equal(deterministicClassification('Optamos por el enfoque B'), 'ADR');
  assert.equal(deterministicClassification('Decidimos cambiar el ORM'), 'ADR');
});

test('deterministicClassification identifies post-mortem entries', () => {
  assert.equal(deterministicClassification('El bug se debía a una condición de carrera'), 'post-mortem');
  assert.equal(deterministicClassification('Error en el parser de fechas'), 'post-mortem');
  assert.equal(deterministicClassification('La causa raíz del fallo fue el caché'), 'post-mortem');
});

test('deterministicClassification identifies log entries', () => {
  assert.equal(deterministicClassification('Cambio en el módulo core'), 'log');
  assert.equal(deterministicClassification('La historia de este archivo'), 'log');
  assert.equal(deterministicClassification('Lección aprendida: documentar'), 'log');
});

test('deterministicClassification returns null for ambiguous entries', () => {
  assert.equal(deterministicClassification('Texto genérico sin señales de clase'), null);
  assert.equal(deterministicClassification('', {}), null);
});

test('hybridExtract reclassifies ambiguous entries deterministically', async () => {
  const files: SourceFile[] = [
    { path: 'briefing.md', content: '## Decisiones\nWe decided X', frontmatter: {} },
    { path: 'unknown.md', content: 'Elegimos Y como enfoque final', frontmatter: {} },
  ];
  const result = await hybridExtract(files);
  assert.equal(result.ambiguous.length, 0);
  assert.equal(result.classified.length, 2);
  assert.equal(result.classified[0].classification, 'ADR');
  assert.equal(result.classified[1].classification, 'ADR');
});

test('hybridExtract discards ambiguous entries without clear patterns', async () => {
  const files: SourceFile[] = [
    { path: 'a.md', content: 'some random content', frontmatter: {} }
  ];
  const result = await hybridExtract(files);
  assert.equal(result.classified.length, 0);
  assert.equal(result.ambiguous.length, 0);
});

test('classifyByHeaders classifies a folder note as ADR via ## Decisiones técnicas', () => {
  const note =
    '# add-x\n\n## Contexto\nContexto de la spec.\n## Decisiones técnicas\nElegimos X.\n## Impacto\nImpacto.\n';
  assert.equal(classifyByHeaders(note), 'ADR');
});
