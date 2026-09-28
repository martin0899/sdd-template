const MAX_COMPONENT = 99;

export function isValidVersion(version: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(version);
}

function parse(version: string): [number, number, number] {
  if (!isValidVersion(version)) return [1, 0, 0];
  const [major, minor, patch] = version.split('.').map(Number);
  return [major, minor, patch];
}

function clamp(v: number): number {
  return Math.min(v, MAX_COMPONENT);
}

export function bumpPatch(version: string): string {
  const [major, minor, patch] = parse(version);
  if (patch < MAX_COMPONENT) return `${major}.${minor}.${patch + 1}`;
  return bumpMinor(`${major}.${minor}.${patch}`);
}

export function bumpMinor(version: string): string {
  const [major, minor] = parse(version);
  if (minor < MAX_COMPONENT) return `${major}.${minor + 1}.0`;
  return bumpMajor(`${major}.${minor}.0`);
}

export function bumpMajor(version: string): string {
  const [major] = parse(version);
  return `${clamp(major + 1)}.0.0`;
}