import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSpecValidate } from '../../src/commands/spec-validate';
import { missingSddEssentials } from '../../src/core/sdd-essentials';
import { resolveChangesDir } from '../../src/core/resolve-changes-dir';

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

function project(changeId: string, artifacts: string[], content = '# artifact\n'): string {
  const root = scratch('sp-spec-validate-proj-');
  const home = scratch('sp-spec-validate-home-');
  process.env.HOME = home;
  const dir = join(root, 'spec', changeId);
  mkdirSync(dir, { recursive: true });
  for (const artifact of artifacts) {
    writeFileSync(join(dir, artifact), content, 'utf8');
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

test('spec validate passes when every artifact of the change is present', async () => {
  const root = project('change-a', ['proposal.md', 'design.md', 'tasks.md']);
  const { code, output } = await capture(() =>
    runSpecValidate({ changeId: 'change-a', projectRoot: root })
  );
  assert.equal(code, 0);
  assert.match(output, /change change-a is valid/);
});

test('spec validate fails when an artifact is missing', async () => {
  const root = project('change-a', ['proposal.md', 'tasks.md']);
  const { code, output } = await capture(() =>
    runSpecValidate({ changeId: 'change-a', projectRoot: root })
  );
  assert.equal(code, 1);
  assert.match(output, /change change-a is missing: design\.md/);
});

test('spec validate fails when the change has no tasks.md', async () => {
  const root = project('change-a', ['proposal.md', 'design.md']);
  const { code, output } = await capture(() =>
    runSpecValidate({ changeId: 'change-a', projectRoot: root })
  );
  assert.equal(code, 1);
  assert.match(output, /change change-a is missing: tasks\.md/);
});

test('spec validate reports the same missing artifacts as missingSddEssentials', async () => {
  const root = project('change-a', ['proposal.md']);
  const changesDir = resolveChangesDir({ projectRoot: root });
  const expected = missingSddEssentials(root, 'change-a', changesDir);
  const { code, output } = await capture(() =>
    runSpecValidate({ changeId: 'change-a', projectRoot: root })
  );
  assert.equal(code, 1);
  assert.deepEqual(expected, ['design.md', 'tasks.md']);
  assert.match(
    output,
    new RegExp(`change change-a is missing: ${expected.join(', ').replace(/\./g, '\\.')}`)
  );
});

test('spec validate does not validate the content of the artifacts', async () => {
  const root = project('change-a', ['proposal.md', 'design.md', 'tasks.md'], '');
  const { code, output } = await capture(() =>
    runSpecValidate({ changeId: 'change-a', projectRoot: root })
  );
  assert.equal(code, 0, 'an empty artifact exists: only its presence is validated');
  assert.match(output, /change change-a is valid/);
});
