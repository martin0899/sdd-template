import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readProgress,
  writeProgress,
  derivePercent,
  deriveEstado,
  deriveTaskPercentage,
  initProgressFromTasksMd,
  parseTasksMd,
  progressRegistryPath,
  type ProgressChange,
  type ProgressRegistry,
  type ProgressTask
} from '../../src/core/progress-registry';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-progress-'));
  created.push(dir);
  return dir;
}

function task(id: string, estatus: ProgressTask['estatus'], porcentaje: number | null = null): ProgressTask {
  return { id, descripcion: `task ${id}`, porcentaje, estatus };
}

test('derivePercent and deriveEstado follow the truth table', () => {
  const cases: Array<{ tasks: ProgressTask[]; percent: number; estado: ProgressTask['estatus'] }> = [
    { tasks: [], percent: 0, estado: 'todo' },
    { tasks: [task('1.1', 'todo')], percent: 0, estado: 'todo' },
    { tasks: [task('1.1', 'in-progress')], percent: 50, estado: 'in-progress' },
    { tasks: [task('1.1', 'done')], percent: 100, estado: 'done' },
    { tasks: [task('1.1', 'done'), task('1.2', 'todo')], percent: 50, estado: 'todo' },
    { tasks: [task('1.1', 'done'), task('1.2', 'in-progress')], percent: 75, estado: 'in-progress' },
    { tasks: [task('1.1', 'done'), task('1.2', 'done')], percent: 100, estado: 'done' },
    { tasks: [task('1.1', 'todo'), task('1.2', 'todo'), task('1.3', 'todo'), task('1.4', 'todo')], percent: 0, estado: 'todo' }
  ];
  for (const c of cases) {
    assert.equal(derivePercent(c.tasks), c.percent, `percent of ${JSON.stringify(c.tasks)}`);
    assert.equal(deriveEstado(c.tasks), c.estado, `estado of ${JSON.stringify(c.tasks)}`);
  }
});

test('derivePercent rounds the average deterministically', () => {
  const tasks = [task('1.1', 'done'), task('1.2', 'todo'), task('1.3', 'todo')];
  assert.equal(derivePercent(tasks), 33);
});

test('deriveTaskPercentage uses the base value of the status when percentage is null', () => {
  assert.equal(deriveTaskPercentage(task('1.1', 'todo', null)), 0);
  assert.equal(deriveTaskPercentage(task('1.1', 'in-progress', null)), 50);
  assert.equal(deriveTaskPercentage(task('1.1', 'done', null)), 100);
});

test('deriveTaskPercentage honours an explicit partial percentage', () => {
  assert.equal(deriveTaskPercentage(task('1.1', 'in-progress', 30)), 30);
  assert.equal(deriveTaskPercentage(task('1.1', 'todo', 0)), 0);
});

test('derivePercent of a change without tasks is 0 (no division by zero)', () => {
  assert.equal(derivePercent([]), 0);
  assert.equal(deriveEstado([]), 'todo');
});

test('readProgress returns an empty registry when the file does not exist', () => {
  const root = scratch();
  assert.deepEqual(readProgress(root), { change: [] });
});

test('readProgress returns an empty registry when the file is invalid JSON', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  writeFileSync(join(root, 'spec', 'progress.json'), '{ not json', 'utf8');
  assert.deepEqual(readProgress(root), { change: [] });
});

test('writeProgress stores the registry atomically and leaves no temp file behind', () => {
  const root = scratch();
  const registry: ProgressRegistry = {
    change: [
      {
        id: 'spec-native-f1',
        nombre: 'Fase F1',
        porcentaje: 50,
        estado: 'in-progress',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [task('1.1', 'done'), task('1.2', 'todo')]
      }
    ]
  };
  writeProgress(root, registry);
  const path = progressRegistryPath(root);
  assert.equal(path, join(root, 'spec', 'progress.json'));
  assert.ok(existsSync(path), 'the registry file must exist');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ProgressRegistry;
  assert.equal(parsed.change.length, 1);
  assert.equal(parsed.change[0].id, 'spec-native-f1');
  assert.equal(parsed.change[0].task.length, 2);
  const leftovers = readdirSync(join(root, 'spec')).filter((f) => f.includes('.tmp.'));
  assert.deepEqual(leftovers, [], 'the temp file must always be renamed away');
});

test('writeProgress never leaves a partial registry when the rename fails', () => {
  // Crash simulation: the rename is the commit point. If it fails, the target
  // must not exist at all (never a half-written file).
  const root = scratch();
  const fs = require('node:fs');
  const original = fs.renameSync;
  fs.renameSync = () => {
    throw new Error('simulated crash');
  };
  try {
    assert.throws(() => writeProgress(root, { change: [] }), /simulated crash/);
  } finally {
    fs.renameSync = original;
  }
  assert.equal(existsSync(progressRegistryPath(root)), false, 'no partial target file');
});

test('writeProgress derives the change percentage and status from its tasks', () => {
  const root = scratch();
  const change: ProgressChange = {
    id: 'change-a',
    nombre: 'Change A',
    porcentaje: 0,
    estado: 'todo',
    task: [task('1.1', 'done'), task('1.2', 'todo')]
  };
  writeProgress(root, { change: [change] });
  const parsed = JSON.parse(readFileSync(progressRegistryPath(root), 'utf8')) as ProgressRegistry;
  assert.equal(parsed.change[0].porcentaje, 50);
  assert.equal(parsed.change[0].estado, 'todo');
});

test('readProgress returns what writeProgress stored', () => {
  const root = scratch();
  const registry: ProgressRegistry = {
    change: [
      {
        id: 'change-a',
        nombre: 'Change A',
        porcentaje: 100,
        estado: 'done',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [task('1.1', 'done')]
      }
    ]
  };
  writeProgress(root, registry);
  assert.deepEqual(readProgress(root), registry);
});

test('initProgressFromTasksMd parses the checkboxes into tasks', () => {
  const tasksMd = `# Tasks: spec-native-f1

## 1. resolveChangesDir

- [x] 1.1 Write failing tests for resolveChangesDir
- [ ] 1.2 Implement the resolveChangesDir module
`;
  const tasks = initProgressFromTasksMd(tasksMd);
  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks[0], {
    id: '1.1',
    descripcion: 'Write failing tests for resolveChangesDir',
    porcentaje: null,
    estatus: 'done'
  });
  assert.deepEqual(tasks[1], {
    id: '1.2',
    descripcion: 'Implement the resolveChangesDir module',
    porcentaje: null,
    estatus: 'todo'
  });
});

test('initProgressFromTasksMd ignores lines without a task id', () => {
  const tasksMd = `# Tasks: x

- [ ] Manual smoke test: run the CLI
- [ ] 1.1 A real task
`;
  const tasks = initProgressFromTasksMd(tasksMd);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, '1.1');
});

test('parseTasksMd keeps every task line with its position', () => {
  const tasksMd = `# Tasks: x

- [x] 1.1 First
- [ ] 1.2 Second
`;
  const parsed = parseTasksMd(tasksMd);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].lineIndex, 2);
  assert.equal(parsed[1].done, false);
});
