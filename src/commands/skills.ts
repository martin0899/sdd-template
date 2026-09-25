import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { detectSkills, buildSkillsIndex, DetectedSkill, SkillsIndex } from '../core/skill-detector';
import { updateSystemReminder } from '../core/system-reminder';

export interface SkillsOptions {
  destino?: string;
  dryRun?: boolean;
}

const INDEX_FILENAME = '_INDEX_SKILLS.json';
const PROMPT_FILENAME = 'AGENTS.md';

function projectRoot(destino: string | undefined): string {
  return resolve(process.cwd(), destino ?? '.');
}

function renderIndex(projectRootPath: string, skills: DetectedSkill[]): SkillsIndex {
  return buildSkillsIndex(projectRootPath, skills);
}

function writeIndex(projectRootPath: string, index: SkillsIndex): void {
  writeFileSync(join(projectRootPath, INDEX_FILENAME), JSON.stringify(index, null, 2) + '\n', 'utf8');
}

function promptPath(projectRootPath: string): string {
  return join(projectRootPath, PROMPT_FILENAME);
}

function currentPrompt(projectRootPath: string): string {
  const file = promptPath(projectRootPath);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

export async function runSkills(opts: SkillsOptions): Promise<number> {
  const root = projectRoot(opts.destino);
  const skills = detectSkills(root);
  const index = renderIndex(root, skills);

  if (opts.dryRun) {
    console.log(`[DRY RUN] Would detect skills in: ${root}`);
    for (const s of skills) {
      console.log(`  - ${s.name} (${s.agent}): ${s.description}`);
    }
    console.log(`  -> Would write ${INDEX_FILENAME} with ${skills.length} skills`);
    console.log(`  -> Would update ${PROMPT_FILENAME} <system-reminder> block`);
    return 0;
  }

  writeIndex(root, index);
  console.log(`[OK] ${INDEX_FILENAME} written with ${skills.length} skills`);

  const content = currentPrompt(root);
  const result = updateSystemReminder(content, skills);
  if (result.status !== 'synced') {
    writeFileSync(promptPath(root), result.content, 'utf8');
  }
  console.log(`[OK] <system-reminder> block in ${PROMPT_FILENAME} ${result.status === 'created' ? 'created' : result.status === 'updated' ? 'updated' : 'up-to-date'}`);

  return 0;
}