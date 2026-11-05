import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRegistry, type RegistryRow } from '../../src/core/vault-doctor';

/**
 * Shared fixtures for the test suite.
 *
 * They only build directories and files: no assertion lives here, so every
 * test keeps its own expectations.
 */

const created: string[] = [];

/** Creates a temporary directory, removed by `cleanupFixtures()`. */
export function scratch(prefix = 'sp-fixture-'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

/** Removes every directory created through `scratch()`. */
export function cleanupFixtures(): void {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
}

/**
 * Pins the legacy changes layout (`openspec/changes`) in the fixture.
 *
 * The native default of the harness is `spec/` since F2: the fixtures that
 * exercise the legacy layout declare it explicitly, so the resolver keeps
 * pointing at `openspec/changes` and every assertion stays meaningful.
 */
export function pinLegacyChangesLayout(root: string): void {
  const manifestPath = join(root, '.sdd-manifest.json');
  if (existsSync(manifestPath)) return;
  writeFileSync(
    manifestPath,
    JSON.stringify({ schemaVersion: 3, spec_dir: 'openspec/changes' }, null, 2) + '\n',
    'utf8'
  );
}

/** Creates the repo layout: `openspec/changes/` (with archive) + `.sdd-registry/`. */
export function writeRepo(root: string, changes: string[] = []): void {
  pinLegacyChangesLayout(root);
  mkdirSync(join(root, 'openspec', 'changes', 'archive'), { recursive: true });
  mkdirSync(join(root, '.sdd-registry', 'briefings'), { recursive: true });
  for (const change of changes) {
    mkdirSync(join(root, 'openspec', 'changes', change), { recursive: true });
  }
}

/** Creates a `YYYY-MM-DD-<name>` folder under `openspec/changes/archive/`. */
export function writeArchivedChange(root: string, specId: string, date = '2026-09-29'): void {
  pinLegacyChangesLayout(root);
  mkdirSync(join(root, 'openspec', 'changes', 'archive', `${date}-${specId}`), { recursive: true });
}

/** Writes `tasks.md` inside a change folder. */
export function changeTasks(root: string, name: string, tasks: string): void {
  pinLegacyChangesLayout(root);
  const dir = join(root, 'openspec', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), tasks, 'utf8');
}

/** Writes `tasks.md` inside an archived change folder. */
export function archivedChangeTasks(root: string, name: string, tasks: string): void {
  pinLegacyChangesLayout(root);
  const dir = join(root, 'openspec', 'changes', 'archive', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tasks.md'), tasks, 'utf8');
}

/** Writes a REGISTRY.md into the repo fixture and parses it. */
export function writeRegistry(root: string, table: string): RegistryRow[] {
  const content = `# Requirements Registry

| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
${table}`;
  mkdirSync(join(root, '.sdd-registry'), { recursive: true });
  writeFileSync(join(root, '.sdd-registry', 'REGISTRY.md'), content, 'utf8');
  return parseRegistry(content);
}

/** A vault with the project folder but no `01_Proyectos/<P>/<spec-id>/` entries. */
export function scratchVault(prefix = 'sp-fixture-'): string {
  const dir = scratch(prefix);
  mkdirSync(join(dir, '01_Proyectos'), { recursive: true });
  return dir;
}

/**
 * Writes the vault fixture in the current 4-aggregate scheme: decisions live as
 * `### <spec-id>` blocks inside a single `decisiones.md`, not as per-spec files
 * under a `decisiones/` folder.
 */
export function writeVault(root: string, project: string, specs: string[]): void {
  mkdirSync(join(root, '01_Proyectos', project), { recursive: true });
  mkdirSync(join(root, '05_wiki', project), { recursive: true });
  for (const spec of specs) {
    mkdirSync(join(root, '01_Proyectos', project, spec), { recursive: true });
    writeFileSync(join(root, '01_Proyectos', project, spec, 'briefing.md'), '# Briefing\n', 'utf8');
  }
  writeDecisiones(root, project, specs);
}

/** Writes `05_wiki/<project>/decisiones.md` with one `### <spec-id>` block per spec. */
export function writeDecisiones(root: string, project: string, specs: string[]): void {
  mkdirSync(join(root, '05_wiki', project), { recursive: true });
  const body = specs
    .map((spec) => `### ${spec}\n\nFuente: \`${spec}\`\nEstado: completado\n\n## Contexto\nFixture.\n\n---\n`)
    .join('\n');
  writeFileSync(
    join(root, '05_wiki', project, 'decisiones.md'),
    `---\nid: decisiones\n---\n# Decisiones — ${project}\n\n${body}`,
    'utf8'
  );
}
