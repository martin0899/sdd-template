import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const CLI = join(process.cwd(), 'dist', 'bin', 'spectralis.js');

test('--check shows updates available with exit code 1', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-check');
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  
  writeFileSync(join(tmpDir, '.sdd-manifest.json'), JSON.stringify({
    schemaVersion: 2,
    spectralisVersion: '1.0.0',
    templateVersion: '1.0.0',
    tools: ['opencode'],
    files: [{ path: 'nonexistent.md', hash: 'abc123' }]
  }));
  
  try {
    let stdout = '';
    let exitCode = 0;
    try {
      execSync(`node ${CLI} update --check`, { 
        cwd: tmpDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (e: any) {
      stdout = e.stdout;
      exitCode = e.status;
    }
    
    assert.equal(exitCode, 1, 'Exit code should be 1 when updates available');
    assert.ok(stdout.includes('tools: opencode'), 'Should show tools');
    assert.ok(stdout.includes('Updates available'), 'Should show updates available');
    assert.ok(stdout.includes('new file'), 'Should show new files');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
