import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSpecSources, runDistill } from '../../src/commands/distill';

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

function walkFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

test('runDistill excludes _Notas content from the wiki output', async () => {
  const vault = scratch();
  const projectDir = join(vault, '01_Proyectos', 'demo');
  mkdirSync(join(projectDir, 'add-feature-x'), { recursive: true });
  writeFileSync(
    join(projectDir, 'add-feature-x', 'briefing.md'),
    '---\ntipo: decision\n---\n# Decisión\n## Decisiones\nUsar SQLite para persistencia'
  );
  mkdirSync(join(projectDir, '_Notas'), { recursive: true });
  writeFileSync(
    join(projectDir, '_Notas', 'pendiente.md'),
    '---\ntipo: decision\n---\n# Nota pendiente\n## Decisiones\nElegir el ORM todavía no está decidido'
  );

  const code = await runDistill({ project: 'demo', vaultRoot: vault });
  assert.equal(code, 0);

  const wikiProject = join(vault, '05_wiki', 'demo');
  assert.deepEqual(readdirSync(join(wikiProject, 'decisiones')), ['add-feature-x.md']);
  const spec = readFileSync(join(wikiProject, 'decisiones', 'add-feature-x.md'), 'utf8');
  assert.match(spec, /SQLite/);

  // No distilled file may contain _Notas content.
  for (const file of walkFiles(wikiProject)) {
    const raw = readFileSync(file, 'utf8');
    assert.doesNotMatch(raw, /ORM todavía|pendiente/i, `_Notas leaked into ${file}`);
  }
});