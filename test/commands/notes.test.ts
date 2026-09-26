import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNotesInit, runNotesSync, isObsidianActive } from '../../src/commands/notes';

let savedHome: string | undefined;
const created: string[] = [];

beforeEach(() => {
  savedHome = process.env.HOME;
  process.env.HOME = mkdtempSync(join(tmpdir(), 'sp-home-'));
});

afterEach(() => {
  if (savedHome !== undefined) process.env.HOME = savedHome;
  for (const d of created) rmSync(d, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const d = mkdtempSync(join(tmpdir(), 'sp-notes-'));
  created.push(d);
  return d;
}

function makeProjectWithManifest(resourcesDir: string): string {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ resources_dir: resourcesDir }), 'utf8');
  return proj;
}

const REPO_ROOT = join(__dirname, '..', '..', '..');

test('notes init creates subfolders in resources_dir from manifest', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  const code = await runNotesInit({ destino: proj });
  assert.equal(code, 0);
  assert.ok(existsSync(join(resources, 'spectralis-cli')));
  assert.ok(existsSync(join(resources, 'git-workflow')));
  assert.ok(existsSync(join(resources, 'local-ai')));
});

test('notes init is idempotent', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  const c1 = await runNotesInit({ destino: proj });
  const c2 = await runNotesInit({ destino: proj });
  assert.equal(c1, 0);
  assert.equal(c2, 0);
});

test('notes init --dry-run writes nothing', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  const code = await runNotesInit({ destino: proj, dryRun: true });
  assert.equal(code, 0);
  assert.equal(existsSync(join(resources, 'spectralis-cli')), false);
});

test('notes init falls back to info inside project when no vault', async () => {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({}), 'utf8');
  const code = await runNotesInit({ destino: proj });
  assert.equal(code, 0);
  assert.ok(existsSync(join(proj, 'info', 'spectralis-cli')));
});

test('notes sync copies manuals to resources_dir', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  const code = await runNotesSync({ destino: proj, templateRoot: REPO_ROOT });
  assert.equal(code, 0);
  assert.ok(existsSync(join(resources, 'spectralis-cli', 'manual.md')));
  assert.ok(existsSync(join(resources, 'git-workflow', 'manual.md')));
});

test('notes sync --dry-run writes nothing', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  const code = await runNotesSync({ destino: proj, dryRun: true, templateRoot: REPO_ROOT });
  assert.equal(code, 0);
  assert.equal(existsSync(join(resources, 'spectralis-cli')), false);
});

test('notes sync is idempotent for identical files', async () => {
  const resources = scratch();
  const proj = makeProjectWithManifest(resources);
  await runNotesSync({ destino: proj, templateRoot: REPO_ROOT });
  const before = readFileSync(join(resources, 'spectralis-cli', 'manual.md'), 'utf8');
  await runNotesSync({ destino: proj, templateRoot: REPO_ROOT });
  const after = readFileSync(join(resources, 'spectralis-cli', 'manual.md'), 'utf8');
  assert.equal(before, after);
});

test('notes sync falls back to info inside project when no vault', async () => {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({}), 'utf8');
  const code = await runNotesSync({ destino: proj, templateRoot: REPO_ROOT });
  assert.equal(code, 0);
  assert.ok(existsSync(join(proj, 'info', 'spectralis-cli', 'manual.md')));
});

test('isObsidianActive: default is off (0)', () => {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({}), 'utf8');
  assert.equal(isObsidianActive({}, proj), false);
});

test('isObsidianActive: active when config switch is 1', () => {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ obsidianSync: 1 }), 'utf8');
  assert.equal(isObsidianActive({}, proj), true);
});

test('isObsidianActive: --obsidian forces on, --no-obsidian forces off', () => {
  const proj = scratch();
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ obsidianSync: 0 }), 'utf8');
  assert.equal(isObsidianActive({ obsidian: true }, proj), true);
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ obsidianSync: 1 }), 'utf8');
  assert.equal(isObsidianActive({ noObsidian: true }, proj), false);
});