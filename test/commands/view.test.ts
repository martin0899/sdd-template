import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runView } from '../../src/commands/view';
import { writeProgress } from '../../src/core/progress-registry';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-view-'));
  created.push(dir);
  return dir;
}

const TASKS_MD = `# Tasks: change-a

## 1. Core

- [x] 1.1 Write the tests
- [ ] 1.2 Implement the module
`;

function makeProject(changes: Array<{ id: string; tasks?: string }>): string {
  const root = scratch();
  for (const change of changes) {
    const dir = join(root, 'spec', change.id);
    mkdirSync(dir, { recursive: true });
    if (change.tasks !== undefined) {
      writeFileSync(join(dir, 'tasks.md'), change.tasks, 'utf8');
    }
  }
  return root;
}

const ARCHIVED_TASKS = `# Tasks: commit-workflow

## 1. Done

- [x] 1.1 Ship it
`;

interface ArchivedFixture {
  id: string;
  change?: Record<string, unknown> | string;
  tasks?: string;
}

function makeArchivedProject(archived: ArchivedFixture[]): string {
  const root = scratch();
  for (const change of archived) {
    const dir = join(root, 'spec', '_archived', change.id);
    mkdirSync(dir, { recursive: true });
    if (change.tasks !== undefined) {
      writeFileSync(join(dir, 'tasks.md'), change.tasks, 'utf8');
    }
    if (change.change !== undefined) {
      const payload = typeof change.change === 'string' ? change.change : JSON.stringify(change.change);
      writeFileSync(join(dir, 'change.json'), payload, 'utf8');
    }
  }
  return root;
}

function changeJson(id: string, fecha: string, estado = 'done'): Record<string, unknown> {
  return { id, nombre: `Change ${id}`, fecha, estado, resumen: { abstracto: '' }, enlaces: [] };
}

async function capture(run: () => Promise<number>): Promise<{ code: number; out: string; err: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  let out = '';
  let err = '';
  console.log = (...args: unknown[]) => { out += `${args.join(' ')}\n`; };
  console.error = (...args: unknown[]) => { err += `${args.join(' ')}\n`; };
  try {
    const code = await run();
    return { code, out, err };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('view lists the active changes with their percentage, status and update', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }, { id: 'change-b', tasks: TASKS_MD }]);
  writeProgress(root, {
    change: [
      {
        id: 'change-a',
        nombre: 'Change A',
        porcentaje: 75,
        estado: 'in-progress',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [
          { id: '1.1', descripcion: 'Write the tests', porcentaje: null, estatus: 'done' },
          { id: '1.2', descripcion: 'Implement the module', porcentaje: null, estatus: 'in-progress' }
        ]
      }
    ]
  });
  const { code, out } = await capture(() => runView({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /change-a/);
  assert.match(out, /75%/);
  assert.match(out, /2026-11-05/);
  assert.match(out, /change-b/);
  assert.match(out, /sin registro/, 'a change without registry entry is reported as unregistered');
});

