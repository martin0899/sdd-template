import { join } from 'node:path';
import { StackInfo } from './detect-stack';

export type StandardKind = 'backend' | 'frontend';

const NOTE_LINE =
  '> Section values marked with `{{...}}` must be refined during onboarding.';

export function resolveVariantFile(
  templateRoot: string,
  kind: StandardKind,
  variant: string
): string {
  return join(templateRoot, 'docs-variants', kind, `${variant}.md`);
}

function tokenReplacement(kind: StandardKind, info: StackInfo): Record<string, string | undefined> {
  const shared: Record<string, string | undefined> = {
    PROJECT_NAME: info.projectName,
    LANGUAGE: info.language,
    LANGUAGE_VERSION: info.languageVersion,
    BUILD_TOOL: info.buildTool,
    TEST_FRAMEWORK: info.testFramework
  };
  const perKind =
    kind === 'backend'
      ? { FRAMEWORK: info.framework, FRAMEWORK_VERSION: info.frameworkVersion }
      : { FRAMEWORK: info.frameworkFe, FRAMEWORK_VERSION: info.frameworkVersionFe };
  return { ...shared, ...perKind };
}

export function fillPlaceholders(
  kind: StandardKind,
  content: string,
  info: StackInfo
): string {
  let out = content;
  const values = tokenReplacement(kind, info);
  for (const [token, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      out = out.split(`{{${token}}}`).join(value);
    }
  }
  if (!/\{\{[A-Z_]+\}\}/.test(out)) {
    out = out
      .split('\n')
      .filter((line) => !line.includes('marked with `{{...}}`'))
      .join('\n');
  }
  return out;
}

export interface UnresolvedPlaceholder {
  file: string;
  line: number;
  placeholder: string;
}

export function findUnresolvedPlaceholders(
  filePath: string,
  content: string
): UnresolvedPlaceholder[] {
  const results: UnresolvedPlaceholder[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(/\{\{[A-Z_]+\}\}/g);
    if (matches) {
      for (const m of matches) {
        results.push({ file: filePath, line: i + 1, placeholder: m });
      }
    }
  }
  return results;
}

export function reportUnresolved(all: UnresolvedPlaceholder[]): string {
  if (all.length === 0) return '';
  const lines = all.map(p => `  ${p.file}:${p.line} → ${p.placeholder}`);
  return `[ERROR] Unresolved placeholders in composed standards:\n${lines.join('\n')}\n\nFix: run sdd-onboard-project to resolve remaining placeholders.`;
}

export { NOTE_LINE };
