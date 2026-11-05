import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runConfig } from '../../src/commands/config';
import { readGlobalConfig } from '../../src/core/config';

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

/** An isolated HOME: the global config of the host never leaks into the test. */
function isolatedHome(): string {
  const home = scratch('sp-config-engine-home-');
  process.env.HOME = home;
  return home;
}

function project(manifest: Record<string, unknown> = {}): string {
  const dir = scratch('sp-config-engine-proj-');
  writeFileSync(
    join(dir, '.sdd-manifest.json'),
    JSON.stringify({ schemaVersion: 3, ...manifest }, null, 2) + '\n',
    'utf8'
  );
  return dir;
}

function captureLog(fn: () => Promise<number>): Promise<{ code: number; output: string }> {
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

test('config --set engine=openspec stores the engine in the project manifest', async () => {
  isolatedHome();
  const dir = project();
  const { code } = await captureLog(() => runConfig({ set: 'engine=openspec', destino: dir }));
  assert.equal(code, 0);
  const manifest = JSON.parse(readFileSync(join(dir, '.sdd-manifest.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  assert.equal(manifest.engine, 'openspec');
});

test('config --get engine prints the resolved engine and its origin', async () => {
  isolatedHome();
  const dir = project({ engine: 'openspec' });
  const { code, output } = await captureLog(() => runConfig({ get: 'engine', destino: dir }));
  assert.equal(code, 0);
  assert.match(output, /openspec/);
  assert.match(output, /manifiesto|manifest/);
});

test('config --get engine falls back to native when nothing declares an engine', async () => {
  isolatedHome();
  const dir = project();
  const { code, output } = await captureLog(() => runConfig({ get: 'engine', destino: dir }));
  assert.equal(code, 0);
  assert.match(output, /native/);
});

test('config --set engine=invalid fails with a descriptive error', async () => {
  isolatedHome();
  const dir = project();
  const { code, output } = await captureLog(() =>
    runConfig({ set: 'engine=invalid', destino: dir })
  );
  assert.equal(code, 1);
  assert.match(output, /engine/i);
  assert.match(output, /openspec.*native|native.*openspec/i);
  const manifest = JSON.parse(readFileSync(join(dir, '.sdd-manifest.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  assert.equal(manifest.engine, undefined, 'nothing is written when the value is invalid');
});

test('a global config without engine resolves to the empty default', () => {
  isolatedHome();
  const config = readGlobalConfig();
  assert.equal(config.engine, '');
});
