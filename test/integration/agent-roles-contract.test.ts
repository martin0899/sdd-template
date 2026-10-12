import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const AGENTS = readFileSync(join(REPO, 'AGENTS.md'), 'utf8');
// The role contract moved out of AGENTS.md (minimal router) into a dedicated skill.
const CONTRACT = readFileSync(join(REPO, '.agents', 'skills', 'subagent-contract', 'SKILL.md'), 'utf8');

test('AGENTS.md routes to the subagent-contract skill', () => {
  assert.match(AGENTS, /## Contrato de roles/);
  assert.match(AGENTS, /subagent-contract/);
});

test('contrato de roles: entradas y salidas de coordinador, planificador, implementador y revisor (gertrudis)', () => {
  assert.match(CONTRACT, /## Contrato de roles/);
  for (const role of ['coordinador', 'planificador', 'implementador']) {
    assert.match(CONTRACT, new RegExp(`\\*\\*${role}\\*\\*.*consume`, 'i'), `${role} declara entradas`);
  }
  assert.match(CONTRACT, /revisor.*gertrudis.*consume.*modo.*ID.*diff.*riesgo/i);
  assert.match(CONTRACT, /produce.*clasificación.*enrutado.*fase|clasificación.*enrutado.*fase/i);
});

test('regla de reutilización: no se crean agentes nuevos; documentador es el único rol nuevo', () => {
  assert.match(CONTRACT, /reutiliza y mejora los agentes existentes/i);
  assert.match(CONTRACT, /documentador/i);
  assert.match(CONTRACT, /no crees agentes nuevos|sin crear agentes nuevos/i);
});

test('compuerta de gertrudis: solo lectura, veredicto cerrado y hallazgos con evidencia reproducible', () => {
  assert.match(CONTRACT, /gertrudis.*reporta y NO modifica/i);
  for (const verdict of ['APROBADO', 'CAMBIOS NECESARIOS', 'BLOQUEO DE ENTORNO']) {
    assert.ok(CONTRACT.includes(verdict), `veredicto ${verdict} presente`);
  }
  assert.match(CONTRACT, /archivo:línea/);
  assert.match(CONTRACT, /evidencia reproducible/);
  assert.match(CONTRACT, /aprobado.*sin evidencia/i);
});

test('revisión condicional por riesgo', () => {
  assert.match(CONTRACT, /ODD.*bajo riesgo.*diff.*checks mínimos/i);
  assert.match(CONTRACT, /riesgo medio\/alto.*gertrudis/i);
  assert.match(CONTRACT, /SDD.*compuertas formales/i);
});

test('flujos por modo: estados SDD, ODD sin OpenSpec y reglas NUNCA', () => {
  assert.match(CONTRACT, /pending.*spec_ready.*in_progress.*done/i);
  assert.match(CONTRACT, /aprobación humana/);
  assert.match(CONTRACT, /nunca.*lances al implementador en.*pending/i);
  assert.match(CONTRACT, /odd\/changes\/<id>\/feature\.md/);
  assert.match(CONTRACT, /migración propuesta|migración/i);
  assert.match(CONTRACT, /no publicar.*sin despacho|sin despacho.*publicar/i);
  assert.match(CONTRACT, /anuncia el modo.*primera línea/i);
  assert.match(CONTRACT, /un solo ejecutor activo/i);
});

test('el coordinador identifica modo, ID, estado y fase antes de actuar', () => {
  assert.match(CONTRACT, /identifica.*modo.*ID.*estado.*fase|identifica.*modo.*fase/i);
  assert.match(CONTRACT, /fachada/i);
  assert.match(CONTRACT, /no crea plan ni checklist paralelos/);
});
