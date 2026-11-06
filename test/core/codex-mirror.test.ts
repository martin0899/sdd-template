import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mirrorCodexSkills } from '../../src/core/codex-mirror';
import { buildInitPlan } from '../../src/commands/plan';
import { detectStack } from '../../src/core/detect-stack';
import { resolveAgent } from '../../src/agents/profiles';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');

let fakeBin: string;
let home: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  // The PATH has a stub graphify: the mirror does not depend on the graph.
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-codex-mirror-bin-'));
  home = mkdtempSync(join(tmpdir(), 'spectralis-codex-mirror-home-'));
  writeFileSync(join(fakeBin, 'graphify'), '#!/usr/bin/env node\nprocess.exit(0);\n');
  baseEnv = {
    ...process.env,
    HOME: home,
    PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
  };
});

after(() => {
  rmSync(fakeBin, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-codex-mirror-${prefix}-`));
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: baseEnv,
    cwd,
    encoding: 'utf8',
    input: 's\n'
  });
}

function manifestPaths(dst: string): string[] {
  const manifest = JSON.parse(readFileSync(join(dst, '.sdd-manifest.json'), 'utf8')) as {
    files?: { path: string }[];
  };
  return (manifest.files ?? []).map((f) => f.path);
}

test('init --agent codex mirrors .agents/skills into .codex/skills and tracks them in the manifest', () => {
  const dst = scratch('init');
  try {
    const r = runCli(['init', '--agent', 'codex', '--yes', '--no-obsidian'], dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);

    const sourceSkills = readdirSync(join(dst, '.agents', 'skills')).filter((entry) =>
      existsSync(join(dst, '.agents', 'skills', entry, 'SKILL.md'))
    );
    assert.ok(sourceSkills.length > 0, 'the payload must install the shared skills');

    for (const skill of sourceSkills) {
      const source = join(dst, '.agents', 'skills', skill, 'SKILL.md');
      const mirror = join(dst, '.codex', 'skills', skill, 'SKILL.md');
      assert.ok(existsSync(mirror), `.codex/skills/${skill}/SKILL.md must exist`);
      assert.deepEqual(
        readFileSync(mirror),
        readFileSync(source),
        `.codex/skills/${skill}/SKILL.md must mirror the source`
      );
    }

    const paths = manifestPaths(dst);
    for (const skill of sourceSkills) {
      assert.ok(
        paths.includes(`.codex/skills/${skill}/SKILL.md`),
        `the mirror of ${skill} must be a managed path`
      );
    }
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('init without codex does not create the .codex mirror', () => {
  const dst = scratch('no-codex');
  try {
    const r = runCli(['init', '--yes', '--no-obsidian'], dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(existsSync(join(dst, '.codex')), false, 'the mirror must not be created');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update restores a missing mirror file and keeps it in the manifest', () => {
  const dst = scratch('update');
  try {
    const init = runCli(['init', '--agent', 'codex', '--yes', '--no-obsidian'], dst);
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const skills = readdirSync(join(dst, '.codex', 'skills')).filter((entry) =>
      existsSync(join(dst, '.codex', 'skills', entry, 'SKILL.md'))
    );
    assert.ok(skills.length > 0, 'the mirror must exist before the update');
    const victim = join(dst, '.codex', 'skills', skills[0], 'SKILL.md');
    rmSync(victim);

    const update = runCli(['update', '--yes', '--no-obsidian'], dst);
    assert.equal(update.status, 0, update.stderr + update.stdout);
    assert.ok(existsSync(victim), 'the mirror file must be restored by the update');
    assert.ok(
      manifestPaths(dst).includes(`.codex/skills/${skills[0]}/SKILL.md`),
      'the mirror path must stay managed'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update --check reports the mirror when it is out of sync', () => {
  const dst = scratch('check');
  try {
    const init = runCli(['init', '--agent', 'codex', '--yes', '--no-obsidian'], dst);
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const skills = readdirSync(join(dst, '.codex', 'skills')).filter((entry) =>
      existsSync(join(dst, '.codex', 'skills', entry, 'SKILL.md'))
    );
    rmSync(join(dst, '.codex', 'skills', skills[0], 'SKILL.md'));

    const check = runCli(['update', '--check'], dst);
    assert.equal(check.status, 1, 'the check must report pending updates');
    assert.match(check.stdout, /\.codex\/skills mirror \(out of sync\)/);
    assert.equal(
      existsSync(join(dst, '.codex', 'skills', skills[0], 'SKILL.md')),
      false,
      'the check must not write anything'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('update detects a hand-edited mirror: --check reports it and --yes replaces it with a backup', () => {
  const dst = scratch('hand-edit');
  try {
    const init = runCli(['init', '--agent', 'codex', '--yes', '--no-obsidian'], dst);
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const skills = readdirSync(join(dst, '.codex', 'skills')).filter((entry) =>
      existsSync(join(dst, '.codex', 'skills', entry, 'SKILL.md'))
    );
    assert.ok(skills.length > 0, 'the mirror must exist before the update');
    const skill = skills[0];
    const mirror = join(dst, '.codex', 'skills', skill, 'SKILL.md');
    const source = readFileSync(join(dst, '.agents', 'skills', skill, 'SKILL.md'));
    writeFileSync(mirror, 'hand edited by the user\n');

    const check = runCli(['update', '--check'], dst);
    assert.equal(check.status, 1, 'a hand-edited mirror must count as a pending update');
    assert.match(check.stdout, /\.codex\/skills mirror \(out of sync\)/);
    assert.equal(
      readFileSync(mirror, 'utf8'),
      'hand edited by the user\n',
      'the check must not write anything'
    );

    const update = runCli(['update', '--yes', '--no-obsidian'], dst);
    assert.equal(update.status, 0, update.stderr + update.stdout);
    assert.deepEqual(
      readFileSync(mirror),
      source,
      'the update must restore the mirror from the source'
    );

    const backups = readdirSync(dst).filter((entry) => entry.startsWith('.sdd-backup-'));
    const backedUp = backups.some(
      (dir) =>
        existsSync(join(dst, dir, '.codex', 'skills', skill, 'SKILL.md')) &&
        readFileSync(join(dst, dir, '.codex', 'skills', skill, 'SKILL.md'), 'utf8') ===
          'hand edited by the user\n'
    );
    assert.ok(backedUp, 'the replaced mirror file must be backed up before the overwrite');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the mirror copies the whole skill tree, nested files included', () => {
  const dst = scratch('tree');
  try {
    mkdirSync(join(dst, '.agents', 'skills', 'demo', 'references'), { recursive: true });
    writeFileSync(join(dst, '.agents', 'skills', 'demo', 'SKILL.md'), '---\nname: demo\n---\nbody\n');
    writeFileSync(join(dst, '.agents', 'skills', 'demo', 'references', 'extra.md'), 'extra\n');

    const result = mirrorCodexSkills({ target: dst });
    assert.ok(result.paths.includes('.codex/skills/demo/SKILL.md'));
    assert.ok(result.paths.includes('.codex/skills/demo/references/extra.md'));
    assert.equal(
      readFileSync(join(dst, '.codex', 'skills', 'demo', 'references', 'extra.md'), 'utf8'),
      'extra\n'
    );
    assert.deepEqual(result.created.sort(), [
      '.codex/skills/demo/SKILL.md',
      '.codex/skills/demo/references/extra.md'
    ]);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the mirror keeps a hand-edited file when the conflict policy is keep', () => {
  const dst = scratch('conflict');
  try {
    mkdirSync(join(dst, '.agents', 'skills', 'demo'), { recursive: true });
    writeFileSync(join(dst, '.agents', 'skills', 'demo', 'SKILL.md'), 'source\n');
    const dest = join(dst, '.codex', 'skills', 'demo', 'SKILL.md');
    mkdirSync(join(dst, '.codex', 'skills', 'demo'), { recursive: true });
    writeFileSync(dest, 'hand edited\n');

    const result = mirrorCodexSkills({ target: dst, conflictPolicy: 'keep' });
    assert.deepEqual(result.conflicts, ['.codex/skills/demo/SKILL.md']);
    assert.equal(readFileSync(dest, 'utf8'), 'hand edited\n', 'the hand-edited file is preserved');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the mirror replaces an outdated file (the manifest hash still matches) and backs it up', () => {
  const dst = scratch('outdated');
  try {
    mkdirSync(join(dst, '.agents', 'skills', 'demo'), { recursive: true });
    writeFileSync(join(dst, '.agents', 'skills', 'demo', 'SKILL.md'), 'new source\n');
    const dest = join(dst, '.codex', 'skills', 'demo', 'SKILL.md');
    mkdirSync(join(dst, '.codex', 'skills', 'demo'), { recursive: true });
    writeFileSync(dest, 'old mirror\n');

    // The manifest hash of the mirror is the hash of its current content:
    // the mirror is outdated (the source changed), not hand-edited.
    const known = new Map([
      ['.codex/skills/demo/SKILL.md', createHash('sha256').update('old mirror\n').digest('hex')]
    ]);
    const result = mirrorCodexSkills({
      target: dst,
      knownHashes: known,
      conflictPolicy: 'keep',
      backupRoot: '.sdd-backup-test'
    });
    assert.deepEqual(result.updated, ['.codex/skills/demo/SKILL.md']);
    assert.equal(readFileSync(dest, 'utf8'), 'new source\n');
    assert.equal(
      readFileSync(join(dst, '.sdd-backup-test', '.codex', 'skills', 'demo', 'SKILL.md'), 'utf8'),
      'old mirror\n',
      'the replaced file is backed up'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the mirror does nothing when the shared skills directory does not exist', () => {
  const dst = scratch('empty');
  try {
    const result = mirrorCodexSkills({ target: dst });
    assert.deepEqual(result.paths, []);
    assert.equal(result.needsWrite, false);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the init plan mentions the codex mirror only when codex is selected', () => {
  const dst = scratch('plan');
  try {
    const stack = detectStack(dst);
    const profile = resolveAgent('codex');
    const withCodex = buildInitPlan(dst, stack, profile, REPO, ['codex']).join('\n');
    assert.match(withCodex, /\.codex\/skills/, 'the plan must describe the mirror');

    const withoutCodex = buildInitPlan(dst, stack, profile, REPO, ['claude']).join('\n');
    assert.doesNotMatch(withoutCodex, /\.codex\/skills/, 'the mirror is not planned without codex');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the init dry-run of the CLI describes the codex mirror', () => {
  const dst = scratch('dry-run');
  try {
    const r = runCli(['init', '--agent', 'codex', '--dry-run', '--yes', '--no-obsidian'], dst);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /\.codex\/skills/, 'the dry-run plan must describe the mirror');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
