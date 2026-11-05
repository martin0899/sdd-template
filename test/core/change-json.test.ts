import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readChangeJson,
  validateChangeJson,
  writeChangeJson,
  type ChangeJson
} from '../../src/core/change-json';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-change-json-'));
  created.push(dir);
  return dir;
}

const CHANGE: ChangeJson = {
  id: 'spec-native-f2',
  nombre: 'Fase F2 del spec nativo',
  fecha: '2026-11-05',
  estado: 'open',
  resumen: { abstracto: 'Ciclo de vida nativo de los changes.' },
  enlaces: []
};

test('writeChangeJson writes the exact schema of the change metadata', () => {
  const dir = scratch();
  writeChangeJson(dir, CHANGE);
  const raw = JSON.parse(readFileSync(join(dir, 'change.json'), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(Object.keys(raw), ['id', 'nombre', 'fecha', 'estado', 'resumen', 'enlaces']);
  assert.deepEqual(Object.keys(raw.resumen as Record<string, unknown>), ['abstracto']);
  assert.equal(raw.id, 'spec-native-f2');
  assert.equal(raw.nombre, 'Fase F2 del spec nativo');
  assert.equal(raw.fecha, '2026-11-05');
  assert.equal(raw.estado, 'open');
  assert.deepEqual(raw.resumen, { abstracto: 'Ciclo de vida nativo de los changes.' });
  assert.deepEqual(raw.enlaces, []);
});

test('readChangeJson reads back what writeChangeJson wrote', () => {
  const dir = scratch();
  writeChangeJson(dir, CHANGE);
  assert.deepEqual(readChangeJson(dir), CHANGE);
});

test('readChangeJson fails when a mandatory field is missing', () => {
  const dir = scratch();
  writeFileSync(
    join(dir, 'change.json'),
    JSON.stringify({ id: 'x', nombre: 'y', fecha: '2026-11-05', estado: 'open', enlaces: [] }),
    'utf8'
  );
  assert.throws(() => readChangeJson(dir), /resumen/);
});

test('readChangeJson returns null when the file does not exist', () => {
  const dir = scratch();
  assert.equal(readChangeJson(dir), null);
});

test('validateChangeJson rejects an id that is not a string', () => {
  const result = validateChangeJson({ ...CHANGE, id: 42 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('id')));
});

test('validateChangeJson rejects a resumen without abstracto', () => {
  const result = validateChangeJson({ ...CHANGE, resumen: { titulo: 'no abstracto' } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('abstracto')));
});

test('validateChangeJson rejects enlaces that are not an array', () => {
  const result = validateChangeJson({ ...CHANGE, enlaces: 'none' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('enlaces')));
});

test('validateChangeJson accepts the exact schema', () => {
  const result = validateChangeJson(CHANGE);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});
