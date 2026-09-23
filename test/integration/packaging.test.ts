import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');

test('packed tarball installs globally and resolves the embedded template without the clone', { timeout: 240000 }, () => {
  const work = mkdtempSync(join(tmpdir(), 'spectralis-pack-'));
  try {
    // 1. npm pack from the repo
    const pack = spawnSync('npm', ['pack', '--pack-destination', work], { cwd: REPO, encoding: 'utf8' });
    assert.equal(pack.status, 0, pack.stderr);
    const tarball = join(work, (pack.stdout.trim().split('\n').pop() ?? '').trim());
    assert.match(tarball, /spectralis-1\.2\.0\.tgz$/);

    // 2. global install from the tarball into an isolated prefix
    const prefix = join(work, 'prefix');
    const install = spawnSync('npm', ['i', '-g', tarball, '--prefix', prefix], { encoding: 'utf8' });
    assert.equal(install.status, 0, install.stderr);

    // 3. run doctor and init --dry-run from a scratch cwd (no clone nearby)
    const scratch = mkdtempSync(join(tmpdir(), 'spectralis-scratch-'));
    try {
      const bin = join(prefix, 'bin', 'spectralis');
      assert.ok(existsSync(bin), 'global bin exists');
      const doctor = spawnSync(bin, ['doctor'], { cwd: scratch, encoding: 'utf8' });
      assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);

      const plan = spawnSync(bin, ['init', scratch, '--dry-run'], { cwd: work, encoding: 'utf8' });
      assert.equal(plan.status, 0, plan.stderr + plan.stdout);
      assert.match(plan.stdout, /PLAN/);
      assert.match(plan.stdout, /\.agents\/skills/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
