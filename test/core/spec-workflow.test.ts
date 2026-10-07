import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSpecFolder, validateSpecComplete, registerSpec, CANONICAL_HEADINGS } from '../../src/core/spec-workflow';
import { LEGACY_SPEC_FILES } from '../../src/core/spec-artifact';

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

test('createSpecFolder produces exactly one folder note <spec-id>.md', () => {
  const root = scratch();
  const res = createSpecFolder(root, 'TestProject', 'my-spec');
  assert.ok(existsSync(join(res.specDir, 'my-spec.md')));
  assert.deepEqual(readdirSync(res.specDir), ['my-spec.md']);
  assert.ok(!existsSync(join(res.specDir, 'briefing.md')));
  const raw = readFileSync(join(res.specDir, 'my-spec.md'), 'utf8');
  for (const h of CANONICAL_HEADINGS) assert.match(raw, new RegExp(`## ${h}`));
  assert.match(raw, /id: spec-my-spec/);
  assert.match(raw, /Tipo: Especificación/);
});

test('createSpecFolder throws when folder exists', () => {
  const root = scratch();
  createSpecFolder(root, 'TestProject', 'my-spec');
  assert.throws(() => createSpecFolder(root, 'TestProject', 'my-spec'));
});

test('validateSpecComplete fails on empty folder note (placeholders)', () => {
  const root = scratch();
  createSpecFolder(root, 'TestProject', 'my-spec');
  const result = validateSpecComplete(root, 'TestProject', 'my-spec');
  assert.equal(result.valid, false);
  assert.deepEqual(result.emptyFiles, ['my-spec.md']);
});

test('validateSpecComplete passes when all canonical sections are filled', () => {
  const root = scratch();
  const { specDir } = createSpecFolder(root, 'TestProject', 'my-spec');
  const raw = readFileSync(join(specDir, 'my-spec.md'), 'utf8');
  const filled = raw.replace(/_Pendiente_/g, 'Contenido real de la especificación con detalle suficiente.');
  writeFileSync(join(specDir, 'my-spec.md'), filled, 'utf8');
  const result = validateSpecComplete(root, 'TestProject', 'my-spec');
  assert.equal(result.valid, true);
  assert.equal(result.emptyFiles.length, 0);
});

test('legacy-only folder validates as conformant (coexistence)', () => {
  const root = scratch();
  const specDir = join(root, '01_Proyectos', 'TestProject', 'legacy-spec');
  mkdirSync(specDir, { recursive: true });
  for (const f of LEGACY_SPEC_FILES) {
    writeFileSync(join(specDir, f), '---\nid: brief-legacy-spec\n---\n\nContenido real con detalle suficiente para pasar la validación.', 'utf8');
  }
  const result = validateSpecComplete(root, 'TestProject', 'legacy-spec');
  assert.equal(result.valid, true, 'legacy trio must be accepted without errors');
});

test('folder without any layout produces a controlled finding naming the folder note', () => {
  const root = scratch();
  const specDir = join(root, '01_Proyectos', 'TestProject', 'empty-spec');
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'loose.md'), '# Loose\n', 'utf8');
  const result = validateSpecComplete(root, 'TestProject', 'empty-spec');
  assert.equal(result.valid, false);
  assert.deepEqual(result.emptyFiles, ['empty-spec.md']);
});

test('registerSpec points the row to the folder note and stays idempotent', () => {
  const root = scratch();
  registerSpec(root, 'my-spec', 'TestProject');
  registerSpec(root, 'my-spec', 'TestProject');
  const reg = readFileSync(join(root, '.sdd-registry', 'REGISTRY.md'), 'utf8');
  assert.ok(reg.includes('TestProject/my-spec/my-spec.md'));
  const rows = reg.split('\n').filter((l) => l.startsWith('| TestProject/my-spec |'));
  assert.equal(rows.length, 1, 'una sola fila registrada (idempotente por specId)');
});

test('registerSpec writes REGISTRY in project root, not in parent of separate vault', () => {
  const base = scratch();
  const projectRoot = join(base, 'test-project');
  const vaultRoot = join(base, 'test-vault');
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(vaultRoot, { recursive: true });

  registerSpec(projectRoot, 'my-spec', 'TestProject');

  assert.ok(existsSync(join(projectRoot, '.sdd-registry', 'REGISTRY.md')));
  assert.ok(!existsSync(join(base, '.sdd-registry')));
  assert.ok(!existsSync(join(vaultRoot, '.sdd-registry')));
});