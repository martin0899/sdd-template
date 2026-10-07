import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs } from '../../src/core/prereqs';

const probeAll = (tool: string) =>
  tool === 'node' ? { found: true, version: 'v22.0.0' } : { found: true, version: '1.0.0' };

const probeNoOpenspec = (tool: string) =>
  tool === 'openspec' ? { found: false } : probeAll(tool);

test('checkPrereqs en modo odd: openspec ausente no se reporta como faltante', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux', 'odd');
  assert.equal(report.ok, true);
  assert.ok(!report.results.some((r) => r.tool === 'openspec'));
});

test('checkPrereqs en modo sdd: openspec ausente se reporta como faltante', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux', 'sdd');
  assert.equal(report.ok, false);
  const openspec = report.results.find((r) => r.tool === 'openspec');
  assert.equal(openspec?.ok, false);
});

test('checkPrereqs sin philosophy equivale al default sdd', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux');
  assert.equal(report.ok, false);
  assert.ok(report.results.some((r) => r.tool === 'openspec' && !r.ok));
});

test('git, node y graphify son incondicionales en ambos modos', () => {
  for (const mode of ['sdd', 'odd'] as const) {
    const report = checkPrereqs(probeNoOpenspec, 'linux', mode);
    for (const tool of ['git', 'node', 'graphify']) {
      const result = report.results.find((r) => r.tool === tool);
      assert.ok(result, `${tool} presente en modo ${mode}`);
      assert.equal(result!.ok, true, `${tool} ok en modo ${mode}`);
    }
  }
});