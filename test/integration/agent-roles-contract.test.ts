import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const AGENTS = readFileSync(join(REPO, 'AGENTS.md'), 'utf8');

test('contrato de roles: entradas y salidas de coordinador, planificador, implementador y revisor (gertrudis)', () => {
  assert.match(AGENTS, /## Contrato de roles/);
  for (const role of ['coordinador', 'planificador', 'implementador']) {
    assert.match(AGENTS, new RegExp(`\\*\\*${role}\\*\\*.*consume`, 'i'), `${role} declara entradas`);
  }
  assert.match(AGENTS, /revisor.*gertrudis.*consume.*modo.*ID.*diff.*riesgo/i);
  assert.match(AGENTS, /produce.*clasificación.*enrutado.*fase|clasificación.*enrutado.*fase/i);
});

test('regla de reutilización: no se crean agentes nuevos; documentador es el único rol nuevo', () => {
  assert.match(AGENTS, /reutiliza y mejora los agentes existentes/i);
  assert.match(AGENTS, /documentador/i);
  assert.match(AGENTS, /no crees agentes nuevos|sin crear agentes nuevos/i);
});

test('compuerta de gertrudis: solo lectura, veredicto cerrado y hallazgos con evidencia reproducible', () => {
  assert.match(AGENTS, /gertrudis.*reporta y NO modifica/i);
  for (const verdict of ['APROBADO', 'CAMBIOS NECESARIOS', 'BLOQUEO DE ENTORNO']) {
    assert.ok(AGENTS.includes(verdict), `veredicto ${verdict} presente`);
  }
  assert.match(AGENTS, /archivo:línea/);
  assert.match(AGENTS, /evidencia reproducible/);
  assert.match(AGENTS, /aprobado.*sin evidencia/i);
});

test('revisión condicional por riesgo', () => {
  assert.match(AGENTS, /ODD.*bajo riesgo.*diff.*checks mínimos/i);
  assert.match(AGENTS, /riesgo medio\/alto.*gertrudis/i);
  assert.match(AGENTS, /SDD.*compuertas formales/i);
});

test('flujos por modo: estados SDD, ODD sin OpenSpec y reglas NUNCA', () => {
  assert.match(AGENTS, /pending.*spec_ready.*in_progress.*done/i);
  assert.match(AGENTS, /aprobación humana/);
  assert.match(AGENTS, /nunca.*lances al implementador en.*pending/i);
  assert.match(AGENTS, /odd\/changes\/<id>\/feature\.md/);
  assert.match(AGENTS, /migración propuesta|migración/i);
  assert.match(AGENTS, /no publicar.*sin despacho|sin despacho.*publicar/i);
  assert.match(AGENTS, /anuncia el modo.*primera línea/i);
  assert.match(AGENTS, /un solo ejecutor activo/i);
});

test('el coordinador identifica modo, ID, estado y fase antes de actuar', () => {
  assert.match(AGENTS, /identifica.*modo.*ID.*estado.*fase|identifica.*modo.*fase/i);
  assert.match(AGENTS, /fachada/i);
  assert.match(AGENTS, /no crea plan ni checklist paralelos/);
});