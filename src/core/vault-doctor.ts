import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { decisionesPath, extractSpecIds } from './wiki-structure';

export type Severity = 'error' | 'warning';

export interface VaultDoctorFinding {
  severity: Severity;
  project: string;
  artifact: string;
  suggestion: string;
}

export interface RegistryRow {
  nota: string;
  requerimiento: string;
  briefing: string;
  changes: string[];
  estado: string;
}

export interface RegistryDoctorInput {
  projectRoot: string;
  vaultRoot: string;
}

const REGISTRY_CELLS_PER_ROW = 6;

/**
 * Parses the REGISTRY.md table.
 *
 * A line may hold several rows concatenated with `||`. Splitting on `||` first
 * (rather than on `|`) separates them without leaving a phantom empty cell,
 * which is what made the previous cell-count heuristic misjudge such lines.
 * Dropping the tail silently used to make a registered change look
 * unregistered, which pushed people to duplicate a row that was already there.
 */
export function parseRegistry(content: string): RegistryRow[] {
  const rows: RegistryRow[] = [];
  for (const line of content.split('\n')) {
    for (const raw of line.split('||')) {
      // A concatenated row arrives as `... | completada || Spec/move | ...`: the
      // `||` doubles as the closing pipe of the first row and the opening pipe of
      // the next, so the trailing segment arrives without its leading pipe.
      const stripped = raw.trim();
      if (!stripped) continue;
      const trimmed = stripped.startsWith('|') ? stripped : `|${stripped}`;
      const cells = trimmed.split('|').map((c) => c.trim());
      if (cells.length < REGISTRY_CELLS_PER_ROW) continue;
      const nota = cells[1];
      if (nota === 'nota (ruta)' || nota === '' || nota === '-------------') continue;
      rows.push({
        nota,
        requerimiento: cells[2],
        briefing: cells[3],
        changes: cells[4]
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        estado: cells[5]
      });
    }
  }
  return rows;
}

export function readRegistry(projectRoot: string): RegistryRow[] {
  const path = join(projectRoot, '.sdd-registry', 'REGISTRY.md');
  if (!existsSync(path)) return [];
  return parseRegistry(readFileSync(path, 'utf8'));
}

export function listActiveChanges(projectRoot: string): string[] {
  const changesDir = join(projectRoot, 'openspec', 'changes');
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .map((d) => d.name);
}

/**
 * Collects every change id the registry can legitimately point at.
 *
 * `openspec/changes/archive/` stores folders as `YYYY-MM-DD-<spec-id>`, while
 * REGISTRY.md references the bare `<spec-id>`. Both forms are registered so a
 * reference resolves against either naming, and consumers of this set inherit
 * that normalisation for free.
 */
function listKnownChanges(projectRoot: string): Set<string> {
  const known = new Set<string>(listActiveChanges(projectRoot));
  const archiveDir = join(projectRoot, 'openspec', 'changes', 'archive');
  if (existsSync(archiveDir)) {
    for (const d of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      known.add(d.name);
      const bare = d.name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      if (bare !== d.name) known.add(bare);
    }
  }
  return known;
}

/**
 * The spec-ids a registry row points at.
 *
 * Only the `changes` column holds spec-ids. The `requerimiento` column holds
 * requirement ids (`nota-*`, `doc-*`), which were never changes, so validating
 * it as one produced false positives of a class that should not exist.
 */
export function collectChangeRefs(rows: RegistryRow[]): Set<string> {
  const refs = new Set<string>();
  for (const row of rows) {
    for (const c of row.changes) {
      if (c) refs.add(c);
    }
  }
  return refs;
}

export function listBrainSpecs(vaultRoot: string, brainProject: string): string[] {
  const dir = join(vaultRoot, '01_Proyectos', brainProject);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);
}

export function resolveBrainProject(projectRoot: string, vaultRoot: string, rows: RegistryRow[]): string | null {
  const projectsDir = join(vaultRoot, '01_Proyectos');
  if (!existsSync(projectsDir)) return null;
  const candidates: string[] = [];
  for (const row of rows) {
    const first = row.nota.split('/')[0];
    if (first && !first.startsWith('/') && !first.includes('.')) candidates.push(first);
    const brief = row.briefing.split('/')[0];
    if (brief && !brief.startsWith('/') && !brief.includes('.')) candidates.push(brief);
  }
  const repoName = basename(projectRoot);
  candidates.push(repoName);
  const folders = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const cand of candidates) {
    const match = folders.find((f) => f.toLowerCase() === cand.toLowerCase());
    if (match) return match;
  }
  return null;
}

