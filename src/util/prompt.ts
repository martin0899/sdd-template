import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let pipedQueue: string[] | undefined;

function ensureQueue(explicit?: string[]): string[] {
  if (explicit) return explicit;
  if (!pipedQueue) {
    if (!process.stdin.isTTY) {
      try {
        pipedQueue = readFileSync(0, 'utf8')
          .split('\n')
          .map((s) => s.trim());
      } catch {
        pipedQueue = [];
      }
    } else {
      pipedQueue = [];
    }
  }
  return pipedQueue;
}

/**
 * Build a synchronous confirm function.
 * - autoYes: always true (--yes mode).
 * - pipedLines: explicit answer queue (used by tests and piped input).
 * - Piped stdin: answers are read once and shifted per question.
 * - Interactive TTY: spawns a child prompt inheriting the terminal.
 *   Exit code 0 = yes, 1 = no.
 */
export function makeConfirm(autoYes: boolean, pipedLines?: string[]): (question: string) => boolean {
  if (autoYes) return () => true;
  return (question: string) => {
    const queue = ensureQueue(pipedLines);
    const next = queue.shift();
    if (next !== undefined) {
      return /^[sSyY]$/.test(next);
    }
    const script = `const rl=require("readline").createInterface({input:process.stdin,output:process.stdout});rl.question(${JSON.stringify(
      `${question} [s/N] `
    )},a=>{rl.close();process.exit(/^[sSyY]$/.test(a.trim())?0:1)});`;
    const result = spawnSync(process.execPath, ['-e', script], { stdio: 'inherit' });
    return result.status === 0;
  };
}
