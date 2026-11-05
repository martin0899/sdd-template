import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const AGENTS = readFileSync(join(REPO, 'AGENTS.md'), 'utf8');
const BRIEFING_SKILL = readFileSync(join(REPO, '.agents', 'skills', 'obsidian-briefing', 'SKILL.md'), 'utf8');

test('la plantilla AGENTS.md fija el briefing en la propuesta, antes de los artefactos, en SDD', () => {
  assert.match(AGENTS, /## Briefing técnico en la propuesta/);
  assert.match(AGENTS, /al proponer un cambio.*sdd/i);
  assert.match(AGENTS, /antes de invocar al planificador/i);
  assert.match(AGENTS, /folder note/);
});

test('obsidian-briefing cubre el disparo de propuesta además del apply', () => {
  assert.match(BRIEFING_SKILL, /propuesta|proponer/i);
  assert.match(BRIEFING_SKILL, /sdd/i);
  assert.match(BRIEFING_SKILL, /apply/i);
});