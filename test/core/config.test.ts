import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGlobalConfig, writeGlobalConfig, readLlmConfig, writeLlmConfig, resolveProjectRoot, detectVaultRoot, setRoute, resolveRoute, detectProjectFromCwd, setCurrentProjectRoot, resolveNotesDir, resolveObsidianSync, setObsidianSync, SpectralisConfig } from '../../src/core/config';

let savedConfig: SpectralisConfig;
let savedHome: string | undefined;

beforeEach(() => {
  savedHome = process.env.HOME;
  process.env.HOME = join(tmpdir(), `sp-cfg-home-${Date.now()}-${Math.random()}`);
  savedConfig = readGlobalConfig();
});

afterEach(() => {
  writeGlobalConfig(savedConfig);
  if (savedHome !== undefined) process.env.HOME = savedHome;
});

test('readGlobalConfig returns defaults when no file exists', () => {
  writeGlobalConfig({
    llm: { host: 'http://localhost:11434', model: '', enabled: false },
    projects_base: join(tmpdir(), 'test-projects'),
    vault_root: '',
    templates_dir: '',
    requirements_dir: '',
    projects_dir: '',
    resources_dir: '',
    autoUpdate: false,
    obsidianSync: 0,
    current_project_root: ''
  });
  const cfg = readGlobalConfig();
  assert.equal(cfg.llm.enabled, false);
  assert.equal(cfg.llm.host, 'http://localhost:11434');
  assert.ok(cfg.projects_base.length > 0);
});

test('writeGlobalConfig and readGlobalConfig round-trip', () => {
  const original = readGlobalConfig();
  const testCfg: SpectralisConfig = {
    llm: { host: 'http://localhost:9999', model: 'test-model', enabled: true },
    projects_base: '/tmp/test-projects',
    vault_root: '/tmp/test-vault',
    templates_dir: '',
    requirements_dir: '',
    projects_dir: '',
    resources_dir: '/tmp/test-resources',
    autoUpdate: false,
    obsidianSync: 0,
    current_project_root: ''
  };
  writeGlobalConfig(testCfg);
  const read = readGlobalConfig();
  assert.equal(read.llm.host, 'http://localhost:9999');
  assert.equal(read.llm.model, 'test-model');
  assert.equal(read.llm.enabled, true);
  assert.equal(read.projects_base, '/tmp/test-projects');
  assert.equal(read.resources_dir, '/tmp/test-resources');
  writeGlobalConfig(original);
});

test('readLlmConfig prefers OLLAMA_HOST env var', () => {
  process.env.OLLAMA_HOST = 'http://env-host:11434';
  const llm = readLlmConfig();
  assert.equal(llm.host, 'http://env-host:11434');
  delete process.env.OLLAMA_HOST;
});

test('writeLlmConfig persists to global config', () => {
  const original = readGlobalConfig();
  writeLlmConfig({ host: 'http://llm:11434', model: 'llama3', enabled: true });
  const llm = readLlmConfig();
  assert.equal(llm.model, 'llama3');
  assert.equal(llm.enabled, true);
  writeGlobalConfig(original);
});

test('resolveProjectRoot uses explicit flag when provided', () => {
  const result = resolveProjectRoot('myproject', { projectRoot: '/explicit/path' });
  assert.equal(result, '/explicit/path');
});

test('resolveProjectRoot returns null when no convention match', () => {
  const result = resolveProjectRoot('nonexistent-project-xyz');
  assert.equal(result, null);
});

