import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDocumenterRequest, type DocumenterRequest } from '../../src/core/documenter-request';

const REQUIRED = ['mode', 'changeId', 'affectedPaths', 'testEvidence', 'risk', 'pending'];

test('validateDocumenterRequest acepta una solicitud completa', () => {
  const res = validateDocumenterRequest({
    mode: 'sdd',
    changeId: 'add-x',
    affectedPaths: ['docs/x.md'],
    testEvidence: 'npm test: 1 pass, 0 fail',
    risk: 'low',
    pending: []
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.missing, []);
});

test('validateDocumenterRequest rechaza una solicitud incompleta y reporta exactamente los campos faltantes', () => {
  const res = validateDocumenterRequest({
    mode: 'odd',
    changeId: 'add-y',
    affectedPaths: ['docs/y.md'],
    risk: 'high'
  } as Partial<DocumenterRequest>);
  assert.equal(res.ok, false);
  assert.deepEqual([...res.missing].sort(), ['pending', 'testEvidence']);
});

test('validateDocumenterRequest reporta todos los campos obligatorios ante una solicitud vacía', () => {
  const res = validateDocumenterRequest({});
  assert.equal(res.ok, false);
  assert.deepEqual([...res.missing].sort(), [...REQUIRED].sort());
});

test('validateDocumenterRequest trata un array vacío como presente (no faltante)', () => {
  const res = validateDocumenterRequest({
    mode: 'sdd',
    changeId: 'add-z',
    affectedPaths: [],
    testEvidence: 'ok',
    risk: 'low',
    pending: []
  });
  assert.equal(res.ok, true, 'affectedPaths/pending vacíos no deben considerarse faltantes');
});