test('view reports that there are no active changes and exits with 0', async () => {
  const root = makeProject([]);
  const { code, out } = await capture(() => runView({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /no hay changes activos/);
});

test('view shows the detail of a change with the status of every task', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  writeProgress(root, {
    change: [
      {
        id: 'change-a',
        nombre: 'Change A',
        porcentaje: 75,
        estado: 'in-progress',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [
          { id: '1.1', descripcion: 'Write the tests', porcentaje: null, estatus: 'done' },
          { id: '1.2', descripcion: 'Implement the module', porcentaje: null, estatus: 'in-progress' }
        ]
      }
    ]
  });
  const { code, out } = await capture(() => runView({ change: 'change-a', projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /change-a/);
  assert.match(out, /75%/);
  assert.match(out, /\[x\] 1\.1 Write the tests/);
  assert.match(out, /\[ \] 1\.2 Implement the module/);
});

test('view shows "sin registro" and the tasks.md checkboxes for a legacy change', async () => {
  const root = makeProject([{ id: 'legacy-change', tasks: TASKS_MD }]);
  const { code, out } = await capture(() => runView({ change: 'legacy-change', projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /sin registro/);
  assert.match(out, /\[x\] 1\.1 Write the tests/);
  assert.match(out, /\[ \] 1\.2 Implement the module/);
});

test('view fails with exit code 2 when the change does not exist', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const { code, err } = await capture(() => runView({ change: 'ghost', projectRoot: root }));
  assert.equal(code, 2);
  assert.match(err, /ghost/);
});

test('view does not list the folder of the archived changes', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  mkdirSync(join(root, 'spec', '_archived'), { recursive: true });
  mkdirSync(join(root, 'spec', '_archived', 'change-b'), { recursive: true });
  const { code, out } = await capture(() => runView({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /change-a/);
  assert.doesNotMatch(out, /change-b/);
  assert.doesNotMatch(out, /_archived/);
});

test('view never writes anything', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const tasksPath = join(root, 'spec', 'change-a', 'tasks.md');
  const before = readFileSync(tasksPath, 'utf8');
  await capture(() => runView({ projectRoot: root }));
  await capture(() => runView({ change: 'change-a', projectRoot: root }));
  assert.equal(readFileSync(tasksPath, 'utf8'), before, 'tasks.md must stay untouched');
  assert.equal(existsSync(join(root, 'spec', 'progress.json')), false, 'the registry file must not be created');
  assert.deepEqual(readdirSync(root).sort(), ['spec']);
});

test('view --archived lists archived changes with date, tasks and state, never the active ones', async () => {
  const root = makeArchivedProject([
    { id: 'commit-workflow', change: changeJson('commit-workflow', '2026-11-01'), tasks: ARCHIVED_TASKS }
  ]);
  mkdirSync(join(root, 'spec', 'active-one'), { recursive: true });
  const { code, out } = await capture(() => runView({ projectRoot: root, archived: true }));
  assert.equal(code, 0);
  assert.match(out, /commit-workflow/);
  assert.match(out, /2026-11-01/);
  assert.match(out, /1\/1/);
  assert.match(out, /done/);
  assert.doesNotMatch(out, /active-one/);
});

test('view --archived falls back to an em dash and done when change.json is missing', async () => {
  const root = makeArchivedProject([{ id: 'legacy-archived', tasks: TASKS_MD }]);
  const { code, out } = await capture(() => runView({ projectRoot: root, archived: true }));
  assert.equal(code, 0);
  assert.match(out, /legacy-archived\s*\|\s*—/, 'a missing change.json renders an em dash in the date column');
  assert.match(out, /1\/2/, 'the task counter comes from tasks.md');
  assert.match(out, /done/, 'a missing change.json falls back to the closed state');
});

test('view <id> --archived renders the tasks.md of the archived change', async () => {
  const root = makeArchivedProject([
    { id: 'commit-workflow', change: changeJson('commit-workflow', '2026-11-01'), tasks: TASKS_MD }
  ]);
  const { code, out } = await capture(() => runView({ change: 'commit-workflow', projectRoot: root, archived: true }));
  assert.equal(code, 0);
  assert.match(out, /commit-workflow/);
  assert.match(out, /sin registro/);
  assert.match(out, /\[x\] 1\.1 Write the tests/);
  assert.match(out, /\[ \] 1\.2 Implement the module/);
});

test('view --archived reports that there are no archived changes and exits with 0', async () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const { code, out } = await capture(() => runView({ projectRoot: root, archived: true }));
  assert.equal(code, 0);
  assert.match(out, /no hay changes archived/);
  assert.equal(existsSync(join(root, 'spec', 'progress.json')), false);
});

test('view --archived never writes anything', async () => {
  const root = makeArchivedProject([
    { id: 'commit-workflow', change: changeJson('commit-workflow', '2026-11-01'), tasks: TASKS_MD }
  ]);
  mkdirSync(join(root, 'spec', 'change-a'), { recursive: true });
  writeFileSync(join(root, 'spec', 'change-a', 'tasks.md'), TASKS_MD, 'utf8');
  const tasksPath = join(root, 'spec', '_archived', 'commit-workflow', 'tasks.md');
  const before = readFileSync(tasksPath, 'utf8');
  await capture(() => runView({ projectRoot: root, archived: true }));
  await capture(() => runView({ change: 'commit-workflow', projectRoot: root, archived: true }));
  assert.equal(readFileSync(tasksPath, 'utf8'), before, 'the archived tasks.md must stay untouched');
  assert.equal(existsSync(join(root, 'spec', 'progress.json')), false, 'the registry file must not be created');
  assert.deepEqual(readdirSync(root).sort(), ['spec']);
});
