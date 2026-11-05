import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs, REQUIRED_TOOLS } from '../../src/core/prereqs';

const probeAll = (tool: string) =>
  tool === 'node' ? { found: true, version: 'v22.0.0' } : { found: true, version: '1.0.0' };

const probeNoOpenspec = (tool: string) =>
  tool === 'openspec' ? { found: false } : probeAll(tool);

test('checkPrereqs does not probe openspec when the engine is native', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux', 'native');
  assert.equal(
    report.results.find((r) => r.tool === 'openspec'),
    undefined,
    'openspec must not appear in the report at all'
  );
  for (const tool of ['git', 'node', 'graphify']) {
    const result = report.results.find((r) => r.tool === tool);
    assert.ok(result, `${tool} is still probed`);
    assert.equal(result?.ok, true, `${tool} ok`);
  }
});

test('checkPrereqs probes openspec when the engine is openspec', () => {
  const report = checkPrereqs(probeAll, 'linux', 'openspec');
  const openspec = report.results.find((r) => r.tool === 'openspec');
  assert.ok(openspec, 'openspec is probed like the other tools');
  assert.equal(openspec?.ok, true);
});

test('checkPrereqs reports the missing openspec binary when the engine is openspec', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux', 'openspec');
  assert.equal(report.ok, false);
  const openspec = report.results.find((r) => r.tool === 'openspec');
  assert.equal(openspec?.ok, false);
  assert.equal(openspec?.problem, 'openspec not found in PATH');
});

test('checkPrereqs ignores the missing openspec binary when the engine is native', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux', 'native');
  assert.equal(report.ok, true, 'a native project does not need the openspec binary');
  assert.equal(
    report.results.filter((r) => r.tool === 'openspec').length,
    0
  );
});

test('checkPrereqs defaults to the native engine', () => {
  const report = checkPrereqs(probeNoOpenspec, 'linux');
  assert.equal(
    report.results.find((r) => r.tool === 'openspec'),
    undefined
  );
});

test('REQUIRED_TOOLS keeps openspec in the list (it is only probed conditionally)', () => {
  assert.deepEqual(
    REQUIRED_TOOLS.map((c) => c.tool),
    ['git', 'node', 'openspec', 'graphify']
  );
});
