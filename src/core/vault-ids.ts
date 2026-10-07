import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';
import matter from 'gray-matter';
import { classifyArtifact, isGeneratedArtifact } from './spec-artifact';
import { VaultDoctorFinding } from './vault-doctor';

export { classifyArtifact, isGeneratedArtifact } from './spec-artifact';

const EXCLUDED_DIRS = new Set(['docs', '05_wiki', '.git', 'node_modules', '.obsidian']);
const VALID_PREFIXES = ['nota-', 'proy-', 'idea-', 'doc-', 'rec-', 'arc-', 'res-', 'brief-', 'test-', 'spec-'] as const;
const PREFIX_REQUIRES_DATE = new Set(['nota-', 'proy-', 'idea-', 'arc-']);
const TYPE_BY_PREFIX: Record<string, string> = {
  'nota-': 'Nota',
  'proy-': 'Proyecto',
  'idea-': 'Idea',
  'doc-': 'Documentación',
  'rec-': 'Recurso',
  'arc-': 'Archivo',
  'spec-': 'Especificación'
};
const DATE_RE = /^\d{8}$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface NoteIdEntry {
  path: string;
  id: string;
  tipo?: string;
  generated: boolean;
  mtimeMs: number;
}

export interface IdCacheEntry {
  path: string;
  id: string;
  tipo?: string;
  mtimeMs: number;
}

export interface VaultIdsOptions {
  vaultRoot: string;
  cacheRoot?: string;
}

function walkMarkdown(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        walkMarkdown(join(dir, entry.name), out);
      }
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      out.push(join(dir, entry.name));
    }
  }
}

function normalizeRel(vaultRoot: string, filePath: string): string {
  const rel = relative(vaultRoot, filePath).split('\\').join('/');
  return rel.startsWith('/') ? rel.slice(1) : rel;
}

export function idPrefix(id: string): string {
  const idx = id.indexOf('-');
  return idx === -1 ? id : id.slice(0, idx + 1);
}

export function isValidPrefix(prefix: string): boolean {
  return (VALID_PREFIXES as readonly string[]).includes(prefix);
}

export function prefixRequiresDate(prefix: string): boolean {
  return PREFIX_REQUIRES_DATE.has(prefix);
}

export function typeForPrefix(prefix: string): string | undefined {
  return TYPE_BY_PREFIX[prefix];
}

export function isSlugValid(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/**
 * Validate an id against the extended base-standards §4 rules.
 * Returns an error message or null when conformant.
 */
export function validateIdFormat(id: string): string | null {
  const prefix = idPrefix(id);
  if (!isValidPrefix(prefix)) return `prefijo inválido '${prefix}'`;
  const rest = id.slice(prefix.length);
  const segments = rest.split('-');
  if (segments.length === 0 || segments[0] === '') return 'falta el slug';
  const first = segments[0];
  const hasDate = DATE_RE.test(first);
  const requiresDate = prefixRequiresDate(prefix);
  if (requiresDate && !hasDate) return `falta fecha YYYYMMDD tras '${prefix}'`;
  const slug = hasDate ? segments.slice(1).join('-') : segments.join('-');
  if (!slug) return 'falta el slug tras la fecha';
  if (!isSlugValid(slug)) return `slug inválido '${slug}' (minúsculas sin tildes/espacios)`;
  return null;
}

export function suggestionForId(relPath: string, id: string | undefined, tipo?: string): string {
  const base = basename(relPath).replace(/\.md$/, '');
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 5)
    .join('-');
  const tipoPrefix = tipo ? Object.keys(TYPE_BY_PREFIX).find((k) => TYPE_BY_PREFIX[k].toLowerCase() === tipo.toLowerCase()) : undefined;
  const prefix = tipoPrefix || 'nota-';
  if (prefix === 'doc-' || prefix === 'rec-') return `${prefix}${slug}`;
  return `${prefix}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${slug}`;
}

export function loadIdsCache(cacheRoot: string): Map<string, IdCacheEntry> {
  const path = join(cacheRoot, 'ids-cache.json');
  if (!existsSync(path)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as IdCacheEntry[];
    const map = new Map<string, IdCacheEntry>();
    for (const e of raw) map.set(e.path, e);
    return map;
  } catch {
    return new Map();
  }
}

