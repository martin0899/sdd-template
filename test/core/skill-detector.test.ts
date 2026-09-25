import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectSkills,
  extractSkillMetadata,
  buildSkillsIndex,
  DetectedSkill
} from '../../src/core/skill-detector';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-det-${prefix}-`));
}

function makeSkill(root: string, agentDir: string, skillName: string, frontmatter: string): void {
  const dir = join(root, agentDir, skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), `${frontmatter}# ${skillName}\n\nBody\n`);
}

test('detectSkills scans .agents/.claude/.cursor skill dirs', () => {
  const root = scratch('multi');
  try {
    makeSkill(root, '.agents/skills', 'alpha', '---\nname: alpha\ndescription: Does alpha things.\n---\n');
    makeSkill(root, '.claude/skills', 'bravo', '---\nname: bravo\ndescription: Does bravo things.\n---\n');
    makeSkill(root, '.cursor/skills', 'charlie', '---\nname: charlie\ndescription: Does charlie things.\n---\n');
    const skills = detectSkills(root);
    assert.equal(skills.length, 3);
    assert.deepEqual(skills.map((s) => s.agent).sort(), ['claude', 'cursor', 'opencode']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('detectSkills returns empty when no skills dirs exist', () => {
  const root = scratch('empty');
  try {
    assert.deepEqual(detectSkills(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('extractSkillMetadata reads name, description, path and agent', () => {
  const root = scratch('meta');
  try {
    makeSkill(root, '.agents/skills', 'alpha', '---\nname: alpha\ndescription: Does alpha things.\n---\n');
    const skills = detectSkills(root);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, 'alpha');
    assert.equal(skills[0].description, 'Does alpha things.');
    assert.equal(skills[0].agent, 'opencode');
    assert.ok(skills[0].path.endsWith('.agents/skills/alpha/SKILL.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('missing frontmatter falls back to dir name and No description', () => {
  const root = scratch('nofm');
  try {
    makeSkill(root, '.agents/skills', 'beta', '');
    const skills = detectSkills(root);
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, 'beta');
    assert.equal(skills[0].description, 'No description');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('trigger falls back to description when not present', () => {
  const root = scratch('trigger');
  try {
    makeSkill(root, '.agents/skills', 'alpha', '---\nname: alpha\ndescription: Does alpha.\n---\n');
    const [skill] = detectSkills(root);
    assert.equal(skill.trigger, 'Does alpha.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('buildSkillsIndex normalizes paths relative to project root', () => {
  const root = scratch('index');
  try {
    makeSkill(root, '.claude/skills', 'bravo', '---\nname: bravo\ndescription: Does bravo.\n---\n');
    const skills: DetectedSkill[] = detectSkills(root);
    const index = buildSkillsIndex(root, skills);
    assert.equal(index.version, 1);
    assert.ok(index.timestamp);
    assert.equal(index.skills[0].path, join('.claude/skills/bravo/SKILL.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});