test('resolveProjectRoot falls back to convention when project exists', () => {
  const original = readGlobalConfig();
  try {
    const base = mkdtempSync(join(tmpdir(), 'sp-proj-'));
    writeGlobalConfig({ ...original, projects_base: base });
    const projDir = join(base, 'my-app');
    require('node:fs').mkdirSync(projDir);
    const result = resolveProjectRoot('my-app');
    assert.equal(result, projDir);
    rmSync(base, { recursive: true, force: true });
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveProjectRoot returns null when convention dir missing', () => {
  const original = readGlobalConfig();
  try {
    const base = mkdtempSync(join(tmpdir(), 'sp-empty-'));
    writeGlobalConfig({ ...original, projects_base: base });
    const result = resolveProjectRoot('no-such-app');
    assert.equal(result, null);
    rmSync(base, { recursive: true, force: true });
  } finally {
    writeGlobalConfig(original);
  }
});

test('detectVaultRoot finds .obsidian in parent directory', () => {
  const base = mkdtempSync(join(tmpdir(), 'sp-vault-'));
  const vaultDir = join(base, 'vault');
  require('node:fs').mkdirSync(join(vaultDir, '.obsidian'), { recursive: true });
  const subDir = join(vaultDir, '01_Proyectos', 'project');
  require('node:fs').mkdirSync(subDir, { recursive: true });
  const result = detectVaultRoot(subDir);
  assert.equal(result, vaultDir);
  rmSync(base, { recursive: true, force: true });
});

test('detectVaultRoot returns null when no vault found', () => {
  const base = mkdtempSync(join(tmpdir(), 'sp-novault-'));
  const result = detectVaultRoot(base);
  assert.equal(result, null);
  rmSync(base, { recursive: true, force: true });
});

test('setRoute and resolveRoute round-trip (global)', () => {
  const original = readGlobalConfig();
  try {
    setRoute('vault_root', '/tmp/my-vault', true);
    const value = resolveRoute('vault_root');
    assert.equal(value, '/tmp/my-vault');
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveRoute reads from project manifest', () => {
  const projDir = mkdtempSync(join(tmpdir(), 'sp-proj-'));
  require('node:fs').writeFileSync(join(projDir, '.sdd-manifest.json'), JSON.stringify({ vault_root: '/proj/vault' }), 'utf8');
  const value = resolveRoute('vault_root', projDir);
  assert.equal(value, '/proj/vault');
  rmSync(projDir, { recursive: true, force: true });
});

test('detectProjectFromCwd finds project with manifest', () => {
  const base = mkdtempSync(join(tmpdir(), 'sp-cwd-'));
  require('node:fs').writeFileSync(join(base, '.sdd-manifest.json'), '{}', 'utf8');
  const result = detectProjectFromCwd(base);
  assert.ok(result);
  assert.equal(result!.root, base);
  assert.equal(result!.project, base.split('/').pop());
  rmSync(base, { recursive: true, force: true });
});

test('detectProjectFromCwd finds project with openspec', () => {
  const base = mkdtempSync(join(tmpdir(), 'sp-cwd-'));
  require('node:fs').mkdirSync(join(base, 'openspec'), { recursive: true });
  const result = detectProjectFromCwd(base);
  assert.ok(result);
  rmSync(base, { recursive: true, force: true });
});

test('detectProjectFromCwd returns null without markers', () => {
  const base = mkdtempSync(join(tmpdir(), 'sp-cwd-'));
  const result = detectProjectFromCwd(base);
  assert.equal(result, null);
  rmSync(base, { recursive: true, force: true });
});

test('setCurrentProjectRoot persists value', () => {
  const original = readGlobalConfig();
  try {
    setCurrentProjectRoot('/tmp/persisted-project');
    const cfg = readGlobalConfig();
    assert.equal(cfg.current_project_root, '/tmp/persisted-project');
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveNotesDir prefers resources_dir from manifest', () => {
  const projDir = mkdtempSync(join(tmpdir(), 'sp-res-manifest-'));
  require('node:fs').writeFileSync(join(projDir, '.sdd-manifest.json'), JSON.stringify({ resources_dir: '/proj/resources' }), 'utf8');
  const res = resolveNotesDir(projDir);
  assert.equal(res.dir, '/proj/resources');
  assert.equal(res.origin, 'manifest');
  rmSync(projDir, { recursive: true, force: true });
});

test('resolveNotesDir falls back to global resources_dir', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, resources_dir: '/global/resources' });
    const res = resolveNotesDir();
    assert.equal(res.dir, '/global/resources');
    assert.equal(res.origin, 'config');
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveNotesDir derives from detected vault', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, resources_dir: '' });
    const base = mkdtempSync(join(tmpdir(), 'sp-res-vault-'));
    const vaultDir = join(base, 'vault');
    require('node:fs').mkdirSync(join(vaultDir, '.obsidian'), { recursive: true });
    const res = resolveNotesDir(vaultDir);
    assert.equal(res.origin, 'vault');
    assert.ok(res.dir.endsWith(join('03_Recursos', '02_Sistemas_info')));
    rmSync(base, { recursive: true, force: true });
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveNotesDir falls back to info inside project', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, resources_dir: '' });
    const projDir = mkdtempSync(join(tmpdir(), 'sp-res-temp-'));
    const res = resolveNotesDir(projDir);
    assert.equal(res.dir, join(projDir, 'info'));
    assert.equal(res.origin, 'info');
    rmSync(projDir, { recursive: true, force: true });
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveObsidianSync defaults to 0', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, obsidianSync: 0 });
    const res = resolveObsidianSync();
    assert.equal(res.value, 0);
    assert.equal(res.origin, 'default');
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveObsidianSync reads from global config', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, obsidianSync: 1 });
    const res = resolveObsidianSync();
    assert.equal(res.value, 1);
    assert.equal(res.origin, 'config');
  } finally {
    writeGlobalConfig(original);
  }
});

test('resolveObsidianSync prefers manifest value', () => {
  const original = readGlobalConfig();
  try {
    writeGlobalConfig({ ...original, obsidianSync: 1 });
    const projDir = mkdtempSync(join(tmpdir(), 'sp-obs-manifest-'));
    require('node:fs').writeFileSync(join(projDir, '.sdd-manifest.json'), JSON.stringify({ obsidianSync: 0 }), 'utf8');
    const res = resolveObsidianSync(projDir);
    assert.equal(res.value, 0);
    assert.equal(res.origin, 'manifest');
    rmSync(projDir, { recursive: true, force: true });
  } finally {
    writeGlobalConfig(original);
  }
});

test('setObsidianSync persists to manifest', () => {
  const projDir = mkdtempSync(join(tmpdir(), 'sp-obs-set-'));
  setObsidianSync(1, false, projDir);
  const manifest = JSON.parse(require('node:fs').readFileSync(join(projDir, '.sdd-manifest.json'), 'utf8'));
  assert.equal(manifest.obsidianSync, 1);
  rmSync(projDir, { recursive: true, force: true });
});
