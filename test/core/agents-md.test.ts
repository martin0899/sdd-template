import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manageAgentsMd } from '../../src/core/agents-md';

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-amd-${prefix}-`));
}

const TPL_AGENTS = '# Agents\n\nRules from template: base-standards and graphify-first.\n';

function makeTemplate(content: string): string {
  const tpl = scratch('tpl');
  writeFileSync(join(tpl, 'AGENTS.md'), content);
  return tpl;
}

test('missing AGENTS.md is created from the template', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true });
    assert.equal(r.status, 'created');
    const created = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(created, /^# Agents/);
    assert.match(created, /BEGIN: SDD template rules/);
    assert.match(created, /Rules from template/);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('existing file without rules gets the managed block appended', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  writeFileSync(join(dst, 'AGENTS.md'), '# My project rules\n\nDo things well.\n');
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true });
    assert.equal(r.status, 'appended');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(out, /# My project rules/);
    assert.match(out, /Rules from template/);
    assert.equal((out.match(/BEGIN: SDD template rules/g) ?? []).length, 1);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('second run is a no-op (synced)', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl, dst, { confirmFn: () => true });
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true });
    assert.equal(r.status, 'synced');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('differing block refreshes in place with backup; own content intact', () => {
  const tpl1 = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl1, dst, { confirmFn: () => true });
    const tpl2 = scratch('tpl');
    writeFileSync(join(tpl2, 'AGENTS.md'), '# Agents\nNEW: skills index rule.\n');
    const before = readFileSync(join(dst, 'AGENTS.md'), 'utf8').split('BEGIN:')[0];
    const r = manageAgentsMd(tpl2, dst, { confirmFn: () => true });
    assert.equal(r.status, 'refreshed');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(out, /NEW: skills index rule\./);
    assert.ok(out.startsWith(before), 'own content before block preserved');
    const backups = readdirSync(dst).filter((d) => d.startsWith('.sdd-backup-'));
    assert.equal(backups.length, 1);
    rmSync(tpl2, { recursive: true, force: true });
  } finally {
    rmSync(tpl1, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('differing block with confirm=false is kept', () => {
  const tpl1 = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl1, dst, { confirmFn: () => true });
    const tpl2 = scratch('tpl');
    writeFileSync(join(tpl2, 'AGENTS.md'), '# Agents\nNEW rule.\n');
    const r = manageAgentsMd(tpl2, dst, { confirmFn: () => false });
    assert.equal(r.status, 'kept');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.ok(!out.includes('NEW rule.'));
    rmSync(tpl2, { recursive: true, force: true });
  } finally {
    rmSync(tpl1, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('sentinel without markers is skipped with warning', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    writeFileSync(join(dst, 'AGENTS.md'), '# Rules\nALWAYS use graphify first (legacy, no markers)\n');
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true });
    assert.equal(r.status, 'skipped-sentinel');
    assert.ok(r.warnings.length > 0);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('dry-run writes nothing', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl, dst, { confirmFn: () => true, dryRun: true });
    assert.equal(existsSync(join(dst, 'AGENTS.md')), false);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});
