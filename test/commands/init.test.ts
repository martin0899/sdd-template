import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { buildInitPlan } from '../../src/commands/plan';
import { makeConfirm } from '../../src/util/prompt';
import { join } from 'node:path';
import { detectStack } from '../../src/core/detect-stack';
import { resolveAgent } from '../../src/agents/profiles';

test('makeConfirm: autoYes always true; piped queue honors s/N sequence', () => {
  const auto = makeConfirm(true, []);
  assert.equal(auto('anything'), true);
  const piped = makeConfirm(false, ['s', 'n', 'S']);
  assert.equal(piped('q1'), true);
  assert.equal(piped('q2'), false);
  assert.equal(piped('q3'), true);
});

test('buildInitPlan mentions every mandatory section', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spectralis-plan-'));
  try {
    const stack = detectStack(dir);
    const profile = resolveAgent(undefined);
    const plan = buildInitPlan(dir, stack, profile, join(__dirname, '..', '..', '..')).join('\n');
    assert.match(plan, /PLAN/);
    assert.match(plan, /openspec init/);
    assert.match(plan, /AGENTS\.md/);
    assert.match(plan, /gitignore/i);
    assert.match(plan, /Spanish context/);
    assert.match(plan, /opencode/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
