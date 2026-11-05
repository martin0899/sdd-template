import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';

export interface RouteConfig {
  vault_root: string;
  templates_dir: string;
  requirements_dir: string;
  projects_dir: string;
  resources_dir: string;
}

/**
 * The only supported philosophy. SDD is the single mode of the harness; any
 * other stored value is tolerated on read (never written, never rewritten).
 */
export type Philosophy = 'sdd';

export interface SpectralisConfig extends RouteConfig {
  projects_base: string;
  autoUpdate: boolean;
  obsidianSync: 0 | 1;
  philosophy: Philosophy;
  current_project_root: string;
  /**
   * Directory that holds the SDD changes. Empty means "not configured": the
   * resolver falls back to `<projectRoot>/openspec/changes`.
   */
  spec_dir?: string;
}

const DEFAULT_CONFIG: SpectralisConfig = {
  projects_base: join(homedir(), 'Documentos', 'Proyectos'),
  vault_root: '',
  templates_dir: '',
  requirements_dir: '',
  projects_dir: '',
  resources_dir: '',
  autoUpdate: false,
  obsidianSync: 0,
  philosophy: 'sdd',
  current_project_root: '',
  spec_dir: ''
};

function globalConfigDir(): string {
  return join(homedir(), '.config', 'spectralis');
}

export function globalConfigPath(): string {
  return join(globalConfigDir(), 'config.json');
}

export function readGlobalConfig(): SpectralisConfig {
  const path = globalConfigPath();
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return {
      projects_base: raw.projects_base ?? DEFAULT_CONFIG.projects_base,
      vault_root: raw.vault_root ?? '',
      templates_dir: raw.templates_dir ?? '',
      requirements_dir: raw.requirements_dir ?? '',
      projects_dir: raw.projects_dir ?? '',
      resources_dir: raw.resources_dir ?? '',
      autoUpdate: raw.autoUpdate ?? false,
      obsidianSync: raw.obsidianSync === 1 ? 1 : 0,
      philosophy: 'sdd',
      current_project_root: raw.current_project_root ?? '',
      // Tolerant read: the hyphenated spelling is accepted as an alias so a
      // config written by hand with `spec-dir` still resolves.
      spec_dir: raw.spec_dir ?? raw['spec-dir'] ?? ''
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeGlobalConfig(config: SpectralisConfig): void {
  const dir = globalConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(globalConfigPath(), JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function resolveRoute(key: keyof RouteConfig, projectRoot?: string): string {
  if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest[key]) return manifest[key];
      } catch {}
    }
  }
  const config = readGlobalConfig();
  return config[key] || '';
}

export function setRoute(key: keyof RouteConfig, value: string, global: boolean, projectRoot?: string): void {
  if (global) {
    const config = readGlobalConfig();
    config[key] = value;
    writeGlobalConfig(config);
  } else if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
    manifest[key] = value;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }
}

/**
 * Stores the directory that holds the SDD changes.
 *
 * The value is stored verbatim (a relative path stays relative): the resolver
 * resolves it against the project root, so the same value keeps working when
 * the project moves.
 */
export function setSpecDir(value: string, global: boolean, projectRoot?: string): void {
  if (global) {
    const config = readGlobalConfig();
    config.spec_dir = value;
    writeGlobalConfig(config);
  } else if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
    manifest.spec_dir = value;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }
}

export function detectVaultRoot(startDir?: string): string | null {
  let dir = startDir || process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.obsidian')) || existsSync(join(dir, '09_Plantilla'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

export const RESOURCES_REL = join('03_Recursos', '02_Sistemas_info');

export interface NotesDirResolution {
  dir: string;
  origin: 'config' | 'manifest' | 'vault' | 'info';
}

/**
 * Resolve the notes/manuals directory for a project with a deterministic cascade:
 * 1. resources_dir in the project manifest (.sdd-manifest.json)
 * 2. resources_dir in the global config
 * 3. detected Obsidian vault -> <vault>/03_Recursos/02_Sistemas_info
 * 4. fallback <projectRoot>/info (last resort)
 */
export function resolveNotesDir(projectRoot?: string): NotesDirResolution {
  if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.resources_dir) return { dir: manifest.resources_dir, origin: 'manifest' };
      } catch {}
    }
  }
  const config = readGlobalConfig();
  if (config.resources_dir) return { dir: config.resources_dir, origin: 'config' };

  const vault = detectVaultRoot(projectRoot || process.cwd());
  if (vault) return { dir: join(vault, RESOURCES_REL), origin: 'vault' };

  const root = projectRoot || process.cwd();
  return { dir: join(root, 'info'), origin: 'info' };
}

export interface ObsidianSyncResolution {
  value: 0 | 1;
  origin: 'manifest' | 'config' | 'default';
}

/**
 * Resolve the obsidian orchestration switch for a project:
 * 1. obsidianSync in the project manifest (.sdd-manifest.json)
 * 2. obsidianSync in the global config
 * 3. default 0 (off)
 */
