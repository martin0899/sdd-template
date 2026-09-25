import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createWikiDir, writeOptimizedNote, readIndex, writeIndex, hybridExtract, generateArquitectura, generateDecisiones, generateErrores, generateLog, generateRestricciones, generateProjectReadme, SourceFile, Decision, ErrorEntry, LogEntry } from '../core/distill';
import { checkPermissions } from '../core/permissions';

export interface DistillOptions {
  project: string;
  dryRun?: boolean;
}

export async function runDistill(opts: DistillOptions): Promise<number> {
  const { project, dryRun } = opts;
  
  // Determine wiki root (vault root) - for now assume current directory
  const wikiRoot = process.cwd();
  const sourceDir = join(wikiRoot, '01_Proyectos', project);
  
  // Verify source directory exists
  if (!existsSync(sourceDir)) {
    console.error(`[ERROR] Project directory not found: ${sourceDir}`);
    return 1;
  }
  
  // Check permissions
  const permissionsOk = checkPermissions(sourceDir, wikiRoot);
  if (!permissionsOk) return 1;
  
  if (dryRun) {
    console.log(`[DRY RUN] Would distill project: ${project}`);
    console.log(`  Source: ${sourceDir}`);
    console.log(`  Target: ${join(wikiRoot, '05_wiki', project)}`);
    return 0;
  }
  
  // Create wiki directory structure
  createWikiDir(wikiRoot, project);
  
  // TODO: Read source files, extract knowledge, classify, and write output
  // This is a placeholder for the actual distillation logic
  console.log(`[INFO] Distilling project: ${project}`);
  
  // Update _INDEX.json
  const index = readIndex(wikiRoot);
  index[project] = {
    name: project,
    path: sourceDir,
    content: ['arquitectura', 'decisiones', 'errores', 'log', 'restricciones'],
    stack: [], // TODO: detect stack
    updated: new Date().toISOString(),
  };
  writeIndex(wikiRoot, index);
  
  console.log(`[INFO] Distillation complete for project: ${project}`);
  return 0;
}