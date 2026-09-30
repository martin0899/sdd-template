import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createWikiDir,
  writeOptimizedNote,
  readIndex,
  writeIndex,
  generateArquitectura,
  generateDecisiones,
  generateLog,
  generateHistorial,
  generateOperacion,
  generateProjectReadme,
  WikiIndex,
  Decision,
  ErrorEntry,
  LogEntry,
} from '../../src/core/distill';

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'spectralis-distill-'));
}

test('createWikiDir creates directory structure (4 aggregates, no obsolete subfolders)', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const projectDir = join(root, '05_wiki', 'my-project');
    assert.ok(existsSync(projectDir));
    assert.ok(!existsSync(join(projectDir, 'decisiones')));
    assert.ok(!existsSync(join(projectDir, 'errores')));
    assert.ok(!existsSync(join(projectDir, 'log')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writeOptimizedNote writes file with minimal frontmatter', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const frontmatter = { id: 'test-id', tags: ['tag1', 'tag2'], extra: 'ignored' };
    writeOptimizedNote(root, 'my-project', 'test.md', frontmatter, 'Hello world');
    const filePath = join(root, '05_wiki', 'my-project', 'test.md');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf8');
    assert.ok(content.includes('id: test-id'));
    assert.ok(content.includes('tags:'));
    assert.ok(!content.includes('extra:'));
    assert.ok(!content.includes('Tipo:'));
    assert.ok(!content.includes('Proyecto:'));
    assert.ok(!content.includes('Fecha:'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readIndex returns empty object when file missing', () => {
  const root = scratch();
  try {
    const index = readIndex(root);
    assert.deepEqual(index, {});
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writeIndex and readIndex round-trip', () => {
  const root = scratch();
  try {
    const index: WikiIndex = {
      'my-project': {
        name: 'my-project',
        path: '/some/path',
        content: ['arquitectura'],
        stack: ['node'],
        updated: '2026-01-01',
      },
    };
    writeIndex(root, index);
    const read = readIndex(root);
    assert.deepEqual(read, index);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateArquitectura writes arquitectura.md', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    generateArquitectura(root, 'my-project', ['Briefing 1', 'Briefing 2']);
    const filePath = join(root, '05_wiki', 'my-project', 'arquitectura.md');
    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Briefing 1'));
    assert.ok(content.includes('Briefing 2'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateDecisiones writes single decisiones.md file', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const decisions: Decision[] = [
      { specId: 'spec1', content: 'Decision 1 content' },
      { specId: 'spec2', content: 'Decision 2 content', frontmatter: { extra: 'value' } },
    ];
    generateDecisiones(root, 'my-project', decisions);
    // New behavior: single decisiones.md file
    const filePath = join(root, '05_wiki', 'my-project', 'decisiones.md');
    assert.ok(existsSync(filePath), 'decisiones.md should exist');
    const content = readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Decision 1 content'));
    assert.ok(content.includes('Decision 2 content'));
    assert.ok(content.includes('spec1'));
    assert.ok(content.includes('spec2'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test('generateLog appends to monthly file', () => {
  const root = scratch();
  try {
    createWikiDir(root, 'my-project');
    const entries1: LogEntry[] = [{ specId: 'add-foo', content: 'First entry' }];
    generateLog(root, 'my-project', entries1, '2026-09');
    const filePath = join(root, '05_wiki', 'my-project', 'log', '2026-09.md');
    assert.ok(existsSync(filePath));
    const content1 = readFileSync(filePath, 'utf8');
    assert.ok(content1.includes('First entry'));
    // Append second entry
    const entries2: LogEntry[] = [{ specId: 'add-bar', content: 'Second entry' }];
    generateLog(root, 'my-project', entries2, '2026-09');
    const content2 = readFileSync(filePath, 'utf8');
    assert.ok(content2.includes('First entry'));
    assert.ok(content2.includes('Second entry'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateProjectReadme creates _README.md', () => {
  const root = scratch();
  try {
    const projectDir = join(root, '01_Proyectos', 'my-project');
    mkdirSync(projectDir, { recursive: true });
    const specs = [
      { name: 'spec1', status: 'completed' },
      { name: 'spec2', status: 'in-progress' },
    ];
    generateProjectReadme(projectDir, specs);
    const readmePath = join(projectDir, '_README.md');
    assert.ok(existsSync(readmePath));
    const content = readFileSync(readmePath, 'utf8');
    assert.ok(content.includes('1/2 specs completed'));
    assert.ok(content.includes('spec1: completed'));
    assert.ok(content.includes('spec2: in-progress'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});