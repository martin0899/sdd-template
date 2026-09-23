import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

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

function dirFingerprint(dir: string): string {
  const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
  return execFileSync('find', [dir, '-type', 'f', '-exec', 'sha256sum', '{}', ';'], {
    encoding: 'utf8'
  });
}

test('fresh install into clean destination matches the anti-corruption contract', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    const r = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(readFileSync(join(dst, 'openspec/config.yaml'), 'utf8'), /All interactions/);
    const agents = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(agents, /BEGIN: SDD template rules/);
    assert.match(agents, /ALWAYS use graphify first/);
    assert.match(readFileSync(join(dst, '.gitignore'), 'utf8'), /BEGIN: SDD managed gitignore/);
    assert.ok(existsSync(join(dst, '.agents/skills/INDEX.md')));
    assert.ok(existsSync(join(dst, '.opencode/package.json')));
    assert.ok(existsSync(join(dst, 'docs/base-standards.md')));
    const manifest = JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8'));
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.spectralisVersion, '1.2.0', 'arnés version recorded separately');
    assert.equal(manifest.templateVersion, '1.2.0', 'template version recorded separately');
    assert.ok(manifest.files.length > 0);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('dry-run leaves the destination bit-identical', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    runCli(['init', dst, '--yes'], 's\n');
    const before = dirFingerprint(dst);
    const r = runCli(['init', dst, '--dry-run']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /PLAN/);
    assert.equal(dirFingerprint(dst), before);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('conflict keeps the destination version when declined, with backup', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    runCli(['init', dst, '--yes'], 's\n');
    const skillPath = join(dst, '.agents/skills/commit/SKILL.md');
    writeFileSync(skillPath, 'customized destination\n');
    // answers: continue install -> s ; replace conflict -> n
    const r = runCli(['init', dst], 's\nn\n');
    assert.equal(r.status, 0);
    assert.equal(readFileSync(skillPath, 'utf8'), 'customized destination\n');
    const backups = readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
    assert.equal(backups.length, 1);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('idempotent re-run creates no new backups', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    runCli(['init', dst, '--yes'], 's\n');
    for (const d of readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'))) {
      rmSync(join(dst, d), { recursive: true, force: true });
    }
    const r = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(r.status, 0);
    const backups = readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
    assert.equal(backups.length, 0);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('--agent antigravity ships no .opencode payload', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    const r = runCli(['init', dst, '--yes', '--agent', 'antigravity'], 's\n');
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dst, '.opencode')));
    assert.ok(existsSync(join(dst, '.agents/skills/INDEX.md')));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init without an argument applies to the current working directory', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    const r = spawnSync(process.execPath, [CLI, 'init', '--yes'], {
      env: baseEnv,
      encoding: 'utf8',
      input: 's\n',
      cwd: dst
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(join(dst, '.agents/skills/INDEX.md')));
    assert.ok(existsSync(join(dst, '.sdd-manifest.json')));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update without manifest prints error and writes nothing', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-it-'));
  try {
    const before = dirFingerprint(dst);
    const r = runCli(['update', dst]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /spectralis init/);
    assert.equal(dirFingerprint(dst), before);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
