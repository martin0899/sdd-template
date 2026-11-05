import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSpecArchive } from '../../src/commands/spec-archive';
import { readProgress, writeProgress } from '../../src/core/progress-registry';

const created: string[] = [];
let originalHome: string | undefined;

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  originalHome = undefined;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-spec-archive-'));
  created.push(dir);
  return dir;
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

const TASKS_MD = `# Tasks: my-change

- [x] 1.1 Primera tarea
- [x] 1.2 Segunda tarea
`;

function makeChange(root: string, id = 'my-change', tasks = TASKS_MD): string {
  const dir = join(root, 'spec', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), tasks, 'utf8');
  writeFileSync(join(dir, 'proposal.md'), `# Propuesta: ${id}\n\n## Why\n\nPorque sí.\n`, 'utf8');
  writeFileSync(join(dir, 'design.md'), `# Design: ${id}\n`, 'utf8');
  writeFileSync(
    join(dir, 'change.json'),
    JSON.stringify(
      {
        id,
        nombre: 'Mi change',
        fecha: '2026-11-05',
        estado: 'open',
        resumen: { abstracto: 'El ciclo nativo de los changes.' },
        enlaces: []
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  return dir;
}

function doneRegistry(root: string, id = 'my-change'): void {
  writeProgress(root, {
    change: [
      {
        id,
        nombre: id,
        porcentaje: 100,
        estado: 'done',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [
          { id: '1.1', descripcion: 'Primera tarea', porcentaje: null, estatus: 'done' },
          { id: '1.2', descripcion: 'Segunda tarea', porcentaje: null, estatus: 'done' }
        ]
      }
    ]
  });
}

test('spec archive moves the change, writes the brain summary and completes the REGISTRY row', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  const { code } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
  );
  assert.equal(code, 0);
  assert.equal(existsSync(join(root, 'spec', 'my-change')), false, 'the change must leave its folder');
  assert.ok(existsSync(join(root, 'spec', '_archived', 'my-change', 'tasks.md')), 'the change must be archived');

  const wiki = join(vault, '05_wiki', 'Spectralis', 'my-change.md');
  assert.ok(existsSync(wiki), 'the brain summary must be written');
  const content = readFileSync(wiki, 'utf8');
  assert.match(content, /^id: wiki-my-change$/m);
  assert.match(content, /El ciclo nativo de los changes\./);

  const registry = readFileSync(join(root, '.sdd-registry', 'REGISTRY.md'), 'utf8');
  assert.match(registry, /my-change/);
  assert.match(registry, /completada/);
});

test('spec archive refuses to archive a change with pending tasks', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  writeProgress(root, {
    change: [
      {
        id: 'my-change',
        nombre: 'my-change',
        porcentaje: 50,
        estado: 'todo',
        updatedAt: '2026-11-05T10:00:00.000Z',
        task: [
          { id: '1.1', descripcion: 'Primera tarea', porcentaje: null, estatus: 'done' },
          { id: '1.2', descripcion: 'Segunda tarea', porcentaje: null, estatus: 'todo' }
        ]
      }
    ]
  });
  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
  );
  assert.equal(code, 2);
  assert.match(err, /1\.2/, 'the pending task must be listed');
  assert.ok(existsSync(join(root, 'spec', 'my-change')), 'nothing must be moved');
});

test('spec archive --force archives a change with pending tasks and warns about them', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root, 'my-change', '# Tasks: my-change\n\n- [x] 1.1 Primera tarea\n- [ ] 1.2 Segunda tarea\n');
  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault, force: true })
  );
  assert.equal(code, 0);
  assert.match(err, /1\.2/, 'the forced task must be listed');
  assert.ok(existsSync(join(root, 'spec', '_archived', 'my-change', 'tasks.md')));
});

test('spec archive archives locally and skips the brain write when the vault root is not resolvable', async () => {
  const root = scratch();
  const home = scratch();
  originalHome = process.env.HOME;
  process.env.HOME = home;
  makeChange(root);
  doneRegistry(root);
  const { code, err } = await capture(() => runSpecArchive({ changeId: 'my-change', projectRoot: root }));
  assert.equal(code, 0, 'the archive must not fail when there is no vault');
  assert.match(err, /vault/i);
  assert.ok(existsSync(join(root, 'spec', '_archived', 'my-change', 'tasks.md')), 'the change is archived anyway');
});

