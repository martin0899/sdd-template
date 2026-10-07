import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * ODD artifact layout contract.
 *
 * The source of truth of an ODD change lives at `odd/changes/<id>/feature.md`
 * inside the project. ODD never creates, detects, invokes or requires
 * `openspec/` nor the OpenSpec CLI; the only legitimate way to enter
 * `openspec/changes/<id>/` is an explicit, user-authorized promotion.
 *
 * Depends on `add-mode-philosophy-cascade` for the effective mode; this module
 * must only be used when the resolved philosophy is `odd`.
 */
export const FEATURE_SECTIONS = ['Contexto', 'Decisiones', 'Evidencia'] as const;

export type OddChangeSize = 'small' | 'substantial';

export function oddChangesDir(projectRoot: string): string {
  return join(projectRoot, 'odd', 'changes');
}

export function oddChangeDir(projectRoot: string, changeId: string): string {
  return join(oddChangesDir(projectRoot), changeId);
}

/** Resolve the ODD source-of-truth path for a change. Never touches openspec/. */
export function resolveOddFeaturePath(projectRoot: string, changeId: string): string {
  return join(oddChangeDir(projectRoot, changeId), 'feature.md');
}

/** Live-document template: context, decisions and verifiable evidence. */
export function featureTemplate(changeId: string): string {
  return `# Feature ODD: ${changeId}

## Contexto
_Pendiente_

## Decisiones
_Pendiente_

## Evidencia
- Referencia al commit: _pendiente_
`;
}

/** Create the ODD feature document (source of truth) for a change. */
export function createFeatureDoc(projectRoot: string, changeId: string): string {
  const path = resolveOddFeaturePath(projectRoot, changeId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, featureTemplate(changeId), 'utf8');
  return path;
}

export function hasFeatureDoc(projectRoot: string, changeId: string): boolean {
  return existsSync(resolveOddFeaturePath(projectRoot, changeId));
}

export function readFeatureDoc(projectRoot: string, changeId: string): string | undefined {
  const path = resolveOddFeaturePath(projectRoot, changeId);
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

/**
 * Size classification by the resume test (request + `git diff`), not by
 * counting files, commands, tests or tasks. A change that can be resumed from
 * the request plus the working diff is small; anything else is substantial and
 * must register its ODD source of truth before the first code write.
 */
export function classifyOddChangeSize(resumableFromRequestAndDiff: boolean): OddChangeSize {
  return resumableFromRequestAndDiff ? 'small' : 'substantial';
}

export interface OddRequirementsCheck {
  ok: boolean;
  requiredDocs: string[];
  problem?: string;
}

/** Enforce the ODD documentation gate for a change before code is written. */
export function checkOddChangeRequirements(
  projectRoot: string,
  changeId: string,
  size: OddChangeSize
): OddRequirementsCheck {
  if (size === 'small') {
    return { ok: true, requiredDocs: [] };
  }
  const featurePath = resolveOddFeaturePath(projectRoot, changeId);
  if (!hasFeatureDoc(projectRoot, changeId)) {
    return {
      ok: false,
      requiredDocs: [featurePath],
      problem: `Cambio ODD sustancial: se requiere ${featurePath} antes de la primera escritura de código.`
    };
  }
  return { ok: true, requiredDocs: [featurePath] };
}

function extractSection(content: string, heading: string): string {
  const lines = content.split('\n');
  const idx = lines.findIndex((line) => line.trim().startsWith(`## ${heading}`));
  if (idx === -1) return '_Pendiente_';
  const section: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^#/.test(lines[i])) break;
    section.push(lines[i]);
  }
  return section.join('\n').trim() || '_Pendiente_';
}

export interface PromotionResult {
  ok: boolean;
  generated: string[];
  sourceOfTruth?: string;
  problem?: string;
}

/**
 * Explicit, user-authorized ODD→SDD promotion. Generates the formal SDD
 * artifacts from `feature.md`, preserves `odd/changes/<id>/` as history and
 * declares the resulting source of truth. Never runs automatically.
 */
export function promoteOddToSdd(input: {
  projectRoot: string;
  changeId: string;
  authorized: boolean;
}): PromotionResult {
  const { projectRoot, changeId, authorized } = input;
  const featurePath = resolveOddFeaturePath(projectRoot, changeId);
  if (!authorized) {
    return {
      ok: false,
      generated: [],
      problem: `Promoción ODD→SDD no autorizada para "${changeId}": no se generan artefactos ni se cambia el modo.`
    };
  }
  const feature = readFeatureDoc(projectRoot, changeId) ?? featureTemplate(changeId);
  const sddDir = join(projectRoot, 'openspec', 'changes', changeId);
  mkdirSync(sddDir, { recursive: true });
  const artifacts: Record<string, string> = {
    'proposal.md': [
      `# Proposal — ${changeId}`,
      '',
      `> Generado por promoción ODD→SDD desde \`${featurePath}\`.`,
      '',
      extractSection(feature, 'Contexto')
    ].join('\n'),
    'design.md': [`# Design — ${changeId}`, '', extractSection(feature, 'Decisiones')].join('\n'),
    'tasks.md': [`# Tasks — ${changeId}`, '', extractSection(feature, 'Evidencia')].join('\n')
  };
  const generated: string[] = [];
  for (const [name, content] of Object.entries(artifacts)) {
    const path = join(sddDir, name);
    writeFileSync(path, content, 'utf8');
    generated.push(path);
  }
  // odd/changes/<id>/ is kept untouched as the ODD history.
  return { ok: true, generated, sourceOfTruth: join('openspec', 'changes', changeId) };
}

export interface LayoutSeparationGuard {
  blocked: boolean;
  warning?: string;
}

/**
 * Strict folder separation between `odd/changes/<id>/` and
 * `openspec/changes/<id>/`. Any coexistence of both folders for the same
 * change without an authorized promotion is flagged and never mixed.
 */
export function guardLayoutSeparation(input: {
  projectRoot: string;
  changeId: string;
  authorizedPromotion?: boolean;
}): LayoutSeparationGuard {
  const { projectRoot, changeId, authorizedPromotion } = input;
  const oddDir = oddChangeDir(projectRoot, changeId);
  const sddDir = join(projectRoot, 'openspec', 'changes', changeId);
  const bothExist = existsSync(oddDir) && existsSync(sddDir);
  if (bothExist && !authorizedPromotion) {
    return {
      blocked: true,
      warning: `Layout ODD/SDD mezclado para "${changeId}": coexisten ${oddDir} y ${sddDir} sin promoción autorizada. No se realiza la mezcla.`
    };
  }
  return { blocked: false };
}