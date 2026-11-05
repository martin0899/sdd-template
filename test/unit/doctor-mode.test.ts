import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { printDoctorReport } from '../../src/commands/doctor';

const created: string[] = [];
const originalCwd = process.cwd();
const originalPath = process.env.PATH;
const originalHome = process.env.HOME;

afterEach(() => {
  process.chdir(originalCwd);
  process.env.PATH = originalPath;
  process.env.HOME = originalHome;
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

function writeStub(dir: string, name: string, content: string): void {
  const path = join(dir, name);
  writeFileSync(path, content, { mode: 0o755 });
  chmodSync(path, 0o755);
}

/** A PATH without the openspec binary: it simulates a host without OpenSpec. */
function fakeBinWithoutOpenspec(): string {
  const bin = scratch('spectralis-doctor-mode-bin-');
  writeStub(bin, 'git', '#!/bin/sh\necho "git version 2.40.0"\nexit 0\n');
  writeStub(bin, 'node', '#!/bin/sh\necho "v22.11.0"\nexit 0\n');
  writeStub(bin, 'graphify', '#!/bin/sh\necho "graphify 1.0.0"\nexit 0\n');
  return bin;
}

function makeProject(manifest: Record<string, unknown>): string {
  const dst = scratch('spectralis-doctor-mode-proj-');
  writeFileSync(join(dst, '.sdd-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return dst;
}

function runDoctor(cwd: string): { ok: boolean; output: string } {
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  process.env.PATH = fakeBinWithoutOpenspec();
  process.env.HOME = scratch('spectralis-doctor-mode-home-');
  process.chdir(cwd);
  try {
    const ok = printDoctorReport();
    return { ok, output: lines.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('doctor sin openspec no bloquea con el engine nativo (openspec es opcional)', () => {
  const proj = makeProject({});
  const { ok, output } = runDoctor(proj);
  assert.equal(ok, true, 'sin openspec el host nativo esta listo');
  assert.match(output, /openspec \(optional\)/);
  assert.match(output, /si usas engine: openspec, instala openspec/i);
});

test('doctor con un manifiesto legado tampoco marca openspec como requerido', () => {
  const proj = makeProject({ philosophy: 'odd' });
  const { ok, output } = runDoctor(proj);
  assert.equal(ok, true);
  assert.doesNotMatch(output, /openspec \(required\)/);
});
