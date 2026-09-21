import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectSpanishContext, SPANISH_CONTEXT_BLOCK } from '../../src/core/spanish-context';
import { parseYaml } from '../helpers/yaml';

const HEADING = SPANISH_CONTEXT_BLOCK[0];

test('config without context field gains a new context block', () => {
  const cfg = 'schema: spec-driven\n';
  const out = injectSpanishContext(cfg);
  const parsed = parseYaml(out) as { schema: string; context: string };
  assert.equal(parsed.schema, 'spec-driven');
  assert.match(parsed.context, /All interactions/);
  assert.match(out, /Language preference: All interactions/);
});

test('existing project context is preserved and spanish block appended', () => {
  const cfg = 'schema: spec-driven\ncontext: |\n  Keep this project rule.\n  And this one too.\n';
  const out = injectSpanishContext(cfg);
  const parsed = parseYaml(out) as { context: string };
  assert.match(parsed.context, /Keep this project rule\./);
  assert.match(parsed.context, /And this one too\./);
  for (const line of SPANISH_CONTEXT_BLOCK) {
    assert.ok(parsed.context.includes(line));
  }
});

test('comments and key order survive the injection', () => {
  const cfg = '# top comment\nschema: spec-driven # inline comment\ncontext: |\n  Own rule.\nrules:\n  proposal:\n    - keep\n';
  const out = injectSpanishContext(cfg);
  assert.match(out, /# top comment/);
  assert.match(out, /# inline comment/);
  assert.match(out, /^schema: spec-driven/m);
  assert.match(out, /^rules:/m);
  const parsed = parseYaml(out) as { rules: { proposal: string[] } };
  assert.deepEqual(parsed.rules.proposal, ['keep']);
});

test('injection is idempotent (no duplicated block)', () => {
  const cfg = 'schema: spec-driven\n';
  const once = injectSpanishContext(cfg);
  const twice = injectSpanishContext(once);
  assert.equal(twice.split(HEADING).length - 1, 1);
});

test('context is valid YAML after injection in both variants', () => {
  for (const cfg of ['schema: spec-driven\n', 'schema: spec-driven\ncontext: |\n  own\n']) {
    const parsed = parseYaml(injectSpanishContext(cfg)) as { context: string };
    assert.ok(typeof parsed.context === 'string');
  }
});
