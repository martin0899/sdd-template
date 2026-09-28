import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bumpPatch, bumpMinor, bumpMajor, isValidVersion } from '../../src/core/project-version';

test('bumpPatch increments patch by 1', () => {
  assert.equal(bumpPatch('1.2.3'), '1.2.4');
  assert.equal(bumpPatch('1.0.0'), '1.0.1');
});

test('bumpPatch carries from 99 to minor', () => {
  assert.equal(bumpPatch('1.2.99'), '1.3.0');
  assert.equal(bumpPatch('1.99.99'), '2.0.0');
});

test('bumpMinor increments minor and resets patch', () => {
  assert.equal(bumpMinor('1.3.5'), '1.4.0');
  assert.equal(bumpMinor('1.0.0'), '1.1.0');
});

test('bumpMinor carries from 99 to major', () => {
  assert.equal(bumpMinor('1.99.5'), '2.0.0');
});

test('bumpMajor increments major and resets minor/patch', () => {
  assert.equal(bumpMajor('1.9.9'), '2.0.0');
});

test('bumpMajor caps at 99', () => {
  assert.equal(bumpMajor('99.9.9'), '99.0.0');
});

test('invalid version falls back to 1.0.0', () => {
  assert.equal(bumpPatch('abc'), '1.0.1');
  assert.equal(bumpPatch(''), '1.0.1');
  assert.equal(bumpMinor('999.2.2'), '1.1.0');
});

test('isValidVersion validates X.Y.Z with 0..99 components', () => {
  assert.equal(isValidVersion('1.2.3'), true);
  assert.equal(isValidVersion('99.99.99'), true);
  assert.equal(isValidVersion('100.0.0'), false);
  assert.equal(isValidVersion('1.2'), false);
  assert.equal(isValidVersion('1.2.3.4'), false);
  assert.equal(isValidVersion('abc'), false);
});