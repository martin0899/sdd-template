import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest } from '../core/manifest';
import { readGlobalConfig, writeGlobalConfig, setRoute, resolveRoute, detectVaultRoot, resolveObsidianSync, setObsidianSync, resolvePhilosophy, setPhilosophy, setSpecDir, type RouteConfig, type SpectralisConfig } from '../core/config';
import { resolveSpecDir } from '../core/resolve-changes-dir';
import { currentPalette, printBanner, green, dim } from '../util/ui';

export interface ConfigOptions {
  destino?: string;
  list?: boolean;
  get?: string;
  vault?: string;
  resources?: string;
  set?: string;
  global?: boolean;
}

function templateRoot(): string {
  return join(__dirname, '..', '..');
}

/**
 * Version of the harness.
 *
 * The manifest of the package is looked up in the root of the template and in
 * its parent: the compiled output lives in `dist/` (or in `dist-test/`, whose
 * layout nests the sources one level deeper).
 */
function pkgVersion(): string {
  const candidates = [
    join(templateRoot(), 'package.json'),
    join(templateRoot(), '..', 'package.json')
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { version: string };
    return pkg.version;
  }
  return '0.0.0';
}

const TOOL_PATHS: Record<string, string[]> = {
  opencode: ['.opencode', '.agents'],
  claude: ['.claude', '.agents'],
  antigravity: ['.antigravity', '.agents'],
  codex: ['.codex', '.agents'],
  agents: ['.agents']
};

function getToolPaths(tool: string): string[] {
  return TOOL_PATHS[tool] || [];
}

/**
 * Configuration keys that were retired together with the external engine.
 *
 * They are reported as unknown instead of being written: the harness has a
 * single native mode, so there is nothing to select.
 */
const RETIRED_CONFIG_KEYS = ['engine'];

/** Reports whether a configuration key was retired (and must not be used). */
function retiredKeyMessage(key: string): string | undefined {
  if (!RETIRED_CONFIG_KEYS.includes(key)) return undefined;
  return `[ERROR] Unknown configuration key: "${key}". It was retired with the external engine; the harness has a single native mode.`;
}

