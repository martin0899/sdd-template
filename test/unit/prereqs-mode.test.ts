import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs } from '../../src/core/prereqs';

const probeAll = (tool: string) =>
  tool === 'node' ? { found: true, version: 'v22.0.0' } : { found: true, version: '1.0.0' };

const probeNoOpenspec = (tool: string) =>
  tool === 'openspec' ? { found: false } : probeAll(tool);

test('checkPrereqs: openspec ausente siempre se reporta como faltante', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux');
  assert.equal(report.ok, false);
  const openspec = report.results.find((r) => r.tool === 'openspec');
  assert.ok(openspec, 'openspec se comprueba siempre');
  assert.equal(openspec?.ok, false);
});

test('checkPrereqs: git, node y graphify son incondicionales', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux');
  for (const tool of ['git', 'node', 'graphify']) {
    const result = report.results.find((r) => r.tool === tool);
    assert.ok(result, `${tool} presente en el informe`);
    assert.equal(result!.ok, true, `${tool} ok`);
  }
});
