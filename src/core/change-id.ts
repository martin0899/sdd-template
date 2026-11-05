import { isAbsolute } from 'node:path';

/**
 * Validation of the ids that become path segments.
 *
 * A change id (and the wiki folder of the brain summary) is used to build a
 * path: it must never escape the folder that holds it. The validation lives
 * here so that every command that builds a path from an id shares the same
 * rule.
 */

/** Kebab-case id: lowercase words separated by single hyphens. */
const CHANGE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Windows drive letter (`C:`) that turns a segment into an absolute path. */
const DRIVE_LETTER = /^[A-Za-z]:/;

/**
 * Whether a string can be used as a single path segment.
 *
 * It rejects the empty value, `.` and `..`, the path separators (`/` and
 * `\`), the null bytes and the absolute paths: none of them may escape the
 * folder that holds the segment.
 */
export function isSafeSegment(segment: string): boolean {
  if (typeof segment !== 'string') return false;
  if (segment.trim() === '') return false;
  if (segment.includes('\0')) return false;
  if (segment === '.' || segment === '..') return false;
  if (segment.includes('/') || segment.includes('\\')) return false;
  if (isAbsolute(segment) || DRIVE_LETTER.test(segment)) return false;
  return true;
}

/**
 * Whether a change id can be used as a folder name.
 *
 * A change id is kebab-case in lowercase (it is also the name of the folder
 * of the change and the name of its file in the wiki of the brain).
 */
export function isValidChangeId(changeId: string): boolean {
  if (!isSafeSegment(changeId)) return false;
  return CHANGE_ID.test(changeId);
}
