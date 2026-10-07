import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFacadeOperation, type FacadeDeps } from '../../src/core/spec-facade';

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

interface Stub {
  deps: FacadeDeps;
  calls: string[][];
}

function stub(fn: (args: string[]) => void = () => {}): Stub {
  const calls: string[][] = [];
  const deps: FacadeDeps = {
    runOpenSpec: (args) => {
      calls.push(args);
      fn(args);
      return { status: 0, stdout: 'stub-ok' };
    },
    isOpenSpecAvailable: () => true
  };
  return { deps, calls };
}

test('fachada: modo sdd default, init delega en openspec new change', () => {
  const root = scratch('sp-facade-sdd-');
  const s = stub();
  const res = runFacadeOperation('init', { projectRoot: root, changeId: 'add-x' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(res.mode, 'sdd');
  assert.equal(res.route, 'sdd');
  assert.deepEqual(s.calls[0], ['new', 'change', 'add-x']);
});

test('fachada: status en modo sdd delega en openspec status', () => {
  const root = scratch('sp-facade-status-');
  const s = stub();
  const res = runFacadeOperation('status', { projectRoot: root, changeId: 'add-x' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(res.route, 'sdd');
  assert.deepEqual(s.calls[0], ['status', '--change', 'add-x', '--json']);
  assert.match(res.details ?? '', /stub-ok/);
});

test('fachada: el flag --sdd gana al manifest odd', () => {
  const root = scratch('sp-facade-flag-');
  writeFileSync(
    join(root, '.sdd-manifest.json'),
    JSON.stringify({ philosophy: 'odd' }, null, 2) + '\n'
  );
  const s = stub();
  const res = runFacadeOperation('validate', { projectRoot: root, changeId: 'add-x', flags: { sdd: true } }, s.deps);
  assert.equal(res.mode, 'sdd');
  assert.equal(res.route, 'sdd');
  assert.deepEqual(s.calls[0], ['validate', 'add-x']);
});

test('fachada: openspec ausente en modo sdd informa y se detiene sin validación propia', () => {
  const root = scratch('sp-facade-noos-');
  let called = 0;
  const res = runFacadeOperation(
    'init',
    { projectRoot: root, changeId: 'add-x' },
    {
      isOpenSpecAvailable: () => false,
      runOpenSpec: () => {
        called++;
        return { status: 1, stdout: '' };
      }
    }
  );
  assert.equal(res.ok, false);
  assert.match(res.problem ?? '', /openspec/i);
  assert.equal(called, 0, 'no se invoca openspec ni una validación alternativa');
});

test('fachada: modo odd (manifest), init opera sobre odd/changes/<id>/feature.md sin openspec', () => {
  const root = scratch('sp-facade-odd-init-');
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }) + '\n');
  const s = stub();
  const res = runFacadeOperation('init', { projectRoot: root, changeId: 'add-o' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(res.mode, 'odd');
  assert.equal(res.route, 'odd');
  assert.ok(existsSync(join(root, 'odd', 'changes', 'add-o', 'feature.md')));
  assert.ok(!existsSync(join(root, 'openspec')), 'ODD no crea openspec/');
  assert.equal(s.calls.length, 0, 'no invoca ningún comando de OpenSpec');
});

test('fachada: validación ODD valida feature.md (secciones) sin openspec', () => {
  const root = scratch('sp-facade-odd-val-');
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }) + '\n');
  const s = stub();
  runFacadeOperation('init', { projectRoot: root, changeId: 'add-o' }, s.deps);
  const res = runFacadeOperation('validate', { projectRoot: root, changeId: 'add-o' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(s.calls.length, 0);
});

test('fachada: cierre ODD marca complete sobre feature.md sin llamar a openspec', () => {
  const root = scratch('sp-facade-odd-close-');
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }) + '\n');
  const s = stub();
  runFacadeOperation('init', { projectRoot: root, changeId: 'add-o' }, s.deps);
  const res = runFacadeOperation('complete', { projectRoot: root, changeId: 'add-o' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(res.phase, 'complete');
  assert.ok(existsSync(join(root, 'odd', 'changes', 'add-o', 'feature.md')));
  assert.equal(s.calls.length, 0);
});

function sddChange(root: string, changeId: string): void {
  mkdirSync(join(root, 'openspec', 'changes', changeId), { recursive: true });
  writeFileSync(join(root, 'openspec', 'changes', changeId, 'proposal.md'), '# Proposal\n');
  writeFileSync(join(root, 'openspec', 'changes', changeId, 'design.md'), '# Design\n');
  writeFileSync(join(root, 'openspec', 'changes', changeId, 'tasks.md'), '# Tasks\n- [ ] pendiente\n');
}

test('fachada: apply delegado no se relanza (un solo ejecutor activo)', () => {
  const root = scratch('sp-facade-single-');
  sddChange(root, 'add-p');
  const s = stub();
  const first = runFacadeOperation('apply', { projectRoot: root, changeId: 'add-p', executor: 'openspec' }, s.deps);
  assert.equal(first.ok, true, first.problem);
  assert.equal(s.calls.length, 1);
  const second = runFacadeOperation('apply', { projectRoot: root, changeId: 'add-p', executor: 'coordinador' }, s.deps);
  assert.equal(second.ok, false, 'no se relanza apply tras delegar');
  assert.match(second.problem ?? '', /apply|ejecutor|delegad/i);
  assert.equal(s.calls.length, 1, 'no se ejecuta una segunda ruta en paralelo');
});

test('fachada: apply SDD con artefactos esenciales incompletos se detiene sin llamar al planificador', () => {
  const root = scratch('sp-facade-incomplete-');
  mkdirSync(join(root, 'openspec', 'changes', 'add-ic'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'changes', 'add-ic', 'proposal.md'), '# Proposal\n');
  // tasks.md intentionally missing
  let calls = 0;
  const res = runFacadeOperation(
    'apply',
    { projectRoot: root, changeId: 'add-ic', executor: 'coordinador' },
    {
      isOpenSpecAvailable: () => true,
      runOpenSpec: () => {
        calls++;
        return { status: 0, stdout: 'planner' };
      }
    }
  );
  assert.equal(res.ok, false);
  assert.match(res.problem ?? '', /tasks\.md/);
  assert.equal(calls, 0, 'no se llama al planificador ni a openspec');
});

test('fachada: apply ODD sustancial sin feature.md se detiene e informa', () => {
  const root = scratch('sp-facade-odd-apply-');
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }) + '\n');
  const s = stub();
  const res = runFacadeOperation('apply', { projectRoot: root, changeId: 'add-nofeat', resumable: false }, s.deps);
  assert.equal(res.ok, false);
  assert.match(res.problem ?? '', /feature\.md/);
  assert.equal(s.calls.length, 0, 'sin openspec en la ruta ODD');
});

test('fachada: apply ODD pequeño (retomable) sin feature.md procede', () => {
  const root = scratch('sp-facade-odd-apply-small-');
  writeFileSync(join(root, '.sdd-manifest.json'), JSON.stringify({ philosophy: 'odd' }) + '\n');
  const s = stub();
  const res = runFacadeOperation('apply', { projectRoot: root, changeId: 'add-small', resumable: true }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(s.calls.length, 0);
});