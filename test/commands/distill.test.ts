import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSpecSources, runDistill } from '../../src/commands/distill';
import {
  deterministicExtract,
  classifyByFilename,
  createDistillCache,
  hybridExtract,
} from '../../src/core/distill';

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
  // New behavior: single decisiones.md file, not a folder
  const decisionesPath = join(wikiProject, 'decisiones.md');
  assert.ok(existsSync(decisionesPath), 'decisiones.md should exist');
  const spec = readFileSync(decisionesPath, 'utf8');
  assert.match(spec, /SQLite/);

  // No distilled file may contain _Notas content.
  for (const file of walkFiles(wikiProject)) {
    const raw = readFileSync(file, 'utf8');
    assert.doesNotMatch(raw, /ORM todavía|pendiente/i, `_Notas leaked into ${file}`);
  }
});

test('classifyByFilename maps briefing/tests/resumen by convention', () => {
  assert.equal(classifyByFilename('add-foo/briefing.md', '# Brief'), 'ADR');
  assert.equal(classifyByFilename('add-foo/tests.md', '# Tests'), 'noise');
  assert.equal(classifyByFilename('add-foo/resumen.md', '# Resumen'), 'noise');
  assert.equal(
    classifyByFilename('add-foo/resumen.md', '## Causa raíz\nEl bug fue...'),
    'post-mortem'
  );
  assert.equal(classifyByFilename('add-foo/proposal.md', '# Propuesta'), null);
});

test('deterministicExtract discards noise and never leaves it ambiguous', () => {
  const sources = [
    { path: 'add-foo/briefing.md', content: '# Brief\n## Decisiones\nUsar X', frontmatter: {} },
    { path: 'add-foo/tests.md', content: '# Tests\nCaso 1', frontmatter: {} },
    { path: 'add-foo/resumen.md', content: '# Resumen\nImplementado', frontmatter: {} },
    { path: 'add-foo/postmortem.md', content: '## Causa raíz\nSe rompió', frontmatter: {} },
  ];
  const { classified, ambiguous } = deterministicExtract(sources);
  assert.equal(ambiguous.length, 0);
  const paths = classified.map((c) => c.sourcePath);
  assert.deepEqual(paths, ['add-foo/briefing.md', 'add-foo/postmortem.md']);
});

test('distillCache round-trips by content hash and invalidates on change', () => {
  const dir = scratch();
  const cache = createDistillCache(dir);
  assert.equal(cache.get('add-foo/briefing.md', 'contenido v1'), null);
  cache.set('add-foo/briefing.md', 'contenido v1', 'ADR');
  assert.equal(cache.get('add-foo/briefing.md', 'contenido v1'), 'ADR');
  assert.equal(cache.get('add-foo/briefing.md', 'contenido v2'), null);
});

test('hybridExtract with zero ambiguous entries never calls the LLM', async () => {
  const sources = [
    { path: 'add-foo/briefing.md', content: '## Decisiones\nUsar X', frontmatter: {} },
    { path: 'add-foo/tests.md', content: '# Tests\nCaso 1', frontmatter: {} },
  ];
  const llm = { host: 'http://127.0.0.1:9', model: 'x', enabled: true }; // unreachable on purpose
  const dir = scratch();
  const cache = createDistillCache(dir);
  const result = await hybridExtract(sources, llm, cache);
  assert.equal(result.classified.length, 1);
  assert.equal(result.classified[0].classification, 'ADR');
});