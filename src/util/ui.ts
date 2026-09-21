import * as os from 'node:os';

export interface Palette {
  check: string;
  cross: string;
  green: (s: string) => string;
  red: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
  prompt: (s: string) => string;
}

const c = (code: string) => (s: string) => `\x1b[${code}m${s}\x1b[0m`;

export const noColor: Palette = {
  check: '[OK]',
  cross: '[FAIL]',
  green: (s) => s,
  red: (s) => s,
  dim: (s) => s,
  bold: (s) => s,
  prompt: (s) => `◆ ${s}`
};

export const ansi: Palette = {
  check: '✔',
  cross: '✖',
  green: c('32'),
  red: c('31'),
  dim: c('2'),
  bold: c('1'),
  prompt: (s) => `${c('35m')}\u25C6\x1b[0m ${s}`
};

function platformSupportsAnsi(): boolean {
  if (process.platform !== 'win32') return true;
  return os.release().startsWith('10.'); // Windows Terminal / recent conhost
}

export function isColorSupported(stream: NodeJS.WriteStream = process.stdout): boolean {
  if (process.env.FORCE_COLOR === '1') return true;
  if (process.env.NO_COLOR) return false;
  if (!stream.isTTY) return false;
  if (process.env.TERM === 'dumb') return false;
  return platformSupportsAnsi();
}

export function check(p: Palette = palette): string {
  return p.check;
}

export function cross(p: Palette = palette): string {
  return p.cross;
}

export function dim(s: string, p: Palette = palette): string {
  return p.dim(s);
}

export function bold(s: string, p: Palette = palette): string {
  return p.bold(s);
}

export function green(s: string, p: Palette = palette): string {
  return p.green(s);
}

export function red(s: string, p: Palette = palette): string {
  return p.red(s);
}

let palette: Palette = noColor;

export function setPalette(next: Palette): void {
  palette = next;
}

export function currentPalette(): Palette {
  if (palette !== noColor) return palette;
  return isColorSupported() ? ansi : noColor;
}

export function printBanner(spectralisVersion: string, templateVersion: string, p: Palette = currentPalette()): string {
  const lines: string[] = [];
  const rule = '─'.repeat(52);
  lines.push(p.bold('  spectralis'));
  lines.push(p.dim('  Spec-Driven Development toolkit · no npm registry'));
  lines.push(p.dim(`  arnés ${spectralisVersion} · template ${templateVersion}`));
  return [rule, ...lines, rule].join('\n');
}

export function phaseLine(
  index: number,
  total: number,
  label: string,
  result: string,
  p: Palette = currentPalette()
): string {
  const num = p.dim(`[${String(index).padStart(2, '0')}/${total}]`);
  const dots = p.dim('.');
  return `${num} ${p.bold(label)} ${'.'.repeat(Math.max(3, 24 - label.length))} ${p.green(result)}`;
}

export function promptMark(s: string, p: Palette = currentPalette()): string {
  return p.prompt(s);
}
