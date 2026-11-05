import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export function sha256File(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

export function writeManifest(
  target: string,
  managedPaths: string[],
  projectVersion: string,
  spectralisVersion: string,
  tools?: string[],
  projectFields?: Record<string, unknown>,
  /**
   * Pre-computed hashes that win over the current on-disk hash. Used by
   * `update --prune` to keep the reference hash of retired files that were
   * preserved (e.g. edited by the user), so they are never pruned later.
   */
  hashOverrides?: Record<string, string>
): string {
  const files = managedPaths
    .filter((rel) => {
      const dest = join(target, rel);
      return existsSync(dest) && statSync(dest).isFile();
    })
    .map((rel) => ({ path: rel, hash: hashOverrides?.[rel] ?? sha256File(join(target, rel)) }));
  const manifest: Record<string, unknown> = {
    schemaVersion: 3,
    spectralisVersion,
    projectVersion,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    excluded: ['secrets', 'local-config', 'generated-artifacts'],
    tools: tools ?? []
  };
  // Preserve project-owned fields (e.g. obsidianSync, philosophy) that live in
  // the same manifest; undefined values are not invented.
  for (const [key, value] of Object.entries(projectFields ?? {})) {
    if (value !== undefined) manifest[key] = value;
  }
  manifest.files = files;
  const manifestPath = join(target, '.sdd-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifestPath;
}

export interface ManifestData {
  schemaVersion: number;
  spectralisVersion: string;
  templateVersion: string;
  projectVersion: string;
  tools: string[];
  obsidianSync?: 0 | 1;
  /**
   * Raw `philosophy` value stored in the manifest. Only 'sdd' is valid today;
   * legacy values are preserved verbatim by `update` (never rewritten) and are
   * interpreted by the effective resolution (resolvePhilosophy).
   */
  philosophy?: string;
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
    // projectVersion (v3) with fallback to templateVersion (v2) or 1.0.0.
    const projectVersion = (raw.projectVersion as string) ?? (raw.templateVersion as string) ?? '1.0.0';
    const obsidianSync: 0 | 1 | undefined =
      raw.obsidianSync === 1 ? 1 : raw.obsidianSync === 0 ? 0 : undefined;
    // The stored value is preserved verbatim (legacy values included): `update`
    // must not rewrite the manifest and only the effective resolution decides
    // which mode applies.
    const philosophy: string | undefined =
      typeof raw.philosophy === 'string' ? raw.philosophy : undefined;
    return {
      schemaVersion: (raw.schemaVersion as number) ?? 1,
      spectralisVersion: (raw.spectralisVersion as string) ?? '',
      templateVersion: (raw.templateVersion as string) ?? projectVersion,
      projectVersion,
      tools,
      obsidianSync,
      philosophy,
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
