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

export { NOTE_LINE };
