import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

/**
 * Creates the wiki directory structure for a project.
 * @param wikiRoot Root of the wiki directory (e.g., vault root)
 * @param projectName Project name (subdirectory under 05_wiki/)
 */
export function createWikiDir(wikiRoot: string, projectName: string): void {
  const projectDir = join(wikiRoot, '05_wiki', projectName);
  const subdirs = ['decisiones', 'errores', 'log'];
  for (const subdir of subdirs) {
    mkdirSync(join(projectDir, subdir), { recursive: true });
  }
}

/**
 * Writes a note with minimal frontmatter (only id + optional tags).
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param filePath Relative path within project directory (e.g., "arquitectura.md")
 * @param frontmatter Original frontmatter (will be filtered)
 * @param content Markdown content (without frontmatter)
 */
export function writeOptimizedNote(
  wikiRoot: string,
  projectName: string,
  filePath: string,
  frontmatter: Record<string, unknown>,
  content: string
): void {
  const filtered: Record<string, unknown> = {};
  if (frontmatter.id) filtered.id = frontmatter.id;
  if (frontmatter.tags && Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) {
    filtered.tags = frontmatter.tags.slice(0, 3); // max 3 tags
  }
  const fileContent = matter.stringify(content, filtered);
  const absolutePath = join(wikiRoot, '05_wiki', projectName, filePath);
  const dir = join(absolutePath, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(absolutePath, fileContent, 'utf8');
}

/**
 * Reads the _INDEX.json file from the wiki root.
 * @param wikiRoot Root of the wiki directory
 * @returns Parsed index object, or empty object if file doesn't exist
 */
export interface WikiIndex {
  [projectName: string]: {
    id?: string;
    name: string;
    path: string;
    content: string[];
    stack: string[];
    updated: string;
  };
}

export function readIndex(wikiRoot: string): WikiIndex {
  const indexPath = join(wikiRoot, '05_wiki', '_INDEX.json');
  if (!existsSync(indexPath)) return {};
  const raw = readFileSync(indexPath, 'utf8');
  return JSON.parse(raw) as WikiIndex;
}

/**
 * Writes the _INDEX.json file to the wiki root.
 * @param wikiRoot Root of the wiki directory
 * @param index Index object to write
 */
export function writeIndex(wikiRoot: string, index: WikiIndex): void {
  const wikiDir = join(wikiRoot, '05_wiki');
  if (!existsSync(wikiDir)) {
    mkdirSync(wikiDir, { recursive: true });
  }
  const indexPath = join(wikiDir, '_INDEX.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
}

/**
 * Classifies content based on section headers.
 * Returns 'ADR' for ## Decisiones, 'post-mortem' for ## Bug, 'log' for ## Errores.
 * Returns null if no header matches.
 */
export function classifyByHeaders(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const header = trimmed.slice(3).toLowerCase();
      if (header.includes('decisiones')) return 'ADR';
      if (header.includes('bug')) return 'post-mortem';
      if (header.includes('errores')) return 'log';
    }
  }
  return null;
}

/**
 * Classifies content based on keywords.
 * Returns 'post-mortem' for "causa raíz", 'ADR' for "alternativas descartadas",
 * 'log' for "lección aprendida". Returns null if no keyword matches.
 */
export function classifyByKeywords(content: string): string | null {
  const lower = content.toLowerCase();
  if (lower.includes('causa raíz')) return 'post-mortem';
  if (lower.includes('alternativas descartadas')) return 'ADR';
  if (lower.includes('lección aprendida')) return 'log';
  return null;
}

/**
 * Classifies based on frontmatter fields (status, tipo, tags).
 * Returns classification string or null if cannot determine.
 */
export function classifyByFrontmatter(frontmatter: Record<string, unknown>): string | null {
  const tipo = typeof frontmatter.tipo === 'string' ? frontmatter.tipo.toLowerCase() : null;
  const status = typeof frontmatter.status === 'string' ? frontmatter.status.toLowerCase() : null;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(t => String(t).toLowerCase()) : [];

  // Prioritize explicit tipo
  if (tipo) {
    if (tipo === 'adr' || tipo === 'decision') return 'ADR';
    if (tipo === 'bug' || tipo === 'post-mortem') return 'post-mortem';
    if (tipo === 'log' || tipo === 'cambio') return 'log';
  }

  // Fallback to status
  if (status) {
    if (status === 'aprobada' || status === 'accepted') return 'ADR';
    if (status === 'resuelto' || status === 'resolved') return 'post-mortem';
    if (status === 'registrado' || status === 'logged') return 'log';
  }

  // Fallback to tags (if any)
  for (const tag of tags) {
    if (tag === 'adr' || tag === 'decision') return 'ADR';
    if (tag === 'bug' || tag === 'post-mortem') return 'post-mortem';
    if (tag === 'log' || tag === 'cambio') return 'log';
  }

  return null;
}

