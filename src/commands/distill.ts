import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import { createWikiDir, writeOptimizedNote, readIndex, writeIndex, hybridExtract, generateArquitectura, generateDecisiones, generateErrores, generateLog, generateRestricciones, generateProjectReadme, SourceFile, Decision, ErrorEntry, LogEntry, LlmOptions, ClassifiedEntry } from '../core/distill';
import { checkPermissions } from '../core/permissions';
import { readLlmConfig, resolveProjectRoot, readGlobalConfig, detectProjectFromCwd, setCurrentProjectRoot } from '../core/config';
import { generateProjectId } from '../core/project-id';
import { detectStack } from '../core/detect-stack';

export interface DistillOptions {
  project: string;
  dryRun?: boolean;
  projectRoot?: string;
  vaultRoot?: string;
}

function readSpecSources(specDir: string): SourceFile[] {
  const sources: SourceFile[] = [];
  if (!existsSync(specDir)) return sources;
  for (const entry of readdirSync(specDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const subDir = join(specDir, entry.name);
      for (const f of readdirSync(subDir)) {
        if (f.endsWith('.md')) {
          const path = join(subDir, f);
          const raw = readFileSync(path, 'utf8');
          const parsed = matter(raw);
          sources.push({ path: `${entry.name}/${f}`, content: parsed.content, frontmatter: parsed.data });
        }
      }
    } else if (entry.name.endsWith('.md') && entry.name !== '_INDEX.md' && entry.name !== '_README.md') {
      const path = join(specDir, entry.name);
      const raw = readFileSync(path, 'utf8');
      const parsed = matter(raw);
      sources.push({ path: entry.name, content: parsed.content, frontmatter: parsed.data });
    }
  }
  return sources;
}

function extractSpecId(path: string): string {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[0] : path.replace(/\.\w+$/, '');
}

function extractSections(content: string): { decisions: string; bugs: string; logs: string; rules: string } {
  const sections = { decisions: '', bugs: '', logs: '', rules: '' };
  const lines = content.split('\n');
  let current = '';
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (lower.includes('decisión') || lower.includes('decision') || lower.includes('técnica') || lower.includes('technical')) current = 'decisions';
      else if (lower.includes('bug') || lower.includes('error') || lower.includes('causa') || lower.includes('post-mortem') || lower.includes('fix')) current = 'bugs';
      else if (lower.includes('lección') || lower.includes('leccion') || lower.includes('cambio') || lower.includes('change') || lower.includes('log') || lower.includes('historial') || lower.includes('realizada')) current = 'logs';
      else if (lower.includes('regla') || lower.includes('restric') || lower.includes('impacto') || lower.includes('impact') || lower.includes('constraint')) current = 'rules';
      else if (lower.includes('contexto') || lower.includes('context') || lower.includes('información') || lower.includes('general')) current = 'decisions';
      else current = '';
    }
    if (current) sections[current as keyof typeof sections] += line + '\n';
  }
  return sections;
}

export async function runDistill(opts: DistillOptions): Promise<number> {
  const { project, dryRun, projectRoot: explicitRoot, vaultRoot: explicitVault } = opts;

  const wikiRoot = explicitVault || readGlobalConfig().vault_root || process.cwd();
  const sourceDir = join(wikiRoot, '01_Proyectos', project);

  if (!existsSync(sourceDir)) {
    console.error(`[ERROR] Project directory not found: ${sourceDir}`);
    return 1;
  }

  const permissionsOk = checkPermissions(sourceDir, wikiRoot);
  if (!permissionsOk) return 1;

  // Stack detection
  const projectRoot = resolveProjectRoot(project, { projectRoot: explicitRoot, cwd: process.cwd() });
  if (projectRoot) {
    setCurrentProjectRoot(projectRoot);
  } else {
    // Try cwd detection as fallback
    const detected = detectProjectFromCwd(process.cwd());
    if (detected) setCurrentProjectRoot(detected.root);
  }
  let stack: string[] = [];
  if (projectRoot) {
    const info = detectStack(projectRoot);
    const raw: string[] = [info.backend, info.frontend];
    stack = raw.filter((s) => s && s !== 'none' && s !== 'generic');
    if (stack.length === 0) stack = ['generic'];
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would distill project: ${project}`);
    console.log(`  Source: ${sourceDir}`);
    console.log(`  Target: ${join(wikiRoot, '05_wiki', project)}`);
    console.log(`  Stack: ${stack.length > 0 ? stack.join(', ') : '(empty)'}`);
    return 0;
  }

  createWikiDir(wikiRoot, project);

  // Read spec sources
  const sources = readSpecSources(sourceDir);
  console.log(`[INFO] Reading ${sources.length} spec files from ${sourceDir}`);

  // Classify with LLM
  const llm: LlmOptions = readLlmConfig();
  const result = await hybridExtract(sources, llm);
  console.log(`[INFO] Classified ${result.classified.length} entries`);

  // Extract sections and generate outputs
  const allDecisions: Decision[] = [];
  const allErrors: ErrorEntry[] = [];
  const allLogs: LogEntry[] = [];
  let allRules = '';
  const briefings: string[] = [];

  for (const entry of result.classified) {
    const sections = extractSections(entry.content);
    const specId = extractSpecId(entry.sourcePath);
    if (sections.decisions) allDecisions.push({ specId, content: sections.decisions });
    if (sections.bugs) allErrors.push({ specId, content: sections.bugs });
    if (sections.logs) allLogs.push({ content: sections.logs });
    if (sections.rules) allRules += sections.rules + '\n';
    briefings.push(entry.content);
  }

  // Also extract from all sources (not just classified)
  for (const src of sources) {
    const sections = extractSections(src.content);
    const specId = extractSpecId(src.path);
    if (sections.decisions && !allDecisions.some(d => d.specId === specId)) {
      allDecisions.push({ specId, content: sections.decisions });
    }
    if (sections.bugs && !allErrors.some(e => e.specId === specId)) {
      allErrors.push({ specId, content: sections.bugs });
    }
    if (sections.rules) allRules += sections.rules + '\n';
  }

  // Generate outputs
  if (briefings.length > 0) generateArquitectura(wikiRoot, project, briefings);
  if (allDecisions.length > 0) generateDecisiones(wikiRoot, project, allDecisions);
  if (allErrors.length > 0) generateErrores(wikiRoot, project, allErrors);
  if (allLogs.length > 0) generateLog(wikiRoot, project, allLogs, new Date().toISOString().slice(0, 7));
  if (allRules) generateRestricciones(wikiRoot, project, allRules);

  // Update _INDEX.json
  const index = readIndex(wikiRoot);
  index[project] = {
    id: generateProjectId(project),
    name: project,
    path: sourceDir,
    content: ['arquitectura', 'decisiones', 'errores', 'log', 'restricciones'],
    stack,
    updated: new Date().toISOString(),
  };
  writeIndex(wikiRoot, index);

  console.log(`[OK] Distillation complete: ${allDecisions.length} ADRs, ${allErrors.length} post-mortems, ${allLogs.length} log entries`);
  return 0;
}
