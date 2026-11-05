import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let home: string;
let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

function writeStub(name: string, content: string): void {
  const path = join(fakeBin, name);
  writeFileSync(path, content, { mode: 0o755 });
  chmodSync(path, 0o755);
}

before(() => {
  home = mkdtempSync(join(tmpdir(), 'spectralis-doctor-mode-home-'));
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-doctor-mode-bin-'));
  // No openspec stub on purpose: this PATH simulates a host without OpenSpec.
  writeStub('git', '#!/bin/sh\necho "git version 2.40.0"\nexit 0\n');
  writeStub('node', '#!/bin/sh\necho "v22.11.0"\nexit 0\n');
  writeStub('graphify', '#!/bin/sh\necho "graphify 1.0.0"\nexit 0\n');
  baseEnv = {
    ...process.env,
    HOME: home,
    // Fake bin only: the real PATH may contain openspec, which would make the
    // "missing" scenario moot. /bin/sh is still used by spawnSync on POSIX.
    PATH: fakeBin
  };
});

after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(fakeBin, { recursive: true, force: true });
});

function runDoctor(cwd: string) {
  return spawnSync(process.execPath, [CLI, 'doctor'], { env: baseEnv, encoding: 'utf8', cwd });
}

function makeProject(manifest: Record<string, unknown>): string {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-doctor-mode-proj-'));
  writeFileSync(join(dst, '.sdd-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return dst;
}

test('doctor sin openspec falla con ayuda de instalacion (openspec es incondicional)', () => {
  const proj = makeProject({});
  try {
    const r = runDoctor(proj);
    assert.notEqual(r.status, 0, 'sin openspec el host no esta listo');
    assert.match(r.stdout, /openspec/i);
    assert.match(r.stdout, /npm i -g openspec/i);
  } finally {
    rmSync(proj, { recursive: true, force: true });
  }
});

test('doctor con un manifiesto legado no marca openspec como opcional', () => {
  const proj = makeProject({ philosophy: 'odd' });
  try {
    const r = runDoctor(proj);
    assert.notEqual(r.status, 0, 'sin openspec el host no esta listo');
    assert.doesNotMatch(r.stdout, /opcional/i, 'openspec ya no es opcional en ningun caso');
  } finally {
    rmSync(proj, { recursive: true, force: true });
  }
});