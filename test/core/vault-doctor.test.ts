import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
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
  listActiveChanges,
  listBrainSpecs,
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

/** Creates a `YYYY-MM-DD-<name>` folder under `openspec/changes/archive/`. */
function writeArchivedChange(root: string, specId: string, date = '2026-09-29'): void {
  mkdirSync(join(root, 'openspec', 'changes', 'archive', `${date}-${specId}`), { recursive: true });
}

/** Writes a REGISTRY.md into the repo fixture and parses it. */
function writeRegistry(root: string, table: string) {
  const content = `# Requirements Registry

| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
${table}`;
  mkdirSync(join(root, '.sdd-registry'), { recursive: true });
  writeFileSync(join(root, '.sdd-registry', 'REGISTRY.md'), content, 'utf8');
  return parseRegistry(content);
}

/** A vault with the project folder but no `01_Proyectos/<P>/<spec-id>/` entries. */
function scratchVault(): string {
  const dir = scratch();
  mkdirSync(join(dir, '01_Proyectos'), { recursive: true });
  return dir;
}

/**
 * Writes the vault fixture in the current 4-aggregate scheme: decisions live as
 * `### <spec-id>` blocks inside a single `decisiones.md`, not as per-spec files
 * under a `decisiones/` folder.
 */
function writeVault(root: string, project: string, specs: string[]): void {
  mkdirSync(join(root, '01_Proyectos', project), { recursive: true });
  mkdirSync(join(root, '05_wiki', project), { recursive: true });
  for (const s of specs) {
    mkdirSync(join(root, '01_Proyectos', project, s), { recursive: true });
    writeFileSync(join(root, '01_Proyectos', project, s, 'briefing.md'), '# Briefing\n', 'utf8');
  }
  writeDecisiones(root, project, specs);
}

/** Writes `05_wiki/<project>/decisiones.md` with one `### <spec-id>` block per spec. */
function writeDecisiones(root: string, project: string, specs: string[]): void {
  mkdirSync(join(root, '05_wiki', project), { recursive: true });
  const body = specs
    .map((s) => `### ${s}\n\nFuente: \`${s}\`\nEstado: completado\n\n## Contexto\nFixture.\n\n---\n`)
    .join('\n');
  writeFileSync(
    join(root, '05_wiki', project, 'decisiones.md'),
    `---\nid: decisiones\n---\n# Decisiones — ${project}\n\n${body}`,
    'utf8'
  );
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

test('parseRegistry splits two rows concatenated with || into two rows', () => {
  // Regression: a 13-cell line was parsed as a single row and cells 7-12 were
  // dropped silently, losing a real change from the registry.
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/update-skill-index-spec | update-skill-index-spec | Spec/update-skill-index-spec/briefing.md | update-skill-index-spec | completada || Spec/move-registry | move-registry | Spec/move-registry/briefing.md | move-registry | completada |
`
  );
  assert.equal(rows.length, 2, 'both rows must survive');
  assert.equal(rows[0].changes[0], 'update-skill-index-spec');
  assert.equal(rows[1].changes[0], 'move-registry', 'the second row must be recovered');
  assert.equal(rows[1].requerimiento, 'move-registry');
});

test('parseRegistry keeps the first row and discards the tail when cells are not a multiple of 6', () => {
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/add-a | add-a | Spec/add-a/briefing.md | add-a | completada | Spec/trailing | |
`
  );
  assert.equal(rows.length, 1, 'malformed remainder is discarded, not guessed');
  assert.equal(rows[0].changes[0], 'add-a');
});

test('checkOrphanedRegistryEntries does not treat requerimiento ids as changes', () => {
  // `requerimiento` holds nota-*/doc-* ids, which were never changes.
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = writeRegistry(
    root,
    `| Spec/_Notas/Plan | nota-20260929-plan | .sdd-registry/briefings/nota-20260929-plan.md | add-a | completada |\n`
  );
  const findings = checkOrphanedRegistryEntries(root, vault, rows);
  assert.deepEqual(findings, [], `requerimiento must not be validated as a change: ${JSON.stringify(findings)}`);
});

