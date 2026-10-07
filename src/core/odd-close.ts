import { validateDocumenterRequest, type DocumenterRequest, type DocumenterRequestField } from './documenter-request';

/**
 * ODD close → brain migration contract.
 *
 * When an ODD change finishes with green test evidence, the `coordinador`
 * detects the close and triggers a structured documenter request; the
 * `documentador` prepares content and Spectralis publishes/distills to
 * `05_wiki/` reusing the existing distill pipeline. Migration is proposed and
 * confirmed explicitly; without green tests there is no migration.
 */
export type Mode = 'sdd' | 'odd';
export type Risk = 'low' | 'medium' | 'high';

export interface TestEvidence {
  ok: boolean;
  summary?: string;
}

export interface CloseDetection {
  isClose: boolean;
  problem?: string;
}

/** Detect an ODD close: mode `odd` + green test evidence. */
export function detectOddClose(input: { mode: Mode; tests?: TestEvidence }): CloseDetection {
  if (input.mode !== 'odd') {
    return { isClose: false, problem: 'El cierre ODD aplica solo cuando el modo efectivo es odd.' };
  }
  if (!input.tests) {
    return { isClose: false, problem: 'Sin evidencia de pruebas: no se detecta cierre ni se propone migración.' };
  }
  if (!input.tests.ok) {
    return { isClose: false, problem: 'Pruebas fallidas: no se detecta cierre y no se migra.' };
  }
  return { isClose: true };
}

/** Build a structured documenter request validated by the shared contract. */
export function makeDocumenterRequest(
  input: DocumenterRequest | Partial<DocumenterRequest>
): { ok: boolean; request?: DocumenterRequest; missing?: DocumenterRequestField[] } {
  const validation = validateDocumenterRequest(input);
  if (!validation.ok) return { ok: false, missing: validation.missing };
  return { ok: true, request: input as DocumenterRequest };
}

export interface PreparedDocumentation {
  content: string;
  pending?: string;
}

export type DocumentadorResolver = (request: DocumenterRequest) => PreparedDocumentation;

function safeFallback(request: DocumenterRequest): PreparedDocumentation {
  return {
    content: `# Cierre ODD: ${request.changeId}\n\n- Modo: ${request.mode}\n- Artefactos: ${request.affectedPaths.join(', ')}\n- Evidencia: ${request.testEvidence}\n`,
    pending: request.pending.length > 0 ? `Pendientes declarados: ${request.pending.join(', ')}` : undefined
  };
}

/**
 * The `documentador` prepares content (never publishes directly). With no
 * suitable profile it returns an explicit pending.
 */
export function documentadorPrepara(
  request: DocumenterRequest,
  resolver?: DocumentadorResolver
): PreparedDocumentation {
  try {
    const prepared = (resolver ?? safeFallback)(request);
    return prepared.pending !== undefined
      ? { content: prepared.content, pending: prepared.pending }
      : prepared;
  } catch {
    return { content: '', pending: 'El documentador no pudo resolver la solicitud con su perfil.' };
  }
}

export type PublishFn = (request: DocumenterRequest) => Promise<{ shipped: boolean; problem?: string }>;

/** Spectalis publish/distill to `05_wiki/` reusing `src/core/distill.ts`. */
export async function publicationViaDistill(
  request: DocumenterRequest,
  opts: { projectRoot?: string; vaultRoot?: string } = {}
): Promise<{ shipped: boolean; problem?: string }> {
  try {
    const { runDistill } = (await import('../commands/distill')) as typeof import('../commands/distill');
    const code = await runDistill({
      project: request.changeId,
      projectRoot: opts.projectRoot,
      vaultRoot: opts.vaultRoot
    });
    return { shipped: code === 0, problem: code === 0 ? undefined : `distill terminó con código ${code}` };
  } catch (err) {
    return { shipped: false, problem: err instanceof Error ? err.message : String(err) };
  }
}

export interface OddCloseInput {
  mode: Mode;
  tests?: TestEvidence;
  changeId: string;
  affectedPaths: string[];
  testEvidence: string;
  risk: Risk;
  pending: string[];
}

export type CloseStatus = 'proposed' | 'published' | 'pending' | 'blocked';

export interface CloseMigrationResult {
  status: CloseStatus;
  problem?: string;
  proposal?: string;
  request?: DocumenterRequest;
}

/**
 * Orchestrates the ODD close: detection → structured request → proposal →
 * confirmation → documentador preparation → Spectralis publish/distill.
 */
export async function closeOddChange(
  input: OddCloseInput,
  deps: { confirmed: boolean; documentadorResolver?: DocumentadorResolver; publish?: PublishFn } = {
    confirmed: false
  }
): Promise<CloseMigrationResult> {
  const detection = detectOddClose({ mode: input.mode, tests: input.tests });
  if (!detection.isClose) {
    return { status: 'blocked', problem: detection.problem };
  }

  const requestRes = makeDocumenterRequest({
    mode: input.mode,
    changeId: input.changeId,
    affectedPaths: input.affectedPaths,
    testEvidence: input.testEvidence,
    risk: input.risk,
    pending: input.pending
  });
  if (!requestRes.ok) {
    return {
      status: 'blocked',
      problem: `Solicitud documental incompleta. Faltan: ${requestRes.missing?.join(', ')}.`
    };
  }
  const request = requestRes.request as DocumenterRequest;

  const proposal = `Migración propuesta: consolidar el cierre ODD "${input.changeId}" en 05_wiki/ (pruebas en verde). Requiere confirmación explícita.`;
  if (!deps.confirmed) {
    return { status: 'proposed', proposal, request };
  }

  const prepared = documentadorPrepara(request, deps.documentadorResolver);
  if (prepared.pending !== undefined) {
    return { status: 'pending', problem: prepared.pending, request };
  }

  const publish = deps.publish ?? publicationViaDistill;
  const result = await publish(request);
  if (!result.shipped) {
    return { status: 'blocked', problem: result.problem ?? 'Publicación/destilación fallida.' };
  }
  return { status: 'published', proposal, request };
}