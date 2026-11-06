import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSpecCreate } from '../../src/commands/spec-create';
import { readProgress } from '../../src/core/progress-registry';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-spec-create-'));
  created.push(dir);
  return dir;
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

test('spec create writes the seeds, the change.json and the first progress entry', async () => {
  const root = scratch();
  const { code } = await capture(() =>
    runSpecCreate({ changeId: 'my-change', nombre: 'Mi cambio', projectRoot: root })
  );
  assert.equal(code, 0);
  const dir = join(root, 'spec', 'my-change');
  assert.ok(existsSync(join(dir, 'proposal.md')), 'proposal.md must exist');
  assert.ok(existsSync(join(dir, 'tasks.md')), 'tasks.md must exist');
  assert.ok(existsSync(join(dir, 'design.md')), 'design.md must exist');
  assert.match(readFileSync(join(dir, 'proposal.md'), 'utf8'), /^# Propuesta: my-change$/m);
  assert.match(readFileSync(join(dir, 'tasks.md'), 'utf8'), /^# Tasks: my-change$/m);
  assert.match(readFileSync(join(dir, 'design.md'), 'utf8'), /^# Design: my-change$/m);

  const change = JSON.parse(readFileSync(join(dir, 'change.json'), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(change), ['id', 'nombre', 'fecha', 'estado', 'resumen', 'enlaces']);
  assert.equal(change.id, 'my-change');
  assert.equal(change.nombre, 'Mi cambio');
  assert.equal(change.estado, 'open');
  assert.deepEqual(change.resumen, { abstracto: '' });
  assert.deepEqual(change.enlaces, []);

  const registry = readProgress(root);
  const entry = registry.change.find((c) => c.id === 'my-change');
  assert.ok(entry, 'the change must be registered in the progress registry');
  assert.equal(entry.nombre, 'Mi cambio');
  assert.equal(entry.porcentaje, 0);
  assert.equal(entry.estado, 'todo');
  assert.deepEqual(entry.task, []);
});

test('spec create fails with exit code 2 when the change already exists and never overwrites it', async () => {
  const root = scratch();
  mkdirSync(join(root, 'spec', 'my-change'), { recursive: true });
  writeFileSync(join(root, 'spec', 'my-change', 'proposal.md'), 'contenido previo', 'utf8');
  const { code, err } = await capture(() =>
    runSpecCreate({ changeId: 'my-change', nombre: 'Mi cambio', projectRoot: root })
  );
  assert.equal(code, 2);
  assert.match(err, /my-change/);
  assert.equal(readFileSync(join(root, 'spec', 'my-change', 'proposal.md'), 'utf8'), 'contenido previo');
});

test('spec create rejects an invalid change id', async () => {
  const root = scratch();
  for (const invalid of ['my change', 'my/change', '..', '../escape']) {
    const { code, err } = await capture(() => runSpecCreate({ changeId: invalid, projectRoot: root }));
    assert.equal(code, 1, `the id "${invalid}" must be rejected`);
    assert.match(err, /kebab-case/);
  }
  assert.equal(existsSync(join(root, 'spec')), false, 'nothing must be written');
});

test('the progress entry of a new change has no tasks until tasks.md declares them', async () => {
  const root = scratch();
  const { code } = await capture(() => runSpecCreate({ changeId: 'seeded-change', projectRoot: root }));
  assert.equal(code, 0);
  const seed = readFileSync(join(root, 'spec', 'seeded-change', 'tasks.md'), 'utf8');
  assert.doesNotMatch(seed, /- \[.\]/, 'the seed of tasks.md declares no task');
  const entry = readProgress(root).change.find((c) => c.id === 'seeded-change');
  assert.ok(entry);
  assert.deepEqual(entry.task, [], 'without checkboxes the entry carries no task');
});

test('spec create resolves the folder with resolveChangesDir', async () => {
  const root = scratch();
  writeFileSync(
    join(root, '.sdd-manifest.json'),
    JSON.stringify({ schemaVersion: 3, spec_dir: 'openspec/changes' }, null, 2) + '\n',
    'utf8'
  );
  const { code } = await capture(() => runSpecCreate({ changeId: 'legacy-change', projectRoot: root }));
  assert.equal(code, 0);
  assert.ok(existsSync(join(root, 'openspec', 'changes', 'legacy-change', 'change.json')));
  assert.equal(existsSync(join(root, 'spec', 'legacy-change')), false);
});
