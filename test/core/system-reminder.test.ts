import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updateSystemReminder,
  buildSkillsBlock,
  SKILLS_MARKER_BEGIN,
  SKILLS_MARKER_END,
  SYSTEM_REMINDER_BEGIN,
  SYSTEM_REMINDER_END,
  SKILLS_HEADING
} from '../../src/core/system-reminder';
import { DetectedSkill } from '../../src/core/skill-detector';

const SKILLS: DetectedSkill[] = [
  { name: 'alpha', description: 'Does alpha.', trigger: 'Does alpha.', path: '.agents/skills/alpha/SKILL.md', agent: 'opencode' },
  { name: 'bravo', description: 'Does bravo.', trigger: 'bravo trigger', path: '.claude/skills/bravo/SKILL.md', agent: 'claude' }
];

test('buildSkillsBlock renders heading and per-skill lines', () => {
  const block = buildSkillsBlock(SKILLS);
  assert.ok(block.startsWith(SKILLS_HEADING));
  assert.ok(block.includes('- alpha: Does alpha.'));
  assert.ok(block.includes('- bravo: Does bravo. (bravo trigger)'));
});

test('creates system-reminder block when prompt has none', () => {
  const result = updateSystemReminder('# Project\n\nRules.\n', SKILLS);
  assert.equal(result.status, 'created');
  assert.ok(result.content.includes(SYSTEM_REMINDER_BEGIN));
  assert.ok(result.content.includes(SYSTEM_REMINDER_END));
  assert.ok(result.content.includes('# Project'));
  assert.ok(result.content.includes(SKILLS_HEADING));
});

test('updates skills section preserving other reminder content', () => {
  const prompt = `${SYSTEM_REMINDER_BEGIN}\nIntro line\n${SKILLS_MARKER_BEGIN}\n## Skills disponibles\n- old: stale\n${SKILLS_MARKER_END}\nTrailer line\n${SYSTEM_REMINDER_END}`;
  const result = updateSystemReminder(prompt, SKILLS);
  assert.equal(result.status, 'updated');
  assert.ok(result.content.includes('Intro line'));
  assert.ok(result.content.includes('Trailer line'));
  assert.ok(!result.content.includes('stale'));
  assert.ok(result.content.includes('- alpha: Does alpha.'));
});

test('inserts skills section into existing reminder preserving other content', () => {
  const prompt = `${SYSTEM_REMINDER_BEGIN}\nKeep this.\n${SYSTEM_REMINDER_END}`;
  const result = updateSystemReminder(prompt, SKILLS);
  assert.equal(result.status, 'updated');
  assert.ok(result.content.includes('Keep this.'));
  assert.ok(result.content.includes(SKILLS_MARKER_BEGIN));
  assert.ok(result.content.includes(SKILLS_HEADING));
});

test('returns synced when skills section is already current', () => {
  const first = updateSystemReminder('# Project\n', SKILLS).content;
  const result = updateSystemReminder(first, SKILLS);
  assert.equal(result.status, 'synced');
  assert.equal(result.content, first);
});