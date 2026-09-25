import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', cwd });
}

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'spectralis-skills-int-'));
  mkdirSync(join(root, '.agents', 'skills', 'alpha'), { recursive: true });
  writeFileSync(
    join(root, '.agents', 'skills', 'alpha', 'SKILL.md'),
    '---\nname: alpha\ndescription: Does alpha things.\n---\n# alpha\n'
  );
  return root;
}

test('skills generates _INDEX_SKILLS.json and updates system-reminder', () => {
  const root = makeProject();
  try {
    const result = runCli(['skills'], root);
    assert.equal(result.status, 0, `CLI exited with status ${result.status}: ${result.stderr}`);
    const indexFile = join(root, '_INDEX_SKILLS.json');
    assert.ok(existsSync(indexFile), '_INDEX_SKILLS.json should be created');
    const index = JSON.parse(readFileSync(indexFile, 'utf8'));
    assert.equal(index.version, 1);
    assert.ok(index.timestamp);
    assert.equal(index.skills.length, 1);
    assert.equal(index.skills[0].name, 'alpha');
    const prompt = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    assert.ok(prompt.includes('<system-reminder>'));
    assert.ok(prompt.includes('## Skills disponibles'));
    assert.ok(prompt.includes('- alpha: Does alpha things.'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('skills --dry-run writes nothing', () => {
  const root = makeProject();
  try {
    const result = runCli(['skills', '--dry-run'], root);
    assert.equal(result.status, 0, `CLI exited with status ${result.status}: ${result.stderr}`);
    assert.ok(result.stdout.includes('[DRY RUN]'));
    assert.ok(!existsSync(join(root, '_INDEX_SKILLS.json')), 'index should not be written in dry-run');
    assert.ok(!existsSync(join(root, 'AGENTS.md')), 'AGENTS.md should not be created in dry-run');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});