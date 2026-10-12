import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  manageAgentsMd,
  detectAgentsMdDrift,
  AGENTS_MARKER_BEGIN,
  AGENTS_MARKER_END,
  AGENTS_SENTINEL
} from '../../src/core/agents-md';

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

// --- repair mode (--repair-agents) ---

function backupDirs(target: string): string[] {
  return readdirSync(target).filter((d) => d.startsWith('.sdd-backup-'));
}

test('repair rebuilds a duplicated managed block into a single block', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const dup = [
    '# My rules',
    AGENTS_MARKER_BEGIN,
    'OLD-1',
    AGENTS_MARKER_END,
    'BETWEEN',
    AGENTS_MARKER_BEGIN,
    'OLD-2',
    AGENTS_MARKER_END,
    '# Tail',
    ''
  ].join('\n');
  writeFileSync(join(dst, 'AGENTS.md'), dup);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'repaired-duplicate');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(out, /# My rules/);
    assert.match(out, /# Tail/);
    assert.match(out, /Rules from template/);
    assert.equal(out.split(AGENTS_MARKER_BEGIN).length - 1, 1);
    assert.equal(out.split(AGENTS_MARKER_END).length - 1, 1);
    assert.ok(!out.includes('OLD-1'));
    assert.ok(!out.includes('OLD-2'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair rebuilds an incomplete block (BEGIN only)', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const inc = ['# My rules', AGENTS_MARKER_BEGIN, 'OLD managed body', ''].join('\n');
  writeFileSync(join(dst, 'AGENTS.md'), inc);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'repaired-incomplete');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(out, /# My rules/);
    assert.match(out, /Rules from template/);
    assert.equal(out.split(AGENTS_MARKER_BEGIN).length - 1, 1);
    assert.equal(out.split(AGENTS_MARKER_END).length - 1, 1);
    assert.ok(!out.includes('OLD managed body'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair rebuilds an incomplete block (END only) preserving trailing content', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const inc = ['OLD managed body', AGENTS_MARKER_END, '# Tail', ''].join('\n');
  writeFileSync(join(dst, 'AGENTS.md'), inc);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'repaired-incomplete');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.match(out, /# Tail/);
    assert.match(out, /Rules from template/);
    assert.equal(out.split(AGENTS_MARKER_BEGIN).length - 1, 1);
    assert.equal(out.split(AGENTS_MARKER_END).length - 1, 1);
    assert.ok(!out.includes('OLD managed body'));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair wraps a legacy sentinel file in markers (repaired-legacy)', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const legacy = `# Legacy rules\n${AGENTS_SENTINEL} (legacy, no markers)\n`;
  writeFileSync(join(dst, 'AGENTS.md'), legacy);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'repaired-legacy');
    const out = readFileSync(join(dst, 'AGENTS.md'), 'utf8');
    assert.ok(out.startsWith(AGENTS_MARKER_BEGIN), 'block opens with BEGIN marker');
    assert.ok(out.trimEnd().endsWith(AGENTS_MARKER_END), 'block closes with END marker');
    assert.equal(out.split(AGENTS_MARKER_BEGIN).length - 1, 1);
    assert.equal(out.split(AGENTS_MARKER_END).length - 1, 1);
    assert.match(out, /Legacy rules/);
    assert.match(out, new RegExp(AGENTS_SENTINEL));
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair requires confirmation even when repair is active', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const dup = [
    '# My rules',
    AGENTS_MARKER_BEGIN,
    'OLD-1',
    AGENTS_MARKER_END,
    AGENTS_MARKER_BEGIN,
    'OLD-2',
    AGENTS_MARKER_END,
    ''
  ].join('\n');
  writeFileSync(join(dst, 'AGENTS.md'), dup);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => false, repair: true });
    assert.equal(r.status, 'kept');
    assert.equal(readFileSync(join(dst, 'AGENTS.md'), 'utf8'), dup, 'declined repair leaves the file untouched');
    assert.equal(backupDirs(dst).length, 0, 'no backup is created when repair is declined');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair creates a backup of the original AGENTS.md', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  const dup = [
    '# My rules',
    AGENTS_MARKER_BEGIN,
    'OLD-1',
    AGENTS_MARKER_END,
    AGENTS_MARKER_BEGIN,
    'OLD-2',
    AGENTS_MARKER_END,
    ''
  ].join('\n');
  writeFileSync(join(dst, 'AGENTS.md'), dup);
  try {
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'repaired-duplicate');
    const backups = backupDirs(dst);
    assert.equal(backups.length, 1, 'one backup directory created');
    assert.equal(readFileSync(join(dst, backups[0], 'AGENTS.md'), 'utf8'), dup, 'backup holds the original content');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('repair on an already-synced block reports synced and creates no backup', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl, dst, { confirmFn: () => true });
    const r = manageAgentsMd(tpl, dst, { confirmFn: () => true, repair: true });
    assert.equal(r.status, 'synced');
    assert.equal(backupDirs(dst).length, 0);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

// --- drift detection (--check / update) ---

test('detectAgentsMdDrift: true when the managed block differs from the template', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  writeFileSync(
    join(dst, 'AGENTS.md'),
    `${AGENTS_MARKER_BEGIN}\nSTALE CONTENT\n${AGENTS_MARKER_END}\n`
  );
  try {
    assert.equal(detectAgentsMdDrift(tpl, dst), true);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('detectAgentsMdDrift: false when the managed block is synced', () => {
  const tpl = makeTemplate(TPL_AGENTS);
  const dst = scratch('dst');
  try {
    manageAgentsMd(tpl, dst, { confirmFn: () => true });
    assert.equal(detectAgentsMdDrift(tpl, dst), false);
  } finally {
    rmSync(tpl, { recursive: true, force: true });
    rmSync(dst, { recursive: true, force: true });
  }
});

test('detectAgentsMdDrift: true for missing file, missing markers, sentinel and duplicates', () => {
  const tpl = makeTemplate(TPL_AGENTS);

  const missing = scratch('dst');
  try {
    assert.equal(detectAgentsMdDrift(tpl, missing), true, 'missing AGENTS.md is drift');
  } finally {
    rmSync(missing, { recursive: true, force: true });
  }

  const noMarkers = scratch('dst');
  writeFileSync(join(noMarkers, 'AGENTS.md'), '# Rules\nno markers here\n');
  try {
    assert.equal(detectAgentsMdDrift(tpl, noMarkers), true, 'no markers is drift (block missing)');
  } finally {
    rmSync(noMarkers, { recursive: true, force: true });
  }

  const sentinel = scratch('dst');
  writeFileSync(join(sentinel, 'AGENTS.md'), `# Rules\n${AGENTS_SENTINEL}\n`);
  try {
    assert.equal(detectAgentsMdDrift(tpl, sentinel), true, 'sentinel without markers is drift');
  } finally {
    rmSync(sentinel, { recursive: true, force: true });
  }

  const duplicate = scratch('dst');
  writeFileSync(
    join(duplicate, 'AGENTS.md'),
    `${AGENTS_MARKER_BEGIN}\nA\n${AGENTS_MARKER_END}\n${AGENTS_MARKER_BEGIN}\nB\n${AGENTS_MARKER_END}\n`
  );
  try {
    assert.equal(detectAgentsMdDrift(tpl, duplicate), true, 'duplicated markers are drift');
  } finally {
    rmSync(duplicate, { recursive: true, force: true });
  }

  rmSync(tpl, { recursive: true, force: true });
});
