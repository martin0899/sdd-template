import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs, realProbe, installHint } from '../../src/core/prereqs';

test('doctor scenario: healthy host reports every tool with version', () => {
  // This host is expected to have the real toolchain; if a tool is genuinely
  // absent the assertion below reports exactly which one.
  const report = checkPrereqs(realProbe, process.platform);
  for (const r of report.results) {
    assert.equal(r.ok, true, `${r.tool}: ${r.problem ?? ''}`);
  }
});

test('installHint is non-empty for every required tool', () => {
  for (const tool of ['git', 'node', 'openspec', 'graphify']) {
    assert.ok(installHint(tool, process.platform).length > 0, tool);
  }
});
