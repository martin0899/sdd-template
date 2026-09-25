import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';

/**
 * Agent directory conventions used to map a skills root to an agent label.
 * `.agents/skills/` is the shared opencode/antigravity directory.
 */
export const SKILL_AGENT_DIRS: ReadonlyArray<{ dir: string; agent: string }> = [
  { dir: '.agents/skills', agent: 'opencode' },
  { dir: '.claude/skills', agent: 'claude' },
  { dir: '.cursor/skills', agent: 'cursor' }
];

export interface DetectedSkill {
  name: string;
  description: string;
  trigger: string;
  path: string;
  agent: string;
}

export interface SkillsIndex {
  version: number;
  timestamp: string;
  skills: DetectedSkill[];
}

const INDEX_VERSION = 1;

/**
 * Recursively finds all `SKILL.md` files under a skills root directory.
 * Returns absolute paths, or an empty array when the directory doesn't exist.
 */
function findSkillFiles(skillsRoot: string): string[] {
  const found: string[] = [];
  if (!existsSync(skillsRoot)) return found;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        walk(abs);
      } else if (entry === 'SKILL.md') {
        found.push(abs);
      }
    }
  };

  walk(skillsRoot);
  return found;
}

/**
 * Extracts skill metadata from a SKILL.md file using its frontmatter.
 * Falls back to the directory name and "No description" when frontmatter is
 * missing or lacks the expected fields.
 */
export function extractSkillMetadata(filePath: string, agent: string): DetectedSkill {
  const raw = readFileSync(filePath, 'utf8');
  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = matter(raw).data;
  } catch {
    frontmatter = {};
  }

  const dirName = filePath.split(sep).filter(Boolean).slice(-2, -1)[0] ?? '';
  const name =
    typeof frontmatter.name === 'string' && frontmatter.name.length > 0 ? frontmatter.name : dirName;
  const description =
    typeof frontmatter.description === 'string' && frontmatter.description.length > 0
      ? frontmatter.description
      : 'No description';
  const trigger =
    typeof frontmatter.trigger === 'string' && frontmatter.trigger.length > 0
      ? frontmatter.trigger
      : description;

  return { name, description, trigger, path: filePath, agent };
}

/**
 * Scans every supported agent skills directory under the project root and
 * returns the detected skills with their metadata.
 */
export function detectSkills(projectRoot: string): DetectedSkill[] {
  const skills: DetectedSkill[] = [];
  for (const { dir, agent } of SKILL_AGENT_DIRS) {
    const root = join(projectRoot, dir);
    for (const file of findSkillFiles(root)) {
      skills.push(extractSkillMetadata(file, agent));
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Builds the `_INDEX_SKILLS.json` payload. Paths are normalized to be relative
 * to the project root so the index stays portable.
 */
export function buildSkillsIndex(projectRoot: string, skills: DetectedSkill[]): SkillsIndex {
  return {
    version: INDEX_VERSION,
    timestamp: new Date().toISOString(),
    skills: skills.map((s) => ({
      ...s,
      path: relative(projectRoot, s.path)
    }))
  };
}