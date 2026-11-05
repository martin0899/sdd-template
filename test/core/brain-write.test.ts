import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brainWrite, WIKI_SECTIONS } from '../../src/core/brain-write';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-brain-write-'));
  created.push(dir);
  return dir;
}

test('brainWrite writes the portable summary with its frontmatter and sections', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    change: {
      id: 'my-change',
      nombre: 'Mi change',
      fecha: '2026-11-05',
      estado: 'open',
      resumen: { abstracto: 'El ciclo nativo de los changes.' },
      enlaces: []
    }
  });
  assert.equal(result.path, join(vault, '05_wiki', 'Spectralis', 'my-change.md'));
  assert.ok(existsSync(result.path));
  const content = readFileSync(result.path, 'utf8');
  assert.match(content, /^---\n/);
  assert.match(content, /^id: wiki-my-change$/m);
  assert.match(content, /^tags: \[wiki, spectralis\]$/m);
  assert.match(content, /^estado: completado$/m);
  assert.match(content, /^fecha_cierre: \d{4}-\d{2}-\d{2}$/m);
  assert.match(content, /^commits: \[\]$/m);
  for (const section of WIKI_SECTIONS) {
    assert.ok(content.includes(`## ${section}`), `the section "${section}" must exist`);
  }
});

test('brainWrite feeds the summary of the change into the section "Qué cambió"', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    change: {
      id: 'my-change',
      nombre: 'Mi change',
      fecha: '2026-11-05',
      estado: 'open',
      resumen: { abstracto: 'El ciclo nativo de los changes.' },
      enlaces: []
    }
  });
  const content = readFileSync(result.path, 'utf8');
  const changed = content.slice(content.indexOf('## Qué cambió'));
  assert.match(changed, /El ciclo nativo de los changes\./);
});

test('brainWrite uses the why and the decisions of the change artifacts', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    proposal: '# Propuesta: my-change\n\n## Why\n\nPorque el ciclo manual se rompe.\n',
    design: '# Design: my-change\n\n## Decisions\n\n1. Decisión tomada.\n'
  });
  const content = readFileSync(result.path, 'utf8');
  assert.match(content, /Porque el ciclo manual se rompe\./);
  assert.match(content, /Decisión tomada\./);
});

test('brainWrite writes into the wiki folder of the project when it is given', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    wikiProject: 'OtroProyecto'
  });
  assert.equal(result.path, join(vault, '05_wiki', 'OtroProyecto', 'my-change.md'));
  assert.ok(existsSync(result.path));
});

test('brainWrite lists the commits it is given', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    commits: ['abc1234']
  });
  const content = readFileSync(result.path, 'utf8');
  assert.match(content, /^commits: \[abc1234\]$/m);
  assert.match(content, /abc1234/);
});

test('brainWrite links the summary from the wiki folder where it wrote it', () => {
  const vault = scratch();
  const result = brainWrite({
    vaultRoot: vault,
    changeId: 'my-change',
    wikiProject: 'OtroProyecto'
  });
  const content = readFileSync(result.path, 'utf8');
  assert.match(content, /\[\[05_wiki\/OtroProyecto\/my-change\|my-change\]\]/);
});

test('brainWrite never overwrites an existing summary', () => {
  const vault = scratch();
  const dir = join(vault, '05_wiki', 'Spectralis');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'my-change.md');
  writeFileSync(path, 'contenido previo\n', 'utf8');

  const result = brainWrite({ vaultRoot: vault, changeId: 'my-change' });

  assert.equal(result.written, false, 'the summary must not be written');
  assert.equal(result.path, path, 'the path of the existing summary must be reported');
  assert.equal(readFileSync(path, 'utf8'), 'contenido previo\n', 'the previous content must survive');
});

test('brainWrite overwrites an existing summary only when it is forced', () => {
  const vault = scratch();
  const dir = join(vault, '05_wiki', 'Spectralis');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'my-change.md');
  writeFileSync(path, 'contenido previo\n', 'utf8');

  const result = brainWrite({ vaultRoot: vault, changeId: 'my-change', force: true });

  assert.equal(result.written, true);
  assert.match(readFileSync(path, 'utf8'), /^id: wiki-my-change$/m);
});

test('brainWrite refuses to write a summary outside the wiki folder', () => {
  const vault = scratch();
  const unsafeIds = ['..', '../escape', 'nested/change', 'nested\\change', '/abs/change'];
  for (const changeId of unsafeIds) {
    assert.throws(
      () => brainWrite({ vaultRoot: vault, changeId }),
      /change/i,
      `the id "${changeId}" must be rejected`
    );
  }
  const unsafeProjects = ['..', '../escape', 'nested/project', 'nested\\project'];
  for (const wikiProject of unsafeProjects) {
    assert.throws(
      () => brainWrite({ vaultRoot: vault, changeId: 'my-change', wikiProject }),
      /wiki/i,
      `the wiki folder "${wikiProject}" must be rejected`
    );
  }
  assert.equal(existsSync(join(vault, '05_wiki')), false, 'nothing must be written');
});
