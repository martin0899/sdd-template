import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSpecFolder, validateSpecComplete, registerSpec } from '../../src/core/spec-workflow';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-spec-'));
  created.push(dir);
  return dir;
}

test('createSpecFolder creates folder with 3 files', () => {
  const root = scratch();
  const dir = createSpecFolder(root, 'TestProject', 'my-spec');
  assert.ok(existsSync(join(dir, 'briefing.md')));
  assert.ok(existsSync(join(dir, 'tests.md')));
  assert.ok(existsSync(join(dir, 'resumen.md')));
});

test('createSpecFolder throws when folder exists', () => {
  const root = scratch();
  createSpecFolder(root, 'TestProject', 'my-spec');
  assert.throws(() => createSpecFolder(root, 'TestProject', 'my-spec'));
});

test('validateSpecComplete fails when files are empty', () => {
  const root = scratch();
  createSpecFolder(root, 'TestProject', 'my-spec');
  const result = validateSpecComplete(root, 'TestProject', 'my-spec');
  assert.equal(result.valid, false);
  assert.equal(result.emptyFiles.length, 3);
});

test('validateSpecComplete passes when files are filled', () => {
  const root = scratch();
  const dir = createSpecFolder(root, 'TestProject', 'my-spec');
  for (const f of ['briefing.md', 'tests.md', 'resumen.md']) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const filled = raw.replace('_Pendiente_', 'Contenido real de la especificación con detalle suficiente.');
    require('node:fs').writeFileSync(join(dir, f), filled, 'utf8');
  }
  const result = validateSpecComplete(root, 'TestProject', 'my-spec');
  assert.equal(result.valid, true);
  assert.equal(result.emptyFiles.length, 0);
});

test('registerSpec appends row to REGISTRY.md', () => {
  const root = scratch();
  registerSpec(root, 'my-spec', 'TestProject');
  const reg = readFileSync(join(root, 'docs', 'requirements', 'REGISTRY.md'), 'utf8');
  assert.ok(reg.includes('my-spec'));
});
