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