export function saveIdsCache(cacheRoot: string, entries: IdCacheEntry[]): void {
  mkdirSync(cacheRoot, { recursive: true });
  const path = join(cacheRoot, 'ids-cache.json');
  writeFileSync(path, JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

/**
 * Scan the vault for note ids, using an mtime cache to avoid re-parsing
 * unchanged notes. Unicity is always recomputed from the returned entries.
 */
export function scanVaultIds(opts: VaultIdsOptions): { entries: NoteIdEntry[]; reparsed: number } {
  const cache = loadIdsCache(opts.cacheRoot ?? opts.vaultRoot);
  const files: string[] = [];
  walkMarkdown(opts.vaultRoot, files);
  const entries: NoteIdEntry[] = [];
  const updated: IdCacheEntry[] = [];
  let reparsed = 0;
  for (const filePath of files) {
    const rel = normalizeRel(opts.vaultRoot, filePath);
    const st = statSync(filePath);
    const cached = cache.get(rel);
    if (cached && cached.mtimeMs === st.mtimeMs) {
      const cachedEntry: NoteIdEntry = {
        path: rel,
        id: cached.id ?? '',
        tipo: cached.tipo,
        generated: isGeneratedArtifact(rel),
        mtimeMs: st.mtimeMs
      };
      entries.push(cachedEntry);
      updated.push(cached);
      continue;
    }
    reparsed++;
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const id = typeof parsed.data.id === 'string' ? parsed.data.id : undefined;
    const tipo = typeof parsed.data.Tipo === 'string' ? parsed.data.Tipo : undefined;
    const generated = isGeneratedArtifact(rel);
    const entry: NoteIdEntry = { path: rel, id: id ?? '', tipo, generated, mtimeMs: st.mtimeMs };
    entries.push(entry);
    updated.push({ path: rel, id: id ?? '', tipo, mtimeMs: st.mtimeMs });
  }
  saveIdsCache(opts.cacheRoot ?? opts.vaultRoot, updated);
  return { entries, reparsed };
}

export function checkIdPresent(entries: NoteIdEntry[], vaultRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  for (const e of entries) {
    if (!e.id) {
      findings.push({
        severity: 'error',
        project: basename(vaultRoot),
        artifact: e.path,
        suggestion: `Añade id: ${suggestionForId(e.path, undefined, e.tipo)} al frontmatter`
      });
    }
  }
  return findings;
}

export function checkIdFormat(entries: NoteIdEntry[], vaultRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  for (const e of entries) {
    if (!e.id) continue;
    const err = validateIdFormat(e.id);
    if (err) {
      findings.push({
        severity: 'error',
        project: basename(vaultRoot),
        artifact: e.path,
        suggestion: `${err}; sugiere ${suggestionForId(e.path, e.id, e.tipo)}`
      });
    }
  }
  return findings;
}

export function checkIdUniqueness(entries: NoteIdEntry[], vaultRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const byId = new Map<string, NoteIdEntry[]>();
  for (const e of entries) {
    if (!e.id) continue;
    const list = byId.get(e.id) ?? [];
    list.push(e);
    byId.set(e.id, list);
  }
  for (const [id, list] of byId) {
    if (list.length > 1) {
      findings.push({
        severity: 'error',
        project: basename(vaultRoot),
        artifact: list.map((l) => l.path).join(', '),
        suggestion: `El id '${id}' está duplicado en ${list.length} notas; renombra los duplicados`
      });
    }
  }
  return findings;
}

export function checkIndexIdRegistration(entries: NoteIdEntry[], vaultRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const indexPath = join(vaultRoot, '03_Recursos', '_INDEX_ID.md');
  if (!existsSync(indexPath)) {
    findings.push({
      severity: 'warning',
      project: basename(vaultRoot),
      artifact: '03_Recursos/_INDEX_ID.md',
      suggestion: 'No existe el índice de IDs; créalo o registra las notas'
    });
    return findings;
  }
  const indexContent = readFileSync(indexPath, 'utf8');
  for (const e of entries) {
    if (e.generated || !e.id) continue;
    const quoted = `\`${e.id}\``;
    if (!indexContent.includes(e.id)) {
      findings.push({
        severity: 'warning',
        project: basename(vaultRoot),
        artifact: e.path,
        suggestion: `Registra el id '${e.id}' (${quoted}) en 03_Recursos/_INDEX_ID.md`
      });
    }
  }
  return findings;
}

export function checkIdTipoCoherente(entries: NoteIdEntry[], vaultRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  for (const e of entries) {
    if (!e.id) continue;
    const prefix = idPrefix(e.id);
    const expected = typeForPrefix(prefix);
    if (!expected) continue; // res-/brief-/test- no tienen Tipo normativo
    if (e.tipo && e.tipo.toLowerCase() !== expected.toLowerCase()) {
      findings.push({
        severity: 'error',
        project: basename(vaultRoot),
        artifact: e.path,
        suggestion: `El prefijo '${prefix}' corresponde a Tipo '${expected}' pero la nota tiene '${e.tipo}'`
      });
    }
  }
  return findings;
}

/**
 * Folder-note coherence (D4b): a folder note must expose the canonical
 * `## Decisiones técnicas` heading so its deterministic ADR classification
 * does not depend on the filename classifier. Identity stays structural; the
 * heading is corroboration, consulted only by this check.
 */
export function checkSpecArtifactCoherence(
  entries: NoteIdEntry[],
  vaultRoot: string,
  contentSource?: (relPath: string) => string
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const read = contentSource ?? ((relPath: string) =>
    existsSync(join(vaultRoot, relPath)) ? readFileSync(join(vaultRoot, relPath), 'utf8') : '');
  for (const e of entries) {
    if (classifyArtifact(e.path) !== 'spec') continue;
    const content = read(e.path);
    if (!/^##\s+Decisiones\b/im.test(content)) {
      findings.push({
        severity: 'warning',
        project: basename(vaultRoot),
        artifact: e.path,
        suggestion: 'Folder note sin el encabezado canónico "## Decisiones técnicas": añádelo para que la clasificación determinista (ADR) no dependa del nombre.'
      });
    }
  }
  return findings;
}

export function checkVaultIds(opts: VaultIdsOptions): { findings: VaultDoctorFinding[]; reparsed: number } {
  const { entries, reparsed } = scanVaultIds(opts);
  const findings = [
    ...checkIdPresent(entries, opts.vaultRoot),
    ...checkIdFormat(entries, opts.vaultRoot),
    ...checkIdUniqueness(entries, opts.vaultRoot),
    ...checkIndexIdRegistration(entries, opts.vaultRoot),
    ...checkIdTipoCoherente(entries, opts.vaultRoot),
    ...checkSpecArtifactCoherence(entries, opts.vaultRoot)
  ];
  return { findings, reparsed };
}