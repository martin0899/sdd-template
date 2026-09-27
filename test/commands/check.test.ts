import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCheck } from '../../src/commands/check';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-check-'));
  created.push(dir);
  return dir;
}

function note(root: string, rel: string, id?: string, tipo?: string): void {
  const path = join(root, rel);
  mkdirSync(join(path, '..'), { recursive: true });
  const fm: string[] = ['---'];
  if (id !== undefined) fm.push(`id: ${id}`);
  if (tipo !== undefined) fm.push(`Tipo: ${tipo}`);
  fm.push('---', '', `# ${rel}`);
  writeFileSync(path, fm.join('\n'), 'utf8');
}

test('check --registry returns exit 1 when errors are present', async () => {
  const root = scratch();
  const vault = scratch();
  mkdirSync(join(root, 'openspec', 'changes', 'add-unregistered'), { recursive: true });
  mkdirSync(join(root, '.sdd-registry', 'briefings'), { recursive: true });
  writeFileSync(
    join(root, '.sdd-registry', 'REGISTRY.md'),
    `# Requirements Registry\n\n| nota (ruta) | requerimiento | briefing | changes generados | estado |\n|-------------|---------------|----------|-------------------|--------|\n`,
    'utf8'
  );
  mkdirSync(join(vault, '05_wiki'), { recursive: true });
  mkdirSync(join(vault, '01_Proyectos', 'Spec'), { recursive: true });
  const code = await runCheck({ registry: true, projectRoot: root, vaultRoot: vault });
  assert.equal(code, 1);
});

test('check without flags also runs the registry sub-check', async () => {
  const root = scratch();
  const vault = scratch();
  mkdirSync(join(root, 'openspec', 'changes', 'add-a'), { recursive: true });
  mkdirSync(join(root, '.sdd-registry', 'briefings'), { recursive: true });
  writeFileSync(
    join(root, '.sdd-registry', 'REGISTRY.md'),
    `# Requirements Registry\n\n| nota (ruta) | requerimiento | briefing | changes generados | estado |\n|-------------|---------------|----------|-------------------|--------|\n`,
    'utf8'
  );
  mkdirSync(join(vault, '05_wiki'), { recursive: true });
  mkdirSync(join(vault, '01_Proyectos', 'Spec', 'add-a'), { recursive: true });
  writeFileSync(join(vault, '01_Proyectos', 'Spec', 'add-a', 'briefing.md'), '# Briefing\n', 'utf8');
  const code = await runCheck({ projectRoot: root, vaultRoot: vault });
  assert.equal(code, 1);
});

test('check --ids returns exit 1 when id errors are present', async () => {
  const root = scratch();
  const vault = scratch();
  note(vault, '00_Notas/bad.md', 'nota-bad', 'Nota');
  note(vault, '00_Notas/dup.md', 'nota-20260926-dup', 'Nota');
  note(vault, '00_Notas/dup2.md', 'nota-20260926-dup', 'Nota');
  const code = await runCheck({ ids: true, projectRoot: root, vaultRoot: vault });
  assert.equal(code, 1);
});

test('check --ids returns exit 0 when all ids are conformant', async () => {
  const root = scratch();
  const vault = scratch();
  mkdirSync(join(vault, '03_Recursos'), { recursive: true });
  writeFileSync(
    join(vault, '03_Recursos', '_INDEX_ID.md'),
    '# Índice de IDs\n\n| ID | Nota | Archivo |\n|---|---|---|\n| `nota-20260926-ok` | Ok | `00_Notas/ok.md` |\n',
    'utf8'
  );
  note(vault, '00_Notas/ok.md', 'nota-20260926-ok', 'Nota');
  const code = await runCheck({ ids: true, projectRoot: root, vaultRoot: vault });
  assert.equal(code, 0);
});