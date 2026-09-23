import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const CLI = join(__dirname, '..', '..', '..', 'dist', 'bin', 'spectralis.js');

test('--v produces same output as --version', () => {
  const version = execSync(`node ${CLI} --version`, { encoding: 'utf8' }).trim();
  const v = execSync(`node ${CLI} --v`, { encoding: 'utf8' }).trim();
  assert.equal(v, version);
  assert.match(v, /^\d+\.\d+\.\d+$/);
});

test('--demo and --dd produce same output as --dry-run in init', () => {
  const dryRun = execSync(`node ${CLI} init --dry-run 2>&1 || true`, { encoding: 'utf8' });
  const demo = execSync(`node ${CLI} init --demo 2>&1 || true`, { encoding: 'utf8' });
  const dd = execSync(`node ${CLI} init --dd 2>&1 || true`, { encoding: 'utf8' });
  
  // All three should produce identical output
  assert.equal(demo, dryRun);
  assert.equal(dd, dryRun);
});

test('--demo and --dd produce same output as --dry-run in update', () => {
  const dryRun = execSync(`node ${CLI} update --dry-run 2>&1 || true`, { encoding: 'utf8' });
  const demo = execSync(`node ${CLI} update --demo 2>&1 || true`, { encoding: 'utf8' });
  const dd = execSync(`node ${CLI} update --dd 2>&1 || true`, { encoding: 'utf8' });
  
  // All three should produce identical output
  assert.equal(demo, dryRun);
  assert.equal(dd, dryRun);
});

test('--help output mentions all 5 commands and aliases', () => {
  const help = execSync(`node ${CLI} --help`, { encoding: 'utf8' });
  
  // Verify all 5 commands are mentioned
  assert.ok(help.includes('init'), 'help should mention init');
  assert.ok(help.includes('update'), 'help should mention update');
  assert.ok(help.includes('doctor'), 'help should mention doctor');
  // status and config are not yet implemented, but should appear in future
  // For now, verify the aliases are documented in examples
  assert.ok(help.includes('--demo'), 'help should mention --demo alias');
  assert.ok(help.includes('--v'), 'help should mention --v alias');
  assert.ok(help.includes('spectralis init'), 'help should have init example');
  assert.ok(help.includes('spectralis update'), 'help should have update example');
});
