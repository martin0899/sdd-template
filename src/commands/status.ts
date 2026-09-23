import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest } from '../core/manifest';
import { currentPalette, printBanner, green, red, dim } from '../util/ui';

export interface StatusOptions {
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

function checkToolExists(tool: string): boolean {
  const toolDirs: Record<string, string[]> = {
    opencode: ['.opencode'],
    claude: ['.claude'],
    antigravity: ['.antigravity'],
    agents: ['.agents']
  };
  
  const dirs = toolDirs[tool] || [];
  const target = resolve(process.cwd(), '.');
  
  for (const dir of dirs) {
    if (existsSync(join(target, dir))) {
      return true;
    }
  }
  return false;
}

export async function runStatus(opts: StatusOptions = {}): Promise<number> {
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

  console.log('\n== spectralis status ==\n');
  
  // Basic info
  console.log(`  spectralis version:  ${manifest.spectralisVersion || 'unknown'}`);
  console.log(`  template version:    ${manifest.templateVersion || 'unknown'}`);
  console.log(`  installed at:        ${new Date().toISOString().split('T')[0]} (from manifest)`);
  
  // Tools
  const tools = manifest.tools || [];
  console.log(`  tools:               ${tools.length > 0 ? tools.join(', ') : 'none registered'}`);
  
  // Health check
  console.log('\n  Health check:');
  let hasWarnings = false;
  
  if (tools.length === 0) {
    console.log('    ' + dim('No tools registered', pal));
    hasWarnings = true;
  } else {
    for (const tool of tools) {
      if (checkToolExists(tool)) {
        console.log('    ' + green(`✓ ${tool}`, pal));
      } else {
        console.log('    ' + dim(`⚠ ${tool} - directory not found`, pal));
        hasWarnings = true;
      }
    }
  }
  
  // Files tracked
  const fileCount = manifest.files?.length || 0;
  console.log(`\n  managed files:      ${fileCount}`);
  
  console.log('');
  if (hasWarnings) {
    console.log(dim('Status: installed with warnings', pal));
  } else {
    console.log(green('Status: healthy', pal));
  }
  
  return 0;
}
