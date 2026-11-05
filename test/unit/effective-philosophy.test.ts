import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveEffectivePhilosophy,
  readGlobalConfig,
  writeGlobalConfig,
  type SpectralisConfig
} from '../../src/core/config';

let savedHome: string | undefined;
let savedConfig: SpectralisConfig;
const created: string[] = [];

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

function projectWith(philosophy?: string): string {
  const proj = scratch('sp-eff-manifest-');
  if (philosophy !== undefined) {
    writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ philosophy }), 'utf8');
  }
  return proj;
}

beforeEach(() => {
  savedHome = process.env.HOME;
  process.env.HOME = scratch('sp-eff-home-');
  savedConfig = readGlobalConfig();
});

afterEach(() => {
  writeGlobalConfig(savedConfig);
  if (savedHome !== undefined) process.env.HOME = savedHome;
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

test('resolveEffectivePhilosophy: el manifiesto gana sobre la config global', () => {
  writeGlobalConfig({ ...readGlobalConfig(), philosophy: 'sdd' });
  const proj = projectWith('sdd');
  const res = resolveEffectivePhilosophy(proj);
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'manifest');
});

test('resolveEffectivePhilosophy: sin manifiesto usa la config global', () => {
  writeGlobalConfig({ ...readGlobalConfig(), philosophy: 'sdd' });
  const res = resolveEffectivePhilosophy(scratch('sp-eff-nomanifest-'));
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'global');
});

test('resolveEffectivePhilosophy: sin nada usa el default sdd', () => {
  const res = resolveEffectivePhilosophy();
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'default');
});

test('resolveEffectivePhilosophy: un manifiesto legado cae a sdd con advertencia', () => {
  const proj = projectWith('odd');
  const res = resolveEffectivePhilosophy(proj);
  assert.equal(res.value, 'sdd');
  assert.ok(res.warning && res.warning.length > 0, 'debe emitir una advertencia legible');
});
