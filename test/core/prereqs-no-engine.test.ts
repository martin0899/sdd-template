import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs, REQUIRED_TOOLS } from '../../src/core/prereqs';

const probeAll = (tool: string) =>
  tool === 'node' ? { found: true, version: 'v22.0.0' } : { found: true, version: '1.0.0' };

test('REQUIRED_TOOLS does not declare the retired openspec CLI', () => {
  assert.deepEqual(
    REQUIRED_TOOLS.map((c) => c.tool),
    ['git', 'node', 'graphify']
  );
});

test('checkPrereqs never probes the openspec binary', () => {
  const report = checkPrereqs((tool) =>
    tool === 'openspec' ? { found: false } : probeAll(tool)
  , 'linux');
  assert.equal(
    report.results.find((r) => r.tool === 'openspec'),
    undefined
  );
  assert.equal(report.ok, true);
});

test('checkPrereqs probes git, node and graphify unconditionally', () => {
  const report = checkPrereqs(probeAll, 'linux');
  for (const tool of ['git', 'node', 'graphify']) {
    const result = report.results.find((r) => r.tool === tool);
    assert.ok(result, `${tool} is still probed`);
    assert.equal(result?.ok, true, `${tool} ok`);
  }
});
