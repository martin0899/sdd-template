import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { readGlobalConfig } from '../core/config';
import { AGGREGATE_FILES as SHARED_AGGREGATE_FILES } from '../core/wiki-structure';

export interface WikiSearchOptions {
  project: string;
  query?: string;
  json?: boolean;
  file?: string;
  vaultRoot?: string;
}

export interface SearchResult {
  file: string;
  section: string;
  preview: string;
  line: number;
}

export interface SearchOutput {
  project: string;
  query: string;
  results: SearchResult[];
  total: number;
}

const AGGREGATE_FILES = SHARED_AGGREGATE_FILES;

function searchInContent(content: string, query: string, file: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = content.split('\n');
  const lowerQuery = query.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(lowerQuery)) {
      // Extract section context
      let section = '';
      for (let j = i; j >= 0; j--) {
        if (lines[j].startsWith('### ')) {
          section = lines[j].replace(/^###\s*/, '').trim();
          break;
        }
        if (lines[j].startsWith('## ')) {
          section = lines[j].replace(/^##\s*/, '').trim();
          break;
        }
      }

      // Get preview context
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      const preview = lines.slice(start, end).join(' ').trim().slice(0, 100);

      results.push({
        file,
        section: section || 'general',
        preview: preview + (preview.length >= 100 ? '...' : ''),
        line: i + 1,
      });
    }
  }

  return results;
}

function searchInFrontmatterTags(frontmatter: Record<string, unknown>, query: string, file: string): SearchResult[] {
  const results: SearchResult[] = [];
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(t => String(t).toLowerCase()) : [];
  const lowerQuery = query.toLowerCase();

  for (const tag of tags) {
    if (tag.includes(lowerQuery)) {
      results.push({
        file,
        section: 'tags',
        preview: `Tag: ${tag}`,
        line: 0,
      });
    }
  }

  return results;
}

export async function runWikiSearch(opts: WikiSearchOptions): Promise<number> {
  const { project, query = '', json = false, file, vaultRoot: explicitVault } = opts;

  // Check vault_root
  const vaultRoot = explicitVault || readGlobalConfig().vault_root;
  if (!vaultRoot) {
    console.error('[ERROR] vault_root not configured. Run: spectralis config --set vault_root=<path> --global');
    return 1;
  }

  // Check project wiki exists
  const wikiPath = join(vaultRoot, '05_wiki', project);
  if (!existsSync(wikiPath)) {
    console.error(`[ERROR] Project wiki not found: ${wikiPath}`);
    console.error('Run "spectralis distill ' + project + '" first to generate wiki content.');
    return 1;
  }

  // Determine which files to search
  const filesToSearch = file ? [file] : AGGREGATE_FILES;
  const allResults: SearchResult[] = [];

  for (const f of filesToSearch) {
    const filePath = join(wikiPath, f);
    if (!existsSync(filePath)) continue;

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);

    // Search in content
    if (query) {
      const contentResults = searchInContent(parsed.content, query, f);
      allResults.push(...contentResults);
    }

    // Search in tags
    if (query) {
      const tagResults = searchInFrontmatterTags(parsed.data, query, f);
      allResults.push(...tagResults);
    }
  }

  // Output results
  if (json) {
    const output: SearchOutput = {
      project,
      query,
      results: allResults,
      total: allResults.length,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (allResults.length === 0) {
      console.log(`Sin resultados para '${query}'`);
      return 0;
    }

    console.log(`== spectralis wiki search · ${project} ==\n`);
    console.log('  Archivo         | Sección            | Match');
    console.log('  ----------------|--------------------|----------');

    for (const result of allResults) {
      const sectionPad = result.section.slice(0, 18).padEnd(18);
      console.log(`  ${result.file.padEnd(15)} | ${sectionPad} | ${result.preview}`);
    }

    console.log(`\n  ${allResults.length} resultado(s)`);
  }

  return 0;
}
