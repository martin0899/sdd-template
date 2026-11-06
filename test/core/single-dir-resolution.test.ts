import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkTddOrdering } from '../../src/core/tdd-check';
import { listActiveChangeEntries } from '../../src/core/vault-doctor';
import { getProjectStatus } from '../../src/commands/projects';
import { discoverProjects } from '../../src/commands/seed';
import { cleanupFixtures, scratch as scratchFixture } from '../helpers/fixtures';

afterEach(() => {
  cleanupFixtures();
});

const scratch = (): string => scratchFixture('sp-single-dir-');

const IMPL_WITHOUT_TDD = `# Tasks: change

## 1. Core module

- [ ] 1.1 Implement the module and verify it exports the expected API
`;

/** Creates a change with a tasks.md inside `changesDir`. */
function writeChange(root: string, changesDir: string, id: string): void {
  const dir = join(root, changesDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), IMPL_WITHOUT_TDD, 'utf8');
}

test('the tdd check reads the resolved directory only', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-native');
  writeChange(root, join('openspec', 'changes'), 'add-legacy');
  const findings = checkTddOrdering(root);
  assert.equal(findings.length, 1);
  assert.match(findings[0].artifact, /add-native/);
});

test('the registry doctor reads the resolved directory only', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec', 'add-native'), { recursive: true });
  mkdirSync(join(root, 'openspec', 'changes', 'add-legacy'), { recursive: true });
  const entries = listActiveChangeEntries(root);
  assert.deepEqual(entries.map((e) => e.id), ['add-native']);
});

test('the projects report counts the resolved directory only', () => {
  const root = scratch();
  writeChange(root, 'spec', 'add-native');
  writeChange(root, join('openspec', 'changes'), 'add-legacy');
  const status = getProjectStatus(root);
  assert.equal(status.changes, 1);
});

test('the seed discovery counts the resolved directory only', () => {
  const base = scratch();
  const project = join(base, 'proj-a');
  mkdirSync(join(project, 'spec', 'add-native'), { recursive: true });
  mkdirSync(join(project, 'openspec', 'changes', 'add-legacy'), { recursive: true });
  const projects = discoverProjects(base);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].changes, 1);
});
