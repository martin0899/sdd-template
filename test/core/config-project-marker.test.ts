import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProjectFromCwd } from '../../src/core/config';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-project-marker-'));
  created.push(dir);
  return dir;
}

test('a project with a spec/ folder is detected as a spec-native project', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  const detected = detectProjectFromCwd(root);
  assert.ok(detected, 'the project must be detected');
  assert.equal(detected.root, root);
});

test('a project with an openspec/ folder is still detected', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec'), { recursive: true });
  const detected = detectProjectFromCwd(root);
  assert.ok(detected, 'the project must be detected');
  assert.equal(detected.root, root);
});

test('a project with a .sdd-manifest.json is still detected', () => {
  const root = scratch();
  mkdirSync(join(root, '.sdd-manifest.json'), { recursive: true });
  const detected = detectProjectFromCwd(root);
  assert.ok(detected, 'the project must be detected');
  assert.equal(detected.root, root);
});

test('a folder without any marker is not a project', () => {
  const root = scratch();
  assert.equal(detectProjectFromCwd(root), null);
});
