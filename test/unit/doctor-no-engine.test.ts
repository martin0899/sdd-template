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
  const bin = scratch('sp-doctor-no-engine-bin-');
  writeStub(bin, 'git', '#!/bin/sh\necho "git version 2.40.0"\nexit 0\n');
  writeStub(bin, 'node', '#!/bin/sh\necho "v22.11.0"\nexit 0\n');
  writeStub(bin, 'graphify', '#!/bin/sh\necho "graphify 1.0.0"\nexit 0\n');
  if (withOpenspec) writeStub(bin, 'openspec', '#!/bin/sh\necho "openspec 1.0.0"\nexit 0\n');
  return bin;
}

function project(manifest: Record<string, unknown> = {}): string {
  const dir = scratch('sp-doctor-no-engine-proj-');
  writeFileSync(
    join(dir, '.sdd-manifest.json'),
    JSON.stringify({ schemaVersion: 3, ...manifest }, null, 2) + '\n',
    'utf8'
  );
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
  process.env.PATH = bin;
  process.env.HOME = scratch('sp-doctor-no-engine-home-');
  process.chdir(dir);
  return capture(() => printDoctorReport());
}

test('doctor does not mention openspec when the binary is missing', () => {
  const dir = project();
  const { ok, output } = runDoctorIn(dir, false);
  assert.doesNotMatch(output, /openspec/i);
  assert.equal(ok, true, 'the host is ready without any external engine');
});

test('doctor does not mention openspec when the binary is present', () => {
  const dir = project();
  const { ok, output } = runDoctorIn(dir, true);
  assert.doesNotMatch(output, /openspec/i);
  assert.equal(ok, true);
});

test('doctor does not report an engine any more', () => {
  const dir = project();
  const { output } = runDoctorIn(dir, false);
  assert.doesNotMatch(output, /engine/i);
});

test('doctor ignores an engine declared in the manifest', () => {
  const dir = project({ engine: 'openspec' });
  const { ok, output } = runDoctorIn(dir, false);
  assert.equal(ok, true);
  assert.doesNotMatch(output, /engine/i);
  assert.doesNotMatch(output, /openspec/i);
});
