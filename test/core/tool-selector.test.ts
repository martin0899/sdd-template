import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTools } from '../../src/core/tool-selector';
import { TOOLS_CATALOG, type ToolDef } from '../../src/agents/detect-tools';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-ts-${prefix}-`));
}

test('resolveTools with --agent flag returns flag value', () => {
  const dst = scratch('flag');
  try {
    const r = resolveTools({ target: dst, agentFlag: 'claude' });
    assert.deepEqual(r.selected, ['claude']);
    assert.equal(r.source, 'flag');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('resolveTools with --yes uses detection', () => {
  const dst = scratch('yes');
  try {
    mkdirSync(join(dst, '.opencode'), { recursive: true });
    const r = resolveTools({ target: dst, yes: true });
    assert.ok(r.selected.includes('opencode'));
    assert.equal(r.source, 'detection');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('resolveTools non-TTY uses detection', () => {
  const dst = scratch('notty');
  try {
    // Simulate non-TTY by saving/restoring isTTY.
    const originalIsTTY = process.stdin.isTTY;
    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
      const r = resolveTools({ target: dst });
      assert.ok(r.selected.includes('opencode'));
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    }
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('resolveTools includes detected tools in pre-selection', () => {
  const dst = scratch('detected');
  try {
    mkdirSync(join(dst, '.claude'), { recursive: true });
    mkdirSync(join(dst, '.opencode'), { recursive: true });
    const r = resolveTools({ target: dst });
    assert.ok(r.selected.includes('opencode'));
    assert.ok(r.selected.includes('claude'));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
