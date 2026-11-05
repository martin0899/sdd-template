import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveChangesDir } from '../../src/core/resolve-changes-dir';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-changes-dir-'));
  created.push(dir);
  return dir;
}

function writeManifest(root: string, data: Record<string, unknown>): void {
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

test('resolveChangesDir returns <projectRoot>/spec when nothing is configured', () => {
  const root = scratch();
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: {} }),
    join(root, 'spec')
  );
});

test('resolveChangesDir keeps the legacy layout when the config declares spec_dir', () => {
  const root = scratch();
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: 'openspec/changes' } }),
    join(root, 'openspec', 'changes')
  );
});

test('resolveChangesDir cascade: option wins over manifest, manifest over config, config over default', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, spec_dir: 'manifest-changes' });
  assert.equal(
    resolveChangesDir({
      projectRoot: root,
      specDir: 'option-changes',
      config: { spec_dir: 'config-changes' }
    }),
    join(root, 'option-changes'),
    'the option must win over every configuration source'
  );
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: 'config-changes' } }),
    join(root, 'manifest-changes'),
    'the manifest must win over the config'
  );
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: {} }),
    join(root, 'manifest-changes'),
    'the manifest must win over the default'
  );
});

test('resolveChangesDir honours an absolute opts.specDir over the default', () => {
  const root = scratch();
  const custom = join(root, 'custom', 'changes');
  assert.equal(resolveChangesDir({ projectRoot: root, specDir: custom, config: {} }), custom);
});

test('resolveChangesDir resolves a relative opts.specDir against projectRoot', () => {
  const root = scratch();
  assert.equal(
    resolveChangesDir({ projectRoot: root, specDir: '.spectralis/changes', config: {} }),
    join(root, '.spectralis', 'changes')
  );
});

test('resolveChangesDir prefers the manifest spec_dir over the global config', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, spec_dir: 'manifest-changes' });
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: 'global-changes' } }),
    join(root, 'manifest-changes')
  );
});

test('resolveChangesDir uses the global config spec_dir when the manifest has none', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3 });
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: 'global-changes' } }),
    join(root, 'global-changes')
  );
});

test('resolveChangesDir resolves a relative global config spec_dir against projectRoot', () => {
  const root = scratch();
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: 'relative/changes' } }),
    join(root, 'relative', 'changes')
  );
});

test('resolveChangesDir uses an absolute global config spec_dir as-is', () => {
  const root = scratch();
  const custom = join(root, 'absolute', 'changes');
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: { spec_dir: custom } }),
    custom
  );
});

test('resolveChangesDir resolves a relative manifest spec_dir against projectRoot', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, spec_dir: 'manifest-relative/changes' });
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: {} }),
    join(root, 'manifest-relative', 'changes')
  );
});

test('resolveChangesDir tolerates the hyphenated spec-dir key', () => {
  const root = scratch();
  writeManifest(root, { schemaVersion: 3, 'spec-dir': 'hyphen-changes' });
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: {} }),
    join(root, 'hyphen-changes')
  );
});

test('resolveChangesDir ignores an unreadable manifest and falls back to the default', () => {
  const root = scratch();
  writeFileSync(join(root, '.sdd-manifest.json'), '{ not json', 'utf8');
  assert.equal(
    resolveChangesDir({ projectRoot: root, config: {} }),
    join(root, 'spec')
  );
});
