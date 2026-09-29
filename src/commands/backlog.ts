import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGlobalConfig } from '../core/config';

export interface BacklogItem {
  file: string;
  id: string;
  status: string;
  tags: string[];
  date: string;
}

export interface BacklogOptions {
  project: string;
  json?: boolean;
  statusFilter?: string;
}

function parseFrontmatter(content: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;
  const lines = match[1].split('\n');
  let currentKey = '';
  let inArray = false;
  const arrayItems: string[] = [];

  for (const line of lines) {
    if (inArray) {
      if (line.trim().startsWith('- ')) {
        arrayItems.push(line.trim().substring(2).trim());
      } else {
        if (arrayItems.length > 0) {
          result[currentKey] = arrayItems;
        }
        inArray = false;
        arrayItems.length = 0;
      }
    }
    if (!inArray) {
      const kvMatch = line.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        currentKey = key;
        if (value.trim().startsWith('[')) {
          inArray = true;
          const arrContent = value.trim().slice(1, -1);
          if (arrContent.trim()) {
            arrayItems.push(...arrContent.split(',').map((s) => s.trim()));
          }
        } else {
          result[key] = value.trim();
        }
      }
    }
  }
  if (inArray && arrayItems.length > 0) {
    result[currentKey] = arrayItems;
  }
  return result;
}

function listBacklog(opts: BacklogOptions): { items: BacklogItem[]; path: string; error?: string } {
  const config = readGlobalConfig();
  const vaultRoot = config.vault_root;

  if (!vaultRoot) {
    return { items: [], path: '', error: 'vault_root not configured. Run: spectralis config --set vault_root=<path> --global' };
  }

  const notasPath = join(vaultRoot, '01_Proyectos', opts.project, '_Notas');

  if (!existsSync(notasPath)) {
    return { items: [], path: notasPath };
  }

  const files = readdirSync(notasPath).filter((f) => f.endsWith('.md'));
  const items: BacklogItem[] = [];

  for (const file of files) {
    const filePath = join(notasPath, file);
    const content = readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);

    const status = (fm['status'] as string) || 'sin-estado';
    if (opts.statusFilter && opts.statusFilter !== 'todos' && status !== opts.statusFilter) {
      continue;
    }

    items.push({
      file,
      id: (fm['id'] as string) || '',
      status,
      tags: Array.isArray(fm['tags']) ? (fm['tags'] as string[]) : [],
      date: (fm['Fecha'] as string) || '',
    });
  }

  return { items, path: notasPath };
}

export async function runBacklog(opts: BacklogOptions): Promise<number> {
  if (!opts.project) {
    console.error('[ERROR] Missing required argument: <proyecto>');
    return 1;
  }

  const result = listBacklog(opts);
  if (result.error) {
    console.error(`[ERROR] ${result.error}`);
    return 1;
  }
  const { items, path } = result;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          project: opts.project,
          path: path.replace(process.env.HOME || '', '~'),
          backlog: items,
          total: items.length,
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(`\n== ${opts.project} — Backlog de ${opts.project} ==\n`);
  console.log('  Nota                          | Estado     | Tags                | Fecha');
  console.log('  ------------------------------|------------|---------------------|----------');

  for (const item of items) {
    const name = item.file.replace('.md', '').padEnd(28);
    const status = item.status.padEnd(11);
    const tags = item.tags.join(', ').padEnd(19);
    console.log(`  ${name}| ${status}| ${tags}| ${item.date}`);
  }

  console.log(`\n  ${items.length} item(s)`);
  return 0;
}
