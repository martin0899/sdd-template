export interface AutoskillsInput {
  yes: boolean;
  nodeMajor: number | undefined;
  confirmFn: (question: string) => boolean;
  runner: (cwd: string) => boolean;
  cwd: string;
}

export interface AutoskillsResult {
  executed: boolean;
  pending: boolean;
  reason?: string;
}

export function decideAutoskills(input: AutoskillsInput): AutoskillsResult {
  if (input.yes) {
    return {
      executed: false,
      pending: true,
      reason: '--yes mode: run npx autoskills manually in the destination'
    };
  }
  if (input.nodeMajor === undefined || input.nodeMajor < 22) {
    return {
      executed: false,
      pending: true,
      reason: `npx autoskills requires Node >= 22${input.nodeMajor !== undefined ? ` (detected: ${input.nodeMajor})` : ''}`
    };
  }
  if (
    !input.confirmFn(
      "Run 'npx autoskills' in the destination to install curated stack skills?"
    )
  ) {
    return { executed: false, pending: true, reason: 'skipped by user' };
  }
  const ok = input.runner(input.cwd);
  if (!ok) {
    return { executed: false, pending: true, reason: 'autoskills failed or was cancelled' };
  }
  return { executed: true, pending: false };
}
