import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBacklog } from '../../src/commands/backlog';
import { readGlobalConfig, writeGlobalConfig, SpectralisConfig } from '../../src/core/config';

const created: string[] = [];
afterEach(() => { for (const d of created) rmSync(d, { recursive: true, force: true }); created.length = 0; });

function scratch(): string { const d = mkdtempSync(join(tmpdir(), 'sp-backlog-')); created.push(d); return d; }

let savedConfig: SpectralisConfig;
let savedHome: string | undefined;
let tempHome: string;

beforeEach(() => {
  savedHome = process.env.HOME;
  savedConfig = readGlobalConfig();
  tempHome = join(tmpdir(), `sp-home-${Date.now()}-${Math.random()}`);
  process.env.HOME = tempHome;
});

afterEach(() => {
  process.env.HOME = savedHome;
  writeGlobalConfig(savedConfig);
});

test('runBacklog returns 1 when no vault_root configured', async () => {
  writeGlobalConfig({ ...savedConfig, vault_root: '' });
  const code = await runBacklog({ project: 'Spectralis' });
  assert.equal(code, 1);
});

test('runBacklog returns 0 and lists items in table format', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'Spectralis', '_Notas');
  mkdirSync(notasPath, { recursive: true });
  writeFileSync(join(notasPath, 'Nota-1.md'), `---\nid: nota-001\nstatus: pendiente\ntags: [spectralis, p1]\nFecha: 2026-09-27\n---\n# Nota 1`, 'utf8');
  writeFileSync(join(notasPath, 'Nota-2.md'), `---\nid: nota-002\nstatus: completado\ntags: [wiki]\nFecha: 2026-09-26\n---\n# Nota 2`, 'utf8');

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  const code = await runBacklog({ project: 'Spectralis' });
  console.log = originalLog;

  assert.equal(code, 0);
  assert.match(output, /Nota-1/);
  assert.match(output, /pendiente/);
});

test('runBacklog --json returns valid JSON', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'TestProject', '_Notas');
  mkdirSync(notasPath, { recursive: true });
  writeFileSync(join(notasPath, 'Test-Note.md'), `---\nid: test-001\nstatus: pendiente\ntags: [test]\nFecha: 2026-09-28\n---\n# Test`, 'utf8');

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output = msg; };

  await runBacklog({ project: 'TestProject', json: true });
  console.log = originalLog;

  const parsed = JSON.parse(output);
  assert.equal(parsed.project, 'TestProject');
  assert.equal(parsed.total, 1);
  assert.equal(parsed.backlog[0].status, 'pendiente');
});

test('runBacklog --status filters correctly', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'FilterTest', '_Notas');
  mkdirSync(notasPath, { recursive: true });
  writeFileSync(join(notasPath, 'A.md'), `---\nid: a\nstatus: pendiente\nFecha: 2026-09-27\n---\n# A`, 'utf8');
  writeFileSync(join(notasPath, 'B.md'), `---\nid: b\nstatus: completado\nFecha: 2026-09-27\n---\n# B`, 'utf8');

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  await runBacklog({ project: 'FilterTest', statusFilter: 'pendiente' });
  console.log = originalLog;

  assert.match(output, /pendiente/);
  assert.match(output, /A\s+\|/);
  assert.doesNotMatch(output, /B\s+\|/);
});

test('runBacklog --status todos shows all', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'AllTest', '_Notas');
  mkdirSync(notasPath, { recursive: true });
  writeFileSync(join(notasPath, 'X.md'), `---\nid: x\nstatus: pendiente\nFecha: 2026-09-27\n---\n# X`, 'utf8');
  writeFileSync(join(notasPath, 'Y.md'), `---\nid: y\nstatus: completado\nFecha: 2026-09-27\n---\n# Y`, 'utf8');

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  await runBacklog({ project: 'AllTest', statusFilter: 'todos' });
  console.log = originalLog;

  assert.match(output, /X\s+\|/);
  assert.match(output, /Y\s+\|/);
});

test('runBacklog returns 1 when project name is missing', async () => {
  const code = await runBacklog({ project: '' });
  assert.equal(code, 1);
});

test('runBacklog returns 0 with empty items when _Notas does not exist', async () => {
  const vaultRoot = scratch();
  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  const code = await runBacklog({ project: 'NonExistent' });
  console.log = originalLog;

  assert.equal(code, 0);
  assert.match(output, /0 item/);
});

test('runBacklog shows 0 items when _Notas is empty', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'EmptyTest', '_Notas');
  mkdirSync(notasPath, { recursive: true });

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  const code = await runBacklog({ project: 'EmptyTest' });
  console.log = originalLog;

  assert.equal(code, 0);
  assert.match(output, /0 item/);
});

test('runBacklog defaults status to sin-estado when not in frontmatter', async () => {
  const vaultRoot = scratch();
  const notasPath = join(vaultRoot, '01_Proyectos', 'NoStatusTest', '_Notas');
  mkdirSync(notasPath, { recursive: true });
  writeFileSync(join(notasPath, 'No-Status.md'), `---\nid: ns-001\nFecha: 2026-09-27\n---\n# No Status`, 'utf8');

  writeGlobalConfig({ ...savedConfig, vault_root: vaultRoot });

  let output = '';
  const originalLog = console.log;
  console.log = (msg: string) => { output += msg + '\n'; };

  await runBacklog({ project: 'NoStatusTest' });
  console.log = originalLog;

  assert.match(output, /sin-estado/);
});
