import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
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

test('fachada: manifiesto legado resuelve sdd, delega en openspec y no reescribe el manifiesto', () => {
  const root = scratch('sp-facade-legacy-');
  const manifestPath = join(root, '.sdd-manifest.json');
  const raw = JSON.stringify({ philosophy: 'odd' }, null, 2) + '\n';
  writeFileSync(manifestPath, raw, 'utf8');
  const s = stub();
  const res = runFacadeOperation('validate', { projectRoot: root, changeId: 'add-x' }, s.deps);
  assert.equal(res.ok, true, res.problem);
  assert.equal(res.mode, 'sdd');
  assert.equal(res.route, 'sdd');
  assert.deepEqual(s.calls[0], ['validate', 'add-x']);
  assert.equal(readFileSync(manifestPath, 'utf8'), raw, 'el manifiesto no se reescribe');
});

test('fachada: la ruta es siempre sdd y no existe una ruta legacy', () => {
  const root = scratch('sp-facade-sdd-only-');
  const s = stub();
  const res = runFacadeOperation('init', { projectRoot: root, changeId: 'add-x' }, s.deps);
  // El tipo de `route` es el literal 'sdd': no admite ningun otro modo.
  const route: 'sdd' = res.route;
  assert.equal(route, 'sdd');
  assert.ok(!existsSync(join(root, 'odd')), 'la fachada no crea artefactos legacy');
  assert.equal(s.calls.length, 1);
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
