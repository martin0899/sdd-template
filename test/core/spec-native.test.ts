import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNativeStatus } from '../../src/core/spec-native';

const created: string[] = [];
const originalHome = process.env.HOME;

afterEach(() => {
  process.env.HOME = originalHome;
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

/** An isolated HOME: the global config of the host never leaks into the test. */
function isolatedHome(): string {
  const home = scratch('sp-spec-native-home-');
  process.env.HOME = home;
  return home;
}

interface ChangeFixture {
  id: string;
  tasks?: string[];
  artifacts?: string[];
}

/** A project with the native layout: `spec/<id>/` and `spec/progress.json`. */
function project(changes: ChangeFixture[], progress?: Record<string, unknown>): string {
  const root = scratch('sp-spec-native-proj-');
  mkdirSync(join(root, 'spec'), { recursive: true });
  for (const change of changes) {
    const dir = join(root, 'spec', change.id);
    mkdirSync(dir, { recursive: true });
    for (const artifact of change.artifacts ?? ['proposal.md', 'design.md', 'tasks.md']) {
      writeFileSync(join(dir, artifact), `# ${artifact}\n`, 'utf8');
    }
    if (change.tasks) {
      const lines = change.tasks.map((task, index) => `- [${index % 2 === 0 ? 'x' : ' '}] ${task}`);
      writeFileSync(join(dir, 'tasks.md'), `# Tasks\n\n${lines.join('\n')}\n`, 'utf8');
    }
  }
  if (progress) {
    writeFileSync(
      join(root, 'spec', 'progress.json'),
      JSON.stringify(progress, null, 2) + '\n',
      'utf8'
    );
  }
  return root;
}

function registry(projectRoot: string, changes: string[]): void {
  const dir = join(projectRoot, '.sdd-registry');
  mkdirSync(dir, { recursive: true });
  const rows = changes
    .map((id) => `| Spectralis/${id} | ${id} | Spectralis/${id}/${id}.md | ${id} | completada |`)
    .join('\n');
  writeFileSync(
    join(dir, 'REGISTRY.md'),
    `# Requirements Registry\n\n| nota (ruta) | requerimiento | briefing | changes generados | estado |\n|---|---|---|---|---|\n${rows}\n`,
    'utf8'
  );
}

test('runNativeStatus lists every active change of the native layout', () => {
  isolatedHome();
  const root = project([
    { id: 'change-a' },
    { id: 'change-b' }
  ]);
  const report = runNativeStatus(root);
  assert.deepEqual(
    report.changes.map((change) => change.id),
    ['change-a', 'change-b']
  );
  assert.equal(report.changesDir, join(root, 'spec'));
});

test('runNativeStatus excludes the archived changes', () => {
  isolatedHome();
  const root = project([{ id: 'change-a' }]);
  mkdirSync(join(root, 'spec', '_archived', 'old-change'), { recursive: true });
  const report = runNativeStatus(root);
  assert.deepEqual(
    report.changes.map((change) => change.id),
    ['change-a']
  );
});

test('runNativeStatus derives the state from the progress registry', () => {
  isolatedHome();
  const root = project(
    [{ id: 'change-a' }],
    {
      change: [
        {
          id: 'change-a',
          nombre: 'change-a',
          porcentaje: 100,
          estado: 'done',
          task: [{ id: '1.1', descripcion: 'tarea', porcentaje: null, estatus: 'done' }]
        }
      ]
    }
  );
  const report = runNativeStatus(root);
  assert.equal(report.changes[0].estado, 'done');
  assert.equal(report.changes[0].porcentaje, 100);
  assert.equal(report.changes[0].completed, 1);
  assert.equal(report.changes[0].pending, 0);
  assert.equal(report.changes[0].unregistered, false);
});

test('runNativeStatus shows the detail of the requested change', () => {
  isolatedHome();
  const root = project(
    [{ id: 'change-a', artifacts: ['proposal.md', 'design.md', 'tasks.md', 'change.json'] }],
    {
      change: [
        {
          id: 'change-a',
          nombre: 'change-a',
          porcentaje: 50,
          estado: 'in-progress',
          task: [
            { id: '1.1', descripcion: 'hecha', porcentaje: null, estatus: 'done' },
            { id: '1.2', descripcion: 'pendiente', porcentaje: null, estatus: 'todo' }
          ]
        }
      ]
    }
  );
  const report = runNativeStatus(root, 'change-a');
  assert.ok(report.detail, 'the detail of the change is reported');
  assert.equal(report.detail?.completed, 1);
  assert.equal(report.detail?.pending, 1);
  assert.deepEqual(report.detail?.artifacts, ['proposal.md', 'design.md', 'tasks.md', 'change.json']);
});

test('runNativeStatus derives the state of a legacy change from its tasks.md and labels it', () => {
  isolatedHome();
  const root = project([
    { id: 'legacy-change', tasks: ['1.1 primera', '1.2 segunda', '1.3 tercera'] }
  ]);
  const report = runNativeStatus(root);
  const change = report.changes[0];
  assert.equal(change.unregistered, true);
  assert.equal(change.label, 'sin registro');
  assert.equal(change.completed, 2);
  assert.equal(change.pending, 1);
  // The derivation is the one of the progress registry: a checkbox can only be
  // done or pending, so the state is `todo` and the percentage is 2/3.
  assert.equal(change.estado, 'todo');
  assert.equal(change.porcentaje, 67);
});

test('runNativeStatus cross-checks the registry and labels the referenced change', () => {
  isolatedHome();
  const root = project(
    [
      { id: 'change-a' },
      { id: 'change-b' }
    ],
    {
      change: [
        { id: 'change-a', nombre: 'change-a', porcentaje: 0, estado: 'todo', task: [] }
      ]
    }
  );
  registry(root, ['change-a']);
  const report = runNativeStatus(root);
  assert.equal(report.registryChecked, true);
  assert.equal(report.changes.find((c) => c.id === 'change-a')?.archived, true);
  assert.equal(report.changes.find((c) => c.id === 'change-a')?.label, 'archivado');
  assert.equal(report.changes.find((c) => c.id === 'change-b')?.archived, false);
});

test('runNativeStatus skips the registry cross-check when there is no registry', () => {
  isolatedHome();
  const root = project([{ id: 'change-a' }]);
  const report = runNativeStatus(root);
  assert.equal(report.registryChecked, false);
  assert.equal(report.changes[0].archived, false);
  assert.equal(report.changes[0].label, 'sin registro');
});

test('runNativeStatus never writes the registry nor the progress registry', () => {
  isolatedHome();
  const root = project([{ id: 'change-a', tasks: ['1.1 primera'] }]);
  const registryPath = join(root, '.sdd-registry', 'REGISTRY.md');
  const progressPath = join(root, 'spec', 'progress.json');
  const tasksPath = join(root, 'spec', 'change-a', 'tasks.md');
  const tasksBefore = readFileSync(tasksPath, 'utf8');
  const before = {
    registry: existsSync(registryPath),
    progress: existsSync(progressPath)
  };
  runNativeStatus(root);
  runNativeStatus(root, 'change-a');
  assert.equal(existsSync(registryPath), before.registry, 'the registry is never created');
  assert.equal(existsSync(progressPath), before.progress, 'the progress registry is never created');
  assert.equal(
    readFileSync(tasksPath, 'utf8'),
    tasksBefore,
    'the tasks.md of the change is never rewritten'
  );
});
