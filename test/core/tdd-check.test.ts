import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkTddOrdering } from '../../src/core/tdd-check';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-tdd-'));
  created.push(dir);
  return dir;
}

function changeTasks(root: string, name: string, tasks: string): void {
  const dir = join(root, 'openspec', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), tasks, 'utf8');
}

function archivedChangeTasks(root: string, name: string, tasks: string): void {
  const dir = join(root, 'openspec', 'changes', 'archive', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), tasks, 'utf8');
}

const IMPL_WITHOUT_TDD = `# Tasks: add-foo

## 1. Core module

- [ ] 1.1 Implement the foo module and verify it exports the expected API
`;

const IMPL_WITH_TDD = `# Tasks: add-foo

## 1. Core module

- [ ] 1.1 Write unit tests first (TDD): foo returns the expected result. Verify: tests fail (RED) before implementation and pass (GREEN) after.
- [ ] 1.2 Implement the foo module and verify the tests pass
`;

const EXEMPT_SECTIONS = `# Tasks: add-foo

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP, only if on base branch)

- [ ] 0.1 Create feature branch. Verify with git branch.

## 2. Verification (MANDATORY - AGENT MUST EXECUTE)

- [ ] 2.1 Run unit tests and verify database state
- [ ] 2.2 Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)
- [ ] 2.3 E2E Testing with Playwright MCP (MANDATORY if applicable - AGENT MUST EXECUTE)

## 3. Update Technical Documentation (MANDATORY)

- [ ] 3.1 Update README
`;

test('tdd-check detects a section that implements without a prior TDD test task', () => {
  const root = scratch();
  changeTasks(root, 'add-foo', IMPL_WITHOUT_TDD);
  const findings = checkTddOrdering(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].artifact, 'openspec/changes/add-foo/tasks.md');
});

test('tdd-check passes when the TDD test task precedes the implementation task', () => {
  const root = scratch();
  changeTasks(root, 'add-foo', IMPL_WITH_TDD);
  const findings = checkTddOrdering(root);
  assert.deepEqual(findings, []);
});

test('tdd-check ignores exempt sections (setup, verification, curl, e2e, documentation, unit tests)', () => {
  const root = scratch();
  changeTasks(root, 'add-foo', EXEMPT_SECTIONS);
  const findings = checkTddOrdering(root);
  assert.deepEqual(findings, []);
});

test('tdd-check does not validate archived changes', () => {
  const root = scratch();
  archivedChangeTasks(root, 'add-archived', IMPL_WITHOUT_TDD);
  const findings = checkTddOrdering(root);
  assert.deepEqual(findings, []);
});

test('tdd-check returns no findings when there are no active changes', () => {
  const root = scratch();
  const findings = checkTddOrdering(root);
  assert.deepEqual(findings, []);
});

test('tdd-check ignores changes without a tasks.md file', () => {
  const root = scratch();
  const dir = join(root, 'openspec', 'changes', 'add-empty');
  mkdirSync(dir, { recursive: true });
  const findings = checkTddOrdering(root);
  assert.deepEqual(findings, []);
});

test('tdd-check reports one finding per violating section in a change', () => {
  const root = scratch();
  const tasks = `# Tasks: add-multi

## 1. Core module

- [ ] 1.1 Implement the core module and verify it works

## 2. API layer

- [ ] 2.1 Build the API routes and verify they respond
`;
  changeTasks(root, 'add-multi', tasks);
  const findings = checkTddOrdering(root);
  assert.equal(findings.length, 2);
});