export function checkChangesWithoutRegistry(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const registered = collectChangeRefs(rows);
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  const brainSpecs = brainProject ? listBrainSpecs(vaultRoot, brainProject) : [];
  for (const id of listActiveChanges(projectRoot)) {
    if (!registered.has(id)) {
      findings.push({
        severity: 'error',
        project: basename(projectRoot),
        artifact: `openspec/changes/${id}`,
        suggestion: `Registra el change ${id} en .sdd-registry/REGISTRY.md`
      });
    }
  }
  if (brainProject) {
    for (const id of brainSpecs) {
      if (!registered.has(id)) {
        findings.push({
          severity: 'error',
          project: brainProject,
          artifact: `01_Proyectos/${brainProject}/${id}`,
          suggestion: `Registra el change ${id} en .sdd-registry/REGISTRY.md`
        });
      }
    }
  }
  return findings;
}

export function checkOrphanedRegistryEntries(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  // A referenced spec-id is satisfied by any of: an active change, an archived
  // change (with or without the archive's date prefix), or a vault folder. An
  // archived change needs no vault folder: its record is the OpenSpec archive
  // plus the main spec. The vault-folder convention only exists from
  // 2026-09-25, so demanding it retroactively would produce warnings that can
  // never reach zero — and a check that never goes green is a check people
  // learn to ignore.
  const known = listKnownChanges(projectRoot);
  for (const id of collectChangeRefs(rows)) {
    if (known.has(id)) continue;
    findings.push({
      severity: 'warning',
      project: basename(projectRoot),
      artifact: `REGISTRY.md -> ${id}`,
      suggestion: `Elimina la fila de ${id} del registro (referencia huérfana)`
    });
  }
  return findings;
}

export function checkMissingBriefings(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  const registryBriefingsDir = join(projectRoot, '.sdd-registry', 'briefings');
  for (const row of rows) {
    if (!row.requerimiento) continue;
    const id = row.requerimiento;
    const candidates: string[] = [];
    if (row.briefing && !row.briefing.startsWith('/')) {
      candidates.push(join(vaultRoot, row.briefing));
      candidates.push(join(projectRoot, row.briefing));
    }
    if (row.briefing && basename(row.briefing)) {
      candidates.push(join(registryBriefingsDir, basename(row.briefing)));
    }
    candidates.push(join(registryBriefingsDir, `${id}.md`));
    if (brainProject) {
      candidates.push(join(vaultRoot, '01_Proyectos', brainProject, id, 'briefing.md'));
    }
    if (!candidates.some((p) => existsSync(p))) {
      findings.push({
        severity: 'error',
        project: basename(projectRoot),
        artifact: `${id}/briefing.md`,
        suggestion: `Genera el briefing de ${id} (spectralis spec init o .sdd-registry/briefings/${id}.md)`
      });
    }
  }
  return findings;
}

