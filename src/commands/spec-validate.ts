import { resolveTargetProjectRoot } from '../core/config';
import { resolveChangesDir } from '../core/resolve-changes-dir';
import { missingSddEssentials } from '../core/sdd-essentials';

export interface SpecValidateOptions {
  /** Id of the change to validate. */
  changeId: string;
  /** Project root (default: the project of the current directory). */
  projectRoot?: string;
  /** Explicit changes directory (wins over the configuration). */
  specDir?: string;
}

/**
 * `spectralis spec validate <changeId>`: validation of the artifacts of a
 * native change.
 *
 * The check reuses `missingSddEssentials` (the same contract the workflow
 * applies before implementing a change) with the resolved directory of the
 * change: only the *presence* of the artifacts is validated, never their
 * content.
 */
export async function runSpecValidate(opts: SpecValidateOptions): Promise<number> {
  const projectRoot = resolveTargetProjectRoot(opts.projectRoot);
  const changesDir = resolveChangesDir({ projectRoot, specDir: opts.specDir });
  const missing = missingSddEssentials(projectRoot, opts.changeId, changesDir);

  if (missing.length > 0) {
    console.error(`[ERROR] change ${opts.changeId} is missing: ${missing.join(', ')}`);
    return 1;
  }

  console.log(`[OK] change ${opts.changeId} is valid`);
  return 0;
}
