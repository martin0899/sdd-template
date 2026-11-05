import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readGlobalConfig, type SpecEngine, type SpectralisConfig } from './config';

export type { SpecEngine } from './config';

/**
 * Engine of the spec workflow, resolved with a deterministic cascade.
 *
 * The engine only decides two things: how the external OpenSpec CLI is
 * *labelled* (required vs optional) and whether it is *probed* at all. The
 * native paths of the harness never spawn it.
 */

/** Engine used when neither the manifest nor the config declare one. */
export const DEFAULT_ENGINE: SpecEngine = 'native';

export interface ResolveEngineOptions {
  /** Root of the project the engine belongs to. */
  projectRoot: string;
  /**
   * Global configuration to read. When omitted the global config file is read
   * from disk; injecting it keeps the resolver deterministic in tests.
   */
  config?: Partial<SpectralisConfig>;
}

export interface EngineResolution {
  /** Resolved engine. */
  value: SpecEngine;
  /** Source of the resolution. */
  origin: 'manifest' | 'config' | 'default';
}

/** The engines the harness understands. */
export const SPEC_ENGINES: readonly SpecEngine[] = ['openspec', 'native'];

/** Whether a value is one of the supported engines. */
export function isSpecEngine(value: unknown): value is SpecEngine {
  return value === 'openspec' || value === 'native';
}

function isConfigured(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/** Reads `engine` from the project manifest (tolerant: never throws). */
function readManifestEngine(projectRoot: string): unknown {
  const manifestPath = join(projectRoot, '.sdd-manifest.json');
  if (!existsSync(manifestPath)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    return manifest.engine;
  } catch {
    return undefined;
  }
}

function invalidEngineMessage(value: unknown, origin: 'manifest' | 'config'): string {
  return `invalid engine "${String(value)}" in the ${origin}: expected "openspec" or "native"`;
}

/**
 * Resolves the engine of a project.
 *
 * Cascade (deterministic, first hit wins):
 * 1. `engine` in the project manifest (`.sdd-manifest.json`).
 * 2. `engine` in the global configuration.
 * 3. Default: `native`.
 *
 * An unknown value is an error: the resolution fails with a descriptive
 * message instead of silently falling back to a different engine.
 */
export function resolveEngine(opts: ResolveEngineOptions): EngineResolution {
  const projectRoot = resolve(opts.projectRoot);
  const globalConfig = opts.config ?? readGlobalConfig();

  const manifestValue = readManifestEngine(projectRoot);
  if (isConfigured(manifestValue)) {
    if (!isSpecEngine(manifestValue)) throw new Error(invalidEngineMessage(manifestValue, 'manifest'));
    return { value: manifestValue, origin: 'manifest' };
  }

  const configValue = globalConfig.engine;
  if (isConfigured(configValue)) {
    if (!isSpecEngine(configValue)) throw new Error(invalidEngineMessage(configValue, 'config'));
    return { value: configValue, origin: 'config' };
  }

  return { value: DEFAULT_ENGINE, origin: 'default' };
}
