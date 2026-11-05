import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSpecStatus } from '../../src/commands/spec-status';

const created: string[] = [];
const originalHome = process.env.HOME;

afterEach(() => {
  process.env.HOME = originalHome;
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

function project(changes: string[]): string {
  const root = scratch('sp-spec-status-proj-');
  const home = scratch('sp-spec-status-home-');
  process.env.HOME = home;
  mkdirSync(join(root, 'spec'), { recursive: true });
  for (const id of changes) {
    const dir = join(root, 'spec', id);
    mkdirSync(dir, { recursive: true });
    for (const artifact of ['proposal.md', 'design.md', 'tasks.md']) {
      writeFileSync(join(dir, artifact), `# ${artifact}\n`, 'utf8');
    }
  }
  return root;
}

function capture(fn: () => Promise<number>): Promise<{ code: number; output: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(' '));
  };
  return (async () => {
    try {
      const code = await fn();
      return { code, output: lines.join('\n') };
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  })();
}

test('spec status lists every active change with its state', async () => {
  const root = project(['change-a', 'change-b']);
  const { code, output } = await capture(() => runSpecStatus({ projectRoot: root }));
  assert.equal(code, 0);
  assert.match(output, /change-a/);
  assert.match(output, /change-b/);
  assert.match(output, /sin registro/);
});

test('spec status shows the detail of the requested change', async () => {
  const root = project(['change-a']);
  const { code, output } = await capture(() =>
    runSpecStatus({ projectRoot: root, changeId: 'change-a' })
  );
  assert.equal(code, 0);
  assert.match(output, /change-a/);
  assert.match(output, /Tareas:/);
  assert.match(output, /Artefactos:/);
  assert.match(output, /proposal\.md/);
});

test('spec status fails when the requested change does not exist', async () => {
  const root = project(['change-a']);
  const { code, output } = await capture(() =>
    runSpecStatus({ projectRoot: root, changeId: 'missing-change' })
  );
  assert.equal(code, 1);
  assert.match(output, /missing-change/);
});
