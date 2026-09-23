import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectTools, TOOLS_CATALOG, labelTool } from '../../src/agents/detect-tools';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-dt-${prefix}-`));
}

test('detects .opencode directory', () => {
  const dst = scratch('opencode');
  try {
    mkdirSync(join(dst, '.opencode'), { recursive: true });
    assert.deepEqual(detectTools(dst), ['opencode']);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('detects multiple tool directories', () => {
  const dst = scratch('multi');
  try {
    mkdirSync(join(dst, '.opencode'), { recursive: true });
    mkdirSync(join(dst, '.claude'), { recursive: true });
    assert.deepEqual(detectTools(dst), ['opencode', 'claude']);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('empty target returns empty array', () => {
  const dst = scratch('empty');
  try {
    assert.deepEqual(detectTools(dst), []);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('labelTool appends (detected) when true', () => {
  const tool = TOOLS_CATALOG.find((t) => t.id === 'opencode')!;
  assert.equal(labelTool(tool, true), 'OpenCode (detected)');
  assert.equal(labelTool(tool, false), 'OpenCode');
});
