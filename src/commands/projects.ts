import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readGlobalConfig, isProjectDir } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';

export interface ProjectStatus {
  name: string;
  path: string;
  changes: number;
  complete: number;
  pending: number;
}

export function detectProjects(projectsBase: string): string[] {
  if (!existsSync(projectsBase)) return [];
  return readdirSync(projectsBase, { withFileTypes: true })
    .filter(d => d.isDirectory() && isProjectDir(join(projectsBase, d.name)))
    .map(d => join(projectsBase, d.name));
}

/**
 * Progress of a project: how many changes it has and how many are done.
 *
 * The changes are counted in the single directory `resolveChangesDir` resolves
 * for the project: the historical layout is not inspected.
 */
export function getProjectStatus(projectPath: string): ProjectStatus {
  const name = projectPath.split('/').pop() ?? '';
  let changes = 0, complete = 0, pending = 0;

  const changesDir = resolveChangesDir({ projectRoot: projectPath });
  if (existsSync(changesDir)) {
    for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'archive' || entry.name === '_archived') continue;
      const tasksPath = join(changesDir, entry.name, 'tasks.md');
      if (!existsSync(tasksPath)) continue;
      changes++;
      const { readFileSync } = require('node:fs');
      const content = readFileSync(tasksPath, 'utf8');
      const done = (content.match(/\[x\]/g) ?? []).length;
      const total = (content.match(/\[[ x]\]/g) ?? []).length;
      if (done === total) complete++; else pending++;
    }
  }

  return { name, path: projectPath, changes, complete, pending };
}

export async function runProjects(opts: { json?: boolean } = {}): Promise<number> {
  const config = readGlobalConfig();
  const base = config.projects_base;
  if (!base) {
    console.error('[ERROR] projects_base not configured. Set it with: spectralis config --set projects_base=<path> --global');
    return 1;
  }

  const projectPaths = detectProjects(base);
  if (projectPaths.length === 0) {
    console.log('No projects found in', base);
    return 0;
  }

  const statuses = projectPaths.map(getProjectStatus);

  if (opts.json) {
    console.log(JSON.stringify({ projects: statuses }, null, 2));
    return 0;
  }

  console.log('\n== spectralis projects ==\n');
  console.log('  Project          | Changes | Complete | Pending');
  console.log('  -----------------|---------|----------|--------');
  for (const s of statuses) {
    console.log(`  ${s.name.padEnd(17)}| ${String(s.changes).padEnd(8)}| ${String(s.complete).padEnd(9)}| ${s.pending}`);
  }
  console.log('');
  return 0;
}
