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

/** A PATH with the tools of the harness (and optionally the openspec binary). */
function fakeBin(withOpenspec: boolean): string {
  const bin = scratch('sp-doctor-engine-bin-');
  writeStub(bin, 'git', '#!/bin/sh\necho "git version 2.40.0"\nexit 0\n');
  writeStub(bin, 'node', '#!/bin/sh\necho "v22.11.0"\nexit 0\n');
  writeStub(bin, 'graphify', '#!/bin/sh\necho "graphify 1.0.0"\nexit 0\n');
  if (withOpenspec) writeStub(bin, 'openspec', '#!/bin/sh\necho "openspec 1.0.0"\nexit 0\n');
  return bin;
}

/** A project that declares an engine (no engine means the native default). */
function project(engine?: string): string {
  const dir = scratch('sp-doctor-engine-proj-');
  const manifest: Record<string, unknown> = { schemaVersion: 3 };
  if (engine !== undefined) manifest.engine = engine;
  writeFileSync(join(dir, '.sdd-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return dir;
}

function capture(fn: () => boolean): { ok: boolean; output: string } {
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  try {
    const ok = fn();
    return { ok, output: lines.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function runDoctorIn(dir: string, withOpenspec: boolean): { ok: boolean; output: string } {
  const bin = fakeBin(withOpenspec);
  const home = scratch('sp-doctor-engine-home-');
  process.env.PATH = bin;
  process.env.HOME = home;
  process.chdir(dir);
  return capture(() => printDoctorReport());
}

test('doctor labels openspec as optional and does not fail when the engine is native and the binary is missing', () => {
  const dir = project('native');
  const { ok, output } = runDoctorIn(dir, false);
  assert.match(output, /openspec \(optional\)/);
  assert.equal(ok, true, 'a native project does not need the openspec binary');
});

test('doctor labels openspec as optional and ok when the engine is native and the binary is present', () => {
  const dir = project('native');
  const { ok, output } = runDoctorIn(dir, true);
  assert.match(output, /openspec \(optional\)/);
  assert.equal(ok, true);
});

test('doctor labels openspec as required and fails when the engine is openspec and the binary is missing', () => {
  const dir = project('openspec');
  const { ok, output } = runDoctorIn(dir, false);
  assert.match(output, /openspec \(required\)/);
  assert.equal(ok, false, 'the declared engine requires the binary');
});

test('doctor warns explicitly when the engine is openspec and the binary is missing', () => {
  const dir = project('openspec');
  const { output } = runDoctorIn(dir, false);
  assert.match(output, /engine: openspec pero el binario openspec no está en PATH/);
});

test('doctor does not warn about the binary when the engine is openspec and it is present', () => {
  const dir = project('openspec');
  const { ok, output } = runDoctorIn(dir, true);
  assert.doesNotMatch(output, /engine: openspec pero el binario openspec no está en PATH/);
  assert.equal(ok, true);
});

test('doctor reports an invalid engine as an error and fails', () => {
  const dir = project('invalid');
  const { ok, output } = runDoctorIn(dir, true);
  assert.equal(ok, false);
  assert.match(output, /invalid engine/i);
});
