import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let home: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  home = mkdtempSync(join(tmpdir(), 'spectralis-specdir-home-'));
  baseEnv = { ...process.env, HOME: home };
});

after(() => {
  rmSync(home, { recursive: true, force: true });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { env: baseEnv, encoding: 'utf8' });
}

function makeProject(manifest: Record<string, unknown> = {}): string {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-specdir-'));
  writeFileSync(join(dst, '.sdd-manifest.json'), JSON.stringify({ schemaVersion: 3, ...manifest }, null, 2) + '\n');
  return dst;
}

test('config --set spec_dir stores the raw value in the project manifest', () => {
  const dst = makeProject();
  try {
    const r = runCli(['config', dst, '--set', 'spec_dir=.spectralis/changes']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const manifest = JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as Record<string, unknown>;
    assert.equal(manifest.spec_dir, '.spectralis/changes', 'the value must stay relative so it resolves against the project');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --get spec_dir prints the stored value and its origin', () => {
  const dst = makeProject({ spec_dir: 'custom/changes' });
  try {
    const r = runCli(['config', dst, '--get', 'spec_dir']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /custom\/changes/);
    assert.match(r.stdout, /manifiesto|manifest/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --get spec_dir falls back to the global value', () => {
  const dst = makeProject();
  try {
    const set = runCli(['config', dst, '--set', 'spec_dir=global-changes', '--global']);
    assert.equal(set.status, 0, set.stderr + set.stdout);
    const r = runCli(['config', dst, '--get', 'spec_dir']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /global-changes/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --list shows the resolved changes directory', () => {
  const dst = makeProject({ spec_dir: 'custom/changes' });
  try {
    const r = runCli(['config', dst, '--list']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /spec_dir/);
    assert.match(r.stdout, /custom\/changes/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