test('spec archive never invokes the openspec binary', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  const childProcess = require('node:fs') && require('node:child_process');
  const originalSpawn = childProcess.spawn;
  const originalSpawnSync = childProcess.spawnSync;
  childProcess.spawn = () => {
    throw new Error('the openspec binary must not be invoked');
  };
  childProcess.spawnSync = () => {
    throw new Error('the openspec binary must not be invoked');
  };
  try {
    const { code } = await capture(() =>
      runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
    );
    assert.equal(code, 0);
  } finally {
    childProcess.spawn = originalSpawn;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('spec archive fails with exit code 2 when the change does not exist', async () => {
  const root = scratch();
  const vault = scratch();
  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'ghost', projectRoot: root, vaultRoot: vault })
  );
  assert.equal(code, 2);
  assert.match(err, /ghost/);
});

test('spec archive removes the entry of the change from the progress registry', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  await capture(() => runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault }));
  assert.equal(readProgress(root).change.some((c) => c.id === 'my-change'), false);
});

test('spec archive aborts before the move when the REGISTRY cannot be written', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  // REGISTRY.md as a directory: reading it fails and the write cannot happen.
  mkdirSync(join(root, '.sdd-registry', 'REGISTRY.md'), { recursive: true });

  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
  );

  assert.notEqual(code, 0, 'the archive must fail');
  assert.match(err, /REGISTRY/i, 'the failure must be reported');
  assert.ok(existsSync(join(root, 'spec', 'my-change', 'tasks.md')), 'the change must stay in its place');
  assert.equal(existsSync(join(root, 'spec', '_archived')), false, 'nothing must be moved');
  assert.equal(existsSync(join(vault, '05_wiki')), false, 'nothing must be written in the vault');
});

test('spec archive fails with an explicit error when the change cannot be moved', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  // `_archived` as a file: the move cannot land inside it.
  writeFileSync(join(root, 'spec', '_archived'), 'bloqueado', 'utf8');

  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
  );

  assert.notEqual(code, 0, 'the archive must fail');
  assert.match(err, /mover/i, 'the failure must be reported');
  assert.ok(existsSync(join(root, 'spec', 'my-change', 'tasks.md')), 'the change must stay in its place');
});

test('spec archive warns and skips the brain write when the summary already exists', async () => {
  const root = scratch();
  const vault = scratch();
  makeChange(root);
  doneRegistry(root);
  const wiki = join(vault, '05_wiki', 'Spectralis');
  mkdirSync(wiki, { recursive: true });
  const existing = join(wiki, 'my-change.md');
  writeFileSync(existing, 'contenido previo\n', 'utf8');

  const { code, err } = await capture(() =>
    runSpecArchive({ changeId: 'my-change', projectRoot: root, vaultRoot: vault })
  );

  assert.equal(code, 0, 'the local archive must complete');
  assert.match(err, /no se sobrescribe/i, 'the skip must be warned');
  assert.ok(err.includes(existing), 'the path of the existing summary must be printed');
  assert.equal(readFileSync(existing, 'utf8'), 'contenido previo\n', 'the previous summary must survive');
  assert.ok(existsSync(join(root, 'spec', '_archived', 'my-change', 'tasks.md')), 'the change is archived anyway');
});

test('spec archive rejects a change id that would escape its folder', async () => {
  const root = scratch();
  const vault = scratch();
  const invalid = ['..', '../escape', 'nested/change', 'nested\\change', '/abs/change', 'bad\0id'];
  for (const id of invalid) {
    const { code, err } = await capture(() =>
      runSpecArchive({ changeId: id, projectRoot: root, vaultRoot: vault })
    );
    assert.equal(code, 2, `the id "${id}" must be rejected`);
    assert.match(err, /change-id/i, `the id "${id}" must be reported`);
  }
  assert.equal(existsSync(join(root, 'spec')), false, 'nothing must be written in the project');
  assert.equal(existsSync(join(vault, '05_wiki')), false, 'nothing must be written in the vault');
});
