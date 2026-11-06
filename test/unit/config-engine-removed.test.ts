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
  const home = scratch('sp-config-engine-removed-home-');
  process.env.HOME = home;
  return home;
}

function project(manifest: Record<string, unknown> = {}): string {
  const dir = scratch('sp-config-engine-removed-proj-');
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

test('config --set engine=native rejects the removed key', async () => {
  isolatedHome();
  const dir = project();
  const { code, output } = await captureLog(() => runConfig({ set: 'engine=native', destino: dir }));
  assert.equal(code, 1);
  assert.match(output, /engine/i);
  assert.match(output, /unknown|unrecognized|no (reconoce|soporta)|retirad/i);
  const manifest = JSON.parse(readFileSync(join(dir, '.sdd-manifest.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  assert.equal(manifest.engine, undefined, 'nothing is written when the key is unknown');
});

test('config --get engine reports the key as unknown', async () => {
  isolatedHome();
  const dir = project();
  const { code, output } = await captureLog(() => runConfig({ get: 'engine', destino: dir }));
  assert.equal(code, 1);
  assert.match(output, /engine/i);
  assert.match(output, /unknown|unrecognized|no (reconoce|soporta)|retirad/i);
});

test('config list does not expose the engine key', async () => {
  isolatedHome();
  const dir = project();
  const { code, output } = await captureLog(() => runConfig({ list: true, destino: dir }));
  assert.equal(code, 0);
  assert.doesNotMatch(output, /engine/i);
});

test('a manifest that declares an engine is ignored', async () => {
  isolatedHome();
  const dir = project({ engine: 'openspec' });
  const { code, output } = await captureLog(() => runConfig({ list: true, destino: dir }));
  assert.equal(code, 0, output);
  assert.doesNotMatch(output, /engine/i);
});

test('the global configuration has no engine key', () => {
  isolatedHome();
  const config = readGlobalConfig();
  assert.equal(
    (config as unknown as Record<string, unknown>).engine,
    undefined,
    'the engine key no longer exists in the configuration'
  );
});
