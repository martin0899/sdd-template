import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { executePrune } from '../../src/commands/update';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

const harnessVersion = (
  JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
).version;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-fakebin-'));
  writeFileSync(join(fakeBin, 'graphify'), '#!/usr/bin/env node\nprocess.exit(0);\n');
  baseEnv = {
    ...process.env,
    PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
  };
});

after(() => {
  rmSync(fakeBin, { recursive: true, force: true });
});

function runCli(args: string[], input?: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: baseEnv,
    encoding: 'utf8',
    input
  });
}

function readManifestJson(dst: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as Record<string, unknown>;
}

test('update preserves projectVersion and refreshes spectralisVersion', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Simulate a project that advanced its own version beyond the init default.
    const manifestPath = join(dst, '.sdd-manifest.json');
    const manifest = readManifestJson(dst);
    manifest.projectVersion = '1.0.5';
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // Make one managed file diverge so update has a change to apply.
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const rewritten = readManifestJson(dst);
    assert.equal(rewritten.projectVersion, '1.0.5', 'project version must be preserved, not replaced by the harness version');
    assert.equal(rewritten.spectralisVersion, harnessVersion, 'harness version must be refreshed');
    assert.notEqual(rewritten.projectVersion, rewritten.spectralisVersion);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update refreshes the managed AGENTS.md block consistently with init', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-agents-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Tamper the managed block so it diverges from the template block.
    const agentsPath = join(dst, 'AGENTS.md');
    const tampered = readFileSync(agentsPath, 'utf8').replace(
      /<!-- BEGIN: SDD template rules \(agregado por spectralis\) -->[\s\S]*?<!-- END: SDD template rules -->/,
      '<!-- BEGIN: SDD template rules (agregado por spectralis) -->\nTAMPERED-BLOCK\n<!-- END: SDD template rules -->'
    );
    writeFileSync(agentsPath, tampered);

    // Force at least one classified change so update does not short-circuit.
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /AGENTS\.md managed/, 'update logs AGENTS.md management status');

    const refreshed = readFileSync(agentsPath, 'utf8');
    assert.ok(!refreshed.includes('TAMPERED-BLOCK'), 'managed block must be refreshed from the template');
    assert.match(refreshed, /BEGIN: SDD template rules/);
    assert.match(refreshed, /ALWAYS use graphify first/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update does not swallow a manageAgentsMd failure and does not rewrite the manifest', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-agents-err-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Turn AGENTS.md into a directory so manageAgentsMd throws (EISDIR).
    const agentsPath = join(dst, 'AGENTS.md');
    rmSync(agentsPath, { recursive: true, force: true });
    mkdirSync(agentsPath, { recursive: true });

    // Force at least one classified change so update does not short-circuit.
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');

    const manifestPath = join(dst, '.sdd-manifest.json');
    const manifestBefore = readFileSync(manifestPath, 'utf8');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.notEqual(r.status, 0, 'a failing AGENTS.md management aborts with non-zero code');
    assert.match(r.stderr, /AGENTS\.md/, 'the failure is reported with detail');
    assert.equal(
      readFileSync(manifestPath, 'utf8'),
      manifestBefore,
      'the manifest must not be rewritten when AGENTS.md management fails'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

const AGENTS_BLOCK_RE = /<!-- BEGIN: SDD template rules \(agregado por spectralis\) -->[\s\S]*?<!-- END: SDD template rules -->/;

function tamperAgentsBlock(dst: string): void {
  const agentsPath = join(dst, 'AGENTS.md');
  const tampered = readFileSync(agentsPath, 'utf8').replace(
    AGENTS_BLOCK_RE,
    '<!-- BEGIN: SDD template rules (agregado por spectralis) -->\nTAMPERED-BLOCK\n<!-- END: SDD template rules -->'
  );
  writeFileSync(agentsPath, tampered);
}

function duplicateAgentsBlock(dst: string): void {
  const agentsPath = join(dst, 'AGENTS.md');
  const content = readFileSync(agentsPath, 'utf8');
  const block = content.match(AGENTS_BLOCK_RE)?.[0];
  assert.ok(block, 'template block present after init');
  writeFileSync(agentsPath, content.replace(block, `${block}\n${block}`));
}

function countBegins(dst: string): number {
  return (readFileSync(join(dst, 'AGENTS.md'), 'utf8').match(/BEGIN: SDD template rules/g) ?? []).length;
}

test('update manages AGENTS.md even when no classified file changed (hasChanges=false)', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-agents-nohash-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Only AGENTS.md drifts; every classified payload file stays unchanged.
    tamperAgentsBlock(dst);

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /AGENTS\.md managed/, 'AGENTS.md is managed despite no file changes');

    const refreshed = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.ok(!refreshed.includes('TAMPERED-BLOCK'), 'stale block refreshed from the template');
    assert.match(refreshed, /ALWAYS use graphify first/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update runs manageAgentsMd even when a copy fails (partial=true)', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-partial-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Replace the skills directory with a regular file so every payload copy
    // under it fails, setting partial=true.
    rmSync(join(dst, '.agents', 'skills'), { recursive: true, force: true });
    writeFileSync(join(dst, '.agents', 'skills'), 'not-a-directory\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 1, r.stderr + r.stdout);
    assert.match(r.stdout, /AGENTS\.md managed/, 'AGENTS.md is still managed when partial=true');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --check detects AGENTS.md drift when all files are up to date', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-check-drift-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    tamperAgentsBlock(dst);

    const r = runCli(['update', dst, '--check']);
    assert.equal(r.status, 1, r.stderr + r.stdout);
    assert.match(r.stdout, /AGENTS\.md/, 'drift is reported');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --check exits 0 when AGENTS.md is synced and nothing changed', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-check-clean-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const r = runCli(['update', dst, '--check']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --repair-agents rebuilds a duplicated block with --yes', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-repair-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    duplicateAgentsBlock(dst);
    assert.equal(countBegins(dst), 2, 'precondition: duplicated markers');

    const r = runCli(['update', dst, '--repair-agents', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /repaired-duplicate/);
    assert.equal(countBegins(dst), 1, 'duplicates collapsed into a single managed block');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --repair-agents without --yes asks for confirmation and keeps the file on decline', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-repair-confirm-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    duplicateAgentsBlock(dst);

    const r = runCli(['update', dst, '--repair-agents', '--no-obsidian'], 'n\n');
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(countBegins(dst), 2, 'declined repair leaves the duplicates untouched');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update preserves AGENTS.md and compound standard manifest entries', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-manifest-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // Seed a compound standard entry (excluded from the payload classification).
    const manifestPath = join(dst, '.sdd-manifest.json');
    const manifest = readManifestJson(dst) as { files: { path: string; hash: string }[] };
    writeFileSync(join(dst, 'docs', 'backend-standards.md'), 'backend standard\n');
    manifest.files.push({ path: 'docs/backend-standards.md', hash: 'deadbeef' });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // Force a classified change so the manifest gets rewritten.
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const rewritten = readManifestJson(dst) as { files: { path: string }[] };
    const paths = rewritten.files.map((f) => f.path);
    assert.ok(paths.includes('AGENTS.md'), 'AGENTS.md entry preserved');
    assert.ok(paths.includes('docs/backend-standards.md'), 'compound standard entry preserved');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

// --- update --prune ---

/** A path that exists in the manifest but not in the template payload. */
const RETIRED_REL = 'docs/legacy-manual.md';
const RETIRED_EDITED_REL = 'docs/legacy-edited.md';

function sha256Of(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function backupDirs(dst: string): string[] {
  return readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
}

/**
 * Registers a file as `retired`: it exists on disk and in the manifest, but it
 * is not part of the current template payload.
 */
function seedRetiredFile(dst: string, rel: string, content: string, manifestHash?: string): void {
  const abs = join(dst, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  const manifestPath = join(dst, '.sdd-manifest.json');
  const manifest = readManifestJson(dst) as { files: { path: string; hash: string }[] };
  manifest.files.push({ path: rel, hash: manifestHash ?? sha256Of(abs) });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function escaped(rel: string): string {
  return rel.replace(/[/.]/g, '\\$&');
}

test('update --prune --yes deletes retired files whose hash matches the manifest, after a backup', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

    const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.ok(!existsSync(join(dst, RETIRED_REL)), 'the retired file is deleted from disk');
    const backups = backupDirs(dst);
    assert.equal(backups.length, 1, 'one backup directory is created');
    assert.ok(
      existsSync(join(dst, backups[0], RETIRED_REL)),
      'the backup preserves the relative path of the deleted file'
    );
    assert.equal(
      readFileSync(join(dst, backups[0], RETIRED_REL), 'utf8'),
      'legacy manual\n',
      'the backup holds the original content'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune preserves retired files whose hash differs from the manifest', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-edited-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // The user edited the file after installation: the hash no longer matches.
    seedRetiredFile(dst, RETIRED_REL, 'edited by the user\n', 'a'.repeat(64));

    const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.ok(existsSync(join(dst, RETIRED_REL)), 'the edited retired file survives the prune');
    assert.equal(
      readFileSync(join(dst, RETIRED_REL), 'utf8'),
      'edited by the user\n',
      'the edited content is untouched'
    );
    assert.equal(backupDirs(dst).length, 0, 'no backup is created for a preserved file');
    assert.match(r.stdout, /prune/i, 'the prune outcome is reported');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune --dry-run reports the prunable files without writing anything', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-dry-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

    const r = runCli(['update', dst, '--prune', '--dry-run', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.match(r.stdout, new RegExp(escaped(RETIRED_REL)), 'the prunable file is reported');
    assert.match(r.stdout, /prune/i, 'the prune plan is reported');
    assert.ok(existsSync(join(dst, RETIRED_REL)), 'dry-run deletes nothing');
    assert.equal(backupDirs(dst).length, 0, 'dry-run creates no backup');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune --check reports the retired files without writing anything', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-check-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

    const r = runCli(['update', dst, '--prune', '--check']);
    assert.equal(r.status, 1, r.stderr + r.stdout);

    assert.match(r.stdout, /retired/i, 'the retired count is reported');
    assert.match(r.stdout, new RegExp(escaped(RETIRED_REL)), 'the file to prune is reported');
    assert.ok(existsSync(join(dst, RETIRED_REL)), '--check deletes nothing');
    assert.equal(backupDirs(dst).length, 0, '--check creates no backup');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune without --yes asks for confirmation and deletes nothing when declined', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-confirm-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

    // First answer declines the prune, second one accepts the update itself.
    const r = runCli(['update', dst, '--prune', '--no-obsidian'], 'n\ns\n');
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.match(
      r.stdout,
      new RegExp(escaped(RETIRED_REL)),
      'the list of files to delete is shown before the confirmation'
    );
    assert.ok(existsSync(join(dst, RETIRED_REL)), 'a declined prune deletes nothing');
    assert.equal(backupDirs(dst).length, 0, 'a declined prune creates no backup');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update without --prune reports retired files but never deletes them', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-noprune-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.match(r.stdout, new RegExp(escaped(RETIRED_REL)), 'the retired file is reported');
    assert.match(r.stdout, /NOT deleted/, 'the report states that nothing is deleted');
    assert.ok(existsSync(join(dst, RETIRED_REL)), 'without --prune the retired file survives');
    assert.equal(backupDirs(dst).length, 0, 'without --prune no backup is created');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune rewrites the manifest excluding pruned files and keeping preserved ones', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-manifest-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');
    seedRetiredFile(dst, RETIRED_EDITED_REL, 'edited by the user\n', 'b'.repeat(64));

    const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const rewritten = readManifestJson(dst) as { files: { path: string; hash: string }[] };
    const paths = rewritten.files.map((f) => f.path);
    assert.ok(!paths.includes(RETIRED_REL), 'the pruned file is excluded from the manifest');
    assert.ok(paths.includes(RETIRED_EDITED_REL), 'the preserved file stays in the manifest');
    const kept = rewritten.files.find((f) => f.path === RETIRED_EDITED_REL);
    assert.equal(
      kept?.hash,
      'b'.repeat(64),
      'the preserved file keeps its reference hash so it is never pruned later'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --prune without retired files reports nothing to prune and creates no backup', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-empty-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.match(r.stdout, /no retired files to prune/i, 'the report states there is nothing to prune');
    assert.equal(backupDirs(dst).length, 0, 'no backup is created');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

// --- retired legacy config (openspec/config.yaml) ---

const LEGACY_CONFIG_REL = 'openspec/config.yaml';

test('update --prune removes the retired legacy config of an existing installation', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-legacy-prune-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    // An installation made by an older version keeps the legacy config.
    seedRetiredFile(dst, LEGACY_CONFIG_REL, 'schema: spec-driven\n');

    const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.ok(
      !existsSync(join(dst, LEGACY_CONFIG_REL)),
      'the retired legacy config is deleted from disk'
    );
    const rewritten = readManifestJson(dst) as { files: { path: string }[] };
    assert.ok(
      !rewritten.files.some((f) => f.path === LEGACY_CONFIG_REL),
      'the manifest no longer manages the legacy config'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update without --prune stops managing the legacy config but keeps the file', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-legacy-noprune-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    seedRetiredFile(dst, LEGACY_CONFIG_REL, 'schema: spec-driven\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.ok(
      existsSync(join(dst, LEGACY_CONFIG_REL)),
      'without --prune the legacy config survives on disk'
    );
    const rewritten = readManifestJson(dst) as { files: { path: string }[] };
    assert.ok(
      !rewritten.files.some((f) => f.path === LEGACY_CONFIG_REL),
      'the manifest no longer manages the legacy config'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('prune keeps a file whose backup failed and deletes the ones backed up successfully', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-partial-'));
  try {
    mkdirSync(join(dst, 'docs'), { recursive: true });
    writeFileSync(join(dst, 'docs', 'ok.md'), 'ok\n');
    writeFileSync(join(dst, 'docs', 'ko.md'), 'ko\n');

    // The backup root is a regular file: every backup into it fails.
    const backupRoot = '.sdd-backup-blocked';
    writeFileSync(join(dst, backupRoot), 'not a directory\n');

    const outcome = executePrune(
      dst,
      [
        { rel: 'docs/ok.md', decision: 'prune' },
        { rel: 'docs/ko.md', decision: 'prune' }
      ],
      backupRoot
    );

    assert.deepEqual(outcome.pruned, [], 'no file is deleted when its backup failed');
    assert.equal(outcome.failed.length, 2, 'both failures are reported');
    assert.ok(outcome.failed[0].error.length > 0, 'the failure is reported with detail');
    assert.ok(existsSync(join(dst, 'docs', 'ok.md')), 'the file with the failed backup survives');
    assert.ok(existsSync(join(dst, 'docs', 'ko.md')), 'the file with the failed backup survives');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('prune deletes a file only after its backup succeeded', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-ok-'));
  try {
    mkdirSync(join(dst, 'docs'), { recursive: true });
    writeFileSync(join(dst, 'docs', 'ok.md'), 'ok\n');

    const outcome = executePrune(dst, [{ rel: 'docs/ok.md', decision: 'prune' }], '.sdd-backup-x');

    assert.deepEqual(outcome.pruned, ['docs/ok.md'], 'the file is pruned');
    assert.deepEqual(outcome.failed, [], 'no failure is reported');
    assert.ok(!existsSync(join(dst, 'docs', 'ok.md')), 'the file is deleted from disk');
    assert.ok(
      existsSync(join(dst, '.sdd-backup-x', 'docs', 'ok.md')),
      'the backup keeps the relative path'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

const gitAvailable = spawnSync('git', ['--version']).status === 0;
test(
  'update --prune deletes with fs only: the deletion is never staged in git',
  { skip: gitAvailable ? false : 'git is not available in this environment' },
  () => {
    const dst = mkdtempSync(join(tmpdir(), 'spectralis-upd-prune-git-'));
    try {
      const init = runCli(['init', dst, '--yes'], 's\n');
      assert.equal(init.status, 0, init.stderr + init.stdout);

      seedRetiredFile(dst, RETIRED_REL, 'legacy manual\n');

      const gitInit = spawnSync('git', ['init'], { cwd: dst, encoding: 'utf8' });
      assert.equal(gitInit.status, 0, gitInit.stderr);
      const gitAdd = spawnSync('git', ['add', '--', RETIRED_REL], { cwd: dst, encoding: 'utf8' });
      assert.equal(gitAdd.status, 0, gitAdd.stderr);

      const r = runCli(['update', dst, '--prune', '--yes', '--no-obsidian']);
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.ok(!existsSync(join(dst, RETIRED_REL)), 'the retired file is deleted from disk');

      const status = spawnSync('git', ['status', '--porcelain'], { cwd: dst, encoding: 'utf8' });
      assert.equal(status.status, 0, status.stderr);
      const entry = status.stdout
        .split('\n')
        .filter((l) => l.includes(RETIRED_REL))
        .map((l) => l.trim());
      assert.equal(entry.length, 1, 'the deleted file is reported by git');
      assert.equal(
        entry[0][0],
        'A',
        'the file is still staged as added: git never removed it from the index (no `git rm`)'
      );
      assert.equal(entry[0][1], 'D', 'the worktree reports the file as deleted');
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  }
);