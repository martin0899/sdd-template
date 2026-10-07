import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import type { VaultDoctorFinding } from './vault-doctor';

/**
 * Agent-rules contract: canonical, shared cycle rules (SDD/ODD).
 *
 * The contract is the single source for cycle rules; governed files
 * (project skills under `.agents/skills`) must reference it instead of
 * redefining the rule text. `spectralis check --rules` reports duplicates
 * (warning) and same-phase contradictions (error). Vendor surfaces
 * (`.opencode/commands/opsx-*.md`, `.opencode/skills/openspec-*`) are
 * external references and are never treated as editable sources.
 *
 * OpenSpec stays a non-re-implemented SDD backend: this contract describes
 * cycle rules, not an SDD engine.
 */
export interface CycleRule {
  id: string;
  phase: string;
  phrase: string;
}

/** Stable rule ids and their canonical text (owned by the contract). */
export const CYCLE_RULES: CycleRule[] = [
  {
    id: 'CYCLE-01',
    phase: 'planning',
    phrase: 'un solo ejecutor activo por cambio'
  },
  {
    id: 'CYCLE-02',
    phase: 'execution',
    phrase: 'apply ejecuta solo las tareas existentes'
  },
  {
    id: 'CYCLE-03',
    phase: 'review',
    phrase: 'reporta y no modifica'
  },
  {
    id: 'CYCLE-04',
    phase: 'documentation',
    phrase: 'nunca publiques por tu cuenta'
  }
];

/** Incompatible statements for the same phase (contradiction). */
const CONTRADICTIONS: Array<{ phase: string; a: string; b: string }> = [
  {
    phase: 'execution',
    a: 'un solo ejecutor activo por cambio',
    b: 'pueden ejecutarse dos ejecutores activos por cambio'
  }
];

const CONTRACT_MARKER = 'agent-rules-contract';

/** Recursively collect `SKILL.md` files under a skill root. */
function walkSkillFiles(dir: string): string[] {
  const found: string[] = [];
  const entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkSkillFiles(full));
    } else if (entry.name === 'SKILL.md') {
      found.push(full);
    }
  }
  return found;
}

/** Governed editable sources: project skills under `.agents/skills/`. */
export function listGovernedSkillFiles(projectRoot: string): string[] {
  return walkSkillFiles(join(projectRoot, '.agents', 'skills')).filter(
    (file) => !file.includes(CONTRACT_MARKER)
  );
}

function relativeTo(projectRoot: string, file: string): string {
  return file.replace(join(projectRoot, '') + '/', '');
}

/**
 * Deterministic check of rule duplication/contradiction among governed files.
 */
export function checkRulesContract(projectRoot: string): VaultDoctorFinding[] {
  const project = basename(projectRoot);
  const files = listGovernedSkillFiles(projectRoot);
  const findings: VaultDoctorFinding[] = [];
  const contentOf = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '');

  // Duplicates: a governed file redefines a canonical rule without referencing
  // the contract.
  for (const file of files) {
    const content = contentOf(file);
    if (content.includes(CONTRACT_MARKER)) continue;
    const hit = CYCLE_RULES.find((rule) => content.includes(rule.phrase));
    if (hit) {
      findings.push({
        severity: 'warning',
        project,
        artifact: relativeTo(projectRoot, file),
        suggestion: `La regla ${hit.id} (fase "${hit.phase}") ya se define en el contrato central: referencia a agent-rules-contract en lugar de redefinirla.`
      });
    }
  }

  // Contradictions: same phase, incompatible statements across governed files.
  for (const pair of CONTRADICTIONS) {
    const aFiles = files.filter((file) => contentOf(file).includes(pair.a));
    const bFiles = files.filter((file) => contentOf(file).includes(pair.b));
    if (aFiles.length > 0 && bFiles.length > 0) {
      findings.push({
        severity: 'error',
        project,
        artifact: `${relativeTo(projectRoot, aFiles[0])} y ${relativeTo(projectRoot, bFiles[0])}`,
        suggestion: `Reglas contradictorias para la fase "${pair.phase}": unifica ambas en el contrato central (agent-rules-contract).`
      });
    }
  }

  return findings;
}