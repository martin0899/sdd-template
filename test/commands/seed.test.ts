import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverProjects, seedProject, seedIndex } from '../../src/commands/seed';

const created: string[] = [];
afterEach(() => { for (const d of created) rmSync(d, { recursive: true, force: true }); created.length = 0; });

function scratch(): string { const d = mkdtempSync(join(tmpdir(), 'sp-seed-')); created.push(d); return d; }

test('discoverProjects finds dirs with openspec/', () => {
  const base = scratch();
  mkdirSync(join(base, 'proj-a', 'openspec', 'changes'), { recursive: true });
  mkdirSync(join(base, 'proj-b', 'openspec', 'changes', 'change-1'), { recursive: true });
  mkdirSync(join(base, 'not-a-project'), { recursive: true });
  const projects = discoverProjects(base);
  assert.equal(projects.length, 2);
});

test('seedProject creates wiki structure', () => {
  const vault = scratch();
  const proj = { name: 'test-proj', path: '/tmp/test-proj', changes: 0 };
  const wikiDir = seedProject(vault, proj);
  assert.ok(existsSync(join(wikiDir, 'decisiones')));
  assert.ok(existsSync(join(wikiDir, 'errores')));
  assert.ok(existsSync(join(wikiDir, 'log')));
});

test('seedIndex writes _INDEX.json', () => {
  const vault = scratch();
  const projects = [{ name: 'proj-a', path: '/tmp/a', changes: 2 }];
  seedIndex(vault, projects);
  const raw = require('node:fs').readFileSync(join(vault, '05_wiki', '_INDEX.json'), 'utf8');
  const index = JSON.parse(raw);
  assert.ok(index['proj-a']);
  assert.equal(index['proj-a'].changes, 2);
});
