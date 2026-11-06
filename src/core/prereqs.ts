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
  { tool: 'graphify', versionArgs: ['--help'] }
];

export function parseNodeMajor(version: string | undefined): number | undefined {
  if (!version) return undefined;
  const match = /^v?(\d+)\./.exec(version.trim());
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Problem reported when a tool is not in the PATH.
 *
 * The message is the same on every platform: the harness never labels a tool
 * as required or optional any more.
 */
function toolNotFoundProblem(tool: string, platform: NodeJS.Platform): string {
  return platform === 'win32' ? `${tool} not found in PATH` : `${tool} no se encuentra en PATH`;
}

/**
 * Checks a single tool with the rules of the prerequisites report.
 *
 * It is the piece shared by the report and by the optional probe of the
 * doctor, so both label a missing tool exactly the same way.
 */
export function checkTool(
  probe: ProbeFn,
  check: PrereqCheck,
  platform: NodeJS.Platform
): PrereqResult {
  const probeResult = probe(check.tool);
  if (!probeResult.found) {
    return {
      tool: check.tool,
      ok: false,
      problem: toolNotFoundProblem(check.tool, platform)
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
}

export function checkPrereqs(probe: ProbeFn, platform: NodeJS.Platform): PrereqReport {
  const results = REQUIRED_TOOLS.map((check) => checkTool(probe, check, platform));
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
