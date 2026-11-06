import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { VaultDoctorFinding } from './vault-doctor';
import { resolveChangesDir } from './resolve-changes-dir';

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
 * The changes are read from a single directory: the one `resolveChangesDir`
 * resolves for the project. The historical layout is not inspected — a project
 * that has not migrated yet must be migrated (`spectralis spec migrate`) to
 * keep its Step K validation.
 */
export function checkTddOrdering(projectRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const project = basename(projectRoot);
  const changesDir = resolveChangesDir({ projectRoot });
  if (!existsSync(changesDir)) return findings;

  for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive' || entry.name === '_archived') continue;
    const tasksPath = join(changesDir, entry.name, 'tasks.md');
    if (!existsSync(tasksPath)) continue;
    const rel = relative(projectRoot, tasksPath);
    const artifact = rel.startsWith('..') ? tasksPath : rel;
    findings.push(...checkTasksFile(tasksPath, entry.name, project, artifact));
  }
  return findings;
}