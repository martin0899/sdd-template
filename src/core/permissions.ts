import { accessSync, constants } from 'node:fs';
import { existsSync } from 'node:fs';

/**
 * Verifies write permissions on source and target directories.
 * Returns true if both are writable, false otherwise.
 */
export function checkPermissions(sourceDir: string, targetDir: string): boolean {
  // Check source directory (readable)
  if (existsSync(sourceDir)) {
    try {
      accessSync(sourceDir, constants.R_OK);
    } catch {
      console.error(`[ERROR] Cannot read from ${sourceDir}: permission denied. Fix: chmod u+rwX ${sourceDir}`);
      return false;
    }
  }
  
  // Check target directory (writable)
  if (existsSync(targetDir)) {
    try {
      accessSync(targetDir, constants.W_OK);
    } catch {
      console.error(`[ERROR] Cannot write to ${targetDir}: permission denied. Fix: chmod u+rwX ${targetDir}`);
      return false;
    }
  } else {
    // Target doesn't exist, check parent directory
    const parent = targetDir.split('/').slice(0, -1).join('/');
    if (existsSync(parent)) {
      try {
        accessSync(parent, constants.W_OK);
      } catch {
        console.error(`[ERROR] Cannot create ${targetDir}: permission denied on ${parent}. Fix: chmod u+rwX ${parent}`);
        return false;
      }
    }
  }
  
  return true;
}