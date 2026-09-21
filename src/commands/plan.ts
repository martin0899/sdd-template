import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { StackInfo } from '../core/detect-stack';
import { ResolvedAgent } from '../agents/profiles';
import { listPayloadFiles, listDocsFiles } from '../core/copy-payload';
import { SPANISH_CONTEXT_BLOCK } from '../core/spanish-context';

export function buildInitPlan(
  target: string,
  stack: StackInfo,
  profile: ResolvedAgent,
  templateRoot: string
): string[] {
  const lines: string[] = [];
  lines.push('== PLAN (dry-run; nothing written yet) ==');
  lines.push('  1. Prerequisites verified.');
  lines.push(`  -- recognition: ${target}`);
  lines.push(
    existsSync(join(target, 'openspec'))
      ? '     openspec/            EXISTS (preserved; openspec init skipped)'
      : '     openspec/            missing (will be created with openspec init)'
  );
  lines.push(
    existsSync(join(target, 'graphify-out/graph.json'))
      ? '     graphify-out/        EXISTS (knowledge graph present)'
      : "     graphify-out/        missing (create it later: graphify update .)"
  );
  lines.push(`     backend : variant ${stack.backend}${stack.framework ? ` | ${stack.framework}${stack.frameworkVersion ? ` ${stack.frameworkVersion}` : ''}` : ''}${stack.language ? ` | ${stack.language}${stack.languageVersion ? ` ${stack.languageVersion}` : ''}` : ''}`);
  lines.push(`     frontend: variant ${stack.frontend}${stack.frameworkFe ? ` | ${stack.frameworkFe}${stack.frameworkVersionFe ? ` ${stack.frameworkVersionFe}` : ''}` : ''}`);
  lines.push(`     project : ${stack.projectName}${stack.buildTool ? ` | build: ${stack.buildTool}` : ''}${stack.testFramework ? ` | tests: ${stack.testFramework}` : ''}`);
  lines.push('  2. openspec init (non-interactive) with tools: ' + profile.openspecTools);
  lines.push('  3. Spanish context injected by APPEND into openspec/config.yaml:');
  for (const line of SPANISH_CONTEXT_BLOCK) lines.push(`     | ${line}`);
  lines.push('  3b. AGENTS.md managed rules block (create / append / refresh, idempotent).');
  lines.push('  3c. .gitignore managed block (graphify-out/, .sdd-backup-*/, .agents/, .opencode/, skills-lock.json, .claude/).');
  lines.push(`  4. Payload copy (agent profile: ${profile.name}; opencode payload: ${profile.includeOpencode ? 'yes' : 'no'}):`);
  for (const rel of listPayloadFiles(templateRoot, profile.includeOpencode).slice(0, 3)) {
    lines.push(`     + ${rel}`);
  }
  lines.push(`     + ... (${listPayloadFiles(templateRoot, profile.includeOpencode).length} payload files, ${listDocsFiles(templateRoot).length} docs files)`);
  lines.push('  4b. Standards composed from docs-variants/ based on the detected stack:');
  lines.push(
    stack.backend === 'none'
      ? '     backend-standards.md  not copied (frontend-only project)'
      : `     backend-standards.md  <- docs-variants/backend/${stack.backend}.md (known placeholders filled)`
  );
  lines.push(
    stack.frontend === 'none'
      ? '     frontend-standards.md not copied (backend-only project)'
      : `     frontend-standards.md <- docs-variants/frontend/${stack.frontend}.md (known placeholders filled)`
  );
  lines.push('  5. Stack skills (npx autoskills): the user will be asked (Node >= 22; --yes defers it).');
  lines.push('');
  lines.push('Dry-run complete. The destination remains identical. Run without --dry-run to apply.');
  return lines;
}
