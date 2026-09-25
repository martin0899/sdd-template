import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest } from '../core/manifest';
import { readGlobalConfig, setRoute, resolveRoute, detectVaultRoot, RouteConfig } from '../core/config';
import { currentPalette, printBanner, green, dim } from '../util/ui';

export interface ConfigOptions {
  destino?: string;
  list?: boolean;
  get?: string;
  vault?: string;
  set?: string;
  global?: boolean;
}

function templateRoot(): string {
  return join(__dirname, '..', '..');
}

function pkgVersion(): string {
  const pkg = JSON.parse(
    require('node:fs').readFileSync(join(templateRoot(), 'package.json'), 'utf8')
  ) as { version: string };
  return pkg.version;
}

const TOOL_PATHS: Record<string, string[]> = {
  opencode: ['.opencode', '.agents'],
  claude: ['.claude', '.agents'],
  antigravity: ['.antigravity', '.agents'],
  agents: ['.agents']
};

function getToolPaths(tool: string): string[] {
  return TOOL_PATHS[tool] || [];
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

  // Handle --set key=value
  if (opts.set) {
    const [key, value] = opts.set.split('=');
    if (!key || !value) {
      console.error('[ERROR] --set requires format key=value');
      return 1;
    }
    const global = opts.global ?? false;
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
    setRoute(key as keyof RouteConfig, resolve(value), global, projectRoot);
    console.log(`[OK] ${key} set to ${value} (${global ? 'global' : 'project'})`);
    return 0;
  }

  // Handle --get
  if (opts.get) {
    const projectRoot = opts.destino ? resolve(process.cwd(), opts.destino) : process.cwd();
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
      ['projects_base', global.projects_base, 'global'],
    ];
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
  console.log(`    template version:    ${manifest.templateVersion || 'unknown'}`);
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
