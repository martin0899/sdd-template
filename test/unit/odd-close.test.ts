import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectOddClose,
  makeDocumenterRequest,
  documentadorPrepara,
  closeOddChange
} from '../../src/core/odd-close';
import { DOCUMENTER_REQUIRED_FIELDS, type DocumenterRequest } from '../../src/core/documenter-request';

const COMPLETE: DocumenterRequest = {
  mode: 'odd',
  changeId: 'add-odd-close',
  affectedPaths: ['odd/changes/add-odd-close/feature.md'],
  testEvidence: 'npm test: 12 pass, 0 fail',
  risk: 'medium',
  pending: []
};

test('detectOddClose: modo odd con pruebas en verde detecta cierre', () => {
  const det = detectOddClose({ mode: 'odd', tests: { ok: true, summary: '12/12' } });
  assert.equal(det.isClose, true);
});

test('detectOddClose: sin pruebas no detecta cierre y lo reporta', () => {
  const det = detectOddClose({ mode: 'odd', tests: undefined });
  assert.equal(det.isClose, false);
  assert.match(det.problem ?? '', /evidencia|pruebas/i);
});

test('detectOddClose: pruebas fallidas no detectan cierre', () => {
  const det = detectOddClose({ mode: 'odd', tests: { ok: false, summary: '2 fail' } });
  assert.equal(det.isClose, false);
  assert.match(det.problem ?? '', /fallid|pruebas/i);
});

test('detectOddClose: el cierre ODD solo aplica en modo odd', () => {
  const det = detectOddClose({ mode: 'sdd', tests: { ok: true } });
  assert.equal(det.isClose, false);
});

test('makeDocumenterRequest: solicitud completa es aceptada y estructurada', () => {
  const res = makeDocumenterRequest(COMPLETE);
  assert.equal(res.ok, true);
  assert.equal(res.request?.changeId, 'add-odd-close');
  assert.deepEqual(res.request?.affectedPaths, COMPLETE.affectedPaths);
  assert.equal(res.request?.testEvidence, 'npm test: 12 pass, 0 fail');
});

test('makeDocumenterRequest: solicitud incompleta se rechaza con campos faltantes (no ad-hoc)', () => {
  const res = makeDocumenterRequest({
    mode: 'odd',
    changeId: 'add-y',
    affectedPaths: ['a.md'],
    risk: 'low'
  } as Partial<DocumenterRequest>);
  assert.equal(res.ok, false);
  assert.ok((res.missing ?? []).length > 0);
  for (const field of res.missing ?? []) {
    assert.ok(DOCUMENTER_REQUIRED_FIELDS.includes(field), `${field} es un campo del contrato`);
  }
});

test('documentadorPrepara: prepara contenido sin escribir en 05_wiki/', () => {
  const prepared = documentadorPrepara(COMPLETE);
  assert.ok(prepared.content.includes('add-odd-close'));
  assert.ok(typeof prepared.content === 'string');
  // pure: no invocation of any publish/distill here (no dependency)
});

test('closeOddChange: con confirmación publica (Spectralis) y el documentador solo prepara', async () => {
  const calls: string[] = [];
  const publish = async (request: DocumenterRequest) => {
    calls.push('publish:' + request.changeId);
    return { shipped: true };
  };
  const resolver = (request: DocumenterRequest) => ({
    content: `preparado: ${request.changeId}`,
    pending: undefined
  });
  const res = await closeOddChange(
    {
      mode: 'odd',
      tests: { ok: true },
      changeId: 'add-odd-close',
      affectedPaths: COMPLETE.affectedPaths,
      testEvidence: COMPLETE.testEvidence,
      risk: 'medium',
      pending: []
    },
    { confirmed: true, publish, documentadorResolver: resolver }
  );
  assert.equal(res.status, 'published');
  assert.deepEqual(calls, ['publish:add-odd-close']);
});

test('closeOddChange: sin confirmación no publica y presenta propuesta', async () => {
  let published = 0;
  const res = await closeOddChange(
    {
      mode: 'odd',
      tests: { ok: true },
      changeId: 'add-prop',
      affectedPaths: ['odd/changes/add-prop/feature.md'],
      testEvidence: 'ok',
      risk: 'low',
      pending: []
    },
    {
      confirmed: false,
      publish: async () => {
        published++;
        return { shipped: true };
      }
    }
  );
  assert.equal(res.status, 'proposed');
  assert.ok(res.proposal && res.proposal.length > 0);
  assert.equal(published, 0, 'sin confirmación no se publica');
});

test('closeOddChange: documentador sin perfil devuelve pendiente y no bloquea en silencio', async () => {
  let published = 0;
  const res = await closeOddChange(
    {
      mode: 'odd',
      tests: { ok: true },
      changeId: 'add-pend',
      affectedPaths: ['odd/changes/add-pend/feature.md'],
      testEvidence: 'ok',
      risk: 'high',
      pending: []
    },
    {
      confirmed: true,
      documentadorResolver: () => ({ content: '', pending: 'Sin perfil adecuado (documentador-local no disponible).' }),
      publish: async () => {
        published++;
        return { shipped: true };
      }
    }
  );
  assert.equal(res.status, 'pending');
  assert.match(res.problem ?? '', /perfil/i);
  assert.equal(published, 0);
});

test('closeOddChange: sin pruebas en verde no migra y lo reporta', async () => {
  let published = 0;
  const res = await closeOddChange(
    {
      mode: 'odd',
      tests: { ok: false, summary: '1 fail' },
      changeId: 'add-nogreen',
      affectedPaths: ['odd/changes/add-nogreen/feature.md'],
      testEvidence: 'falla: test 4',
      risk: 'medium',
      pending: []
    },
    {
      confirmed: true,
      publish: async () => {
        published++;
        return { shipped: true };
      }
    }
  );
  assert.equal(res.status, 'blocked');
  assert.equal(res.proposal, undefined, 'sin pruebas en verde no se propone migración');
  assert.equal(published, 0);
  assert.match(res.problem ?? '', /pruebas|evidencia/i);
});