import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateIdFormat,
  scanVaultIds,
  checkIdPresent,
  checkIdFormat,
  checkIdUniqueness,
  checkIndexIdRegistration,
  checkIdTipoCoherente,
  checkVaultIds,
  loadIdsCache
} from '../../src/core/vault-ids';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-ids-'));
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

test('validateIdFormat accepts conformant ids and rejects invalid ones', () => {
  assert.equal(validateIdFormat('nota-20260926-doctor-consistencia'), null);
  assert.equal(validateIdFormat('proy-20260921-modernizacion-devops'), null);
  assert.equal(validateIdFormat('idea-20260923-qa-rag-playwright'), null);
  assert.equal(validateIdFormat('doc-docker'), null);
  assert.equal(validateIdFormat('rec-apis-chapur-cobro'), null);
  assert.equal(validateIdFormat('arc-20260101-proyecto-antiguo'), null);
  assert.equal(validateIdFormat('res-20260925-add-05-wiki-distill'), null);
  assert.equal(validateIdFormat('brief-add-05-wiki-distill'), null);
  assert.equal(validateIdFormat('test-add-05-wiki-distill'), null);
  assert.match(validateIdFormat('nota-doctor-consistencia') ?? '', /falta fecha/);
  assert.match(validateIdFormat('foo-20260926-doctor') ?? '', /prefijo inválido/);
  assert.match(validateIdFormat('nota-20260926-Doctor') ?? '', /slug inválido/);
  assert.match(validateIdFormat('nota-20260926-doctor espacio') ?? '', /slug inválido/);
  assert.match(validateIdFormat('nota-202609-doctor') ?? '', /falta fecha/);
});

test('checkIdPresent flags note without id', () => {
  const root = scratch();
  note(root, '00_Notas/no-id.md', undefined, 'Nota');
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIdPresent(entries, root);
  assert.ok(findings.some((f) => f.artifact.endsWith('no-id.md')));
  assert.ok(findings.every((f) => f.severity === 'error'));
});

test('checkIdFormat flags non-conformant id and accepts generated artifact prefixes', () => {
  const root = scratch();
  note(root, '00_Notas/bad.md', 'nota-doctor', 'Nota');
  note(root, '01_Proyectos/Spec/add-x/briefing.md', 'brief-add-x', 'Briefing');
  note(root, '01_Proyectos/Spec/add-x/tests.md', 'test-add-x', 'Tests');
  note(root, '01_Proyectos/Spec/add-x/resumen.md', 'res-add-x', 'Resumen');
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIdFormat(entries, root);
  assert.ok(findings.some((f) => f.artifact.endsWith('bad.md')));
  assert.ok(!findings.some((f) => f.artifact.includes('briefing.md')));
  assert.ok(!findings.some((f) => f.artifact.includes('tests.md')));
  assert.ok(!findings.some((f) => f.artifact.includes('resumen.md')));
});

test('checkIdUniqueness flags duplicated id listing both paths', () => {
  const root = scratch();
  note(root, '00_Notas/a.md', 'nota-20260926-misma', 'Nota');
  note(root, '01_Proyectos/Spec/b.md', 'nota-20260926-misma', 'Nota');
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIdUniqueness(entries, root);
  assert.equal(findings.length, 1);
  assert.ok(findings[0].artifact.includes('a.md'));
  assert.ok(findings[0].artifact.includes('b.md'));
});

test('checkIndexIdRegistration warns for unregistered content ids but not generated artifacts', () => {
  const root = scratch();
  note(root, '00_Notas/content.md', 'nota-20260926-content', 'Nota');
  note(root, '01_Proyectos/Spec/add-x/briefing.md', 'brief-add-x', 'Briefing');
  mkdirSync(join(root, '03_Recursos'), { recursive: true });
  writeFileSync(join(root, '03_Recursos', '_INDEX_ID.md'), '# Índice de IDs\n\n| ID | Nota |\n|---|---|\n', 'utf8');
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIndexIdRegistration(entries, root);
  assert.ok(findings.some((f) => f.artifact.endsWith('content.md')));
  assert.ok(!findings.some((f) => f.artifact.includes('briefing.md')));
  assert.ok(findings.every((f) => f.severity === 'warning'));
});

