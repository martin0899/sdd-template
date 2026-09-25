import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProjectId, slugify } from '../../src/core/project-id';

test('generateProjectId produces proy-YYYYMMDD-slug format', () => {
  const id = generateProjectId('Spectralis', '20260925');
  assert.equal(id, 'proy-20260925-spectralis');
  assert.match(id, /^proy-\d{8}-/);
});

test('generateProjectId uses today date when not provided', () => {
  const id = generateProjectId('Chapur Pay');
  assert.match(id, /^proy-\d{8}-chapur-pay$/);
});

test('slugify handles accents and special chars', () => {
  assert.equal(slugify('Mesa Regalos'), 'mesa-regalos');
  assert.equal(slugify('Objetos de BD'), 'objetos-de-bd');
  assert.equal(slugify('  Leading and trailing  '), 'leading-and-trailing');
});

test('generateProjectId is stable with same date', () => {
  assert.equal(generateProjectId('spectralis', '20260925'), generateProjectId('Spectralis', '20260925'));
});