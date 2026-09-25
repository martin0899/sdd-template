import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface PostChecksContext {
  backendVariant: string;
  frontendVariant: string;
  includeOpencode: boolean;
}

export interface PostChecksResult {
  warnings: string[];
  manualSteps: string[];
}

const SPANISH_HEADING = 'Language preference: All interactions';

export function runPostChecks(target: string, ctx: PostChecksContext): PostChecksResult {
  const warnings: string[] = [];
  const manualSteps: string[] = [];

  const configFile = join(target, 'openspec/config.yaml');
  if (!existsSync(configFile) || !readFileSync(configFile, 'utf8').includes(SPANISH_HEADING)) {
    warnings.push('Spanish context not detected in openspec/config.yaml');
  }
  if (!existsSync(join(target, '.agents/skills/commit/SKILL.md'))) {
    warnings.push('Missing .agents/skills/commit/SKILL.md');
  }
  if (ctx.includeOpencode && !existsSync(join(target, '.opencode/package.json'))) {
    warnings.push('Missing .opencode/package.json');
  }
  if (!existsSync(join(target, 'docs'))) {
    warnings.push('Missing docs/ directory');
  }
  const manifestFile = join(target, '.sdd-manifest.json');
  if (!existsSync(manifestFile)) {
    warnings.push('Missing .sdd-manifest.json');
  } else {
    const manifest = readFileSync(manifestFile, 'utf8');
    if (!manifest.includes('"schemaVersion": 2') && !manifest.includes('"schemaVersion": 1')) {
      warnings.push('Manifest does not declare a valid schemaVersion');
    }
    if (!manifest.includes('"files":')) {
      warnings.push('Manifest does not contain the file inventory');
    }
  }
  if (!existsSync(join(target, '.agents/skills/INDEX.md'))) {
    warnings.push('Missing .agents/skills/INDEX.md (skill routing index)');
  }
  if (!existsSync(join(target, '.agents/skills/spec-from-note/SKILL.md'))) {
    warnings.push('Missing .agents/skills/spec-from-note/SKILL.md');
  }
  if (ctx.backendVariant !== 'none' && !existsSync(join(target, 'docs/backend-standards.md'))) {
    warnings.push(`Missing docs/backend-standards.md (variant ${ctx.backendVariant})`);
  }
  if (ctx.frontendVariant !== 'none' && !existsSync(join(target, 'docs/frontend-standards.md'))) {
    warnings.push(`Missing docs/frontend-standards.md (variant ${ctx.frontendVariant})`);
  }
  if (ctx.backendVariant === 'generic' || ctx.frontendVariant === 'generic') {
    warnings.push('Generic standards were composed: refine them with the sdd-onboard-project skill');
  }
  if (!existsSync(join(target, 'graphify-out/graph.json'))) {
    warnings.push("Knowledge graph missing (graphify-out/): create it with 'graphify update .' (sdd-onboard-project skill)");
  }
  if (existsSync(join(target, 'install.sh'))) {
    warnings.push('install.sh must not be copied to the destination');
  }
  if (existsSync(join(target, 'docs-variants'))) {
    warnings.push('docs-variants/ must not be copied to the destination (installer-only source)');
  }
  if (existsSync(join(target, '.opencode/plugins'))) {
    warnings.push('.opencode/plugins/ must not exist (policy: no opencode plugins)');
  }

  if (ctx.includeOpencode) {
    manualSteps.push('1. npm install inside .opencode/ (dependency @opencode-ai/plugin)');
    manualSteps.push('2. (Optional, Claude Code only) npx skills in the destination');
  } else {
    manualSteps.push('1. (Optional, Claude Code only) npx skills in the destination');
  }
  const next = manualSteps.length + 1;
  manualSteps.push(`${next}. Onboarding: graphify update . and the sdd-onboard-project skill flow (refine generic standards, resolve pending placeholders)`);
  manualSteps.push(`${next + 1}. On first spec-from-note use: register the note template path in docs/requirements/REGISTRY.md`);

  return { warnings, manualSteps };
}