test('checkChangesWithoutRegistry does not treat requerimiento ids as changes', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = writeRegistry(
    root,
    `| Spec/_Notas/Plan | nota-20260929-plan | .sdd-registry/briefings/nota-20260929-plan.md | add-a | completada |\n`
  );
  assert.deepEqual(checkChangesWithoutRegistry(root, vault, rows), []);
});

test('checkOrphanedRegistryEntries recognises an archived change behind a date prefix', () => {
  // Regression: archive/ stores `2026-09-29-add-foo` while the registry says `add-foo`.
  const root = scratch();
  writeRepo(root, ['add-a']);
  writeArchivedChange(root, 'add-foo');
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-foo']);
  const rows = writeRegistry(
    root,
    `| Spec/add-foo | add-foo | Spec/add-foo/briefing.md | add-foo | completada |\n`
  );
  assert.deepEqual(checkOrphanedRegistryEntries(root, vault, rows), []);
});

test('checkOrphanedRegistryEntries stays silent for an archived change with no vault folder', () => {
  // An archived change is accounted for by openspec/changes/archive/ alone: its
  // record lives in the OpenSpec archive and the main spec, not in the vault. The
  // vault-folder convention only exists from 2026-09-25 onwards, so requiring it
  // retroactively would emit warnings that can never reach zero.
  const root = scratch();
  writeRepo(root, ['add-a']);
  writeArchivedChange(root, 'add-foo');
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = writeRegistry(
    root,
    `| Spec/add-foo | add-foo | Spec/add-foo/briefing.md | add-foo | completada |\n`
  );
  assert.deepEqual(checkOrphanedRegistryEntries(root, vault, rows), []);
});

test('checkOrphanedRegistryEntries still reports a truly dangling spec-id', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a']);
  const rows = writeRegistry(
    root,
    `| Spec/add-ghost | add-ghost | Spec/add-ghost/briefing.md | add-ghost | completada |\n`
  );
  const findings = checkOrphanedRegistryEntries(root, vault, rows);
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.ok(findings[0].artifact.includes('add-ghost'));
  assert.equal(findings[0].severity, 'warning');
});

test('contract: an archive folder name from this repo resolves without its date prefix', () => {
  const root = process.cwd();
  const archive = join(root, 'openspec', 'changes', 'archive');
  const names = readdirSync(archive, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const prefixed = names.filter((n) => /^\d{4}-\d{2}-\d{2}-/.test(n));
  assert.ok(prefixed.length > 0, 'the repo must actually store date-prefixed archive folders');
  // Every prefixed folder must be resolvable by its bare spec-id.
  const specId = prefixed[prefixed.length - 1].replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const rows = writeRegistry(
    scratch(),
    `| Spec/${specId} | ${specId} | Spec/${specId}/briefing.md | ${specId} | completada |\n`
  );
  // The spec-id is not an active change, so the only folder that can satisfy it
  // is the date-prefixed one under archive/. A registry row pointing at it must
  // never be reported as a dangling reference.
  assert.ok(!listActiveChanges(root).includes(specId), 'sanity: not an active change');
  const findings = checkOrphanedRegistryEntries(root, scratchVault(), rows);
  const dangling = findings.filter((f) => f.artifact.startsWith('REGISTRY.md'));
  assert.deepEqual(dangling, [], `archive folder must resolve for ${specId}: ${JSON.stringify(findings)}`);
});

test('checkUndistilled still recognises an archived change with a distilled decision', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  writeArchivedChange(root, 'add-done');
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-done']);
  const rows = writeRegistry(
    root,
    `| Spec/add-done | add-done | Spec/add-done/briefing.md | add-done | completada |\n`
  );
  assert.deepEqual(checkUndistilled(root, vault, rows), []);
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

test('checkUndistilled reports no finding when the decision block exists', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  // REGISTRY declares add-a and add-b; both must be distilled for a clean result.
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const findings = checkUndistilled(root, vault, parseRegistry(REGISTRY));
  assert.deepEqual(findings, [], 'a distilled change must not be reported (regression: 22 false warnings)');
});

test('checkUndistilled flags a completed change whose spec-id has no block', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/add-undistilled | nota-20260929-requirement | Spec/add-undistilled/briefing.md | add-undistilled | completada |
`
  );
  const findings = checkUndistilled(root, vault, rows);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
});

test('checkUndistilled correlates by changes[], not by requerimiento', () => {
  // The requirement id is never a spec-id; the distilled blocks are keyed by spec-id.
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-a, add-b, add-missing | completada |
`
  );
  const findings = checkUndistilled(root, vault, rows);
  assert.equal(findings.length, 1, 'exactly one change is missing');
  // The reported spec-id must come from changes[], not from the requirement id.
  assert.ok(findings[0].artifact.includes('decisiones.md'));
  assert.ok(
    findings[0].suggestion.includes('add-missing'),
    `suggestion must name the missing spec-id, got: ${findings[0].suggestion}`
  );
  assert.ok(!findings[0].suggestion.includes('nota-20260929-plan'));
});

