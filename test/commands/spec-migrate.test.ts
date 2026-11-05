import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSpecMigrate } from '../../src/commands/spec-migrate';
import { readProgress } from '../../src/core/progress-registry';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-spec-migrate-'));
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

function legacyChange(
  root: string,
  id: string,
  files: Record<string, string> = {
    'proposal.md': `# Propuesta: ${id}\n\n## Why\n\nPorque sí.\n`,
    'design.md': `# Design: ${id}\n`,
    'tasks.md': `# Tasks: ${id}\n\n- [ ] 1.1 Primera tarea\n- [x] 1.2 Segunda tarea\n`
  }
): string {
  const dir = join(root, 'openspec', 'changes', id);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, 'utf8');
  }
  return dir;
}

test('spec migrate moves the legacy files and merges the progress entry', async () => {
  const root = scratch();
  legacyChange(root, 'change-a');
  const { code } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  const target = join(root, 'spec', 'change-a');
  assert.ok(existsSync(join(target, 'proposal.md')), 'proposal.md must be moved');
  assert.ok(existsSync(join(target, 'design.md')), 'design.md must be moved');
  assert.ok(existsSync(join(target, 'tasks.md')), 'tasks.md must be moved');
  assert.equal(existsSync(join(root, 'openspec', 'changes', 'change-a', 'proposal.md')), false);

  const entry = readProgress(root).change.find((c) => c.id === 'change-a');
  assert.ok(entry, 'the change must be registered in the progress registry');
  assert.deepEqual(entry.task.map((t) => t.id), ['1.1', '1.2']);
  assert.equal(entry.task.find((t) => t.id === '1.2')?.estatus, 'done');
});

test('spec migrate is idempotent', async () => {
  const root = scratch();
  legacyChange(root, 'change-a');
  await capture(() => runSpecMigrate({ projectRoot: root }));
  const { code, out } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /no hay changes legacy para migrar/);
  assert.equal(readProgress(root).change.filter((c) => c.id === 'change-a').length, 1);
});

test('spec migrate reports the archived changes as already closed and never moves them', async () => {
  const root = scratch();
  const archived = join(root, 'openspec', 'changes', 'archive', '2026-09-29-change-old');
  mkdirSync(archived, { recursive: true });
  writeFileSync(join(archived, 'tasks.md'), '# Tasks: change-old\n', 'utf8');
  const { code, out } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /change-old/);
  assert.match(out, /ya cerrados/);
  assert.ok(existsSync(join(archived, 'tasks.md')), 'the archived change must stay where it is');
});

test('spec migrate --dry-run lists the plan and writes nothing', async () => {
  const root = scratch();
  legacyChange(root, 'change-a');
  const { code, out } = await capture(() => runSpecMigrate({ projectRoot: root, dryRun: true }));
  assert.equal(code, 0);
  assert.match(out, /change-a/);
  assert.equal(existsSync(join(root, 'spec', 'change-a')), false, 'nothing must be created');
  assert.ok(existsSync(join(root, 'openspec', 'changes', 'change-a', 'proposal.md')), 'nothing must be moved');
  assert.deepEqual(readProgress(root).change, [], 'the registry must stay untouched');
});

test('spec migrate reports that there is nothing to migrate', async () => {
  const root = scratch();
  const { code, out } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(out, /no hay changes legacy para migrar/);
});

test('spec migrate keeps the changes migrated before a failure and names the failed one', async () => {
  const root = scratch();
  legacyChange(root, 'aaa-change');
  legacyChange(root, 'zzz-blocked');
  // A file where the folder of the change should be: the migration of that
  // change cannot complete.
  mkdirSync(join(root, 'spec'), { recursive: true });
  writeFileSync(join(root, 'spec', 'zzz-blocked'), 'not a folder', 'utf8');
  const { code, err } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 1);
  assert.match(err, /zzz-blocked/, 'the error must name the failed change');
  assert.ok(existsSync(join(root, 'spec', 'aaa-change', 'tasks.md')), 'the previous change stays migrated');
  assert.ok(readProgress(root).change.some((c) => c.id === 'aaa-change'));
});

test('spec migrate creates the change.json of a legacy change that lacks it', async () => {
  const root = scratch();
  legacyChange(root, 'change-a');
  const { code } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  const raw = JSON.parse(readFileSync(join(root, 'spec', 'change-a', 'change.json'), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(raw), ['id', 'nombre', 'fecha', 'estado', 'resumen', 'enlaces']);
  assert.equal(raw.id, 'change-a');
  assert.deepEqual(raw.resumen, { abstracto: '' });
  assert.deepEqual(raw.enlaces, []);
});

test('spec migrate warns about a change that lives in both layouts and never duplicates it', async () => {
  const root = scratch();
  legacyChange(root, 'change-a');
  mkdirSync(join(root, 'spec', 'change-a'), { recursive: true });
  writeFileSync(join(root, 'spec', 'change-a', 'tasks.md'), '# Tasks: change-a\n', 'utf8');
  const { code, out, err } = await capture(() => runSpecMigrate({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(`${out}${err}`, /change-a/);
  assert.match(`${out}${err}`, /ambos layouts/);
  assert.equal(readProgress(root).change.filter((c) => c.id === 'change-a').length, 0);
});
