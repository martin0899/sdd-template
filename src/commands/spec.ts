import { resolve } from 'node:path';
import { createSpecFolder, validateSpecComplete, registerSpec } from '../core/spec-workflow';
import { runDistill } from './distill';
import { readGlobalConfig } from '../core/config';

export interface SpecInitOptions {
  project: string;
  specId: string;
  vaultRoot?: string;
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
  try {
    const dir = createSpecFolder(vaultRoot, opts.project, opts.specId);
    console.log(`[OK] Spec folder created: ${dir}`);
    console.log('  - briefing.md');
    console.log('  - tests.md');
    console.log('  - resumen.md');
    console.log(`\nNext: fill the files, then run spectralis spec complete ${opts.project} ${opts.specId}`);
    return 0;
  } catch (err: unknown) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

export async function runSpecComplete(opts: SpecCompleteOptions): Promise<number> {
  const vaultRoot = resolveVault(opts);
  const config = readGlobalConfig();
  const projectRoot = opts.projectRoot ? resolve(opts.projectRoot) : (config.vault_root ? resolve(config.vault_root, '..') : process.cwd());

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