export function checkIndexMisaligned(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const indexPath = join(vaultRoot, '05_wiki', '_INDEX.json');
  if (!existsSync(indexPath)) {
    findings.push({
      severity: 'warning',
      project: basename(projectRoot),
      artifact: '05_wiki/_INDEX.json',
      suggestion: 'Genera el índice con spectralis seed'
    });
    return findings;
  }
  let index: Record<string, { changes?: number; updated?: string }> = {};
  try {
    index = JSON.parse(readFileSync(indexPath, 'utf8')) as Record<string, { changes?: number; updated?: string }>;
  } catch {
    findings.push({
      severity: 'warning',
      project: basename(projectRoot),
      artifact: '05_wiki/_INDEX.json',
      suggestion: 'El índice no es JSON válido; regenera con spectralis seed'
    });
    return findings;
  }
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  const repoName = basename(projectRoot);
  const entryKey = Object.keys(index).find((k) => k.toLowerCase() === repoName.toLowerCase());
  if (!entryKey) {
    findings.push({
      severity: 'warning',
      project: repoName,
      artifact: '05_wiki/_INDEX.json',
      suggestion: `Falta la entrada de ${repoName} en el índice; regenera con spectralis seed`
    });
    return findings;
  }
  const entry = index[entryKey];
  const expected = listActiveChanges(projectRoot).length;
  if (typeof entry.changes === 'number' && entry.changes !== expected) {
    findings.push({
      severity: 'warning',
      project: repoName,
      artifact: '05_wiki/_INDEX.json',
      suggestion: `changes=${entry.changes} pero hay ${expected} changes activos; re-ejecuta spectralis seed`
    });
  }
  if (brainProject) {
    const updatedMs = Date.parse(entry.updated ?? '');
    const changesDir = join(projectRoot, 'openspec', 'changes');
    let newest = 0;
    if (existsSync(changesDir)) {
      for (const d of readdirSync(changesDir, { withFileTypes: true })) {
        if (d.isDirectory() && d.name !== 'archive') {
          newest = Math.max(newest, statSync(join(changesDir, d.name)).mtimeMs);
        }
      }
    }
    if (Number.isFinite(updatedMs) && newest > updatedMs) {
      findings.push({
        severity: 'warning',
        project: repoName,
        artifact: '05_wiki/_INDEX.json',
        suggestion: 'updated desactualizado (hay changes más recientes); re-ejecuta spectralis seed'
      });
    }
  }
  return findings;
}

/**
 * Extracts the distilled spec-ids from a `decisiones.md` aggregate.
 *
 * Kept as an alias of the shared contract so existing callers keep working; the
 * implementation now lives in `wiki-structure`, next to the producer that writes
 * those blocks.
 */
export const extractDistilledSpecIds = extractSpecIds;

/**
 * A registry row counts as completed when its state declares finished work,
 * regardless of which vocabulary the row happens to use: `completada`,
 * `applied`, or `N/N applied`. States with open work (`N/M applied` where
 * N < M, `0/M pending`) do not require distillation yet.
 */
export function isCompletedState(estado: string): boolean {
  const value = estado.trim().toLowerCase();
  if (value === 'completada' || value === 'applied') return true;
  const ratio = value.match(/^(\d+)\s*\/\s*(\d+)\s*applied$/);
  if (ratio) {
    const [, applied, total] = ratio;
    return total !== '0' && applied === total;
  }
  return false;
}

export function checkUndistilled(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  if (!brainProject) return findings;

  const decisionsDoc = decisionesPath(vaultRoot, brainProject);
  const artifact = `05_wiki/${brainProject}/decisiones.md`;
  // A project that has not been distilled yet has no aggregate at all. Absence of
  // the file is a different situation from a missing block inside it, and is
  // already surfaced by the _INDEX.json misalignment check — reporting every
  // completed change here would flood freshly seeded projects.
  if (!existsSync(decisionsDoc)) return findings;

  const distilled = extractSpecIds(readFileSync(decisionsDoc, 'utf8'));

  for (const row of rows) {
    if (!isCompletedState(row.estado)) continue;
    for (const specId of row.changes) {
      if (!specId || distilled.has(specId)) continue;
      findings.push({
        severity: 'warning',
        project: brainProject,
        artifact,
        suggestion: `Destila ${specId} (spectralis distill) para generar su decisión en ${artifact}`
      });
    }
  }
  return findings;
}

export function checkRegistryConsistency(input: RegistryDoctorInput): VaultDoctorFinding[] {
  const rows = readRegistry(input.projectRoot);
  return [
    ...checkChangesWithoutRegistry(input.projectRoot, input.vaultRoot, rows),
    ...checkOrphanedRegistryEntries(input.projectRoot, input.vaultRoot, rows),
    ...checkMissingBriefings(input.projectRoot, input.vaultRoot, rows),
    ...checkIndexMisaligned(input.projectRoot, input.vaultRoot, rows),
    ...checkUndistilled(input.projectRoot, input.vaultRoot, rows)
  ];
}

export function hasErrors(findings: VaultDoctorFinding[]): boolean {
  return findings.some((f) => f.severity === 'error');
}