test('checkUndistilled uses the brain project from rows, not from the repo name', () => {
  // Regression guard: resolveBrainProject prefers row.nota/row.briefing over
  // basename(projectRoot), so a fixture whose rows point elsewhere must be
  // resolved through the rows (and then produce no findings at all).
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| _Notas/Plan | nota-20260929-plan | _Notas/Plan/briefing.md | add-undistilled | completada |
`
  );
  // No project folder matches the row candidates -> no brain project -> no findings.
  assert.deepEqual(checkUndistilled(root, vault, rows), []);
});

test('checkUndistilled reports one finding per missing spec-id of a multi-change requirement', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-a, add-b, add-c, add-d | completada |
`
  );
  const findings = checkUndistilled(root, vault, rows);
  assert.equal(findings.length, 2);
  assert.ok(findings.some((f) => f.suggestion.includes('add-c')));
  assert.ok(findings.some((f) => f.suggestion.includes('add-d')));
  assert.ok(!findings.some((f) => f.suggestion.includes('add-a')));
  assert.ok(!findings.some((f) => f.suggestion.includes('add-b')));
});

test('checkUndistilled treats applied and N/N applied as completed', () => {
  for (const estado of ['applied', '1/1 applied', 'completada']) {
    const root = scratch();
    writeRepo(root, ['add-a']);
    const vault = scratch();
    writeVault(vault, 'Spec', ['add-a', 'add-b']);
    const rows = parseRegistry(
      `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-undistilled | ${estado} |
`
    );
    const findings = checkUndistilled(root, vault, rows);
    assert.equal(findings.length, 1, `estado '${estado}' must count as completed`);
  }
});

test('checkUndistilled ignores states with open pending work', () => {
  for (const estado of ['0/2 pending', '2/3 applied', '1/2 applied']) {
    const root = scratch();
    writeRepo(root, ['add-a']);
    const vault = scratch();
    writeVault(vault, 'Spec', ['add-a', 'add-b']);
    const rows = parseRegistry(
      `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-undistilled | ${estado} |
`
    );
    const findings = checkUndistilled(root, vault, rows);
    assert.equal(findings.length, 0, `estado '${estado}' must NOT count as completed`);
  }
});

