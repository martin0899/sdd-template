import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveOddFeaturePath,
  createFeatureDoc,
  FEATURE_SECTIONS,
  classifyOddChangeSize,
  checkOddChangeRequirements,
  promoteOddToSdd,
  guardLayoutSeparation
} from '../../src/core/odd-layout';

const created: string[] = [];
function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

test('resolveOddFeaturePath resuelve odd/changes/<id>/feature.md dentro del proyecto', () => {
  const root = scratch('sp-odd-layout-');
  const path = resolveOddFeaturePath(root, 'add-mi-cambio');
  assert.equal(path, join(root, 'odd', 'changes', 'add-mi-cambio', 'feature.md'));
  assert.ok(!path.includes('openspec'), 'la resolución no toca openspec/');
});

test('createFeatureDoc escribe feature.md con la plantilla (contexto, decisiones, evidencia)', () => {
  const root = scratch('sp-odd-feat-');
  const path = createFeatureDoc(root, 'add-x');
  assert.ok(existsSync(path), 'feature.md debe crearse');
  const content = readFileSync(path, 'utf8');
  for (const section of FEATURE_SECTIONS) {
    assert.match(content, new RegExp(section), `sección ${section} presente`);
  }
  assert.match(content, /commit/i, 'evidencia referencia al commit');
});

test('crear feature docs no crea openspec/ ni escribe en él', () => {
  const root = scratch('sp-odd-noopenspec-');
  createFeatureDoc(root, 'add-x');
  createFeatureDoc(root, 'add-y');
  assert.ok(!existsSync(join(root, 'openspec')), 'el flujo ODD no crea openspec/');
  assert.deepEqual(readdirSync(join(root, 'odd', 'changes')), ['add-x', 'add-y']);
});

test('cambio retomable (pedido + git diff) es pequeño y no exige documentación formal', () => {
  const root = scratch('sp-odd-small-');
  const size = classifyOddChangeSize(true);
  assert.equal(size, 'small');
  const req = checkOddChangeRequirements(root, 'add-small', size);
  assert.equal(req.ok, true);
  assert.deepEqual(req.requiredDocs, []);
});

test('cambio no retomable es sustancial y exige feature.md antes de escribir código', () => {
  const root = scratch('sp-odd-substantial-');
  const size = classifyOddChangeSize(false);
  assert.equal(size, 'substantial');
  const req = checkOddChangeRequirements(root, 'add-big', size);
  assert.equal(req.ok, false);
  assert.match(req.problem ?? '', /feature\.md/);
  assert.deepEqual(req.requiredDocs, [resolveOddFeaturePath(root, 'add-big')]);

  createFeatureDoc(root, 'add-big');
  const after = checkOddChangeRequirements(root, 'add-big', size);
  assert.equal(after.ok, true);
});

test('promoción no autorizada no genera artefactos ni crea openspec/', () => {
  const root = scratch('sp-odd-promote-unauth-');
  createFeatureDoc(root, 'add-p');
  const res = promoteOddToSdd({ projectRoot: root, changeId: 'add-p', authorized: false });
  assert.equal(res.ok, false);
  assert.deepEqual(res.generated, []);
  assert.ok(!existsSync(join(root, 'openspec')), 'sin autorización no se crea openspec/');
});

test('promoción autorizada genera artefactos formales, conserva el historial ODD y declara la fuente de verdad', () => {
  const root = scratch('sp-odd-promote-auth-');
  createFeatureDoc(root, 'add-p');
  const res = promoteOddToSdd({ projectRoot: root, changeId: 'add-p', authorized: true });
  assert.equal(res.ok, true);
  assert.equal(res.sourceOfTruth, join('openspec', 'changes', 'add-p'));
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(existsSync(join(root, 'openspec', 'changes', 'add-p', name)), `${name} generado`);
  }
  assert.ok(
    existsSync(join(root, 'odd', 'changes', 'add-p', 'feature.md')),
    'el historial ODD se conserva tras la promoción'
  );
  assert.ok(res.generated.length >= 3);
});

test('la guarda de separación avisa y bloquea la mezcla sin promoción autorizada', () => {
  const root = scratch('sp-odd-sep-');
  createFeatureDoc(root, 'add-m');
  mkdirSync(join(root, 'openspec', 'changes', 'add-m'), { recursive: true });
  const blocked = guardLayoutSeparation({ projectRoot: root, changeId: 'add-m', authorizedPromotion: false });
  assert.equal(blocked.blocked, true);
  assert.match(blocked.warning ?? '', /mezcl/i);

  const allowed = guardLayoutSeparation({ projectRoot: root, changeId: 'add-m', authorizedPromotion: true });
  assert.equal(allowed.blocked, false, 'la promoción autorizada es la vía legítima');
});

test('uso normal ODD (solo odd/changes) no dispara la guarda', () => {
  const root = scratch('sp-odd-normal-');
  createFeatureDoc(root, 'add-n');
  const g = guardLayoutSeparation({ projectRoot: root, changeId: 'add-n', authorizedPromotion: false });
  assert.equal(g.blocked, false);
});