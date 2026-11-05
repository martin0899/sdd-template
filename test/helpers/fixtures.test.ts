import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  archivedChangeTasks,
  changeTasks,
  cleanupFixtures,
  scratch,
  scratchVault,
  writeArchivedChange,
  writeDecisiones,
  writeRegistry,
  writeRepo,
  writeVault
} from './fixtures';

afterEach(() => {
  cleanupFixtures();
});

test('scratch creates a directory that cleanupFixtures removes', () => {
  const dir = scratch('sp-fixtures-test-');
  assert.ok(existsSync(dir));
  cleanupFixtures();
  assert.equal(existsSync(dir), false);
});

test('writeRepo builds the openspec/changes and .sdd-registry layout', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  assert.ok(existsSync(join(root, 'openspec', 'changes', 'archive')));
  assert.ok(existsSync(join(root, 'openspec', 'changes', 'add-a')));
  assert.ok(existsSync(join(root, '.sdd-registry', 'briefings')));
});

test('writeArchivedChange builds the dated archive folder', () => {
  const root = scratch();
  writeRepo(root);
  writeArchivedChange(root, 'add-foo', '2026-09-29');
  assert.ok(existsSync(join(root, 'openspec', 'changes', 'archive', '2026-09-29-add-foo')));
});

test('changeTasks and archivedChangeTasks write tasks.md in the right place', () => {
  const root = scratch();
  changeTasks(root, 'add-foo', '- [ ] 1.1 do it\n');
  archivedChangeTasks(root, 'add-old', '- [x] 1.1 done\n');
  assert.equal(
    readFileSync(join(root, 'openspec', 'changes', 'add-foo', 'tasks.md'), 'utf8'),
    '- [ ] 1.1 do it\n'
  );
  assert.equal(
    readFileSync(join(root, 'openspec', 'changes', 'archive', 'add-old', 'tasks.md'), 'utf8'),
    '- [x] 1.1 done\n'
  );
});

test('writeRegistry writes REGISTRY.md and returns the parsed rows', () => {
  const root = scratch();
  const rows = writeRegistry(
    root,
    `| Spec/add-a | add-a | Spec/add-a/briefing.md | add-a | completada |\n`
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].changes[0], 'add-a');
  assert.ok(existsSync(join(root, '.sdd-registry', 'REGISTRY.md')));
});

test('writeVault builds the brain layout with the decisiones aggregate', () => {
  const root = scratch();
  writeVault(root, 'Spec', ['add-a']);
  assert.ok(existsSync(join(root, '01_Proyectos', 'Spec', 'add-a', 'briefing.md')));
  const decisiones = readFileSync(join(root, '05_wiki', 'Spec', 'decisiones.md'), 'utf8');
  assert.match(decisiones, /### add-a/);
  assert.match(decisiones, /id: decisiones/);
});

test('writeDecisiones writes one block per spec', () => {
  const root = scratch();
  writeDecisiones(root, 'Spec', ['add-a', 'add-b']);
  const decisiones = readFileSync(join(root, '05_wiki', 'Spec', 'decisiones.md'), 'utf8');
  assert.match(decisiones, /### add-a/);
  assert.match(decisiones, /### add-b/);
});

test('scratchVault creates the brain root without spec folders', () => {
  const vault = scratchVault();
  assert.ok(existsSync(join(vault, '01_Proyectos')));
});
