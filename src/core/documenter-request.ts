/**
 * Documenter delegation: structured documentation request contract.
 *
 * Subagents never publish directly; they hand a structured request to the
 * `coordinador`, which consolidates and dispatches it to the logical
 * `documentador` role. This validator is the deterministic gate: an
 * incomplete request is rejected and reports exactly which required fields
 * are missing (pure, no LLM, no dependencies).
 */
export interface DocumenterRequest {
  mode: 'sdd' | 'odd';
  changeId: string;
  affectedPaths: string[];
  testEvidence: string;
  risk: 'low' | 'medium' | 'high';
  pending: string[];
}

export const DOCUMENTER_REQUIRED_FIELDS = [
  'mode',
  'changeId',
  'affectedPaths',
  'testEvidence',
  'risk',
  'pending'
] as const;

export type DocumenterRequestField = (typeof DOCUMENTER_REQUIRED_FIELDS)[number];

export interface DocumenterRequestValidation {
  ok: boolean;
  missing: DocumenterRequestField[];
}

export function validateDocumenterRequest(
  input: Partial<DocumenterRequest> | Record<string, unknown>
): DocumenterRequestValidation {
  const record = input as Record<string, unknown>;
  const missing = DOCUMENTER_REQUIRED_FIELDS.filter((field) => {
    const value = record[field];
    // Empty arrays are present (e.g. no affected paths yet); undefined,
    // null and empty strings are treated as missing.
    return value === undefined || value === null || value === '';
  });
  return { ok: missing.length === 0, missing };
}