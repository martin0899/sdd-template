import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function sha256File(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function writeManifest(
  target: string,
  managedPaths: string[],
  templateVersion: string,
  spectralisVersion: string
): string {
  const files = managedPaths
    .filter((rel) => {
      const dest = join(target, rel);
      return existsSync(dest) && statSync(dest).isFile();
    })
    .map((rel) => ({ path: rel, hash: sha256File(join(target, rel)) }));
  const manifest = {
    schemaVersion: 1,
    spectralisVersion,
    templateVersion,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    excluded: ['secrets', 'local-config', 'generated-artifacts'],
    files
  };
  const manifestPath = join(target, '.sdd-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifestPath;
}

export function manifestPaths(manifestFile: string): string[] {
  if (!existsSync(manifestFile)) return [];
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as {
    files?: { path: string }[];
  };
  return (manifest.files ?? []).map((f) => f.path);
}
