import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

const harnessVersion = (
  JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
).version;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-fakebin-'));
  const openspecStub = [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    'if (process.argv[2] === "init") {',
    '  fs.mkdirSync("openspec", { recursive: true });',
    '  fs.writeFileSync("openspec/config.yaml", "schema: spec-driven\\n");',
    '}',
    'process.exit(0);'
  ].join('\n');
  writeFileSync(join(fakeBin, 'openspec'), openspecStub);
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

test('update preserves AGENTS.md, openspec/config.yaml and compound standard manifest entries', () => {
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
    assert.ok(paths.includes('openspec/config.yaml'), 'openspec/config.yaml entry preserved');
    assert.ok(paths.includes('docs/backend-standards.md'), 'compound standard entry preserved');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});