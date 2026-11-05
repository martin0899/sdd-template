import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTask } from '../../src/commands/task';
import type { ProgressRegistry } from '../../src/core/progress-registry';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-task-'));
  created.push(dir);
  return dir;
}

const TASKS_MD = `# Tasks: spec-native-f1

## 1. resolveChangesDir

- [ ] 1.1 Write failing tests for resolveChangesDir
- [ ] 1.2 Implement the resolveChangesDir module
- [ ] 1.3 Rewire the 7 sites
`;

function makeProject(tasksMd = TASKS_MD, change = 'spec-native-f1'): { root: string; tasksPath: string } {
  const root = scratch();
  const dir = join(root, 'openspec', 'changes', change);
  mkdirSync(dir, { recursive: true });
  const tasksPath = join(dir, 'tasks.md');
  writeFileSync(tasksPath, tasksMd, 'utf8');
  return { root, tasksPath };
}

async function capture(run: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  let out = '';
  let err = '';
  console.log = (...args: unknown[]) => { out += `${args.join(' ')}\n`; };
  console.error = (...args: unknown[]) => { err += `${args.join(' ')}\n`; };
  console.warn = (...args: unknown[]) => { err += `${args.join(' ')}\n`; };
  try {
    const code = await run();
    return { code, out, err };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

function readRegistry(root: string): ProgressRegistry {
  return JSON.parse(readFileSync(join(root, 'spec', 'progress.json'), 'utf8')) as ProgressRegistry;
}

test('task --done updates the registry and mirrors the checkbox in tasks.md', async () => {
  const { root, tasksPath } = makeProject();
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', done: true, projectRoot: root })
  );
  assert.equal(code, 0);
  const registry = readRegistry(root);
  const change = registry.change.find((c) => c.id === 'spec-native-f1');
  assert.ok(change, 'the change must be registered');
  const task = change!.task.find((t) => t.id === '1.1');
  assert.equal(task?.estatus, 'done');
  assert.equal(task?.porcentaje, 100);
  const md = readFileSync(tasksPath, 'utf8');
  assert.match(md, /- \[x\] 1\.1 Write failing tests/, 'the checkbox must be mirrored');
  assert.match(md, /- \[ \] 1\.2 Implement/, 'the other tasks must stay untouched');
});

test('task --undone updates the registry and mirrors the checkbox back', async () => {
  const { root, tasksPath } = makeProject();
  await capture(() => runTask({ change: 'spec-native-f1', taskId: '1.1', done: true, projectRoot: root }));
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', undone: true, projectRoot: root })
  );
  assert.equal(code, 0);
  const registry = readRegistry(root);
  const task = registry.change[0].task.find((t) => t.id === '1.1');
  assert.equal(task?.estatus, 'todo');
  assert.equal(task?.porcentaje, 0);
  assert.match(readFileSync(tasksPath, 'utf8'), /- \[ \] 1\.1 Write failing tests/);
});

test('task derives the change percentage and status from its tasks', async () => {
  const { root } = makeProject();
  await capture(() => runTask({ change: 'spec-native-f1', taskId: '1.1', done: true, projectRoot: root }));
  const change = readRegistry(root).change[0];
  assert.equal(change.porcentaje, 33, 'one of three tasks done');
  assert.equal(change.estado, 'todo');
});

test('task fails with exit code 2 when the task id does not exist', async () => {
  const { root } = makeProject();
  const { code, err } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '9.9', done: true, projectRoot: root })
  );
  assert.equal(code, 2);
  assert.match(err, /9\.9/, 'the error must name the task id');
});

test('task fails with exit code 2 when the change does not exist', async () => {
  const { root } = makeProject();
  const { code, err } = await capture(() =>
    runTask({ change: 'ghost-change', taskId: '1.1', done: true, projectRoot: root })
  );
  assert.equal(code, 2);
  assert.match(err, /ghost-change/);
});

test('task fails with exit code 3 when the task id prefix is ambiguous', async () => {
  const { root } = makeProject();
  const { code, err } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1', done: true, projectRoot: root })
  );
  assert.equal(code, 3);
  assert.match(err, /1\.1/);
  assert.match(err, /1\.2/);
  assert.match(err, /1\.3/);
});

test('task creates the registry from the tasks.md parse on the first write', async () => {
  const { root } = makeProject();
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.2', done: true, projectRoot: root })
  );
  assert.equal(code, 0);
  const change = readRegistry(root).change[0];
  assert.equal(change.id, 'spec-native-f1');
  assert.equal(change.nombre, 'spec-native-f1');
  assert.equal(change.task.length, 3, 'every task of tasks.md is registered');
  assert.deepEqual(
    change.task.map((t) => t.id),
    ['1.1', '1.2', '1.3']
  );
  assert.equal(change.task.find((t) => t.id === '1.2')?.estatus, 'done');
});

test('task mirrors only the whole task id, never a partial match', async () => {
  const tasksMd = `# Tasks: spec-native-f1

- [ ] 1.1 First task
- [ ] 1.10 Tenth task
`;
  const { root, tasksPath } = makeProject(tasksMd);
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', done: true, projectRoot: root })
  );
  assert.equal(code, 0);
  const md = readFileSync(tasksPath, 'utf8');
  assert.match(md, /- \[x\] 1\.1 First task/);
  assert.match(md, /- \[ \] 1\.10 Tenth task/, '1.10 must stay untouched');
});

test('task accepts an explicit status and percentage', async () => {
  const { root, tasksPath } = makeProject();
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', estado: 'in-progress', porcentaje: 30, projectRoot: root })
  );
  assert.equal(code, 0);
  const task = readRegistry(root).change[0].task.find((t) => t.id === '1.1');
  assert.equal(task?.estatus, 'in-progress');
  assert.equal(task?.porcentaje, 30);
  assert.match(readFileSync(tasksPath, 'utf8'), /- \[ \] 1\.1 Write failing tests/);
});

test('task fails with exit code 1 when no status is requested', async () => {
  const { root } = makeProject();
  const { code, err } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', projectRoot: root })
  );
  assert.equal(code, 1);
  assert.match(err, /--done|--undone|--estado/);
});

test('task fails with exit code 1 when the status is not supported', async () => {
  const { root } = makeProject();
  const { code } = await capture(() =>
    runTask({ change: 'spec-native-f1', taskId: '1.1', estado: 'pendiente', projectRoot: root })
  );
  assert.equal(code, 1);
});

test('task fails with exit code 2 when the task exists neither in the registry nor in tasks.md', async () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec', 'changes', 'empty-change'), { recursive: true });
  const { code } = await capture(() =>
    runTask({ change: 'empty-change', taskId: '1.1', done: true, projectRoot: root })
  );
  assert.equal(code, 2, 'a task that exists nowhere cannot be updated');
});