export async function runConfig(opts: ConfigOptions = {}): Promise<number> {
  const version = pkgVersion();
  const pal = currentPalette();

  // Handle --vault
  if (opts.vault) {
    const global = opts.global ?? false;
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
    setRoute('vault_root', resolve(opts.vault), global, projectRoot);
    console.log(`[OK] vault_root set to ${opts.vault} (${global ? 'global' : 'project'})`);
    return 0;
  }

  // Handle --resources (alias of --set resources_dir=)
  if (opts.resources) {
    const global = opts.global ?? false;
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
    setRoute('resources_dir', resolve(opts.resources), global, projectRoot);
    console.log(`[OK] resources_dir set to ${opts.resources} (${global ? 'global' : 'project'})`);
    return 0;
  }

  // Handle --set key=value
  if (opts.set) {
    const [key, value] = opts.set.split('=');
    if (!key || !value) {
      console.error('[ERROR] --set requires format key=value');
      return 1;
    }
    const global = opts.global ?? false;
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
    const retired = retiredKeyMessage(key);
    if (retired) {
      console.error(retired);
      return 1;
    }
    if (key === 'obsidianSync') {
      const parsed = value === '1' ? 1 : 0;
      setObsidianSync(parsed, global, projectRoot);
      console.log(`[OK] obsidianSync set to ${parsed} (${global ? 'global' : 'project'})`);
      return 0;
    }
    if (key === 'philosophy') {
      if (value !== 'sdd') {
        console.error(`[ERROR] Valor inválido para philosophy: "${value}". Valores admitidos: sdd.`);
        return 1;
      }
      setPhilosophy(value, global, projectRoot);
      console.log(`[OK] philosophy set to ${value} (${global ? 'global' : 'project'})`);
      return 0;
    }
    if (key === 'spec_dir' || key === 'spec-dir') {
      // Stored verbatim: a relative value is resolved against the project root
      // later, so the project keeps working when it moves.
      setSpecDir(value, global, projectRoot);
      console.log(`[OK] spec_dir set to ${value} (${global ? 'global' : 'project'})`);
      return 0;
    }
    setRoute(key as keyof RouteConfig, resolve(value), global, projectRoot);
    console.log(`[OK] ${key} set to ${value} (${global ? 'global' : 'project'})`);
    return 0;
  }

  // Handle --get
  if (opts.get) {
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
    if (opts.get === 'obsidianSync') {
      const res = resolveObsidianSync(projectRoot);
      console.log(`${res.value} [${res.origin}]`);
      return 0;
    }
    if (opts.get === 'philosophy') {
      const res = resolvePhilosophy(projectRoot);
      if (res.warning) console.error(`[WARN] ${res.warning}`);
      const origin = res.origin === 'manifest' ? 'manifiesto' : res.origin;
      console.log(`${res.value} [${origin}]`);
      return 0;
    }
    if (opts.get === 'spec_dir' || opts.get === 'spec-dir') {
      const res = resolveSpecDir({ projectRoot });
      const origin = res.origin === 'manifest' ? 'manifiesto' : res.origin;
      console.log(`${res.value || '(not set)'} [${origin}]`);
      return 0;
    }
    const retired = retiredKeyMessage(opts.get);
    if (retired) {
      console.error(retired);
      return 1;
    }
    const value = resolveRoute(opts.get as keyof RouteConfig, projectRoot);
    console.log(value || '(not set)');
    return 0;
  }

  console.log(printBanner(version, version, pal));
  const target = resolve(process.cwd(), opts.destino ?? '.');

  // Handle --list (routes)
  if (opts.list) {
    console.log('\n== spectralis config --list ==\n');
    const global = readGlobalConfig();
    const detected = detectVaultRoot();
    const routes: Array<[string, string, string]> = [
      ['vault_root', resolveRoute('vault_root', target), global.vault_root ? 'global' : (detected ? 'detected' : 'not set')],
      ['templates_dir', resolveRoute('templates_dir', target), global.templates_dir ? 'global' : 'not set'],
      ['requirements_dir', resolveRoute('requirements_dir', target), global.requirements_dir ? 'global' : 'not set'],
      ['projects_dir', resolveRoute('projects_dir', target), global.projects_dir ? 'global' : 'not set'],
      ['resources_dir', resolveRoute('resources_dir', target), global.resources_dir ? 'global' : (detected ? 'derived' : 'not set')],
      ['projects_base', global.projects_base, 'global'],
    ];
    const obsidian = resolveObsidianSync(target);
    console.log(`  obsidianSync: ${obsidian.value}  [${obsidian.origin}]`);
    const philosophy = resolvePhilosophy(target);
    const philosophyOrigin = philosophy.origin === 'manifest' ? 'manifiesto' : philosophy.origin;
    console.log(`  philosophy: ${philosophy.value}  [${philosophyOrigin}]`);
    const specDir = resolveSpecDir({ projectRoot: target });
    const specDirOrigin = specDir.origin === 'manifest' ? 'manifiesto' : specDir.origin;
    console.log(`  spec_dir: ${specDir.value || '(not set)'}  [${specDirOrigin}]`);
    for (const [key, value, origin] of routes) {
      console.log(`  ${key}: ${value || '(not set)'}  [${origin}]`);
    }
    if (detected) console.log(`\n  Auto-detected vault: ${detected}`);
    console.log('');
    return 0;
  }

  if (!existsSync(target)) {
    console.error(`[ERROR] Destination does not exist: ${target}`);
    return 2;
  }

  const manifest = readManifest(target);
  if (!manifest) {
    console.error('[ERROR] No .sdd-manifest.json found in the destination.');
    console.error('spectralis has not been installed here. Run spectralis init first.');
    return 2;
  }

  console.log('\n== spectralis config ==\n');
  
  // Basic info
  console.log('  [Harness]');
  console.log(`    spectralis version:  ${manifest.spectralisVersion || 'unknown'}`);
  console.log(`    project version:     ${manifest.projectVersion || 'unknown'}`);
  console.log(`    schema version:      ${manifest.schemaVersion}`);
  
  // Tools
  const tools = manifest.tools || [];
  console.log('\n  [Tools]');
  if (tools.length === 0) {
    console.log('    No tools registered');
  } else {
    for (const tool of tools) {
      const paths = getToolPaths(tool);
      console.log(`    ${green('•', pal)} ${tool}`);
      if (paths.length > 0) {
        console.log(`      directories: ${paths.join(', ')}`);
      }
    }
  }
  
  // Directories status
  console.log('\n  [Directories]');
  const allPaths = new Set<string>();
  for (const tool of tools) {
    for (const p of getToolPaths(tool)) {
      allPaths.add(p);
    }
  }
  
  if (allPaths.size === 0) {
    console.log('    No directories configured');
  } else {
    for (const p of allPaths) {
      const exists = existsSync(join(target, p));
      const status = exists ? green('exists', pal) : dim('not found', pal);
      console.log(`    ${p}: ${status}`);
    }
  }
  
  // Files tracked
  const fileCount = manifest.files?.length || 0;
  console.log('\n  [Managed Files]');
  console.log(`    total: ${fileCount}`);
  
  console.log('');
  console.log(dim('This is a read-only configuration view.', pal));
  console.log(dim('Use "spectralis update" to sync with template.', pal));
  
  return 0;
}
