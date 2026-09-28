import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

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

export function parseRegistry(content: string): RegistryRow[] {
  const rows: RegistryRow[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').map((c) => c.trim());
    if (cells.length < 6) continue;
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

function listKnownChanges(projectRoot: string): Set<string> {
  const known = new Set<string>(listActiveChanges(projectRoot));
  const archiveDir = join(projectRoot, 'openspec', 'changes', 'archive');
  if (existsSync(archiveDir)) {
    for (const d of readdirSync(archiveDir, { withFileTypes: true })) {
      if (d.isDirectory()) known.add(d.name);
    }
  }
  return known;
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
  const registered = new Set<string>();
  for (const row of rows) {
    if (row.requerimiento) registered.add(row.requerimiento);
    for (const c of row.changes) registered.add(c);
  }
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
  const known = listKnownChanges(projectRoot);
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  const brainSpecs = new Set(brainProject ? listBrainSpecs(vaultRoot, brainProject) : []);
  const referenced = new Set<string>();
  for (const row of rows) {
    if (row.requerimiento) referenced.add(row.requerimiento);
    for (const c of row.changes) referenced.add(c);
  }
  for (const id of referenced) {
    if (!known.has(id) && !brainSpecs.has(id)) {
      findings.push({
        severity: 'warning',
        project: basename(projectRoot),
        artifact: `REGISTRY.md -> ${id}`,
        suggestion: `Elimina la fila de ${id} del registro (referencia huérfana)`
      });
    }
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

export function checkUndistilled(
  projectRoot: string,
  vaultRoot: string,
  rows: RegistryRow[]
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const brainProject = resolveBrainProject(projectRoot, vaultRoot, rows);
  if (!brainProject) return findings;
  const decisionsDir = join(vaultRoot, '05_wiki', brainProject, 'decisiones');
  for (const row of rows) {
    if (row.estado !== 'completada' || !row.requerimiento) continue;
    const decision = join(decisionsDir, `${row.requerimiento}.md`);
    if (!existsSync(decision)) {
      findings.push({
        severity: 'warning',
        project: brainProject,
        artifact: `05_wiki/${brainProject}/decisiones/${row.requerimiento}.md`,
        suggestion: `Destila ${row.requerimiento} (spectralis distill) para generar su decisión`
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