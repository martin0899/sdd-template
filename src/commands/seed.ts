import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGlobalConfig, detectProjectFromCwd, setCurrentProjectRoot } from '../core/config';

export interface SeedProjectInfo {
  name: string;
  path: string;
  changes: number;
  stack: string[];
}

function readProjectStack(projectPath: string): string[] {
  const stackFile = join(projectPath, 'stack.json');
  if (!existsSync(stackFile)) return [];
  try {
    const raw = JSON.parse(readFileSync(stackFile, 'utf8')) as {
      backend?: string;
      frontend?: string;
      framework?: string;
      frameworkFe?: string;
    };
    const stack: string[] = [];
    for (const v of [raw.backend, raw.frontend]) {
      if (v && v !== 'generic' && v !== 'none') stack.push(v);
    }
    for (const fw of [raw.framework, raw.frameworkFe]) {
      if (fw && !stack.includes(fw)) stack.push(fw);
    }
    return stack;
  } catch {
    return [];
  }
}

export function discoverProjects(projectsBase: string): SeedProjectInfo[] {
  if (!existsSync(projectsBase)) return [];
  const projects: SeedProjectInfo[] = [];

  function walk(dir: string, depth: number) {
    if (depth > 5) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const projPath = join(dir, entry.name);
      const openspecDir = join(projPath, 'openspec');
      if (existsSync(openspecDir)) {
        const changesDir = join(openspecDir, 'changes');
        let changes = 0;
        if (existsSync(changesDir)) {
          changes = readdirSync(changesDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name !== 'archive')
            .length;
        }
        projects.push({ name: entry.name, path: projPath, changes, stack: readProjectStack(projPath) });
      } else {
        walk(projPath, depth + 1);
      }
    }
  }

  walk(projectsBase, 0);
  return projects;
}

export function seedProject(vaultRoot: string, project: SeedProjectInfo): string {
  const wikiDir = join(vaultRoot, '05_wiki', project.name);
  for (const sub of ['decisiones', 'errores', 'log']) {
    mkdirSync(join(wikiDir, sub), { recursive: true });
  }
  return wikiDir;
}

export function seedIndex(vaultRoot: string, projects: SeedProjectInfo[]): void {
  const index: Record<string, unknown> = {};
  for (const p of projects) {
    index[p.name] = {
      name: p.name,
      path: join('05_wiki', p.name),
      content: ['arquitectura', 'decisiones', 'errores', 'log', 'restricciones'],
      stack: p.stack,
      changes: p.changes,
      updated: new Date().toISOString()
    };
  }
  const wikiDir = join(vaultRoot, '05_wiki');
  mkdirSync(wikiDir, { recursive: true });
  writeFileSync(join(wikiDir, '_INDEX.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
}

export async function runSeed(opts: { project?: string; dryRun?: boolean; vaultRoot?: string } = {}): Promise<number> {
  const config = readGlobalConfig();
  const vaultRoot = opts.vaultRoot || config.vault_root || process.cwd();
  const projectsBase = config.projects_base;

  if (!projectsBase || !existsSync(projectsBase)) {
    console.error(`[ERROR] projects_base not found: ${projectsBase}`);
    return 1;
  }

  // Detect project from cwd (if running inside an installed project)
  const detected = detectProjectFromCwd(process.cwd());
  if (detected) {
    setCurrentProjectRoot(detected.root);
    console.log(`[OK] Detected project from cwd: ${detected.project} (${detected.root})`);
  }

  let projects = discoverProjects(projectsBase);
  if (opts.project) {
    projects = projects.filter(p => p.name === opts.project);
    if (projects.length === 0) {
      console.error(`[ERROR] Project not found: ${opts.project}`);
      return 1;
    }
  }

  if (opts.dryRun) {
    console.log(`[DRY RUN] Would seed ${projects.length} projects:`);
    for (const p of projects) {
      console.log(`  - ${p.name} (${p.changes} changes)`);
    }
    return 0;
  }

  for (const p of projects) {
    const wikiDir = seedProject(vaultRoot, p);
    console.log(`  ${'✔'} ${p.name} → ${wikiDir}`);
  }

  seedIndex(vaultRoot, projects);
  console.log(`\n[OK] Seeded ${projects.length} projects. _INDEX.json written.`);
  return 0;
}
