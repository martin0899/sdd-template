import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { missingSddEssentials } from '../../src/core/sdd-essentials';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-sdd-essentials-'));
  created.push(dir);
  return dir;
}

/** Creates the three planning artifacts of a change inside `changesDir`. */
function writeChange(root: string, changesDir: string, changeId: string, files: string[]): void {
  const dir = join(root, changesDir, changeId);
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    writeFileSync(join(dir, file), `# ${file}\n`, 'utf8');
  }
}

const ALL = ['proposal.md', 'design.md', 'tasks.md'];

test('missingSddEssentials reports the changeId when no change is given', () => {
  const root = scratch();
  assert.deepEqual(missingSddEssentials(root), ['changeId']);
});

test('missingSddEssentials reports nothing when the three artifacts are present', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-x', ALL);
  assert.deepEqual(missingSddEssentials(root, 'add-x'), []);
});

test('missingSddEssentials reports every missing artifact by name', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-x', ['proposal.md']);
  assert.deepEqual(missingSddEssentials(root, 'add-x'), ['design.md', 'tasks.md']);
});

test('missingSddEssentials honours the changes directory it receives', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-x', ALL);
  const other = join(root, 'elsewhere');
  mkdirSync(other, { recursive: true });
  assert.deepEqual(missingSddEssentials(root, 'add-x', other), ALL);
});

test('missingSddEssentials resolves the native changes directory when none is given', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-y', ALL);
  assert.deepEqual(missingSddEssentials(root, 'add-y'), []);
});

test('missingSddEssentials does not read the legacy layout: one directory only', () => {
  const root = scratch();
  writeChange(root, join('openspec', 'changes'), 'add-z', ALL);
  // The legacy layout is not the resolved directory: the change is not found.
  assert.deepEqual(missingSddEssentials(root, 'add-z'), ALL);
});
