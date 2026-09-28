import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSpecSources } from '../../src/commands/distill';

const created: string[] = [];
afterEach(() => { for (const d of created) rmSync(d, { recursive: true, force: true }); created.length = 0; });

function scratch(): string { const d = mkdtempSync(join(tmpdir(), 'sp-distill-')); created.push(d); return d; }

test('readSpecSources skips underscore-prefixed entries', () => {
  const projectDir = scratch();
  mkdirSync(join(projectDir, 'add-spec-one'), { recursive: true });
  writeFileSync(join(projectDir, 'add-spec-one', 'briefing.md'), '---\nid: brief\n---\n# Brief\n');
  mkdirSync(join(projectDir, '_Notas'), { recursive: true });
  writeFileSync(join(projectDir, '_Notas', 'decision.md'), '# Decisión\n## Decisiones\nAlgo');
  writeFileSync(join(projectDir, '_INDEX.md'), '# Index');
  writeFileSync(join(projectDir, '_README.md'), '# Readme');

  const sources = readSpecSources(projectDir);
  const paths = sources.map(s => s.path);
  assert.deepEqual(paths, ['add-spec-one/briefing.md']);
});

test('readSpecSources reads top-level md files (non underscore)', () => {
  const projectDir = scratch();
  writeFileSync(join(projectDir, 'spec.md'), '# Spec\nSome content');
  writeFileSync(join(projectDir, '_INDEX.md'), '# Index');

  const sources = readSpecSources(projectDir);
  const paths = sources.map(s => s.path);
  assert.deepEqual(paths, ['spec.md']);
});