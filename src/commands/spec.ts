import { resolve } from 'node:path';
import { createSpecFolder, validateSpecComplete, registerSpec } from '../core/spec-workflow';
import { runDistill } from './distill';
import { readGlobalConfig, resolveProjectRoot, resolveEffectivePhilosophy } from '../core/config';
import { runSpecCreate, type SpecCreateOptions } from './spec-create';
import { runSpecMigrate, type SpecMigrateOptions } from './spec-migrate';
import { runSpecArchive, type SpecArchiveOptions } from './spec-archive';

export interface SpecInitOptions {
  project: string;
  specId: string;
  vaultRoot?: string;
  projectRoot?: string;
}

export interface SpecCompleteOptions {
  project: string;
  specId: string;
  vaultRoot?: string;
  projectRoot?: string;
}

function resolveVault(opts: { vaultRoot?: string }): string {
  if (opts.vaultRoot) return resolve(opts.vaultRoot);
  const config = readGlobalConfig();
  return config.vault_root || process.cwd();
}

export async function runSpecInit(opts: SpecInitOptions): Promise<number> {
  const vaultRoot = resolveVault(opts);

  const projectRoot = resolveProjectRoot(opts.project, { projectRoot: opts.projectRoot }) ?? undefined;
  const philosophy = resolveEffectivePhilosophy(projectRoot);
  if (philosophy.warning) console.error(`[WARN] ${philosophy.warning}`);
  console.log(`  philosophy: ${philosophy.value} [${philosophy.origin}]`);

  try {
    const res = createSpecFolder(vaultRoot, opts.project, opts.specId);
    console.log(`[OK] Spec folder created: ${res.specDir}`);
    console.log(`  - ${opts.specId}.md (folder note, Tipo: Especificación)`);
    console.log(`\nNext: fill the sections, then run spectralis spec complete ${opts.project} ${opts.specId}`);
    return 0;
  } catch (err: unknown) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

export async function runSpecComplete(opts: SpecCompleteOptions): Promise<number> {
  const vaultRoot = resolveVault(opts);
  const projectRoot = resolveProjectRoot(opts.project, { projectRoot: opts.projectRoot }) ?? process.cwd();

  const validation = validateSpecComplete(vaultRoot, opts.project, opts.specId);
  if (!validation.valid) {
    console.error(`[ERROR] Cannot complete spec. Empty files: ${validation.emptyFiles.join(', ')}`);
    console.error('Fill the files before running spec complete.');
    return 1;
  }

  registerSpec(projectRoot, opts.specId, opts.project);
  console.log(`[OK] Registered in REGISTRY.md: ${opts.specId}`);

  const distillCode = await runDistill({ project: opts.project, dryRun: false });
  if (distillCode !== 0) {
    console.error('[WARN] Distillation failed, but spec is registered.');
    return distillCode;
  }

  console.log(`[OK] Spec completed and distilled: ${opts.project}/${opts.specId}`);
  return 0;
}

/** Actions accepted by `spectralis spec <action>`. */
export const SPEC_ACTIONS = ['init', 'complete', 'create', 'migrate', 'archive'] as const;

export type SpecAction = (typeof SPEC_ACTIONS)[number];

/** Options shared by every action of the `spec` command group. */
export interface SpecCommandOptions {
  vaultRoot?: string;
  projectRoot?: string;
  /** Human readable name of the change (`spec create`). */
  nombre?: string;
  /** Archive even when tasks are pending (`spec archive`). */
  force?: boolean;
  /** Report the plan without writing anything (`spec migrate`). */
  dryRun?: boolean;
  /** Wiki folder of the brain summary (`spec archive`). */
  wikiProject?: string;
}

/** Handlers the dispatcher delegates to (injectable for the parse matrix). */
export interface SpecCommandHandlers {
  init: (opts: SpecInitOptions) => Promise<number>;
  complete: (opts: SpecCompleteOptions) => Promise<number>;
  create: (opts: SpecCreateOptions) => Promise<number>;
  migrate: (opts: SpecMigrateOptions) => Promise<number>;
  archive: (opts: SpecArchiveOptions) => Promise<number>;
}

const defaultHandlers: SpecCommandHandlers = {
  init: runSpecInit,
  complete: runSpecComplete,
  create: runSpecCreate,
  migrate: runSpecMigrate,
  archive: runSpecArchive
};

function usageError(action: string, expected: string): number {
  console.error(`[ERROR] Missing arguments. Usage: spectralis spec ${action} ${expected}`);
  return 1;
}

/**
 * Dispatch of `spectralis spec <action> [project] [specId]`.
 *
 * The action decides which arguments are required: `init` and `complete` need
 * a project and a spec id, `create` and `archive` need a change id and
 * `migrate` needs none. A missing argument is a usage error (exit code 1) and
 * an unknown action lists the valid ones.
 */
export async function runSpecCommand(
  action: string,
  positionals: string[],
  opts: SpecCommandOptions = {},
  handlers: SpecCommandHandlers = defaultHandlers
): Promise<number> {
  const [first, second] = positionals;
  switch (action) {
    case 'init': {
      if (!first || !second) return usageError('init', '<project> <specId>');
      return handlers.init({
        project: first,
        specId: second,
        vaultRoot: opts.vaultRoot,
        projectRoot: opts.projectRoot
      });
    }
    case 'complete': {
      if (!first || !second) return usageError('complete', '<project> <specId>');
      return handlers.complete({
        project: first,
        specId: second,
        vaultRoot: opts.vaultRoot,
        projectRoot: opts.projectRoot
      });
    }
    case 'create': {
      if (!first) return usageError('create', '<change-id> [--nombre <text>]');
      return handlers.create({
        changeId: first,
        nombre: opts.nombre,
        projectRoot: opts.projectRoot
      });
    }
    case 'migrate': {
      return handlers.migrate({
        projectRoot: opts.projectRoot,
        dryRun: opts.dryRun
      });
    }
    case 'archive': {
      if (!first) return usageError('archive', '<change-id> [--force]');
      return handlers.archive({
        changeId: first,
        projectRoot: opts.projectRoot,
        vaultRoot: opts.vaultRoot,
        force: opts.force,
        wikiProject: opts.wikiProject
      });
    }
    default: {
      console.error(`[ERROR] Unknown action: ${action}. Valid actions: ${SPEC_ACTIONS.join(', ')}.`);
      return 1;
    }
  }
}
