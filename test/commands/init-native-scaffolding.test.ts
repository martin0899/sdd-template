import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');
let fakeBin: string;
let home: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  // The PATH has no openspec binary on purpose: a successful init proves the
  // harness never spawns an external spec engine.
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-init-native-bin-'));
  home = mkdtempSync(join(tmpdir(), 'spectralis-init-native-home-'));
  writeFileSync(join(fakeBin, 'graphify'), '#!/usr/bin/env node\nprocess.exit(0);\n');
  baseEnv = {
    ...process.env,
    HOME: home,
    PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
  };
});

after(() => {
  rmSync(fakeBin, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

function runInit(dst: string, extra: string[] = []) {
  return spawnSync(process.execPath, [CLI, 'init', dst, '--yes', '--no-obsidian', ...extra], {
    env: baseEnv,
    encoding: 'utf8',
    input: 's\n'
  });
}

test('init creates the native spec/ scaffolding without any external CLI', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-native-'));
  try {
    const r = runInit(dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    assert.ok(existsSync(join(dst, 'spec')), 'spec/ must be created');
    assert.ok(existsSync(join(dst, 'spec', 'progress.json')), 'spec/progress.json must be seeded');
    assert.ok(existsSync(join(dst, 'spec', 'config.yaml')), 'spec/config.yaml must be created');

    const progress = JSON.parse(readFileSync(join(dst, 'spec', 'progress.json'), 'utf8')) as {
      change?: unknown[];
    };
    assert.deepEqual(progress.change, [], 'the progress registry starts empty');

    const config = readFileSync(join(dst, 'spec', 'config.yaml'), 'utf8');
    assert.match(config, /Language preference: All interactions/);

    assert.equal(
      existsSync(join(dst, 'openspec')),
      false,
      'init must not create an openspec/ directory'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init does not manage openspec/config.yaml in the manifest', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-native-manifest-'));
  try {
    const r = runInit(dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const manifest = JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as {
      files?: { path: string }[];
    };
    const paths = (manifest.files ?? []).map((f) => f.path);
    assert.ok(!paths.includes('openspec/config.yaml'), 'the legacy config is not managed');
    assert.ok(paths.includes('AGENTS.md'), 'the managed block is still tracked');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the init plan describes the native scaffolding and no external engine', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-init-native-plan-'));
  try {
    const r = runInit(dst, ['--dry-run']);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.doesNotMatch(r.stdout, /openspec/i);
    assert.match(r.stdout, /spec\//);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
