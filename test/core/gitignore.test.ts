import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manageGitignore, GITIGNORE_ENTRIES } from '../../src/core/gitignore';

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'spectralis-gi-'));
}

test('entries include .claude and openspec per local policy', () => {
  assert.ok(GITIGNORE_ENTRIES.includes('.claude/'));
  assert.ok(GITIGNORE_ENTRIES.includes('openspec/'));
  assert.equal(GITIGNORE_ENTRIES.length, 7);
});

test('missing file is created with the full managed block', () => {
  const dst = scratch();
  try {
    const r = manageGitignore(dst, { confirmFn: () => true });
    assert.equal(r.status, 'created');
    const out = readFileSync(join(dst, '.gitignore'), 'utf8');
    assert.match(out, /# BEGIN: SDD managed gitignore/);
    assert.match(out, /# END: SDD managed gitignore/);
    for (const entry of GITIGNORE_ENTRIES) {
      assert.match(out, new RegExp(`^${entry.replace(/[*.]/g, (m) => `\\${m}`)}$`, 'm'), entry);
    }
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('existing file without sentinel gets the block appended with own content intact', () => {
  const dst = scratch();
  writeFileSync(join(dst, '.gitignore'), 'node_modules/\n');
  try {
    const r = manageGitignore(dst, { confirmFn: () => true });
    assert.equal(r.status, 'appended');
    const out = readFileSync(join(dst, '.gitignore'), 'utf8');
    assert.match(out, /^node_modules\/$/m);
    assert.equal((out.match(/BEGIN: SDD managed gitignore/g) ?? []).length, 1);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('entries already covered outside the block are not duplicated', () => {
  const dst = scratch();
  writeFileSync(
    join(dst, '.gitignore'),
    'node_modules/\n.agents/\n.opencode/\n.claude/\nopenspec/\nskills-lock.json\ngraphify-out/\n.sdd-backup-*/\n'
  );
  try {
    const r = manageGitignore(dst, { confirmFn: () => true });
    assert.equal(r.status, 'synced');
    const out = readFileSync(join(dst, '.gitignore'), 'utf8');
    assert.ok(!out.includes('BEGIN: SDD managed gitignore'), 'no block needed when everything is covered');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('old block missing .claude and openspec is refreshed with backup; rest intact', () => {
  const dst = scratch();
  const oldBlock =
    '# BEGIN: SDD managed gitignore (agregado por spectralis; no editar a mano)\ngraphify-out/\n.sdd-backup-*/\n.agents/\n.opencode/\nskills-lock.json\n# END: SDD managed gitignore\n';
  writeFileSync(join(dst, '.gitignore'), `own stuff\n${oldBlock}more own stuff\n`);
  try {
    const r = manageGitignore(dst, { confirmFn: () => true });
    assert.equal(r.status, 'refreshed');
    const out = readFileSync(join(dst, '.gitignore'), 'utf8');
    assert.match(out, /^\.claude\/$/m);
    assert.match(out, /^openspec\/$/m);
    assert.match(out, /^own stuff$/m);
    assert.match(out, /^more own stuff$/m);
    const backups = readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
    assert.equal(backups.length, 1);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('complete block reports sync without writes (idempotent)', () => {
  const dst = scratch();
  try {
    manageGitignore(dst, { confirmFn: () => true });
    const before = readFileSync(join(dst, '.gitignore'), 'utf8');
    const r = manageGitignore(dst, { confirmFn: () => true });
    assert.equal(r.status, 'synced');
    assert.equal(readFileSync(join(dst, '.gitignore'), 'utf8'), before);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('refresh with confirm=false keeps the old block', () => {
  const dst = scratch();
  const oldBlock =
    '# BEGIN: SDD managed gitignore (agregado por spectralis; no editar a mano)\ngraphify-out/\n.sdd-backup-*/\n.agents/\n.opencode/\nskills-lock.json\n# END: SDD managed gitignore\n';
  writeFileSync(join(dst, '.gitignore'), oldBlock);
  try {
    const r = manageGitignore(dst, { confirmFn: () => false });
    assert.equal(r.status, 'kept');
    const out = readFileSync(join(dst, '.gitignore'), 'utf8');
    assert.ok(!out.includes('.claude/'));
    assert.ok(!out.includes('openspec/'));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('dry-run writes nothing', () => {
  const dst = scratch();
  try {
    manageGitignore(dst, { confirmFn: () => true, dryRun: true });
    assert.equal(existsSync(join(dst, '.gitignore')), false);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
