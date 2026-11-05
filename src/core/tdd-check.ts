import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { VaultDoctorFinding } from './vault-doctor';
import { resolveChangesDirs } from './resolve-changes-dir';

const TDD_MARKERS = /(\(tdd\)|tests? first|pruebas antes)/i;
const IMPL_VERBS = /(implement|crear|create|add|build|wire|restyle|refactor|migrate|setup)/i;
const EXEMPT_SECTIONS = /(setup|verification|update technical documentation|documentation|curl|endpoint|e2e|unit test)/i;

interface Section {
  title: string;
  tasks: string[];
}

function parseSections(content: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of content.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { title: heading[1], tasks: [] };
      sections.push(current);
      continue;
    }
    const task = line.match(/^-\s+\[[ x]\]\s+(.+)$/);
    if (task && current) {
      current.tasks.push(task[1]);
    }
  }
  return sections;
}

function isExempt(title: string): boolean {
  return EXEMPT_SECTIONS.test(title);
}

function isImplementation(task: string): boolean {
  return IMPL_VERBS.test(task) && !TDD_MARKERS.test(task);
}

function firstImplementationIndex(tasks: string[]): number {
  return tasks.findIndex((t) => isImplementation(t));
}

function firstTddTestIndex(tasks: string[]): number {
  return tasks.findIndex((t) => TDD_MARKERS.test(t));
}

function checkTasksFile(
  tasksPath: string,
  changeName: string,
  project: string,
  artifact: string
): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const content = readFileSync(tasksPath, 'utf8');
  for (const section of parseSections(content)) {
    if (isExempt(section.title)) continue;
    const implIdx = firstImplementationIndex(section.tasks);
    if (implIdx === -1) continue;
    const tddIdx = firstTddTestIndex(section.tasks);
    if (tddIdx === -1 || tddIdx > implIdx) {
      findings.push({
        severity: 'error',
        project,
        artifact,
        suggestion: `Añade una tarea de tests con marcador TDD antes del primer task de implementación en la sección "${section.title}" (Step K)`
      });
    }
  }
  return findings;
}

/**
 * TDD ordering of every active change of a project.
 *
 * Both layouts are inspected during the migration window (the resolved one and
 * the legacy `openspec/changes/`), so a project that has not migrated yet
 * keeps its Step K validation.
 */
export function checkTddOrdering(projectRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const project = basename(projectRoot);
  const seen = new Set<string>();

  for (const changesDir of resolveChangesDirs({ projectRoot })) {
    if (!existsSync(changesDir)) continue;
    for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'archive' || entry.name === '_archived') continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      const tasksPath = join(changesDir, entry.name, 'tasks.md');
      if (!existsSync(tasksPath)) continue;
      const rel = relative(projectRoot, tasksPath);
      const artifact = rel.startsWith('..') ? `openspec/changes/${entry.name}/tasks.md` : rel;
      findings.push(...checkTasksFile(tasksPath, entry.name, project, artifact));
    }
  }
  return findings;
}