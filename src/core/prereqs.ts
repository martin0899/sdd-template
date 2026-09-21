import { spawnSync } from 'node:child_process';

export interface PrereqResult {
  tool: string;
  ok: boolean;
  version?: string;
  problem?: string;
}

export interface PrereqReport {
  ok: boolean;
  results: PrereqResult[];
}

export interface ToolProbe {
  found: boolean;
  version?: string;
}

export type ProbeFn = (tool: string) => ToolProbe;

export interface PrereqCheck {
  tool: string;
  minMajor?: number;
  versionArgs: string[];
}

export const REQUIRED_TOOLS: PrereqCheck[] = [
  { tool: 'git', versionArgs: ['--version'] },
  { tool: 'node', minMajor: 22, versionArgs: ['--version'] },
  { tool: 'openspec', versionArgs: ['--help'] },
  { tool: 'graphify', versionArgs: ['--help'] }
];

export function parseNodeMajor(version: string | undefined): number | undefined {
  if (!version) return undefined;
  const match = /^v?(\d+)\./.exec(version.trim());
  return match ? parseInt(match[1], 10) : undefined;
}

export function checkPrereqs(probe: ProbeFn, platform: NodeJS.Platform): PrereqReport {
  const results: PrereqResult[] = REQUIRED_TOOLS.map((check) => {
    const probeResult = probe(check.tool);
    if (!probeResult.found) {
      return {
        tool: check.tool,
        ok: false,
        problem:
          platform === 'win32'
            ? `${check.tool} not found in PATH`
            : `${check.tool} no se encuentra en PATH`
      };
    }
    if (check.minMajor !== undefined) {
      const major = parseNodeMajor(probeResult.version);
      if (major === undefined || major < check.minMajor) {
        return {
          tool: check.tool,
          ok: false,
          version: probeResult.version,
          problem: `requires node >= ${check.minMajor} (detected: ${probeResult.version ?? 'unknown'})`
        };
      }
    }
    return { tool: check.tool, ok: true, version: probeResult.version };
  });
  return { ok: results.every((r) => r.ok), results };
}

export function installHint(tool: string, platform: NodeJS.Platform): string {
  switch (tool) {
    case 'git':
      return platform === 'win32'
        ? 'git: download from https://git-scm.com/downloads (Git for Windows)'
        : `git: https://git-scm.com/downloads${platform === 'darwin' ? ' or: brew install git' : ' or: sudo apt install git'}`;
    case 'node':
      return platform === 'win32'
        ? 'node >= 22: https://nodejs.org (LTS installer)'
        : `node >= 22: https://nodejs.org${platform === 'darwin' ? ' or: brew install node' : ''}`;
    case 'openspec':
      return 'openspec (CLI): npm i -g openspec (or your package manager / OpenSpec docs)';
    case 'graphify':
      return 'graphify (CLI): see the graphify documentation (provides: graphify update/query/explain)';
    default:
      return `${tool}: see its official documentation`;
  }
}

export const realProbe: ProbeFn = (tool) => {
  const check = REQUIRED_TOOLS.find((t) => t.tool === tool);
  const result = spawnSync(tool, check?.versionArgs ?? ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (result.error || result.status !== 0) {
    return { found: false };
  }
  return { found: true, version: (result.stdout ?? '').trim().split('\n')[0] };
};