export function resolveObsidianSync(projectRoot?: string): ObsidianSyncResolution {
  if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.obsidianSync === 1 || manifest.obsidianSync === 0) {
          return { value: manifest.obsidianSync === 1 ? 1 : 0, origin: 'manifest' };
        }
      } catch {}
    }
  }
  const config = readGlobalConfig();
  return { value: config.obsidianSync, origin: config.obsidianSync === 1 ? 'config' : 'default' };
}

export function setObsidianSync(value: 0 | 1, global: boolean, projectRoot?: string): void {
  if (global) {
    const config: SpectralisConfig = readGlobalConfig();
    config.obsidianSync = value;
    writeGlobalConfig(config);
  } else if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
    manifest.obsidianSync = value;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }
}

export interface PhilosophyResolution {
  value: Philosophy;
  origin: 'manifest' | 'global' | 'default';
  warning?: string;
}

function isPhilosophy(value: unknown): value is Philosophy {
  return value === 'sdd';
}

/** Raw content of the global config file, or undefined when it is absent/unreadable. */
function readRawGlobalConfig(): Record<string, unknown> | undefined {
  const rawPath = globalConfigPath();
  if (!existsSync(rawPath)) return undefined;
  try {
    return JSON.parse(readFileSync(rawPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the working philosophy for a project:
 * 1. philosophy in the project manifest (.sdd-manifest.json)
 * 2. philosophy in the global config
 * 3. default 'sdd' (backwards compatible)
 *
 * SDD is the only philosophy. Any other stored value (a legacy one included)
 * is ignored (tolerant read): it falls back to 'sdd' with a readable warning
 * and the file on disk is never rewritten.
 */
export function resolvePhilosophy(projectRoot?: string): PhilosophyResolution {
  if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (manifest.philosophy !== undefined) {
          if (isPhilosophy(manifest.philosophy)) {
            return { value: manifest.philosophy, origin: 'manifest' };
          }
          return {
            value: 'sdd',
            origin: 'default',
            warning: `Valor de philosophy no soportado en el manifiesto: "${String(manifest.philosophy)}". Se usa el default "sdd".`
          };
        }
      } catch {}
    }
  }
  const raw = readRawGlobalConfig();
  if (raw && raw.philosophy !== undefined) {
    if (isPhilosophy(raw.philosophy)) {
      return { value: raw.philosophy, origin: 'global' };
    }
    return {
      value: 'sdd',
      origin: 'default',
      warning: `Valor de philosophy no soportado en la configuración global: "${String(raw.philosophy)}". Se usa el default "sdd".`
    };
  }
  return { value: 'sdd', origin: 'default' };
}

export function setPhilosophy(value: Philosophy, global: boolean, projectRoot?: string): void {
  if (global) {
    const config = readGlobalConfig();
    config.philosophy = value;
    writeGlobalConfig(config);
  } else if (projectRoot) {
    const manifestPath = join(projectRoot, '.sdd-manifest.json');
    const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
    manifest.philosophy = value;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }
}

export interface EffectivePhilosophyResolution {
  value: Philosophy;
  origin: 'manifest' | 'global' | 'default';
  warning?: string;
}

/**
 * Resolve the effective philosophy for a command run.
 *
 * There are no mode flags anymore: SDD is the only mode, so the cascade is
 * the same deterministic one of `resolvePhilosophy` (manifest > global >
 * default 'sdd'). Kept as the entry point used by the commands and the facade.
 */
export function resolveEffectivePhilosophy(projectRoot?: string): EffectivePhilosophyResolution {
  return resolvePhilosophy(projectRoot);
}

export function detectProjectFromCwd(cwd: string): { project: string; root: string } | null {
  if (existsSync(join(cwd, '.sdd-manifest.json')) || existsSync(join(cwd, 'openspec'))) {
    return { project: cwd.split('/').pop() ?? '', root: cwd };
  }
  return null;
}

export function resolveProjectRoot(
  project: string,
  opts: { projectRoot?: string; cwd?: string } = {}
): string | null {
  if (opts.projectRoot) return opts.projectRoot;

  const config = readGlobalConfig();
  if (config.current_project_root) {
    const basename = config.current_project_root.split('/').pop() ?? '';
    if (basename === project && existsSync(config.current_project_root)) {
      return config.current_project_root;
    }
  }

  const cwd = opts.cwd ?? process.cwd();
  const detected = detectProjectFromCwd(cwd);
  if (detected && detected.project === project) {
    return detected.root;
  }

  const base = config.projects_base;
  if (!base) return null;
  const candidate = join(base, project);
  return existsSync(candidate) ? candidate : null;
}

export function setCurrentProjectRoot(root: string): void {
  const config = readGlobalConfig();
  config.current_project_root = root;
  writeGlobalConfig(config);
}

/**
 * Resolves the project a command must operate on.
 *
 * Order: explicit path -> the project of the current directory -> the project
 * remembered in the global configuration -> the current directory.
 */
export function resolveTargetProjectRoot(explicit?: string): string {
  if (explicit) return resolve(process.cwd(), explicit);
  const detected = detectProjectFromCwd(process.cwd());
  if (detected) return detected.root;
  const config = readGlobalConfig();
  if (config.current_project_root && existsSync(config.current_project_root)) {
    return config.current_project_root;
  }
  return process.cwd();
}
