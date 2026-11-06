import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let home: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  home = mkdtempSync(join(tmpdir(), 'spectralis-specnative-home-'));
  baseEnv = { ...process.env, HOME: home };
});

after(() => {
  rmSync(home, { recursive: true, force: true });
});

const TASKS_MD = `# Tasks: change-a

## 1. Core

- [ ] 1.1 Write the tests
- [ ] 1.2 Implement the module
`;

function makeProject(changes: Array<{ id: string; tasks?: string }>): string {
  const root = mkdtempSync(join(tmpdir(), 'spectralis-specnative-'));
  // The CLI suite exercises the command wiring, not the layout: the legacy
  // layout is pinned explicitly so the fixture does not depend on the default.
  writeFileSync(
    join(root, '.sdd-manifest.json'),
    JSON.stringify({ schemaVersion: 3, spec_dir: 'openspec/changes' }, null, 2) + '\n',
    'utf8'
  );
  for (const change of changes) {
    const dir = join(root, 'openspec', 'changes', change.id);
    mkdirSync(dir, { recursive: true });
    if (change.tasks !== undefined) writeFileSync(join(dir, 'tasks.md'), change.tasks, 'utf8');
  }
  return root;
}

/** A project with the native layout (`spec/<id>/`), the default since F2. */
function makeNativeProject(changes: Array<{ id: string; tasks?: string }>): string {
  const root = mkdtempSync(join(tmpdir(), 'spectralis-specnative-native-'));
  writeFileSync(
    join(root, '.sdd-manifest.json'),
    JSON.stringify({ schemaVersion: 3 }, null, 2) + '\n',
    'utf8'
  );
  for (const change of changes) {
    const dir = join(root, 'spec', change.id);
    mkdirSync(dir, { recursive: true });
    if (change.tasks !== undefined) writeFileSync(join(dir, 'tasks.md'), change.tasks, 'utf8');
  }
  return root;
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { env: baseEnv, cwd, encoding: 'utf8' });
}

test('spectralis view without changes reports that there are none', () => {
  const root = makeProject([]);
  const r = runCli(['view'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /no hay changes activos/);
});

test('spectralis view lists the changes of the project', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['view'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /change-a/);
});

test('spectralis view <change> shows the detail and the "sin registro" state', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['view', 'change-a'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /sin registro/);
  assert.match(r.stdout, /\[ \] 1\.1 Write the tests/);
});

test('spectralis view <change> fails with exit code 2 when the change does not exist', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['view', 'ghost'], root);
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.match(r.stderr, /ghost/);
});

test('spectralis task --done writes the registry and mirrors tasks.md', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['task', 'change-a', '1.1', '--done'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const registryPath = join(root, 'spec', 'progress.json');
  assert.ok(existsSync(registryPath), 'the registry must be written');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    change: Array<{ id: string; porcentaje: number; estado: string; task: Array<{ id: string; estatus: string }> }>;
  };
  assert.equal(registry.change[0].id, 'change-a');
  assert.equal(registry.change[0].task.find((t) => t.id === '1.1')?.estatus, 'done');
  assert.equal(registry.change[0].porcentaje, 50);
  assert.match(readFileSync(join(root, 'openspec', 'changes', 'change-a', 'tasks.md'), 'utf8'), /- \[x\] 1\.1/);
});

test('spectralis task fails with exit code 2 for an unknown task and with 3 for an ambiguous one', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const missing = runCli(['task', 'change-a', '9.9', '--done'], root);
  assert.equal(missing.status, 2, missing.stderr + missing.stdout);
  const ambiguous = runCli(['task', 'change-a', '1', '--done'], root);
  assert.equal(ambiguous.status, 3, ambiguous.stderr + ambiguous.stdout);
  assert.match(ambiguous.stderr, /1\.1/);
  assert.match(ambiguous.stderr, /1\.2/);
});

test('spectralis view shows the registered progress after a task update', () => {
  const root = makeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  runCli(['task', 'change-a', '1.1', '--done'], root);
  const r = runCli(['view', 'change-a'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /50%/);
  assert.match(r.stdout, /\[x\] 1\.1 Write the tests/);
});

test('spectralis spec status lists the native changes of the project', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['spec', 'status'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /change-a/);
  assert.match(r.stdout, /sin registro/);
});

test('spectralis spec status <change> shows the detail of the change', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['spec', 'status', 'change-a'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /change-a/);
  assert.match(r.stdout, /Tareas:/);
});

test('spectralis spec status <change> fails when the change does not exist', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['spec', 'status', 'ghost'], root);
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(r.stderr, /ghost/);
});

test('spectralis spec validate <change> passes when every artifact is present', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  for (const artifact of ['proposal.md', 'design.md']) {
    writeFileSync(join(root, 'spec', 'change-a', artifact), `# ${artifact}\n`, 'utf8');
  }
  const r = runCli(['spec', 'validate', 'change-a'], root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /change change-a is valid/);
});

test('spectralis spec validate <change> fails when an artifact is missing', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['spec', 'validate', 'change-a'], root);
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(r.stderr, /change change-a is missing: proposal\.md, design\.md/);
});

test('spectralis spec validate without a change id fails with a usage message', () => {
  const root = makeNativeProject([{ id: 'change-a', tasks: TASKS_MD }]);
  const r = runCli(['spec', 'validate'], root);
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(r.stderr, /Usage: spectralis spec validate/);
});

test('spectralis spec --help mentions the status and validate actions', () => {
  const r = runCli(['spec', '--help'], process.cwd());
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /status/);
  assert.match(r.stdout, /validate/);
});
