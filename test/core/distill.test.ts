import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyByHeaders, classifyByKeywords, classifyByFrontmatter, deterministicExtract, classifyWithLLM, hybridExtract, SourceFile } from '../../src/core/distill';

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

test('classifyByFrontmatter classifies by tipo', () => {
  const fm = { tipo: 'adr' };
  assert.equal(classifyByFrontmatter(fm), 'ADR');
  const fm2 = { tipo: 'bug' };
  assert.equal(classifyByFrontmatter(fm2), 'post-mortem');
  const fm3 = { tipo: 'log' };
  assert.equal(classifyByFrontmatter(fm3), 'log');
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
test('classifyWithLLM returns empty when disabled', async () => {
  const result = await classifyWithLLM('some plan', { host: 'http://localhost:1', model: 'test', enabled: false });
  assert.equal(result.size, 0);
});

test('classifyWithLLM returns empty when host unreachable', async () => {
  const result = await classifyWithLLM('some plan', { host: 'http://localhost:1', model: 'test', enabled: true });
  assert.equal(result.size, 0);
});

test('hybridExtract discards ambiguous when LLM disabled', async () => {
  const files: SourceFile[] = [
    { path: 'a.md', content: 'some random content', frontmatter: {} }
  ];
  const result = await hybridExtract(files, { host: 'http://localhost:1', model: '', enabled: false });
  assert.equal(result.classified.length, 0);
  assert.equal(result.ambiguous.length, 0);
});
