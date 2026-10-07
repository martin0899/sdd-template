import { resolve } from 'node:path';
import { createSpecFolder, validateSpecComplete, registerSpec } from '../core/spec-workflow';
import { runDistill } from './distill';
import { readGlobalConfig, resolveProjectRoot, resolveEffectivePhilosophy } from '../core/config';

export interface SpecInitOptions {
  project: string;
  specId: string;
  vaultRoot?: string;
  projectRoot?: string;
  odd?: boolean;
  sdd?: boolean;
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

  let philosophy;
  try {
    const projectRoot = resolveProjectRoot(opts.project, { projectRoot: opts.projectRoot }) ?? undefined;
    philosophy = resolveEffectivePhilosophy({ odd: opts.odd, sdd: opts.sdd }, projectRoot);
  } catch (err: unknown) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
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
