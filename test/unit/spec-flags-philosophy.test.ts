import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let home: string;
let vault: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  home = mkdtempSync(join(tmpdir(), 'spectralis-specphil-home-'));
  vault = mkdtempSync(join(tmpdir(), 'spectralis-specphil-vault-'));
  baseEnv = { ...process.env, HOME: home };
});

after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(vault, { recursive: true, force: true });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { env: baseEnv, encoding: 'utf8' });
}

function specFolder(project: string, specId: string): string {
  return join(vault, '01_Proyectos', project, specId);
}

test('spec init --odd resuelve modo odd', () => {
  const r = runCli(['spec', 'init', 'Proj', 'odd-change', '--odd', '--vault-root', vault]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /odd/);
  assert.ok(existsSync(specFolder('Proj', 'odd-change')), 'spec folder must be created');
});

test('spec init --sdd resuelve modo sdd', () => {
  const r = runCli(['spec', 'init', 'Proj', 'sdd-change', '--sdd', '--vault-root', vault]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /sdd/);
  assert.ok(existsSync(specFolder('Proj', 'sdd-change')), 'spec folder must be created');
});

test('spec init --odd --sdd falla sin iniciar la operación', () => {
  const r = runCli(['spec', 'init', 'Proj', 'conflict-change', '--odd', '--sdd', '--vault-root', vault]);
  assert.notEqual(r.status, 0, 'contradictory flags must fail');
  assert.match(r.stderr + r.stdout, /excluyentes/i);
  assert.ok(!existsSync(specFolder('Proj', 'conflict-change')), 'no folder must be created');
});
