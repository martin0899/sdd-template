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

test('AGENTS.md is a minimal router (~25 lines)', () => {
  const count = lineCount(AGENTS);
  assert.ok(
    count >= 22 && count <= 28,
    `AGENTS.md should be ~25 lines (22-28), got ${count}`
  );
});

test('AGENTS.md references docs/base-standards.md and the skills index', () => {
  assert.match(AGENTS, /docs\/base-standards\.md/);
  assert.match(AGENTS, /\.agents\/skills\/INDEX\.md/);
});

test('AGENTS.md keeps every essential routing reference', () => {
  const references = [
    'docs/base-standards.md',
    '.agents/skills/INDEX.md',
    'graphify',
    'OpenSpec',
    'obsidianSync',
    '_lessons.md',
    'ciclo spec'
  ];
  for (const reference of references) {
    assert.ok(
      AGENTS.includes(reference),
      `AGENTS.md must keep the "${reference}" reference`
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
