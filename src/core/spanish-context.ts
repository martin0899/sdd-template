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
