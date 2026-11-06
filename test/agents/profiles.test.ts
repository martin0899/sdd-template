import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_PROFILES, SUPPORTED_AGENTS, resolveAgent } from '../../src/agents/profiles';

test('the codex profile does not include the opencode payload', () => {
  assert.deepEqual(AGENT_PROFILES.codex, { includeOpencode: false });
});

test('resolveAgent resolves the codex profile', () => {
  const resolved = resolveAgent('codex');
  assert.equal(resolved.name, 'codex');
  assert.equal(resolved.includeOpencode, false);
});

test('codex is a supported agent value', () => {
  assert.ok(SUPPORTED_AGENTS.includes('codex'), 'codex must be listed as a supported agent');
});
