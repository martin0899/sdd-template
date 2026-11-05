import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Metadata of a change, stored next to its artifacts in `change.json`.
 *
 * The schema is exact: `{ id, nombre, fecha, estado, resumen: { abstracto },
 * enlaces }`. It travels with the change when it is archived and it feeds the
 * summary published in the brain.
 */
export interface ChangeJson {
  /** Id of the change: the name of its folder. */
  id: string;
  /** Human readable name of the change. */
  nombre: string;
  /** Creation date (`YYYY-MM-DD`). */
  fecha: string;
  /** Lifecycle state of the change (e.g. `open`). */
  estado: string;
  /** Short summary of the change. */
  resumen: {
    /** One paragraph summary. */
    abstracto: string;
  };
  /** Links to related artifacts. */
  enlaces: unknown[];
}

/** Name of the metadata file inside the folder of a change. */
export const CHANGE_JSON_FILE = 'change.json';

export interface ChangeJsonValidation {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates the schema of a `change.json` payload.
 *
 * Every mandatory field must be present with the right type; unknown extra
 * fields are tolerated (a newer harness may add metadata).
 */
export function validateChangeJson(data: unknown): ChangeJsonValidation {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['change.json must be an object'] };
  }
  const change = data as Record<string, unknown>;

  if (!isNonEmptyString(change.id)) errors.push('id must be a non-empty string');
  if (typeof change.nombre !== 'string') errors.push('nombre must be a string');
  if (!isNonEmptyString(change.fecha)) errors.push('fecha must be a non-empty string');
  if (!isNonEmptyString(change.estado)) errors.push('estado must be a non-empty string');

  const resumen = change.resumen;
  if (!resumen || typeof resumen !== 'object' || Array.isArray(resumen)) {
    errors.push('resumen must be an object with an abstracto');
  } else if (typeof (resumen as Record<string, unknown>).abstracto !== 'string') {
    errors.push('resumen.abstracto must be a string');
  }

  if (!Array.isArray(change.enlaces)) errors.push('enlaces must be an array');

  return { valid: errors.length === 0, errors };
}

/**
 * Writes the metadata of a change inside its folder.
 *
 * The file always holds the exact schema: no extra key is written.
 */
export function writeChangeJson(dir: string, data: ChangeJson): void {
  const payload: ChangeJson = {
    id: data.id,
    nombre: data.nombre,
    fecha: data.fecha,
    estado: data.estado,
    resumen: { abstracto: data.resumen.abstracto },
    enlaces: Array.isArray(data.enlaces) ? data.enlaces : []
  };
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, CHANGE_JSON_FILE), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

/**
 * Reads the metadata of a change.
 *
 * A missing file is not an error (a legacy change may not have one): it
 * returns `null`. A malformed file is an error: the caller must report it
 * instead of silently continuing with wrong metadata.
 */
export function readChangeJson(dir: string): ChangeJson | null {
  const path = join(dir, CHANGE_JSON_FILE);
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err: unknown) {
    throw new Error(`change.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const validation = validateChangeJson(parsed);
  if (!validation.valid) {
    throw new Error(`invalid change.json: ${validation.errors.join('; ')}`);
  }
  const change = parsed as Record<string, unknown>;
  const resumen = change.resumen as { abstracto: string };
  return {
    id: change.id as string,
    nombre: change.nombre as string,
    fecha: change.fecha as string,
    estado: change.estado as string,
    resumen: { abstracto: resumen.abstracto },
    enlaces: change.enlaces as unknown[]
  };
}
