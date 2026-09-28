import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { basename } from 'node:path';
import { VaultDoctorFinding } from './vault-doctor';

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

function checkTasksFile(tasksPath: string, changeName: string, project: string): VaultDoctorFinding[] {
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
        artifact: `openspec/changes/${changeName}/tasks.md`,
        suggestion: `Añade una tarea de tests con marcador TDD antes del primer task de implementación en la sección "${section.title}" (Step K)`
      });
    }
  }
  return findings;
}

export function checkTddOrdering(projectRoot: string): VaultDoctorFinding[] {
  const findings: VaultDoctorFinding[] = [];
  const project = basename(projectRoot);
  const changesDir = join(projectRoot, 'openspec', 'changes');
  if (!existsSync(changesDir)) return findings;

  for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const tasksPath = join(changesDir, entry.name, 'tasks.md');
    if (!existsSync(tasksPath)) continue;
    findings.push(...checkTasksFile(tasksPath, entry.name, project));
  }
  return findings;
}