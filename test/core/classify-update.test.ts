import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyFiles, countByStatus, hasChanges } from '../../src/core/classify-update';
import { writeManifest } from '../../src/core/manifest';
import { sha256File } from '../../src/core/manifest';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-cu-${prefix}-`));
}

function makeTemplate(): string {
  const tpl = scratch('tpl');
  mkdirSync(join(tpl, '.agents/skills/commit'), { recursive: true });
  writeFileSync(join(tpl, '.agents/skills/commit/SKILL.md'), 'commit skill\n');
  mkdirSync(join(tpl, '.opencode'), { recursive: true });
  writeFileSync(join(tpl, '.opencode/package.json'), '{}\n');
  writeFileSync(join(tpl, '.opencode/package-lock.json'), '{}\n');
  mkdirSync(join(tpl, 'docs'), { recursive: true });
  writeFileSync(join(tpl, 'docs/base.md'), 'base standards\n');
  return tpl;
}

function installDestination(target: string, tpl: string, includeOpencode = true): void {
  const payloadFiles = includeOpencode
    ? ['.agents/skills/commit/SKILL.md', '.opencode/package.json', '.opencode/package-lock.json']
    : ['.agents/skills/commit/SKILL.md'];
  const docsFiles = ['docs/base.md'];
  const allFiles = [...payloadFiles, ...docsFiles];
  // Write files BEFORE the manifest (writeManifest requires them to exist).
  for (const rel of allFiles) {
    const dir = rel.includes('/') ? rel.substring(0, rel.lastIndexOf('/')) : undefined;
    if (dir) mkdirSync(join(target, dir), { recursive: true });
    writeFileSync(join(target, rel), readFileSync(join(tpl, rel)));
  }
  writeManifest(target, allFiles, '1.0.0', '1.0.0');
}

test('all files unchanged after clean install', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    installDestination(dst, tpl);
    const { manifest, files } = classifyFiles(dst, tpl, true);
    assert.ok(manifest);
    assert.equal(countByStatus(files).unchanged, files.length);
    assert.equal(hasChanges(files), false);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('updatable file detected when plantilla changes but user has not touched it', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    installDestination(dst, tpl);
    // Simulate plantilla change: update the source file
    writeFileSync(join(tpl, '.agents/skills/commit/SKILL.md'), 'commit skill v2\n');
    const { files } = classifyFiles(dst, tpl, true);
    const counts = countByStatus(files);
    assert.ok(counts.updatable >= 1, 'should detect at least one updatable file');
    assert.ok(files.some((f) => f.rel === '.agents/skills/commit/SKILL.md' && f.status === 'updatable'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('conflict detected when user modified file locally', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    installDestination(dst, tpl);
    // User modifies the file locally
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'my custom version\n');
    const { files } = classifyFiles(dst, tpl, true);
    const counts = countByStatus(files);
    assert.ok(counts.conflict >= 1, 'should detect at least one conflict');
    assert.ok(files.some((f) => f.rel === '.agents/skills/commit/SKILL.md' && f.status === 'conflict'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('new file detected when plantilla has file not in destination', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    installDestination(dst, tpl);
    // Plantilla adds a new file
    writeFileSync(join(tpl, 'docs/new-api.md'), 'api spec\n');
    const { files } = classifyFiles(dst, tpl, true);
    const counts = countByStatus(files);
    assert.ok(counts.new >= 1, 'should detect at least one new file');
    assert.ok(files.some((f) => f.rel === 'docs/new-api.md' && f.status === 'new'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('retired file detected when manifest has file removed from plantilla', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    installDestination(dst, tpl);
    // Remove file from plantilla
    rmSync(join(tpl, '.opencode/package-lock.json'));
    const { files } = classifyFiles(dst, tpl, true);
    const counts = countByStatus(files);
    assert.ok(counts.retired >= 1, 'should detect at least one retired file');
    assert.ok(files.some((f) => f.rel === '.opencode/package-lock.json' && f.status === 'retired'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('no manifest returns all files as new (no updatable/conflict)', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    // Don't install — no manifest
    const { manifest, files } = classifyFiles(dst, tpl, true);
    assert.equal(manifest, undefined);
    assert.ok(files.every((f) => f.status === 'new'), 'all files should be new without manifest');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});
