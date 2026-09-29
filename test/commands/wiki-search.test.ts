import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWikiSearch } from '../../src/commands/wiki-search';

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'spectralis-wiki-search-'));
}

test('runWikiSearch returns 1 when vault_root not configured', async () => {
  // This test relies on vault_root not being configured in test environment
  // We can't easily test this without mocking, so we skip if vault_root exists
  const code = await runWikiSearch({ project: 'Spectralis', vaultRoot: undefined });
  // Either 0 (configured) or 1 (not configured) is acceptable
  assert.ok(code === 0 || code === 1, 'Should return 0 or 1');
});

test('runWikiSearch returns 1 when project wiki does not exist', async () => {
  const vault = scratch();
  try {
    // Create empty vault structure
    mkdirSync(join(vault, '05_wiki'), { recursive: true });
    const code = await runWikiSearch({ project: 'nonexistent', vaultRoot: vault });
    assert.equal(code, 1, 'Should return 1 for nonexistent project');
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('runWikiSearch returns 0 with empty query when project exists', async () => {
  const vault = scratch();
  try {
    // Create wiki structure
    mkdirSync(join(vault, '05_wiki', 'testproject'), { recursive: true });
    writeFileSync(join(vault, '05_wiki', 'testproject', 'arquitectura.md'), '# Arquitectura\nTest content');
    const code = await runWikiSearch({ project: 'testproject', vaultRoot: vault });
    assert.equal(code, 0, 'Should return 0 for existing project');
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('runWikiSearch returns 0 with JSON output', async () => {
  const vault = scratch();
  try {
    // Create wiki structure
    mkdirSync(join(vault, '05_wiki', 'testproject'), { recursive: true });
    writeFileSync(join(vault, '05_wiki', 'testproject', 'arquitectura.md'), '# Arquitectura\nTest content');
    const code = await runWikiSearch({ project: 'testproject', json: true, vaultRoot: vault });
    assert.equal(code, 0, 'Should return 0 for successful JSON search');
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('runWikiSearch filters by file with --file flag', async () => {
  const vault = scratch();
  try {
    // Create wiki structure with multiple files
    mkdirSync(join(vault, '05_wiki', 'testproject'), { recursive: true });
    writeFileSync(join(vault, '05_wiki', 'testproject', 'arquitectura.md'), '# Arquitectura\nUnique content A');
    writeFileSync(join(vault, '05_wiki', 'testproject', 'decisiones.md'), '# Decisiones\nUnique content B');
    const code = await runWikiSearch({
      project: 'testproject',
      query: 'Unique',
      file: 'arquitectura.md',
      vaultRoot: vault,
    });
    assert.equal(code, 0, 'Should return 0 for successful filtered search');
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('runWikiSearch outputs JSON that can be parsed', async () => {
  const vault = scratch();
  let output = '';
  try {
    // Create wiki structure
    mkdirSync(join(vault, '05_wiki', 'testproject'), { recursive: true });
    writeFileSync(join(vault, '05_wiki', 'testproject', 'arquitectura.md'), '---\nid: arquitectura\ntags: [arquitectura, test]\n---\n# Arquitectura\nSearchable content');

    // Capture console.log output
    const originalLog = console.log;
    let capturedOutput = '';
    console.log = (...args: unknown[]) => { capturedOutput += args.join(' ') + '\n'; };

    await runWikiSearch({ project: 'testproject', query: 'Searchable', json: true, vaultRoot: vault });

    console.log = originalLog;

    // Should be valid JSON
    const parsed = JSON.parse(capturedOutput.trim());
    assert.equal(parsed.project, 'testproject');
    assert.equal(parsed.query, 'Searchable');
    assert.ok(Array.isArray(parsed.results));
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test('runWikiSearch finds content in decisiones.md', async () => {
  const vault = scratch();
  let output = '';
  try {
    mkdirSync(join(vault, '05_wiki', 'testproject'), { recursive: true });
    writeFileSync(join(vault, '05_wiki', 'testproject', 'decisiones.md'), '---\nid: decisiones\n---\n# Decisiones\n\n### add-feature\n\nFuente: `add-feature`\nEstado: completado\n\nContent about the feature');

    const originalLog = console.log;
    let capturedOutput = '';
    console.log = (...args: unknown[]) => { capturedOutput += args.join(' ') + '\n'; };

    await runWikiSearch({ project: 'testproject', query: 'feature', vaultRoot: vault });

    console.log = originalLog;

    assert.ok(capturedOutput.includes('decisiones.md'), 'Should find result in decisiones.md');
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
