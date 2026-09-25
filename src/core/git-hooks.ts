import { existsSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const POST_MERGE_HOOK = `#!/bin/sh
# Rebuild dist/ after git pull/merge so new commands/aliases are available
# without requiring a manual \`pnpm prepare\`.

# Only rebuild if TypeScript source files exist
if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
  echo "[post-merge] Rebuilding dist/ ..."
  npx tsc -p tsconfig.json
  if [ $? -eq 0 ]; then
    echo "[post-merge] dist/ rebuilt successfully."
  else
    echo "[post-merge] WARNING: dist/ rebuild failed. Run 'pnpm prepare' manually."
  fi
fi
`;

export interface GitHookResult {
  installed: boolean;
  skipped?: string;
}

/**
 * Install post-merge git hook that rebuilds dist/ after git pull/merge.
 * Only installs if the target is a git repo and tsconfig.json exists.
 */
export function installGitHooks(target: string): GitHookResult {
  const gitDir = join(target, '.git');
  if (!existsSync(gitDir)) {
    return { installed: false, skipped: 'not a git repository' };
  }

  if (!existsSync(join(target, 'tsconfig.json'))) {
    return { installed: false, skipped: 'no tsconfig.json' };
  }

  const hooksDir = join(gitDir, 'hooks');
  const hookPath = join(hooksDir, 'post-merge');

  // Skip if hook already exists and matches
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, 'utf8');
    if (existing.includes('[post-merge] Rebuilding dist/')) {
      return { installed: false, skipped: 'hook already installed' };
    }
  }

  writeFileSync(hookPath, POST_MERGE_HOOK);
  chmodSync(hookPath, 0o755);
  return { installed: true };
}
