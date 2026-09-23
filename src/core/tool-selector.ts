import * as readline from 'node:readline';
import { TOOLS_CATALOG, type ToolDef, detectTools, labelTool } from '../agents/detect-tools';
import { currentPalette } from '../util/ui';

export interface ToolSelectorOptions {
  target: string;
  catalog?: ToolDef[];
  agentFlag?: string;
  yes?: boolean;
}

export interface ToolSelection {
  selected: string[];
  source: 'menu' | 'flag' | 'detection' | 'default';
}

function defaultSelection(target: string, catalog: ToolDef[]): string[] {
  const detected = detectTools(target, catalog);
  return detected.includes('opencode') ? detected : ['opencode', ...detected];
}

export function resolveTools(opts: ToolSelectorOptions): ToolSelection {
  const catalog = opts.catalog ?? TOOLS_CATALOG;

  if (opts.agentFlag) {
    return { selected: [opts.agentFlag], source: 'flag' };
  }
  if (opts.yes || !process.stdin.isTTY) {
    const selected = defaultSelection(opts.target, catalog);
    return { selected, source: 'detection' };
  }
  return { selected: defaultSelection(opts.target, catalog), source: 'default' };
}

export async function selectTools(opts: ToolSelectorOptions): Promise<ToolSelection> {
  const catalog = opts.catalog ?? TOOLS_CATALOG;

  if (opts.agentFlag) {
    return { selected: [opts.agentFlag], source: 'flag' };
  }

  if (opts.yes || !process.stdin.isTTY) {
    const selected = defaultSelection(opts.target, catalog);
    return { selected, source: 'detection' };
  }

  return interactiveSelect(opts.target, catalog);
}

async function interactiveSelect(target: string, catalog: ToolDef[]): Promise<ToolSelection> {
  const detected = detectTools(target, catalog);
  const selected = new Set(defaultSelection(target, catalog));
  const pal = currentPalette();

  let filter = '';
  let cursor = 0;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Enable raw mode for key detection.
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  function render(): void {
    const items = catalog.map((t) => ({
      tool: t,
      label: labelTool(t, detected.includes(t.id)),
      checked: selected.has(t.id)
    }));

    const filtered = filter
      ? items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()))
      : items;

    // Move cursor up and clear.
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(pal.bold('Select tools to configure:\n\n'));

    for (let i = 0; i < filtered.length; i++) {
      const prefix = i === cursor ? '› ' : '  ';
      const checkbox = filtered[i].checked ? '[x]' : '[ ]';
      const label = filtered[i].label;
      process.stdout.write(`${prefix}${checkbox} ${label}\n`);
    }

    process.stdout.write(`\nSearch: ${filter}_\n`);
    process.stdout.write('↑↓ navigate • Space toggle • Backspace remove • Enter confirm\n');
  }

  render();

  return new Promise<ToolSelection>((resolve) => {
    const items = catalog.map((t) => ({
      tool: t,
      label: labelTool(t, detected.includes(t.id)),
      checked: selected.has(t.id)
    }));

    function getFiltered() {
      return filter
        ? items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()))
        : items;
    }

    process.stdin.on('data', (data: Buffer) => {
      const key = data.toString();

      if (key === '\r' || key === '\n') {
        // Enter: confirm.
        rl.close();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve({ selected: Array.from(selected), source: 'menu' });
        return;
      }

      if (key === '\x1b[A') {
        // Arrow up.
        cursor = Math.max(0, cursor - 1);
      } else if (key === '\x1b[B') {
        // Arrow down.
        const filtered = getFiltered();
        cursor = Math.min(filtered.length - 1, cursor + 1);
      } else if (key === ' ') {
        // Space: toggle.
        const filtered = getFiltered();
        if (filtered[cursor]) {
          const id = filtered[cursor].tool.id;
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
        }
      } else if (key === '\x7f' || key === '\b') {
        // Backspace: remove last char from filter.
        filter = filter.slice(0, -1);
        cursor = 0;
      } else if (key === '\x03') {
        // Ctrl+C: abort.
        rl.close();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
        process.exit(1);
      } else if (key.length === 1 && key >= ' ') {
        // Printable character: add to filter.
        filter += key;
        cursor = 0;
      }

      render();
    });
  });
}
