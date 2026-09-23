import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ToolDef {
  id: string;
  label: string;
  dirs: string[];
}

export const TOOLS_CATALOG: ToolDef[] = [
  { id: 'opencode', label: 'OpenCode', dirs: ['.opencode'] },
  { id: 'claude', label: 'Claude Code', dirs: ['.claude'] },
  { id: 'antigravity', label: 'Antigravity', dirs: ['.antigravity'] },
  { id: 'shared-agents', label: 'Shared .agents skills', dirs: ['.agents'] }
];

export function detectTools(target: string, catalog: ToolDef[] = TOOLS_CATALOG): string[] {
  const detected: string[] = [];
  for (const tool of catalog) {
    const found = tool.dirs.some((dir) => existsSync(join(target, dir)));
    if (found) detected.push(tool.id);
  }
  return detected;
}

export function labelTool(tool: ToolDef, detected: boolean): string {
  return detected ? `${tool.label} (detected)` : tool.label;
}
