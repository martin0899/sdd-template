import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PACKAGE_NAME = 'spectralis';
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1500;

interface Cache {
  checkedAt: number;
  latest: string | null;
}

function cachePath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'spectralis', 'update-check.json');
}

function readCache(): Cache | null {
  try {
    const raw = readFileSync(cachePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Cache>;
    if (typeof parsed.checkedAt !== 'number') return null;
    return { checkedAt: parsed.checkedAt, latest: typeof parsed.latest === 'string' ? parsed.latest : null };
  } catch {
    return null;
  }
}

function writeCache(cache: Cache): void {
  try {
    const dir = join(cachePath(), '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(cachePath(), JSON.stringify(cache), 'utf8');
  } catch {
    /* never fail the CLI because of the cache */
  }
}

/** Compare two semver strings (major.minor.patch). Returns >0 if a > b. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split('.').map((n) => Number(n.replace(/[^0-9].*/, '')) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/** Returns the latest version string if newer than current, else null. Silent on any failure. */
export async function checkForUpdate(currentVersion: string): Promise<string | null> {
  if (process.env.SPECTRALIS_NO_UPDATE_CHECK === '1') return null;

  const cached = readCache();
  const now = Date.now();
  let latest: string | null = null;

  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    latest = cached.latest;
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(REGISTRY_URL, { signal: controller.signal });
      if (res.ok) {
        const body = (await res.json()) as { version?: unknown };
        if (typeof body.version === 'string') latest = body.version;
      }
    } catch {
      /* network/parse failure: stay silent */
    } finally {
      clearTimeout(timer);
    }
    writeCache({ checkedAt: now, latest });
  }

  if (!latest || compareVersions(latest, currentVersion) <= 0) return null;
  return latest;
}

/** Synchronously print a pnpm-style update notice from the cache (if fresh) and
 *  refresh the cache in the background when it is stale. Never blocks. */
export function maybePrintUpdateNotice(currentVersion: string): void {
  try {
    const cached = readCache();
    const now = Date.now();
    if (!cached || now - cached.checkedAt >= CACHE_TTL_MS) {
      void checkForUpdate(currentVersion);
      return;
    }
    if (cached.latest && compareVersions(cached.latest, currentVersion) > 0) {
      const latest = cached.latest;
      const bar = '─'.repeat(46);
      console.log(`\n┌${bar}┐`);
      console.log(`│  Update available! ${currentVersion} → ${latest}.`.padEnd(48, ' ') + '│');
      console.log(`│  Changelog: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${latest}`.padEnd(48, ' ') + '│');
      console.log(`│  To update, run: npm i -g ${PACKAGE_NAME}`.padEnd(48, ' ') + '│');
      console.log(`└${bar}┘\n`);
    }
  } catch {
    /* never fail the CLI because of the update check */
  }
}