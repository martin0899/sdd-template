import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let home: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-init-modes-bin-'));
  home = mkdtempSync(join(tmpdir(), 'spectralis-init-modes-home-'));
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
    HOME: home,
    PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
  };
});

after(() => {
  rmSync(fakeBin, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
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

test('init --odd falla como opcion desconocida', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-odd-flag-'));
  try {
    const r = runInit(dst, ['--odd']);
    assert.notEqual(r.status, 0, 'el flag retirado debe abortar el comando');
    assert.match(r.stderr + r.stdout, /unknown option/i);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init --sdd falla como opcion desconocida', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-sdd-flag-'));
  try {
    const r = runInit(dst, ['--sdd']);
    assert.notEqual(r.status, 0, 'el flag retirado debe abortar el comando');
    assert.match(r.stderr + r.stdout, /unknown option/i);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init sin flags mantiene la ejecucion de openspec init', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-sdd-'));
  try {
    const r = runInit(dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(join(dst, 'openspec/config.yaml')), 'openspec must be initialized');
    const files = (manifestOf(dst).files as { path: string }[]) ?? [];
    assert.ok(
      files.some((f) => f.path === 'openspec/config.yaml'),
      'manifest must manage openspec/config.yaml'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
