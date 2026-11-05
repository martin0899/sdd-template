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
  home = mkdtempSync(join(tmpdir(), 'spectralis-cfgphil-home-'));
  baseEnv = { ...process.env, HOME: home };
});

after(() => {
  rmSync(home, { recursive: true, force: true });
});

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { env: baseEnv, encoding: 'utf8' });
}

function makeProject(manifest: Record<string, unknown> = {}): string {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-cfgphil-'));
  writeFileSync(join(dst, '.sdd-manifest.json'), JSON.stringify({ schemaVersion: 3, ...manifest }, null, 2) + '\n');
  return dst;
}

function readManifest(dst: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as Record<string, unknown>;
}

test('config --set philosophy=sdd persiste el valor en el proyecto', () => {
  const dst = makeProject();
  try {
    const r = runCli(['config', dst, '--set', 'philosophy=sdd']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(readManifest(dst).philosophy, 'sdd');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --set philosophy=odd falla sin escribir (el modo legacy esta retirado)', () => {
  const dst = makeProject();
  try {
    const r = runCli(['config', dst, '--set', 'philosophy=odd']);
    assert.notEqual(r.status, 0, 'un valor no admitido debe fallar');
    assert.match(r.stderr + r.stdout, /sdd/);
    assert.equal(readManifest(dst).philosophy, undefined, 'the retired value must not be written');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --get philosophy imprime valor y origen', () => {
  const dst = makeProject({ philosophy: 'sdd' });
  try {
    const r = runCli(['config', dst, '--get', 'philosophy']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /sdd/);
    assert.match(r.stdout, /manifiesto|manifest/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --get philosophy de un manifiesto legado cae a sdd con advertencia', () => {
  const dst = makeProject({ philosophy: 'odd' });
  try {
    const r = runCli(['config', dst, '--get', 'philosophy']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /sdd/);
    assert.match(r.stderr + r.stdout, /odd/, 'debe avisar del valor legacy leido');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --set philosophy=rapido falla sin escribir', () => {
  const dst = makeProject({ projectVersion: '1.0.0' });
  try {
    const r = runCli(['config', dst, '--set', 'philosophy=rapido']);
    assert.notEqual(r.status, 0, 'must fail for an invalid value');
    assert.match(r.stderr + r.stdout, /sdd/);
    assert.equal(readManifest(dst).philosophy, undefined, 'invalid value must not be written');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('config --list incluye philosophy', () => {
  const dst = makeProject({ philosophy: 'sdd' });
  try {
    const r = runCli(['config', dst, '--list']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /philosophy/);
    assert.match(r.stdout, /sdd/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
