import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  resolveEffectivePhilosophy,
  type EffectivePhilosophyResolution,
  type Philosophy
} from './config';
import {
  resolveOddFeaturePath,
  createFeatureDoc,
  readFeatureDoc,
  hasFeatureDoc,
  checkOddChangeRequirements,
  classifyOddChangeSize,
  FEATURE_SECTIONS
} from './odd-layout';

/**
 * Spec facade: a single, mode-aware interface to initiate, query, validate,
 * complete and close a change. It resolves the effective philosophy
 * (flags > manifest > global > default `sdd`) before routing:
 * - SDD route delegates to the OpenSpec CLI (never re-implements its engine).
 * - ODD route operates on `odd/changes/<id>/feature.md` without OpenSpec.
 *
 * Guarantees a single active executor per change (apply is never re-run once
 * delegated) and apply always executes the existing tasks only: with essential
 * artifacts missing it stops and reports, never calling the planner.
 */
export type FacadeOperation = 'init' | 'status' | 'validate' | 'complete' | 'apply';

export interface FacadeResult {
  ok: boolean;
  mode: Philosophy;
  route: 'sdd' | 'odd';
  operation: FacadeOperation;
  problem?: string;
  details?: string;
  phase?: string;
}

export interface OpenspecRun {
  status: number;
  stdout: string;
  stderr?: string;
}

export interface FacadeDeps {
  resolveMode?: (flags: { odd?: boolean; sdd?: boolean }, projectRoot?: string) => EffectivePhilosophyResolution;
  runOpenSpec?: (args: string[], cwd: string) => OpenspecRun;
  isOpenSpecAvailable?: () => boolean;
  readState?: (path: string) => string | undefined;
  writeState?: (path: string, content: string) => void;
  now?: () => string;
}

export interface FacadeContext {
  projectRoot: string;
  changeId?: string;
  flags?: { odd?: boolean; sdd?: boolean };
  executor?: string;
  resumable?: boolean;
}

interface PhaseState {
  changeId: string;
  phase: string;
  executor: string;
  updatedAt: string;
}

const defaultRunOpenSpec: NonNullable<FacadeDeps['runOpenSpec']> = (args, cwd) => {
  const res = spawnSync('openspec', args, { cwd, encoding: 'utf8' });
  return { status: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
};

const defaultIsOpenSpecAvailable: NonNullable<FacadeDeps['isOpenSpecAvailable']> = () => {
  const res = spawnSync('openspec', ['--help'], { encoding: 'utf8' });
  return !res.error && res.status === 0;
};

const defaultReadState: NonNullable<FacadeDeps['readState']> = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : undefined;

const defaultWriteState: NonNullable<FacadeDeps['writeState']> = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
};

const defaultNow: NonNullable<FacadeDeps['now']> = () => new Date().toISOString();

function facadeStatePath(projectRoot: string): string {
  return join(projectRoot, '.spectralis', 'facade-state.json');
}

function parseState(raw: string | undefined): PhaseState | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PhaseState;
  } catch {
    return undefined;
  }
}

/** Map a facade operation to the delegated OpenSpec CLI call (SDD route). */
function sddArgs(operation: FacadeOperation, changeId?: string): string[] {
  switch (operation) {
    case 'init':
      return ['new', 'change', changeId ?? ''];
    case 'status':
      return ['status', '--change', changeId ?? '', '--json'];
    case 'validate':
      return ['validate', changeId ?? ''];
    case 'complete':
      return ['archive', changeId ?? ''];
    case 'apply':
      return ['instructions', 'apply', '--change', changeId ?? '', '--json'];
  }
}

/** Essential SDD artifacts that apply must find before delegating. */
function missingSddEssentials(projectRoot: string, changeId?: string): string[] {
  if (!changeId) return ['changeId'];
  const base = join(projectRoot, 'openspec', 'changes', changeId);
  const missing: string[] = [];
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) {
    if (!existsSync(join(base, name))) missing.push(name);
  }
  return missing;
}

