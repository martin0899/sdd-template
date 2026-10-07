import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-phil-fakebin-'));
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
  return spawnSync(process.execPath, [CLI, ...args], { env: baseEnv, encoding: 'utf8', input });
}

function readManifestJson(dst: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as Record<string, unknown>;
}

test('update preserva philosophy: odd del manifiesto', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-phil-upd-'));
  try {
    const init = runCli(['init', dst, '--yes', '--no-obsidian'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const manifestPath = join(dst, '.sdd-manifest.json');
    const manifest = readManifestJson(dst);
    manifest.philosophy = 'odd';
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // Diverge a managed file so update actually rewrites the manifest.
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');

    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const rewritten = readManifestJson(dst);
    assert.equal(rewritten.philosophy, 'odd', 'update must preserve the existing philosophy');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update no inventa philosophy cuando el manifiesto no la declara', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-phil-upd-none-'));
  try {
    const init = runCli(['init', dst, '--yes', '--no-obsidian'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const before = readManifestJson(dst);
    assert.equal(before.philosophy, undefined, 'a fresh install should not declare philosophy');

    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'customized destination\n');
    const r = runCli(['update', dst, '--yes', '--no-obsidian']);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const rewritten = readManifestJson(dst);
    assert.equal(rewritten.philosophy, undefined, 'update must not invent a philosophy value');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
