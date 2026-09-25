import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProjects, getProjectStatus } from '../../src/commands/projects';

const created: string[] = [];
afterEach(() => { for (const d of created) rmSync(d, { recursive: true, force: true }); created.length = 0; });

function scratch(): string { const d = mkdtempSync(join(tmpdir(), 'sp-proj-')); created.push(d); return d; }

test('detectProjects finds dirs with openspec/', () => {
  const base = scratch();
  mkdirSync(join(base, 'proj-a', 'openspec'), { recursive: true });
  mkdirSync(join(base, 'proj-b', 'openspec'), { recursive: true });
  mkdirSync(join(base, 'not-a-project'), { recursive: true });
  const projects = detectProjects(base);
  assert.equal(projects.length, 2);
});

test('getProjectStatus counts changes', () => {
  const base = scratch();
  const projDir = join(base, 'my-project');
  mkdirSync(join(projDir, 'openspec', 'changes', 'change-a'), { recursive: true });
  mkdirSync(join(projDir, 'openspec', 'changes', 'change-b'), { recursive: true });
  mkdirSync(join(projDir, 'openspec', 'changes', 'archive'), { recursive: true });
  writeFileSync(join(projDir, 'openspec', 'changes', 'change-a', 'tasks.md'), '- [x] done\n- [x] done2', 'utf8');
  writeFileSync(join(projDir, 'openspec', 'changes', 'change-b', 'tasks.md'), '- [x] done\n- [ ] pending', 'utf8');
  const status = getProjectStatus(projDir);
  assert.equal(status.changes, 2);
  assert.equal(status.complete, 1);
  assert.equal(status.pending, 1);
});
