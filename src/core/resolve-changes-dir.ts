import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { readGlobalConfig, type SpectralisConfig } from './config';

/**
 * Default location of the SDD changes inside a project.
 *
 * The native layout of the harness is `spec/<id>/`: it is the default. Projects
 * that keep the historical layout declare `spec_dir: openspec/changes` in their
 * configuration (manifest or global config) and the cascade resolves it without
 * any code change.
 */
export const DEFAULT_CHANGES_DIR = 'spec';

export interface ResolveChangesDirOptions {
  /** Root of the project the changes belong to. */
  projectRoot: string;
  /** Explicit override (command flag). It wins over every configuration source. */
  specDir?: string;
  /**
   * Global configuration to read. When omitted the global config file is read
   * from disk; injecting it keeps the resolver deterministic in tests.
   */
  config?: Partial<SpectralisConfig>;
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

/** Reads `spec_dir` from the project manifest (tolerant: never throws). */
function readManifestSpecDir(projectRoot: string): string | undefined {
  const manifestPath = join(projectRoot, '.sdd-manifest.json');
  if (!existsSync(manifestPath)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    return firstNonEmpty(manifest.spec_dir, manifest['spec-dir']);
  } catch {
    return undefined;
  }
}

export interface SpecDirResolution {
  /** Raw configured value ('' when nothing is configured). */
  value: string;
  origin: 'option' | 'manifest' | 'config' | 'default';
}

/**
 * Resolves the *raw* `spec_dir` value and its origin, following the same
 * cascade as {@link resolveChangesDir} but without turning it into a path.
 */
export function resolveSpecDir(opts: ResolveChangesDirOptions): SpecDirResolution {
  const projectRoot = resolve(opts.projectRoot);
  const globalConfig = opts.config ?? readGlobalConfig();
  const candidates: Array<{ value: string | undefined; origin: SpecDirResolution['origin'] }> = [
    { value: opts.specDir, origin: 'option' },
    { value: readManifestSpecDir(projectRoot), origin: 'manifest' },
    {
      value: firstNonEmpty(
        globalConfig.spec_dir,
        (globalConfig as Record<string, unknown>)['spec-dir']
      ),
      origin: 'config'
    }
  ];
  for (const candidate of candidates) {
    if (typeof candidate.value === 'string' && candidate.value.trim() !== '') {
      return { value: candidate.value, origin: candidate.origin };
    }
  }
  return { value: '', origin: 'default' };
}

/**
 * Resolves the directory that holds the SDD changes of a project.
 *
 * Cascade (deterministic, first hit wins):
 * 1. `opts.specDir` (explicit value coming from a command flag).
 * 2. `spec_dir` in the project manifest (`.sdd-manifest.json`).
 * 3. `spec_dir` in the global configuration.
 * 4. Default: `<projectRoot>/spec`.
 *
 * Relative values are resolved against `projectRoot`; absolute values are used
 * as-is. The result is always an absolute, normalized path.
 *
 * There is a single changes directory per project: the dual-read window is
 * retired. A project that still keeps its changes in the historical layout
 * declares it with `spec_dir`; migrating it is the job of
 * `spectralis spec migrate`.
 */
export function resolveChangesDir(opts: ResolveChangesDirOptions): string {
  const projectRoot = resolve(opts.projectRoot);
  const { value } = resolveSpecDir(opts);
  if (value === '') return join(projectRoot, DEFAULT_CHANGES_DIR);
  return isAbsolute(value) ? resolve(value) : resolve(projectRoot, value);
}
