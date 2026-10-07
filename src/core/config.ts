import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';

export interface LlmConfig {
  host: string;
  model: string;
  enabled: boolean;
}

export interface RouteConfig {
  vault_root: string;
  templates_dir: string;
  requirements_dir: string;
  projects_dir: string;
  resources_dir: string;
}

export type Philosophy = 'sdd' | 'odd';

export interface SpectralisConfig extends RouteConfig {
  llm: LlmConfig;
  projects_base: string;
  autoUpdate: boolean;
  obsidianSync: 0 | 1;
  philosophy: Philosophy;
  current_project_root: string;
}

const DEFAULT_LLM: LlmConfig = {
  host: 'http://localhost:11434',
  model: '',
  enabled: false
};

const DEFAULT_CONFIG: SpectralisConfig = {
  llm: DEFAULT_LLM,
  projects_base: join(homedir(), 'Documentos', 'Proyectos'),
  vault_root: '',
  templates_dir: '',
  requirements_dir: '',
  projects_dir: '',
  resources_dir: '',
  autoUpdate: false,
  obsidianSync: 0,
  philosophy: 'sdd',
  current_project_root: ''
};

function globalConfigDir(): string {
  return join(homedir(), '.config', 'spectralis');
}

export function globalConfigPath(): string {
  return join(globalConfigDir(), 'config.json');
}

export function readGlobalConfig(): SpectralisConfig {
  const path = globalConfigPath();
  if (!existsSync(path)) return { ...DEFAULT_CONFIG, llm: { ...DEFAULT_LLM } };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return {
      llm: { ...DEFAULT_LLM, ...(raw.llm ?? {}) },
      projects_base: raw.projects_base ?? DEFAULT_CONFIG.projects_base,
      vault_root: raw.vault_root ?? '',
      templates_dir: raw.templates_dir ?? '',
      requirements_dir: raw.requirements_dir ?? '',
      projects_dir: raw.projects_dir ?? '',
      resources_dir: raw.resources_dir ?? '',
      autoUpdate: raw.autoUpdate ?? false,
      obsidianSync: raw.obsidianSync === 1 ? 1 : 0,
      philosophy: raw.philosophy === 'odd' ? 'odd' : 'sdd',
      current_project_root: raw.current_project_root ?? ''
    };
  } catch {
    return { ...DEFAULT_CONFIG, llm: { ...DEFAULT_LLM } };
  }
}

export function writeGlobalConfig(config: SpectralisConfig): void {
  const dir = globalConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(globalConfigPath(), JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function readLlmConfig(): LlmConfig {
  const envHost = process.env.OLLAMA_HOST;
  const config = readGlobalConfig();
  return {
    ...config.llm,
    host: envHost || config.llm.host || DEFAULT_LLM.host
  };
}

export function writeLlmConfig(llm: LlmConfig): void {
  const config = readGlobalConfig();
  config.llm = llm;
  writeGlobalConfig(config);
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
  return value === 'sdd' || value === 'odd';
}

/**
 * Resolve the working philosophy for a project:
 * 1. philosophy in the project manifest (.sdd-manifest.json)
 * 2. philosophy in the global config
 * 3. default 'sdd' (backwards compatible)
 *
 * Invalid stored values are ignored (tolerant read), fall back to 'sdd'
 * and surface a readable warning.
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
            warning: `Valor de philosophy inválido en el manifiesto: "${String(manifest.philosophy)}". Se usa el default "sdd".`
          };
        }
      } catch {}
    }
  }
  const config = readGlobalConfig();
  if (config.philosophy === 'odd') {
    return { value: 'odd', origin: 'global' };
  }
  try {
    const rawPath = globalConfigPath();
    if (existsSync(rawPath)) {
      const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
      if (raw.philosophy !== undefined && !isPhilosophy(raw.philosophy)) {
        return {
          value: 'sdd',
          origin: 'default',
          warning: `Valor de philosophy inválido en la configuración global: "${String(raw.philosophy)}". Se usa el default "sdd".`
        };
      }
    }
  } catch {}
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
  origin: 'flag' | 'manifest' | 'global' | 'default';
  warning?: string;
}

/**
 * Resolve the effective philosophy for a command run, applying the
 * explicit `--odd`/`--sdd` flags before the project cascade.
 * Precedence: --odd > --sdd > manifest > global > sdd.
 * Passing both flags is a hard error (mutually exclusive).
 */
export function resolveEffectivePhilosophy(
  flags: { odd?: boolean; sdd?: boolean } = {},
  projectRoot?: string
): EffectivePhilosophyResolution {
  if (flags.odd && flags.sdd) {
    throw new Error('Los flags --odd y --sdd son mutuamente excluyentes. Usa solo uno.');
  }
  if (flags.odd) return { value: 'odd', origin: 'flag' };
  if (flags.sdd) return { value: 'sdd', origin: 'flag' };
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
