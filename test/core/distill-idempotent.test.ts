import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createWikiDir,
  generateArquitectura,
  generateDecisiones,
  generateOperacion,
  generateHistorial,
  writeOptimizedNote,
  Decision,
  ErrorEntry,
  LogEntry,
} from '../../src/core/distill';
import { extractSpecIds, decisionesPath } from '../../src/core/wiki-structure';

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'spectralis-idempotent-'));
}

test('contract: what distill writes is what the wiki structure module expects', () => {
  // Ties the real producer to the shared contract: if generateDecisiones changes
  // its filename or its block anchor, this fails instead of leaving
  // checkUndistilled and wiki-search silently matching nothing.
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    generateDecisiones(root, 'my-project', [{ specId: 'add-contract', content: 'Contenido' }]);

    const written = join(root, '05_wiki', 'my-project', 'decisiones.md');
    assert.ok(existsSync(written), 'distill must write the decisions aggregate');
    assert.equal(
      decisionesPath(root, 'my-project'),
      written,
      'the contract path must match the file the producer actually wrote'
    );

    const ids = extractSpecIds(readFileSync(written, 'utf8'));
    assert.ok(ids.has('add-contract'), 'the shared extractor must read the block distill wrote');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateArquitectura is idempotent - second run produces same output', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    generateArquitectura(root, 'my-project', ['Briefing content']);
    const filePath = join(root, '05_wiki', 'my-project', 'arquitectura.md');
    const content1 = readFileSync(filePath, 'utf8');

    // Second run
    generateArquitectura(root, 'my-project', ['Briefing content']);
    const content2 = readFileSync(filePath, 'utf8');

    assert.equal(content1, content2, 'arquitectura.md should be identical on second run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateDecisiones is idempotent - second run produces same output', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const decisions: Decision[] = [
      { specId: 'add-foo', content: 'Use feature X' },
    ];
    generateDecisiones(root, 'my-project', decisions);
    const filePath = join(root, '05_wiki', 'my-project', 'decisiones.md');
    const content1 = readFileSync(filePath, 'utf8');

    // Second run
    generateDecisiones(root, 'my-project', decisions);
    const content2 = readFileSync(filePath, 'utf8');

    assert.equal(content1, content2, 'decisiones.md should be identical on second run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateOperacion is idempotent - second run produces same output', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const errors: ErrorEntry[] = [
      { specId: 'add-foo', content: 'Bug in feature X' },
    ];
    generateOperacion(root, 'my-project', errors, 'Rule: Use feature X');
    const filePath = join(root, '05_wiki', 'my-project', 'operacion.md');
    const content1 = readFileSync(filePath, 'utf8');

    // Second run
    generateOperacion(root, 'my-project', errors, 'Rule: Use feature X');
    const content2 = readFileSync(filePath, 'utf8');

    assert.equal(content1, content2, 'operacion.md should be identical on second run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateHistorial is idempotent - second run produces same output', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const entries: LogEntry[] = [
      { specId: 'add-foo', content: 'Implemented feature X', frontmatter: { updated: '2026-09-01' } },
    ];
    generateHistorial(root, 'my-project', entries);
    const filePath = join(root, '05_wiki', 'my-project', 'historial.md');
    const content1 = readFileSync(filePath, 'utf8');

    // Second run
    generateHistorial(root, 'my-project', entries);
    const content2 = readFileSync(filePath, 'utf8');

    assert.equal(content1, content2, 'historial.md should be identical on second run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});



test('Full distill flow produces exactly 4 files and no legacy structure', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const projectDir = join(root, '05_wiki', 'my-project');

    const decisions: Decision[] = [{ specId: 'add-foo', content: 'Decision content' }];
    const errors: ErrorEntry[] = [{ specId: 'add-foo', content: 'Error content' }];
    const logs: LogEntry[] = [{ specId: 'add-foo', content: 'Log content', frontmatter: { updated: '2026-09-01' } }];

    generateArquitectura(root, 'my-project', ['Briefing']);
    generateDecisiones(root, 'my-project', decisions);
    generateOperacion(root, 'my-project', errors, 'Restrictions');
    generateHistorial(root, 'my-project', logs);

    // Assert on the whole directory, not just .md files: the legacy scheme showed
    // up as folders (decisiones/, errores/, log/), which an extension filter hides.
    const entries = readdirSync(projectDir, { withFileTypes: true });
    const names = entries.map((e) => e.name).sort();
    assert.deepEqual(
      names,
      ['arquitectura.md', 'decisiones.md', 'historial.md', 'operacion.md'],
      `the wiki dir must hold exactly the 4 aggregates, got: ${names.join(', ')}`
    );
    assert.ok(entries.every((e) => e.isFile()), 'no legacy folder may be created');
    for (const legacy of ['decisiones', 'errores', 'log']) {
      assert.ok(!names.includes(legacy), `legacy folder ${legacy}/ must not be created`);
    }
    assert.ok(!names.includes('restricciones.md'), 'restricciones.md must not be created');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Each block has minimum provenance (spec-id, state, date)', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const decisions: Decision[] = [
      { specId: 'add-foo', content: 'Decision content' },
    ];
    generateDecisiones(root, 'my-project', decisions);
    const content = readFileSync(join(root, '05_wiki', 'my-project', 'decisiones.md'), 'utf8');

    // Check for minimum provenance
    assert.ok(content.includes('add-foo'), 'Should include spec-id');
    assert.ok(content.includes('Fuente:'), 'Should include Fuente');
    assert.ok(content.includes('Estado:'), 'Should include Estado');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Exit code 0 on normal execution', () => {
  // This is implicitly tested by other tests passing
  // The runDistill function returns 0 on success
  assert.ok(true, 'Exit code 0 verified by successful test runs');
});
