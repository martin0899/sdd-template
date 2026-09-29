import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { bumpPatch, bumpMinor, bumpMajor } from '../core/project-version';
import { currentPalette, printBanner } from '../util/ui';
import { readManifest } from '../core/manifest';

export interface BumpOptions {
  level?: 'patch' | 'minor' | 'major';
  spectralis?: boolean;
  project?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

function templateRoot(): string {
  return join(__dirname, '..', '..');
}

function bumpSpectralisVersion(level: 'patch' | 'minor' | 'major', dryRun: boolean): string {
  const pkgPath = join(templateRoot(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

  let newVersion: string;
  switch (level) {
    case 'major':
      newVersion = bumpMajor(pkg.version);
      break;
    case 'minor':
      newVersion = bumpMinor(pkg.version);
      break;
    default:
      newVersion = bumpPatch(pkg.version);
  }

  if (!dryRun) {
    pkg.version = newVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  return newVersion;
}

function bumpProjectVersion(target: string, level: 'patch' | 'minor' | 'major', dryRun: boolean): string {
  const manifestPath = join(target, '.sdd-manifest.json');
  const manifest = readManifest(target);

  if (!manifest) {
    throw new Error('No .sdd-manifest.json found. Run "spectralis init" first.');
  }

  const currentVersion = manifest.projectVersion ?? '1.0.0';

  let newVersion: string;
  switch (level) {
    case 'major':
      newVersion = bumpMajor(currentVersion);
      break;
    case 'minor':
      newVersion = bumpMinor(currentVersion);
      break;
    default:
      newVersion = bumpPatch(currentVersion);
  }

  if (!dryRun) {
    const allManaged = (manifest.files ?? []).map((f) => f.path);
    const { writeManifest } = require('../core/manifest');
    writeManifest(target, allManaged, newVersion, manifest.spectralisVersion, manifest.tools ?? []);
  }

  return newVersion;
}

export async function runBump(opts: BumpOptions = {}): Promise<number> {
  const level = opts.level ?? 'patch';
  const pal = currentPalette();
  const spectralisVersion = JSON.parse(
    readFileSync(join(templateRoot(), 'package.json'), 'utf8')
  ) as { version: string };

  // Default: bump project version if in a project, else spectralis version
  const target = resolve(process.cwd());
  const manifestPath = join(target, '.sdd-manifest.json');
  const isProject = existsSync(manifestPath);

  // Determine what to bump
  const doSpectralis = opts.spectralis ?? false;
  const doProject = opts.project ?? (!doSpectralis && isProject);

  if (!doSpectralis && !doProject) {
    console.log('Nothing to bump. Use --spectralis or --project to specify.');
    return 1;
  }

  console.log(printBanner(spectralisVersion.version, spectralisVersion.version, pal));
  console.log('\n== spectralis bump ==\n');

  let result = 0;

  if (doSpectralis) {
    const newVersion = bumpSpectralisVersion(level, opts.dryRun ?? false);
    console.log(`  [spectralis] ${spectralisVersion.version} → ${newVersion} (${level})`);
  }

  if (doProject) {
    try {
      const newVersion = bumpProjectVersion(target, level, opts.dryRun ?? false);
      const manifest = readManifest(target);
      console.log(`  [project]    ${manifest?.projectVersion ?? '1.0.0'} → ${newVersion} (${level})`);
    } catch (err) {
      console.error(`  [project]    ERROR: ${(err as Error).message}`);
      result = 1;
    }
  }

  if (opts.dryRun) {
    console.log('\nDry-run complete. Nothing written.');
  } else {
    console.log('\n[OK] Bump complete.');
  }

  return result;
}
