import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLegacyChanges } from '../../src/core/legacy-changes-reader';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-legacy-reader-'));
  created.push(dir);
  return dir;
}

test('readLegacyChanges lists the active legacy changes', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec', 'changes', 'change-a'), { recursive: true });
  mkdirSync(join(root, 'openspec', 'changes', 'change-b'), { recursive: true });
  const changes = readLegacyChanges(root);
  assert.deepEqual(changes.map((c) => c.id), ['change-a', 'change-b']);
  assert.ok(changes.every((c) => !c.archived));
});

test('readLegacyChanges reports the archived changes without migrating them', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec', 'changes', 'archive', '2026-09-29-change-old'), { recursive: true });
  const changes = readLegacyChanges(root);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, 'change-old', 'the date prefix is stripped');
  assert.equal(changes[0].archived, true);
});

test('readLegacyChanges returns an empty list when there is no legacy directory', () => {
  const root = scratch();
  assert.deepEqual(readLegacyChanges(root), []);
});

test('readLegacyChanges ignores the files of the legacy directory', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec', 'changes'), { recursive: true });
  const changes = readLegacyChanges(root);
  assert.deepEqual(changes, []);
});
