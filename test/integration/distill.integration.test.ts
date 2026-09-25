import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
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

function runCli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: baseEnv,
    encoding: 'utf8',
    cwd,
  });
}

test('distill --dry-run shows planned output without writing', () => {
  const root = mkdtempSync(join(tmpdir(), 'spectralis-distill-test-'));
  try {
    // Create a fake project directory
    const projectDir = join(root, '01_Proyectos', 'my-project');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, 'spec.md'), '# Spec\nSome content');
    
    const result = runCli(['distill', 'my-project', '--dry-run'], root);
    assert.equal(result.status, 0, `CLI exited with status ${result.status}: ${result.stderr}`);
    assert.ok(result.stdout.includes('[DRY RUN] Would distill project: my-project'));
    // Ensure no 05_wiki directory created
    assert.ok(!existsSync(join(root, '05_wiki')), '05_wiki should not be created in dry-run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('distill missing project shows error', () => {
  const root = mkdtempSync(join(tmpdir(), 'spectralis-distill-test-'));
  try {
    const result = runCli(['distill', 'nonexistent'], root);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes('Project directory not found'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});