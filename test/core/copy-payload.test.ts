import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyPayload, isExcludedPath } from '../../src/core/copy-payload';
import { writeManifest } from '../../src/core/manifest';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-${prefix}-`));
}

function makeTemplate(): string {
  const tpl = scratch('tpl');
  mkdirSync(join(tpl, '.agents/skills/commit'), { recursive: true });
  writeFileSync(join(tpl, '.agents/skills/commit/SKILL.md'), 'commit skill\n');
  mkdirSync(join(tpl, '.opencode'), { recursive: true });
  writeFileSync(join(tpl, '.opencode/package.json'), '{}\n');
  writeFileSync(join(tpl, '.opencode/package-lock.json'), '{}\n');
  mkdirSync(join(tpl, 'docs/manuals'), { recursive: true });
  writeFileSync(join(tpl, 'docs/base.md'), 'base standards\n');
  writeFileSync(join(tpl, 'docs/manuals/x.md'), 'manual\n');
  writeFileSync(join(tpl, 'AGENTS.md'), '# AGENTS\n');
  return tpl;
}

test('fresh copy creates payload, docs and a valid manifest', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    const report = copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    assert.ok(existsSync(join(dst, '.agents/skills/commit/SKILL.md')));
    assert.ok(existsSync(join(dst, '.opencode/package.json')));
    assert.ok(existsSync(join(dst, 'docs/base.md')));
    assert.ok(!existsSync(join(dst, 'AGENTS.md')), 'AGENTS.md is managed by core/agents-md');
    assert.equal(report.failed.length, 0);
    assert.equal(report.created.length, 5);

    writeManifest(dst, ['.agents/skills/commit/SKILL.md', 'docs/base.md'], '1.0.0', '1.0.0');
    const manifest = JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as {
      schemaVersion: number;
      spectralisVersion: string;
      templateVersion: string;
      files: { path: string; hash: string }[];
    };
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.spectralisVersion, '1.0.0');
    assert.equal(manifest.templateVersion, '1.0.0');
    assert.equal(manifest.files.length, 2);
    assert.match(manifest.files[0].hash, /^[0-9a-f]{64}$/);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('conflict: backup + confirm=false keeps destination version', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized\n');
    const report = copyPayload({
      templateRoot: tpl,
      target: dst,
      includeOpencode: true,
      confirmFn: () => false
    });
    assert.equal(readFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'utf8'), 'customized\n');
    assert.equal(report.kept.length, 1);
    const backupDirs = readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
    assert.equal(backupDirs.length, 1);
    assert.ok(
      existsSync(join(dst, backupDirs[0], '.agents/skills/commit/SKILL.md')),
      'backup preserves relative path'
    );
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('conflict: confirm=true replaces after backup', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized\n');
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    assert.equal(readFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'utf8'), 'commit skill\n');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('identical payload is skipped without backups (idempotent)', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    const report = copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true });
    assert.equal(report.created.length, 0);
    assert.equal(report.conflicts.length, 0);
    assert.equal(report.backups.length, 0);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('dry-run writes nothing', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: true, confirmFn: () => true, dryRun: true });
    assert.equal(existsSync(join(dst, '.agents')), false);
    assert.equal(existsSync(join(dst, 'docs')), false);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('copy failure reports partial state (backups preserved)', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    const report = copyPayload({
      templateRoot: tpl,
      target: dst,
      includeOpencode: true,
      confirmFn: () => true,
      failCopy: (rel) => rel === 'docs/base.md'
    });
    assert.ok(report.failed.includes('docs/base.md'));
    assert.ok(existsSync(join(dst, '.agents/skills/commit/SKILL.md')), 'earlier copies survive');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('includeOpencode=false never touches .opencode', () => {
  const tpl = makeTemplate();
  const dst = scratch('dst');
  try {
    copyPayload({ templateRoot: tpl, target: dst, includeOpencode: false, confirmFn: () => true });
    assert.equal(existsSync(join(dst, '.opencode')), false);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('isExcludedPath blocks sensitive and generated paths', () => {
  for (const rel of [
    '.env',
    'apps/.env.local',
    'graphify-out/graph.json',
    'node_modules/x/y.js',
    'dist/bundle.js',
    '.sdd-backup-20260921/f',
    'skills-lock.json',
    '.opencode/plugins/p.js'
  ]) {
    assert.equal(isExcludedPath(rel), true, rel);
  }
  assert.equal(isExcludedPath('docs/base.md'), false);
});
