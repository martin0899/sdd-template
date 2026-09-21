export interface AgentProfile {
  openspecTools: string;
  includeOpencode: boolean;
}

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  opencode: { openspecTools: 'opencode', includeOpencode: true },
  antigravity: { openspecTools: 'antigravity', includeOpencode: false },
  claude: { openspecTools: 'claude', includeOpencode: false },
  all: { openspecTools: 'all', includeOpencode: true }
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
