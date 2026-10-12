import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const AGENTS = readFileSync(join(REPO, 'AGENTS.md'), 'utf8');
const BASE_STANDARDS = readFileSync(join(REPO, 'docs', 'base-standards.md'), 'utf8');

function lineCount(text: string): number {
  return text.replace(/\n+$/, '').split('\n').length;
}

test('AGENTS.md is a minimal router (~40 lines)', () => {
  const count = lineCount(AGENTS);
  assert.ok(
    count >= 35 && count <= 45,
    `AGENTS.md should be ~40 lines (±5), got ${count}`
  );
});

test('AGENTS.md references docs/base-standards.md and the skills index', () => {
  assert.match(AGENTS, /docs\/base-standards\.md/);
  assert.match(AGENTS, /\.agents\/skills\/INDEX\.md/);
});

test('AGENTS.md keeps every critical routing section', () => {
  const sections = [
    'Core Development Rules',
    'Skills Index',
    'Exploration Briefing Gate',
    'graphify',
    'Mandatory OpenSpec',
    'Obsidian Integration',
    'Obsidian Orchestration',
    'Lessons',
    'Fachada del ciclo spec',
    'Contrato de roles',
    'Delegación documental',
    'Contrato de reglas del ciclo',
    'Briefing técnico en la propuesta',
  ];
  for (const section of sections) {
    assert.ok(
      AGENTS.toLowerCase().includes(section.toLowerCase()),
      `AGENTS.md must keep the "${section}" section`
    );
  }
});

test('AGENTS.md does not duplicate base-standards.md content', () => {
  const baseLines = new Set(
    BASE_STANDARDS.split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length >= 40)
  );
  for (const line of AGENTS.split('\n').map((l) => l.trim())) {
    if (line.length >= 40) {
      assert.ok(!baseLines.has(line), `AGENTS.md duplicates a base-standards line: ${line}`);
    }
  }
});
