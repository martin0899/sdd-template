import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const CLI = join(process.cwd(), 'dist', 'bin', 'spectralis.js');

test('--config shows configuration with exit code 0', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-config');
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  
  writeFileSync(join(tmpDir, '.sdd-manifest.json'), JSON.stringify({
    schemaVersion: 2,
    spectralisVersion: '1.1.0',
    templateVersion: '1.1.0',
    tools: ['opencode', 'claude'],
    files: [{ path: 'package.json', hash: 'abc123' }]
  }));
  
  try {
    const result = execSync(`node ${CLI} config`, { 
      cwd: tmpDir, 
      encoding: 'utf8'
    });
    assert.ok(result.includes('[Harness]'), 'Should show Harness section');
    assert.ok(result.includes('spectralis version:'), 'Should show spectralis version');
    assert.ok(result.includes('template version:'), 'Should show template version');
    assert.ok(result.includes('[Tools]'), 'Should show Tools section');
    assert.ok(result.includes('opencode'), 'Should show opencode tool');
    assert.ok(result.includes('claude'), 'Should show claude tool');
    assert.ok(result.includes('[Directories]'), 'Should show Directories section');
    assert.ok(result.includes('[Managed Files]'), 'Should show Managed Files section');
    assert.ok(result.includes('read-only'), 'Should mention read-only');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('--config exits with code 2 when no manifest', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-config-nomanifest');
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  
  try {
    let stderr = '';
    let exitCode = 0;
    try {
      execSync(`node ${CLI} config`, { 
        cwd: tmpDir, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (e: any) {
      stderr = e.stderr;
      exitCode = e.status;
    }
    
    assert.equal(exitCode, 2, 'Exit code should be 2 when no manifest');
    assert.ok(stderr.includes('manifest') || stderr.includes('not been installed'), 'Should show not installed message');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
