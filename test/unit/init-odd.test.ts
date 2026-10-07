import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-init-odd-bin-'));
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

function runInit(dst: string, extra: string[] = []) {
  return spawnSync(process.execPath, [CLI, 'init', dst, '--yes', '--no-obsidian', ...extra], {
    env: baseEnv,
    encoding: 'utf8',
    input: 's\n'
  });
}

function manifestOf(dst: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as Record<string, unknown>;
}

test('init --odd no ejecuta openspec init ni crea openspec/', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-odd-'));
  try {
    const r = runInit(dst, ['--odd']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(!existsSync(join(dst, 'openspec')), 'no openspec dir in odd-only installs');
    assert.ok(!existsSync(join(dst, 'openspec/config.yaml')), 'no openspec/config.yaml in odd');
    const files = (manifestOf(dst).files as { path: string }[]) ?? [];
    assert.ok(
      !files.some((f) => f.path === 'openspec/config.yaml'),
      'manifest must not manage openspec/config.yaml in odd mode'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init en modo sdd mantiene la ejecución de openspec init', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-sdd-'));
  try {
    const r = runInit(dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(join(dst, 'openspec/config.yaml')), 'openspec must be initialized in sdd mode');
    const files = (manifestOf(dst).files as { path: string }[]) ?? [];
    assert.ok(
      files.some((f) => f.path === 'openspec/config.yaml'),
      'manifest must manage openspec/config.yaml in sdd mode'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});