export interface AgentProfile {
  includeOpencode: boolean;
}

/**
 * Profiles of the supported agents.
 *
 * The profile only decides which payload directories travel with the
 * installation: the harness has a single native mode and no external tooling
 * to configure.
 */
export const AGENT_PROFILES: Record<string, AgentProfile> = {
  opencode: { includeOpencode: true },
  antigravity: { includeOpencode: false },
  claude: { includeOpencode: false },
  codex: { includeOpencode: false },
  all: { includeOpencode: true }
};

export const SUPPORTED_AGENTS = Object.keys(AGENT_PROFILES);

export interface ResolvedAgent extends AgentProfile {
  name: string;
}

export function resolveAgent(input: string | undefined): ResolvedAgent {
  const name = input && input.length > 0 ? input : 'opencode';
  const profile = AGENT_PROFILES[name];
  if (!profile) {
    throw new Error(
      `Unsupported agent "${name}". Supported values: ${SUPPORTED_AGENTS.join(', ')}`
    );
  }
  return { name, ...profile };
}