export interface SourceFile {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface ClassifiedEntry {
  sourcePath: string;
  classification: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface AmbiguousEntry {
  sourcePath: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface DeterministicResult {
  classified: ClassifiedEntry[];
  ambiguous: AmbiguousEntry[];
}

/**
 * Classifies based on the file name. Spec folders follow a convention:
 * briefing.md → decision, tests.md → noise, resumen.md → noise unless it
 * contains post-mortem keywords (checked by classifyByKeywords).
 */
export function classifyByFilename(path: string, content: string): LLMClassification | null {
  const name = path.toLowerCase();
  if (name.endsWith('briefing.md')) return 'ADR';
  if (name.endsWith('tests.md')) return 'noise';
  if (name.endsWith('resumen.md') || name.endsWith('summary.md')) {
    const kw = classifyByKeywords(content);
    return kw === 'post-mortem' ? 'post-mortem' : 'noise';
  }
  return null;
}

/**
 * Runs all Level 1 classifiers on source files.
 * Returns classified entries and ambiguous entries.
 */
export function deterministicExtract(sourceFiles: SourceFile[]): DeterministicResult {
  const classified: ClassifiedEntry[] = [];
  const ambiguous: AmbiguousEntry[] = [];

  for (const file of sourceFiles) {
    // Try header classification first
    let classification = classifyByHeaders(file.content);
    if (!classification) classification = classifyByKeywords(file.content);
    if (!classification) classification = classifyByFrontmatter(file.frontmatter);
    if (!classification) classification = classifyByFilename(file.path, file.content);

    if (classification === 'noise') {
      continue; // deterministically discarded; never sent to the LLM
    }
    if (classification) {
      classified.push({
        sourcePath: file.path,
        classification,
        content: file.content,
        frontmatter: file.frontmatter,
      });
    } else {
      ambiguous.push({
        sourcePath: file.path,
        content: file.content,
        frontmatter: file.frontmatter,
      });
    }
  }

  return { classified, ambiguous };
}

/**
 * Formats ambiguous entries for LLM consumption.
 * Returns a concise list of entries with context.
 */
export function buildCandidatePlan(ambiguousEntries: AmbiguousEntry[]): string {
  if (ambiguousEntries.length === 0) return '';
  const lines = ambiguousEntries.map((entry, idx) => {
    const snippet = entry.content.slice(0, 200).replace(/\n/g, ' ');
    return `${idx + 1}. ${entry.sourcePath}: ${snippet}...`;
  });
  return lines.join('\n');
}

export type LLMClassification = 'ADR' | 'post-mortem' | 'log' | 'noise';

export interface DistillCacheEntry {
  hash: string;
  classification: LLMClassification;
}

export interface DistillCache {
  get(sourcePath: string, content: string): LLMClassification | null;
  set(sourcePath: string, content: string, classification: LLMClassification): void;
  flush(): void;
}

/**
 * File-backed LLM classification cache keyed by content hash.
 * Persists at <wikiRoot>/graphify-out/.distill-cache.json (machine-local,
 * never committed). Re-runs skip the LLM for unchanged files.
 */
export function createDistillCache(wikiRoot: string): DistillCache {
  const cacheDir = join(wikiRoot, 'graphify-out');
  const cachePath = join(cacheDir, '.distill-cache.json');
  let entries = new Map<string, DistillCacheEntry>();
  let dirty = false;

  try {
    if (existsSync(cachePath)) {
      const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as Record<string, DistillCacheEntry>;
      entries = new Map(Object.entries(raw));
    }
  } catch {
    entries = new Map();
  }

  const hash = (content: string): string =>
    createHash('sha256').update(content).digest('hex').slice(0, 32);

  return {
    get(sourcePath, content) {
      const entry = entries.get(sourcePath);
      if (!entry) return null;
      return entry.hash === hash(content) ? entry.classification : null;
    },
    set(sourcePath, content, classification) {
      entries.set(sourcePath, { hash: hash(content), classification });
      dirty = true;
    },
    flush() {
      if (!dirty) return;
      try {
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(cachePath, JSON.stringify(Object.fromEntries(entries), null, 2), 'utf8');
        dirty = false;
      } catch {
        // cache is best-effort; failure must not break distillation
      }
    },
  };
}

export interface LlmOptions {
  host: string;
  model: string;
  enabled: boolean;
}

/**
 * Invokes LLM to classify ambiguous entries via Ollama /api/generate.
 * Returns a Map of entryPath to classification. Entries not in the map are discarded.
 */
export async function classifyWithLLM(
  candidatePlan: string,
  llm: LlmOptions
): Promise<Map<string, LLMClassification>> {
  const result = new Map<string, LLMClassification>();
  if (!llm.enabled || !llm.model) return result;

  const prompt = `Classify each entry as exactly one of: ADR, post-mortem, log, or noise.

Rules:
- ADR: technical decision or context about a decision
- post-mortem: bug, error, root cause, or fix analysis
- log: change log, history, or learned lesson
- noise: anything else, do NOT include it in your answer

Output ONLY one line per entry, with no extra text, in this exact format:
<path> = <classification>

Example:
add-foo/briefing.md = ADR
add-bar/post-mortem.md = post-mortem

Entries:
${candidatePlan}`;

  try {
    const res = await fetch(`${llm.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llm.model,
        prompt,
        stream: false,
        think: false,
        options: { temperature: 0, num_predict: 1000 }
      }),
      signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) return result;
    const data = await res.json() as { response?: string };
    const text = data.response ?? '';
    for (const line of text.split('\n')) {
      const m = line.match(/^(.+?)\s*=\s*(ADR|post-mortem|log|noise)/i);
      if (m) {
        const key = m[1].trim();
        const cls = m[2].toLowerCase() as LLMClassification;
        result.set(key, cls);
      }
    }
  } catch {
    // LLM unreachable — return empty (ambiguous entries discarded)
  }
  return result;
}

/**
 * Combines Level 1 + Level 2 results.
 * Deterministic entries are not sent to LLM.
 * Ambiguous entries are classified by LLM if enabled, otherwise discarded.
 */
export async function hybridExtract(
  sourceFiles: SourceFile[],
  llm: LlmOptions,
  cache?: DistillCache
): Promise<DeterministicResult> {
  const { classified, ambiguous } = deterministicExtract(sourceFiles);

  if (ambiguous.length > 0 && llm.enabled) {
    const cached = new Map<string, LLMClassification>();
    const toAsk: AmbiguousEntry[] = [];
    for (const entry of ambiguous) {
      const hit = cache?.get(entry.sourcePath, entry.content);
      if (hit) cached.set(entry.sourcePath, hit);
      else toAsk.push(entry);
    }

    if (toAsk.length > 0) {
      const candidatePlan = buildCandidatePlan(toAsk);
      const llmClassifications = await classifyWithLLM(candidatePlan, llm);
      for (const [path, cls] of llmClassifications) {
        if (cls !== 'noise') cached.set(path, cls);
      }
    }

    for (const entry of ambiguous) {
      const cls = cached.get(entry.sourcePath);
      if (cls && cls !== 'noise') {
        classified.push({
          sourcePath: entry.sourcePath,
          classification: cls,
          content: entry.content,
          frontmatter: entry.frontmatter
        });
        cache?.set(entry.sourcePath, entry.content, cls);
      }
    }
  }

  return { classified, ambiguous: [] };
}

/**
 * Extracts system overview from briefing files and writes arquitectura.md.
 * Overwrite strategy: replaces entirely with most recent briefing synthesis.
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param briefings Array of briefing file contents (strings)
 */
export function generateArquitectura(
  wikiRoot: string,
  projectName: string,
  briefings: string[]
): void {
  // Simple synthesis: concatenate all briefings with separator
  const overview = briefings.join('\n\n---\n\n');
  const frontmatter = {
    id: 'arquitectura',
    tags: ['arquitectura', 'overview'],
  };
  writeOptimizedNote(wikiRoot, projectName, 'arquitectura.md', frontmatter, overview);
}

export interface Decision {
  specId: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Writes/updates ADR files to decisiones/<spec-id>.md (merge by spec-id).
 * New decisions added, existing updated only if changed.
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param decisions Array of decision objects
 */
export function generateDecisiones(
  wikiRoot: string,
  projectName: string,
  decisions: Decision[]
): void {
  for (const decision of decisions) {
    const filePath = `decisiones/${decision.specId}.md`;
    const frontmatter = {
      id: decision.specId,
      tags: ['decision', 'adr'],
      ...decision.frontmatter,
    };
    // Simple merge: if file exists and content identical, skip
    const absolutePath = join(wikiRoot, '05_wiki', projectName, filePath);
    if (existsSync(absolutePath)) {
      const existing = readFileSync(absolutePath, 'utf8');
      const existingData = matter(existing);
      if (existingData.content.trim() === decision.content.trim()) {
        continue; // no change
      }
    }
    writeOptimizedNote(wikiRoot, projectName, filePath, frontmatter, decision.content);
  }
}

export interface ErrorEntry {
  specId: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Writes/updates post-mortem files to errores/<spec-id>.md (merge by spec-id).
 * New errors added, existing updated only if changed.
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param errors Array of error entry objects
 */
export function generateErrores(
  wikiRoot: string,
  projectName: string,
  errors: ErrorEntry[]
): void {
  for (const error of errors) {
    const filePath = `errores/${error.specId}.md`;
    const frontmatter = {
      id: error.specId,
      tags: ['bug', 'post-mortem'],
      ...error.frontmatter,
    };
    const absolutePath = join(wikiRoot, '05_wiki', projectName, filePath);
    if (existsSync(absolutePath)) {
      const existing = readFileSync(absolutePath, 'utf8');
      const existingData = matter(existing);
      if (existingData.content.trim() === error.content.trim()) {
        continue;
      }
    }
    writeOptimizedNote(wikiRoot, projectName, filePath, frontmatter, error.content);
  }
}

export interface LogEntry {
  content: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Appends to log/YYYY-MM.md (append-only).
 * New entries don't overwrite existing ones.
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param entries Array of log entry objects
 * @param date Date string (YYYY-MM) for the log file
 */
export function generateLog(
  wikiRoot: string,
  projectName: string,
  entries: LogEntry[],
  date: string
): void {
  const filePath = `log/${date}.md`;
  const absolutePath = join(wikiRoot, '05_wiki', projectName, filePath);
  let existingContent = '';
  if (existsSync(absolutePath)) {
    existingContent = readFileSync(absolutePath, 'utf8');
  }
  // Append new entries, skipping blocks already present (append-only is idempotent).
  const newBlocks = entries.map((e) => e.content.trim());
  const existingBlocks = new Set(
    existingContent
      .split(/\n\s*\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
  );
  const fresh = newBlocks.filter((b) => !existingBlocks.has(b));
  const newContent = fresh.join('\n\n\n');
  const fullContent = newContent ? (existingContent ? `${existingContent}\n\n\n${newContent}` : newContent) : existingContent;
  const frontmatter = {
    id: `log-${date}`,
    tags: ['log'],
  };
  writeOptimizedNote(wikiRoot, projectName, filePath, frontmatter, fullContent);
}

/**
 * Overwrites restricciones.md with current hard rules.
 * @param wikiRoot Root of the wiki directory
 * @param projectName Project name
 * @param rules Content of hard rules (string)
 * @param frontmatter Optional frontmatter fields
 */
export function generateRestricciones(
  wikiRoot: string,
  projectName: string,
  rules: string,
  frontmatter?: Record<string, unknown>
): void {
  const baseFrontmatter = {
    id: 'restricciones',
    tags: ['restricciones', 'rules'],
    ...frontmatter,
  };
  writeOptimizedNote(wikiRoot, projectName, 'restricciones.md', baseFrontmatter, rules);
}

/**
 * Auto-generates/updates _README.md in 01_Proyectos/<project>/.
 * @param projectDir Path to 01_Proyectos/<project>/
 * @param specs Array of spec objects with name and status
 */
export function generateProjectReadme(
  projectDir: string,
  specs: Array<{ name: string; status: string }>
): void {
  const completedCount = specs.filter(s => s.status === 'completed').length;
  const specList = specs.map(s => `- ${s.name}: ${s.status}`).join('\n');
  const content = `# ${projectDir.split('/').pop()}\n\nStatus: ${completedCount}/${specs.length} specs completed\n\n## Specs\n\n${specList}\n`;
  const readmePath = join(projectDir, '_README.md');
  writeFileSync(readmePath, content, 'utf8');
}