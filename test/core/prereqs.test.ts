import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPrereqs,
  installHint,
  parseNodeMajor
} from '../../src/core/prereqs';

const probeAll = (tool: string) =>
  tool === 'node' ? { found: true, version: 'v22.0.0' } : { found: true, version: '1.0.0' };

test('all tools present reports ok', () => {
  const report = checkPrereqs(probeAll, 'linux');
  assert.equal(report.ok, true);
  assert.equal(report.results.length, 4);
  for (const r of report.results) {
    assert.equal(r.ok, true, r.tool);
  }
});

test('missing tool fails the report without throwing', () => {
  const report = checkPrereqs((tool) =>
    tool === 'graphify'
      ? { found: false }
      : tool === 'node'
        ? { found: true, version: 'v22.0.0' }
        : { found: true, version: '1.0.0' }
  , 'linux');
  assert.equal(report.ok, false);
  const graphify = report.results.find((r) => r.tool === 'graphify');
  assert.equal(graphify?.ok, false);
  assert.match(graphify?.problem ?? '', /not found|no se encuentra/i);
  const others = report.results.filter((r) => r.tool !== 'graphify');
  for (const r of others) assert.equal(r.ok, true);
});

test('node below 22 fails with version requirement', () => {
  const report = checkPrereqs((tool) =>
    tool === 'node' ? { found: true, version: 'v18.19.0' } : { found: true, version: '1.0.0' }
  , 'linux');
  assert.equal(report.ok, false);
  const node = report.results.find((r) => r.tool === 'node');
  assert.equal(node?.ok, false);
  assert.match(node?.problem ?? '', /22/);
});

test('parseNodeMajor handles v-prefix and garbage', () => {
  assert.equal(parseNodeMajor('v22.21.1'), 22);
  assert.equal(parseNodeMajor('23.0.0'), 23);
  assert.equal(parseNodeMajor('garbage'), undefined);
});

test('installHint names the tool per platform', () => {
  assert.match(installHint('git', 'win32'), /git-scm\.com/i);
  assert.match(installHint('node', 'darwin'), /nodejs\.org/i);
  assert.match(installHint('openspec', 'linux'), /openspec/i);
  assert.match(installHint('graphify', 'linux'), /graphify/i);
});