test('checkUndistilled points at decisiones.md and never at a legacy decisiones/ path', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-undistilled | completada |
`
  );
  const findings = checkUndistilled(root, vault, rows);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].artifact, '05_wiki/Spec/decisiones.md');
  assert.ok(findings[0].suggestion.includes('spectralis distill'));
});

test('checkUndistilled does not match a spec-id mentioned inside another block body', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  writeVault(vault, 'Spec', ['add-a', 'add-b']);
  // add-mentioned is referenced in prose, but has no `### add-mentioned` heading.
  writeDecisiones(vault, 'Spec', ['add-a', 'add-b']);
  const path = join(vault, '05_wiki', 'Spec', 'decisiones.md');
  const content = require('node:fs').readFileSync(path, 'utf8');
  writeFileSync(
    path,
    content.replace('## Contexto', '## Contexto\n\nEste bloque menciona add-mentioned pero no lo define.\n\n## Otro'),
    'utf8'
  );
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-mentioned | completada |
`
  );
  const findings = checkUndistilled(root, vault, rows);
  assert.equal(findings.length, 1, 'a prose mention must not count as a distilled decision');
});

test('checkUndistilled reports nothing when decisiones.md does not exist yet', () => {
  const root = scratch();
  writeRepo(root, ['add-a']);
  const vault = scratch();
  mkdirSync(join(vault, '01_Proyectos', 'Spec'), { recursive: true });
  mkdirSync(join(vault, '05_wiki', 'Spec'), { recursive: true });
  const rows = parseRegistry(
    `| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| Spec/Plan | nota-20260929-plan | Spec/Plan/briefing.md | add-a | completada |
`
  );
  assert.deepEqual(checkUndistilled(root, vault, rows), [], 'a freshly seeded project must not flood warnings');
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
  const artifacts = findings.map((f) => f.artifact);
  // 'change sin registro' comes from the repo/openspec changes, the rest from REGISTRY.
  const changeWithoutRegistry = findings.find(
    (f) => f.artifact.startsWith('openspec/changes/') && f.severity === 'error'
  );
  assert.ok(changeWithoutRegistry, `change sin registro (artefactos: ${artifacts.join(' | ')})`);
  assert.ok(artifacts.some((a) => a.includes('add-ghost')), 'referencia huérfana');
  assert.ok(artifacts.some((a) => a.includes('add-nobrief')), 'briefing faltante');
  assert.ok(artifacts.some((a) => a.includes('_INDEX.json')), 'índice desalineado');
  assert.ok(hasErrors(findings));
});
test('checkMissingBriefings accepts the folder note as the brain artifact and reports its path when missing', () => {
  const root = scratch();
  writeRepo(root, ['add-fn', 'add-none']);
  const vault = scratch();
  mkdirSync(join(vault, '01_Proyectos', 'Spec', 'add-fn'), { recursive: true });
  writeFileSync(join(vault, '01_Proyectos', 'Spec', 'add-fn', 'add-fn.md'), '# add-fn\n\n## Decisiones técnicas\nContenido.\n', 'utf8');
  const rows = parseRegistry(
    REGISTRY +
      '| Spec/add-fn | add-fn | Spec/add-fn/add-fn.md | add-fn | completada |\n' +
      '| Spec/add-none | add-none | Spec/add-none/add-none.md | add-none | completada |\n'
  );
  const findings = checkMissingBriefings(root, vault, rows);
  assert.ok(!findings.some((f) => f.artifact.includes('add-fn') && f.severity === 'error'), 'folder note satisface el contrato');
  const none = findings.filter((f) => f.artifact.includes('add-none'));
  assert.equal(none.filter((f) => f.severity === 'error').length, 1);
  assert.match(none[0].artifact, /add-none\/add-none\.md/, 'reporta la ruta esperada del folder note');
});

test('checkMissingBriefings accepts the legacy trio as the brain artifact', () => {
  const root = scratch();
  writeRepo(root, ['add-legacy']);
  const vault = scratch();
  const dir = join(vault, '01_Proyectos', 'Spec', 'add-legacy');
  mkdirSync(dir, { recursive: true });
  for (const f of ['briefing.md', 'tests.md', 'resumen.md']) {
    writeFileSync(join(dir, f), '# Contenido\n', 'utf8');
  }
  const rows = parseRegistry(REGISTRY + '| Spec/add-legacy | add-legacy | Spec/add-legacy/briefing.md | add-legacy | completada |\n');
  const findings = checkMissingBriefings(root, vault, rows);
  assert.ok(!findings.some((f) => f.artifact.includes('add-legacy') && f.severity === 'error'), 'legacy trio satisface el contrato');
});

test('listBrainSpecs ignores loose md files in the project root', () => {
  const vault = scratch();
  mkdirSync(join(vault, '01_Proyectos', 'Spec', 'add-a'), { recursive: true });
  writeFileSync(join(vault, '01_Proyectos', 'Spec', 'LOOSE.md'), '# Loose\n', 'utf8');
  assert.deepEqual(listBrainSpecs(vault, 'Spec'), ['add-a']);
});
