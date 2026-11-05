import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument, YAMLMap, Scalar } from 'yaml';

export const SPANISH_CONTEXT_BLOCK = [
  'Language preference: All interactions, questions, summaries, and results must be displayed in Spanish.',
  'Even if the files and configurations are in English, the user interface and AI responses should be in Spanish.',
  'When showing artifacts, status, or any output, translate to Spanish while preserving technical terms in English when appropriate.'
];

const HEADING = SPANISH_CONTEXT_BLOCK[0];

function blockText(): string {
  return SPANISH_CONTEXT_BLOCK.join('\n');
}

/**
 * Append the Spanish context block to the `context` field of a
 * openspec/config.yaml content string. APPEND semantics only: existing
 * content, comments and key order are preserved (round-trip via the yaml
 * Document API). Idempotent: an existing heading is never duplicated.
 */
export function injectSpanishContext(cfgContent: string): string {
  if (cfgContent.includes(HEADING)) {
    return cfgContent;
  }
  const doc = parseDocument(cfgContent);
  if (doc.errors.length > 0) {
    throw new Error(`config.yaml is not valid YAML: ${doc.errors[0]?.message ?? 'unknown'}`);
  }
  if (doc.has('context')) {
    const node = doc.get('context', true);
    if (node && typeof (node as Scalar).value === 'string') {
      const scalar = node as Scalar;
      const current = String(scalar.value).replace(/\n+$/, '');
      scalar.value = `${current}\n${blockText()}`;
      scalar.type = 'BLOCK_LITERAL';
    } else {
      doc.set('context', blockText());
    }
  } else {
    doc.set('context', blockText());
  }
  const out = doc.toString({ lineWidth: 0 });
  return out.endsWith('\n') ? out : `${out}\n`;
}

/** Config of a spec-native project (the layout the harness writes). */
export const NATIVE_CONFIG_REL = join('spec', 'config.yaml');
/** Config of a legacy project (the layout of the OpenSpec CLI). */
export const LEGACY_CONFIG_REL = join('openspec', 'config.yaml');

/** Content of a config that does not exist yet. */
const DEFAULT_CONFIG_CONTENT = 'schema: spec-driven\n';

export interface ConfigTargets {
  /** Config of the native layout (`spec/config.yaml`). */
  native?: string;
  /** Config of the legacy layout (`openspec/config.yaml`). */
  legacy?: string;
}

/**
 * Config files of a project that must carry the Spanish context.
 *
 * A spec-native project (it has `spec/`) uses its own config; a legacy one
 * keeps `openspec/config.yaml`. A project with both layouts gets both.
 */
export function resolveConfigTargets(target: string): ConfigTargets {
  const targets: ConfigTargets = {};
  if (existsSync(join(target, 'spec'))) targets.native = join(target, NATIVE_CONFIG_REL);
  if (existsSync(join(target, 'openspec'))) targets.legacy = join(target, LEGACY_CONFIG_REL);
  return targets;
}

/**
 * Injects the Spanish context in the config files of a project.
 *
 * The legacy config is read when it exists: its content seeds the native one,
 * so a project that migrates does not lose its configuration. The injection
 * keeps the APPEND semantics and is idempotent.
 *
 * It returns the files that were written; an empty list means the project
 * has no config to write.
 */
export function injectSpanishContextInProject(target: string): string[] {
  const targets = resolveConfigTargets(target);
  const written: string[] = [];

  const legacyContent = targets.legacy && existsSync(targets.legacy)
    ? readFileSync(targets.legacy, 'utf8')
    : '';

  if (targets.native) {
    const seed = existsSync(targets.native)
      ? readFileSync(targets.native, 'utf8')
      : legacyContent || DEFAULT_CONFIG_CONTENT;
    writeFileSync(targets.native, injectSpanishContext(seed), 'utf8');
    written.push(targets.native);
  }

  if (targets.legacy) {
    const seed = existsSync(targets.legacy)
      ? readFileSync(targets.legacy, 'utf8')
      : DEFAULT_CONFIG_CONTENT;
    writeFileSync(targets.legacy, injectSpanishContext(seed), 'utf8');
    written.push(targets.legacy);
  }

  return written;
}
