import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { readGlobalConfig, detectProjectFromCwd, setCurrentProjectRoot, isProjectDir } from '../core/config';
import { indexContent } from '../core/wiki-structure';
import { resolveChangesDirs } from '../core/resolve-changes-dir';

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
      if (isProjectDir(projPath)) {
        // Both layouts are counted during the migration window (the resolved
        // one and the legacy `openspec/changes/`): a project that has not
        // migrated yet keeps reporting its changes. A change that lives in
        // both layouts is counted once.
        const counted = new Set<string>();
        for (const changesDir of resolveChangesDirs({ projectRoot: projPath })) {
          if (!existsSync(changesDir)) continue;
          for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name === 'archive' || entry.name === '_archived') continue;
            counted.add(entry.name);
          }
        }
        projects.push({ name: entry.name, path: projPath, changes: counted.size, stack: readProjectStack(projPath) });
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
  // Aligned with the 4-aggregate scheme: only the project dir, no obsolete subfolders.
  mkdirSync(wikiDir, { recursive: true });
  return wikiDir;
}

export function seedIndex(vaultRoot: string, projects: SeedProjectInfo[]): void {
  const index: Record<string, unknown> = {};
  for (const p of projects) {
    index[p.name] = {
      name: p.name,
      path: join('05_wiki', p.name),
      content: indexContent(),
      stack: p.stack,
      changes: p.changes,
      updated: new Date().toISOString()
    };
  }
  const wikiDir = join(vaultRoot, '05_wiki');
  mkdirSync(wikiDir, { recursive: true });
  // Atomic write: temp + rename (avoids partial files on interruption).
  const indexPath = join(wikiDir, '_INDEX.json');
  const tmpPath = `${indexPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
  renameSync(tmpPath, indexPath);
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
