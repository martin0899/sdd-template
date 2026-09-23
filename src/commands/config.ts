import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest } from '../core/manifest';
import { currentPalette, printBanner, green, dim } from '../util/ui';

export interface ConfigOptions {
  destino?: string;
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
  console.log(printBanner(version, version, pal));

  const target = resolve(process.cwd(), opts.destino ?? '.');
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
