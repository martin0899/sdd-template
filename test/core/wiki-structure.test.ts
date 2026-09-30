import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  AGGREGATE_IDS,
  AGGREGATE_FILES,
  indexContent,
  DECISION_BLOCK_RE,
  extractSpecIds,
  decisionesPath
} from '../../src/core/wiki-structure';

test('the three representations of the structure stay in correspondence', () => {
  // If these ever diverge, _INDEX.json categories, the files distill writes and
  // the files wiki-search scans would describe different worlds.
  const expected = ['arquitectura', 'decisiones', 'operacion', 'historial'];
  assert.deepEqual(AGGREGATE_IDS, expected);
  assert.deepEqual(AGGREGATE_FILES, expected.map((id) => `${id}.md`));
  assert.deepEqual(indexContent(), expected);
  assert.equal(AGGREGATE_FILES.length, AGGREGATE_IDS.length);
  assert.equal(indexContent().length, AGGREGATE_IDS.length);
});

test('extractSpecIds reads the decision block headings', () => {
  const md = `---
id: decisiones
---
# Decisiones — demo

### add-alpha

Fuente: \`add-alpha\`
Estado: completado

## Contexto
Algo.

---

### add-beta

Fuente: \`add-beta\`
Estado: completado
`;
  const ids = extractSpecIds(md);
  assert.deepEqual([...ids].sort(), ['add-alpha', 'add-beta']);
});

test('extractSpecIds ignores a spec-id merely mentioned in a block body', () => {
  const md = `### add-real

Fuente: \`add-real\`
Estado: completado

## Otro
Este bloque menciona add-fantasma pero no lo define.
`;
  const ids = extractSpecIds(md);
  assert.ok(ids.has('add-real'));
  assert.ok(!ids.has('add-fantasma'), 'a prose mention is not a distilled decision');
});

test('extractSpecIds ignores lower-level headings', () => {
  const md = `# Decisiones — demo\n\n## Contexto\n\n#### no soy un spec-id\n`;
  assert.equal(extractSpecIds(md).size, 0);
});

test('DECISION_BLOCK_RE only matches a level-3 heading line', () => {
  // The extractor splits the document into lines before matching, so the contract
  // is "matches a heading line, rejects a prose line". Asserting that on a single
  // string would test the regex in isolation rather than the behaviour.
  assert.equal('### add-x'.match(DECISION_BLOCK_RE)?.[1], 'add-x');
  assert.equal(DECISION_BLOCK_RE.test('## add-x'), false, 'level 2 is not a decision block');
  assert.equal(DECISION_BLOCK_RE.test('# add-x'), false, 'level 1 is not a decision block');
  assert.equal(
    DECISION_BLOCK_RE.test('menciona add-x dentro de un parrafo'),
    false,
    'a prose line is not a decision block'
  );
  assert.equal(extractSpecIds('texto\n### add-y\nmas texto').has('add-y'), true);
});

test('decisionesPath builds the path of the decisions aggregate', () => {
  assert.equal(decisionesPath('/vault', 'demo'), join('/vault', '05_wiki', 'demo', 'decisiones.md'));
  assert.equal(decisionesPath('/vault', 'My Project'), join('/vault', '05_wiki', 'My Project', 'decisiones.md'));
});

test('the decisions document is one of the aggregates', () => {
  assert.ok(AGGREGATE_FILES.includes('decisiones.md'));
  assert.ok(AGGREGATE_IDS.includes('decisiones'));
});
