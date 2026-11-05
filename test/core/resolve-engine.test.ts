import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveEngine } from '../../src/core/resolve-engine';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-engine-'));
  created.push(dir);
  return dir;
}

function writeManifest(root: string, data: Record<string, unknown>): void {
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

test('resolveEngine falls back to native when neither the manifest nor the config declare an engine', () => {
  const root = scratch();
  assert.deepEqual(resolveEngine({ projectRoot: root, config: {} }), {
    value: 'native',
    origin: 'default'
  });
});

test('resolveEngine reads the engine declared in the global config', () => {
  const root = scratch();
  assert.deepEqual(resolveEngine({ projectRoot: root, config: { engine: 'openspec' } }), {
    value: 'openspec',
    origin: 'config'
  });
});

test('resolveEngine prefers the engine of the manifest over the one of the config', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, engine: 'openspec' });
  assert.deepEqual(resolveEngine({ projectRoot: root, config: { engine: 'native' } }), {
    value: 'openspec',
    origin: 'manifest'
  });
});

test('resolveEngine falls back to the config when the manifest declares no engine', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3 });
  assert.deepEqual(resolveEngine({ projectRoot: root, config: { engine: 'openspec' } }), {
    value: 'openspec',
    origin: 'config'
  });
});

test('resolveEngine rejects an invalid engine of the manifest with a descriptive error', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, engine: 'invalid' });
  assert.throws(
    () => resolveEngine({ projectRoot: root, config: {} }),
    /invalid engine/i
  );
  assert.throws(
    () => resolveEngine({ projectRoot: root, config: {} }),
    /openspec.*native|native.*openspec/i
  );
});

test('resolveEngine rejects an invalid engine of the config with a descriptive error', () => {
  const root = scratch();
  assert.throws(
    () => resolveEngine({ projectRoot: root, config: { engine: 'invalid' } as never }),
    /invalid engine/i
  );
});

test('resolveEngine ignores an empty engine (not configured) and falls back to the default', () => {
  const root = scratch();
  assert.deepEqual(resolveEngine({ projectRoot: root, config: { engine: '' } }), {
    value: 'native',
    origin: 'default'
  });
});

test('resolveEngine ignores an unreadable manifest and falls back to the default', () => {
  const root = scratch();
  writeFileSync(join(root, '.sdd-manifest.json'), '{ not json', 'utf8');
  assert.deepEqual(resolveEngine({ projectRoot: root, config: {} }), {
    value: 'native',
    origin: 'default'
  });
});
