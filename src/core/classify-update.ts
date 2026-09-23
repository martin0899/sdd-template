import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { sha256File, readManifest } from './manifest';
import { listPayloadFiles, listDocsFiles } from './copy-payload';
import type { ManifestData } from './manifest';

export type FileStatus = 'unchanged' | 'updatable' | 'conflict' | 'new' | 'retired';

export interface ClassifiedFile {
  rel: string;
  status: FileStatus;
}

export function classifyFiles(
  target: string,
  templateRoot: string,
  includeOpencode: boolean
): { manifest: ManifestData | undefined; files: ClassifiedFile[] } {
  const manifest = readManifest(target);

  const templatePayload = [
    ...listPayloadFiles(templateRoot, includeOpencode),
    ...listDocsFiles(templateRoot)
  ];

  const manifestHashes = new Map<string, string>();
  if (manifest) {
    for (const entry of manifest.files) {
      manifestHashes.set(entry.path, entry.hash);
    }
  }

  const result: ClassifiedFile[] = [];

  for (const rel of templatePayload) {
    const destFile = join(target, rel);
    const destExists = existsSync(destFile);

    if (!destExists) {
      result.push({ rel, status: 'new' });
      continue;
    }

    const destHash = sha256File(destFile);
    const manifestHash = manifestHashes.get(rel);

    if (!manifestHash) {
      // File exists in destination but not in manifest (not installed by spectralis).
      result.push({ rel, status: 'conflict' });
      continue;
    }

    if (destHash === manifestHash) {
      // User hasn't touched it — safe to update if plantilla differs.
      const plantillaHash = sha256File(join(templateRoot, rel));
      if (destHash === plantillaHash) {
        result.push({ rel, status: 'unchanged' });
      } else {
        result.push({ rel, status: 'updatable' });
      }
    } else {
      // User has modified the file locally.
      const plantillaHash = sha256File(join(templateRoot, rel));
      if (destHash === plantillaHash) {
        // Somehow same as plantilla despite manifest mismatch — unchanged.
        result.push({ rel, status: 'unchanged' });
      } else {
        result.push({ rel, status: 'conflict' });
      }
    }
  }

  // Retired files: in manifest but not in current plantilla.
  if (manifest) {
    const templateSet = new Set(templatePayload);
    for (const entry of manifest.files) {
      if (!templateSet.has(entry.path)) {
        result.push({ rel: entry.path, status: 'retired' });
      }
    }
  }

  return { manifest, files: result };
}

export function countByStatus(files: ClassifiedFile[]): Record<FileStatus, number> {
  const counts: Record<FileStatus, number> = { unchanged: 0, updatable: 0, conflict: 0, new: 0, retired: 0 };
  for (const f of files) counts[f.status]++;
  return counts;
}

export function hasChanges(files: ClassifiedFile[]): boolean {
  return files.some((f) => f.status !== 'unchanged');
}
