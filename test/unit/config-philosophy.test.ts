import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolvePhilosophy,
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

beforeEach(() => {
  savedHome = process.env.HOME;
  process.env.HOME = scratch('sp-phil-home-');
  savedConfig = readGlobalConfig();
});

afterEach(() => {
  writeGlobalConfig(savedConfig);
  if (savedHome !== undefined) process.env.HOME = savedHome;
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

test('resolvePhilosophy: el manifiesto odd gana con origen manifest', () => {
  const proj = scratch('sp-phil-manifest-');
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }), 'utf8');
  const res = resolvePhilosophy(proj);
  assert.equal(res.value, 'odd');
  assert.equal(res.origin, 'manifest');
});

test('resolvePhilosophy: sin manifiesto usa la config global (odd)', () => {
  writeGlobalConfig({ ...readGlobalConfig(), philosophy: 'odd' });
  const proj = scratch('sp-phil-nomanifest-');
  const res = resolvePhilosophy(proj);
  assert.equal(res.value, 'odd');
  assert.equal(res.origin, 'global');
});

test('resolvePhilosophy: sin manifiesto ni global usa el default sdd', () => {
  writeGlobalConfig({ ...readGlobalConfig(), philosophy: 'sdd' });
  const res = resolvePhilosophy();
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'default');
});

test('resolvePhilosophy: valor inválido en el manifiesto cae a sdd y advierte', () => {
  const proj = scratch('sp-phil-invalid-');
  writeFileSync(join(proj, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'rapido' }), 'utf8');
  const res = resolvePhilosophy(proj);
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'default');
  assert.ok(res.warning && res.warning.length > 0, 'debe emitir una advertencia legible');
});

test('resolvePhilosophy: valor inválido en la config global cae a sdd y advierte', () => {
  const dir = join(process.env.HOME as string, '.config', 'spectralis');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ philosophy: 'rapido' }), 'utf8');
  const res = resolvePhilosophy();
  assert.equal(res.value, 'sdd');
  assert.equal(res.origin, 'default');
  assert.ok(res.warning && res.warning.length > 0, 'debe emitir una advertencia legible');
});