export function runFacadeOperation(
  operation: FacadeOperation,
  ctx: FacadeContext,
  deps: FacadeDeps = {}
): FacadeResult {
  const projectRoot = ctx.projectRoot;
  const changeId = ctx.changeId;
  const resolveMode = deps.resolveMode ?? ((flags, root) => resolveEffectivePhilosophy(flags, root));
  const mode = resolveMode(ctx.flags ?? {}, projectRoot);
  const route: 'sdd' | 'odd' = mode.value === 'odd' ? 'odd' : 'sdd';
  const runOpenSpec = deps.runOpenSpec ?? defaultRunOpenSpec;
  const isAvailable = deps.isOpenSpecAvailable ?? defaultIsOpenSpecAvailable;
  const readState = deps.readState ?? defaultReadState;
  const writeState = deps.writeState ?? defaultWriteState;
  const now = deps.now ?? defaultNow;
  const statePath = facadeStatePath(projectRoot);

  // Single active executor: apply must never run twice for the same change.
  if (operation === 'apply') {
    const existing = parseState(readState(statePath));
    if (existing && existing.changeId === changeId && existing.phase === 'implementing') {
      return {
        ok: false,
        mode: mode.value,
        route,
        operation,
        problem: `Apply para "${changeId}" ya está delegado a ${existing.executor} (fase ${existing.phase}). Un solo ejecutor activo: no se relanza apply.`
      };
    }
  }

  if (route === 'sdd') {
    if (operation === 'apply') {
      const missing = missingSddEssentials(projectRoot, changeId);
      if (missing.length > 0) {
        return {
          ok: false,
          mode: mode.value,
          route,
          operation,
          phase: 'planning',
          problem: `Artefactos esenciales incompletos (SDD): faltan ${missing.join(', ')}. Apply se detiene y no llama al planificador.`
        };
      }
    }
    if (!isAvailable()) {
      return {
        ok: false,
        mode: mode.value,
        route,
        operation,
        problem:
          'OpenSpec (backend SDD) no está disponible. La fachada informa y se detiene sin validación alternativa.'
      };
    }
    const args = sddArgs(operation, changeId);
    const res = runOpenSpec(args, projectRoot);
    // Only phase-changing operations update the executor state; reads never
    // demote the phase (a status/validate must not re-enable apply).
    if (operation === 'init' || operation === 'apply' || operation === 'complete') {
      const phase = operation === 'apply' ? 'implementing' : operation === 'complete' ? 'complete' : 'active';
      writeState(
        statePath,
        JSON.stringify({ changeId, phase, executor: ctx.executor ?? 'openspec', updatedAt: now() })
      );
    }
    return { ok: res.status === 0, mode: mode.value, route, operation, details: res.stdout, phase: operation === 'apply' ? 'implementing' : operation === 'complete' ? 'complete' : 'active' };
  }

  return runOddOperation(operation, ctx, { statePath, readState, writeState, now });
}

function runOddOperation(
  operation: FacadeOperation,
  ctx: FacadeContext,
  stateDeps: { statePath: string; readState: FacadeDeps['readState']; writeState: FacadeDeps['writeState']; now: FacadeDeps['now'] }
): FacadeResult {
  const { projectRoot, changeId } = ctx;
  if (!changeId) {
    return { ok: false, mode: 'odd', route: 'odd', operation, problem: 'Falta el changeId para la ruta ODD.' };
  }
  const featurePath = resolveOddFeaturePath(projectRoot, changeId);
  const record = (phase: string) =>
    stateDeps.writeState?.(
      stateDeps.statePath,
      JSON.stringify({
        changeId,
        phase,
        executor: ctx.executor ?? 'coordinador',
        updatedAt: stateDeps.now?.() ?? new Date().toISOString()
      })
    );
  switch (operation) {
    case 'init':
      createFeatureDoc(projectRoot, changeId);
      record('active');
      return { ok: true, mode: 'odd', route: 'odd', operation, phase: 'active', details: featurePath };
    case 'status':
      if (!hasFeatureDoc(projectRoot, changeId)) {
        return { ok: false, mode: 'odd', route: 'odd', operation, phase: 'planning', problem: `No existe ${featurePath}.` };
      }
      return {
        ok: true,
        mode: 'odd',
        route: 'odd',
        operation,
        phase: 'active',
        details: readFeatureDoc(projectRoot, changeId) ?? ''
      };
    case 'validate': {
      const content = readFeatureDoc(projectRoot, changeId);
      if (!content) {
        return { ok: false, mode: 'odd', route: 'odd', operation, phase: 'planning', problem: `No existe ${featurePath}; no se puede validar.` };
      }
      const missing = FEATURE_SECTIONS.filter((section) => !new RegExp(`## ${section}`).test(content));
      if (missing.length > 0) {
        return {
          ok: false,
          mode: 'odd',
          route: 'odd',
          operation,
          phase: 'active',
          problem: `feature.md no cumple la plantilla. Faltan secciones: ${missing.join(', ')}.`
        };
      }
      return { ok: true, mode: 'odd', route: 'odd', operation, phase: 'active' };
    }
    case 'complete':
      if (!hasFeatureDoc(projectRoot, changeId)) {
        return { ok: false, mode: 'odd', route: 'odd', operation, phase: 'planning', problem: `No existe ${featurePath}.` };
      }
      record('complete');
      return { ok: true, mode: 'odd', route: 'odd', operation, phase: 'complete' };
    case 'apply': {
      const size = classifyOddChangeSize(ctx.resumable ?? false);
      const req = checkOddChangeRequirements(projectRoot, changeId, size);
      if (!req.ok) {
        return { ok: false, mode: 'odd', route: 'odd', operation, phase: 'planning', problem: req.problem };
      }
      record('implementing');
      return { ok: true, mode: 'odd', route: 'odd', operation, phase: 'implementing', details: featurePath };
    }
  }
}