test('checkIndexIdRegistration passes when id is registered', () => {
  const root = scratch();
  note(root, '00_Notas/content.md', 'nota-20260926-content', 'Nota');
  mkdirSync(join(root, '03_Recursos'), { recursive: true });
  writeFileSync(
    join(root, '03_Recursos', '_INDEX_ID.md'),
    '# Índice de IDs\n\n| ID | Nota | Archivo |\n|---|---|---|\n| `nota-20260926-content` | Content | `00_Notas/content.md` |\n',
    'utf8'
  );
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIndexIdRegistration(entries, root);
  assert.equal(findings.length, 0);
});

test('checkIdTipoCoherente flags prefix/type mismatch', () => {
  const root = scratch();
  note(root, '00_Notas/mismatch.md', 'nota-20260926-x', 'Documentación');
  const { entries } = scanVaultIds({ vaultRoot: root });
  const findings = checkIdTipoCoherente(entries, root);
  assert.ok(findings.some((f) => f.artifact.endsWith('mismatch.md')));
  assert.ok(findings.every((f) => f.severity === 'error'));
});

test('scanVaultIds skips docs, 05_wiki and dot dirs', () => {
  const root = scratch();
  note(root, '00_Notas/ok.md', 'nota-20260926-ok', 'Nota');
  note(root, 'docs/whatever.md', 'doc-x', 'Documentación');
  note(root, '05_wiki/Spec/decisiones/x.md', 'add-x', 'Decisión');
  note(root, '.git/config.md', 'x-1', 'Nota');
  const { entries } = scanVaultIds({ vaultRoot: root });
  assert.equal(entries.length, 1);
  assert.ok(entries[0].path.endsWith('00_Notas/ok.md'));
});

test('scanVaultIds uses mtime cache and only reparses changed notes', () => {
  const root = scratch();
  note(root, '00_Notas/a.md', 'nota-20260926-a', 'Nota');
  note(root, '00_Notas/b.md', 'nota-20260926-b', 'Nota');
  const cacheRoot = join(root, '.spectralis');
  const first = scanVaultIds({ vaultRoot: root, cacheRoot });
  assert.equal(first.reparsed, 2);
  const cached = loadIdsCache(cacheRoot);
  assert.equal(cached.size, 2);

  const second = scanVaultIds({ vaultRoot: root, cacheRoot });
  assert.equal(second.reparsed, 0);

  const bPath = join(root, '00_Notas', 'b.md');
  const future = new Date(Date.now() + 5000);
  utimesSync(bPath, future, future);
  const third = scanVaultIds({ vaultRoot: root, cacheRoot });
  assert.equal(third.reparsed, 1);
});

test('checkVaultIds aggregates all id checks', () => {
  const root = scratch();
  note(root, '00_Notas/dup.md', 'nota-20260926-dup', 'Nota');
  note(root, '00_Notas/dup2.md', 'nota-20260926-dup', 'Nota');
  note(root, '00_Notas/bad.md', 'nota-bad', 'Nota');
  const { findings } = checkVaultIds({ vaultRoot: root });
  assert.ok(findings.some((f) => f.artifact.includes('dup.md')));
  assert.ok(findings.some((f) => f.artifact.includes('bad.md')));
});

test('fixtures vault-ids trigger duplicated, non-conformant and incoherent ids', () => {
  const vault = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'vault-ids');
  const cacheRoot = scratch();
  const { findings } = checkVaultIds({ vaultRoot: vault, cacheRoot });
  assert.ok(findings.some((f) => f.artifact.includes('dup-a.md') && f.suggestion.includes('duplicado')), 'id duplicado');
  assert.ok(findings.some((f) => f.artifact.includes('bad-format.md')), 'id no conforme');
  assert.ok(findings.some((f) => f.artifact.includes('tipo-mismatch.md')), 'tipo incoherente');
  assert.ok(!findings.some((f) => f.artifact.includes('briefing.md')), 'artefacto generado sin hallazgo de formato');
});