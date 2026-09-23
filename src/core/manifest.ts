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
  spectralisVersion: string,
  tools?: string[]
): string {
  const files = managedPaths
    .filter((rel) => {
      const dest = join(target, rel);
      return existsSync(dest) && statSync(dest).isFile();
    })
    .map((rel) => ({ path: rel, hash: sha256File(join(target, rel)) }));
  const manifest: Record<string, unknown> = {
    schemaVersion: 2,
    spectralisVersion,
    templateVersion,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    excluded: ['secrets', 'local-config', 'generated-artifacts'],
    tools: tools ?? [],
    files
  };
  const manifestPath = join(target, '.sdd-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifestPath;
}

export interface ManifestData {
  schemaVersion: number;
  spectralisVersion: string;
  templateVersion: string;
  tools: string[];
  files: { path: string; hash: string }[];
}

export function readManifest(target: string): ManifestData | undefined {
  const manifestFile = join(target, '.sdd-manifest.json');
  if (!existsSync(manifestFile)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
    // Tolerant reading: v1 manifests lack `tools`; derive from legacy profile.
    const tools: string[] = Array.isArray(raw.tools)
      ? (raw.tools as string[])
      : raw.includeOpencode === true
        ? ['opencode']
        : raw.includeOpencode === false
          ? []
          : ['opencode'];
    return {
      schemaVersion: (raw.schemaVersion as number) ?? 1,
      spectralisVersion: (raw.spectralisVersion as string) ?? '',
      templateVersion: (raw.templateVersion as string) ?? '',
      tools,
      files: (raw.files as { path: string; hash: string }[]) ?? []
    };
  } catch {
    return undefined;
  }
}

export function manifestPaths(manifestFile: string): string[] {
  if (!existsSync(manifestFile)) return [];
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as {
    files?: { path: string }[];
  };
  return (manifest.files ?? []).map((f) => f.path);
}
