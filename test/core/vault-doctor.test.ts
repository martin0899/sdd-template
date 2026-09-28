import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseRegistry,
  checkChangesWithoutRegistry,
  checkOrphanedRegistryEntries,
  checkMissingBriefings,
  checkIndexMisaligned,
  checkUndistilled,
  checkRegistryConsistency,
  hasErrors
} from '../../src/core/vault-doctor';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-doctor-'));
  created.push(dir);
  return dir;
}

function writeRepo(root: string, changes: string[]): void {
  mkdirSync(join(root, 'openspec', 'changes', 'archive'), { recursive: true });
  mkdirSync(join(root, '.sdd-registry', 'briefings'), { recursive: true });
  for (const c of changes) mkdirSync(join(root, 'openspec', 'changes', c), { recursive: true });
}

function writeVault(root: string, project: string, specs: string[]): void {
  mkdirSync(join(root, '01_Proyectos', project), { recursive: true });
  mkdirSync(join(root, '05_wiki', project, 'decisiones'), { recursive: true });
  for (const s of specs) {
    mkdirSync(join(root, '01_Proyectos', project, s), { recursive: true });
    writeFileSync(join(root, '01_Proyectos', project, s, 'briefing.md'), '# Briefing\n', 'utf8');
  }
}

const REGISTRY = `# Requirements Registry

| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/add-a | add-a | Spec/add-a/briefing.md | add-a | completada |
| Spec/add-b | add-b | Spec/add-b/briefing.md | add-b | completada |
`;

test('parseRegistry parses table rows', () => {
  const rows = parseRegistry(REGISTRY);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].requerimiento, 'add-a');
  assert.equal(rows[0].estado, 'completada');
});

test('checkChangesWithoutRegistry flags change in repo without registry row', () => {
  const root = scratch();
  writeRepo(root, ['add-a', 'add-unregistered']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = parseRegistry(REGISTRY);
  const findings = checkChangesWithoutRegistry(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('add-unregistered')));
  assert.ok(findings.every((f) => f.severity === 'error'));
});

test('checkChangesWithoutRegistry flags brain spec without registry row', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-brain-only']);
  const rows = parseRegistry(REGISTRY);
  const findings = checkChangesWithoutRegistry(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('add-brain-only')));
});

test('checkOrphanedRegistryEntries flags registered change with no folder', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = parseRegistry(REGISTRY + `| Spec/add-ghost | add-ghost | Spec/add-ghost/briefing.md | add-ghost | completada |\n`);
  const findings = checkOrphanedRegistryEntries(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('add-ghost')));
  assert.equal(findings.filter((f) => f.artifact.includes('add-ghost'))[0].severity, 'warning');
});

test('checkMissingBriefings flags registered change without briefing file', () => {
  const root = scratch();
  writeRepo(root, ['add-a', 'add-nobrief']);
  mkdirSync(join(root, 'openspec', 'changes', 'add-nobrief'), { recursive: true });
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = parseRegistry(REGISTRY + `| Spec/add-nobrief | add-nobrief | Spec/add-nobrief/briefing.md | add-nobrief | completada |\n`);
  const findings = checkMissingBriefings(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('add-nobrief')));
  assert.equal(findings.filter((f) => f.artifact.includes('add-nobrief'))[0].severity, 'error');
});

test('checkIndexMisaligned flags stale changes count', () => {
  const root = scratch();
  writeRepo(root, ['add-a', 'add-b']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  writeFileSync(
    join(vault, '05_wiki', '_INDEX.json'),
    JSON.stringify({ spec: { changes: 1, updated: new Date().toISOString() } }, null, 2) + '\n',
    'utf8'
  );
  const rows = parseRegistry(REGISTRY);
  const findings = checkIndexMisaligned(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('_INDEX.json')));
  assert.ok(findings.every((f) => f.severity === 'warning'));
});

test('checkUndistilled flags completed change without decision', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = parseRegistry(REGISTRY + `| Spec/add-undistilled | add-undistilled | Spec/add-undistilled/briefing.md | add-undistilled | completada |\n`);
  const findings = checkUndistilled(root, vault, rows);
  assert.ok(findings.some((f) => f.artifact.includes('add-undistilled')));
  assert.equal(findings.filter((f) => f.artifact.includes('add-undistilled'))[0].severity, 'warning');
});

test('checkRegistryConsistency aggregates all checks and hasErrors works', () => {
  const root = scratch();
  writeRepo(root, ['add-a', 'add-unregistered', 'add-nobrief']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  writeFileSync(
    join(vault, '05_wiki', '_INDEX.json'),
    JSON.stringify({ spec: { changes: 9, updated: '2000-01-01T00:00:00.000Z' } }, null, 2) + '\n',
    'utf8'
  );
  const registry = REGISTRY + `| Spec/add-nobrief | add-nobrief | Spec/add-nobrief/briefing.md | add-nobrief | completada |\n`;
  writeFileSync(join(root, '.sdd-registry', 'REGISTRY.md'), registry, 'utf8');
  const findings = checkRegistryConsistency({ projectRoot: root, vaultRoot: vault });
  assert.ok(findings.length >= 3);
  assert.ok(hasErrors(findings));
});

test('fixtures registry-doctor trigger the expected findings', () => {
  const repo = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'registry-doctor', 'repo');
  const vault = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'registry-doctor', 'vault');
  const findings = checkRegistryConsistency({ projectRoot: repo, vaultRoot: vault });
  assert.ok(findings.some((f) => f.artifact.includes('add-unregistered')), 'change sin registro');
  assert.ok(findings.some((f) => f.artifact.includes('add-ghost')), 'referencia huérfana');
  assert.ok(findings.some((f) => f.artifact.includes('add-nobrief')), 'briefing faltante');
  assert.ok(findings.some((f) => f.artifact.includes('_INDEX.json')), 'índice desalineado');
  assert.ok(hasErrors(findings));
});