import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPostChecks } from '../../src/core/post-checks';

function buildTarget(complete: boolean): string {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-pc-'));
  if (complete) {
    for (const dir of ['openspec', 'graphify-out', '.agents/skills/commit', '.agents/skills/spec-from-note', '.opencode', 'docs']) {
      mkdirSync(join(dst, dir), { recursive: true });
    }
    writeFileSync(join(dst, 'openspec/config.yaml'), 'context: |\n  Language preference: All interactions\n');
    writeFileSync(join(dst, '.agents/skills/commit/SKILL.md'), 'x');
    writeFileSync(join(dst, '.agents/skills/INDEX.md'), 'x');
    writeFileSync(join(dst, '.agents/skills/spec-from-note/SKILL.md'), 'x');
    writeFileSync(join(dst, '.opencode/package.json'), '{}');
    writeFileSync(join(dst, 'docs/backend-standards.md'), 'x');
    writeFileSync(join(dst, 'docs/frontend-standards.md'), 'x');
    writeFileSync(join(dst, '.sdd-manifest.json'), '{"schemaVersion": 2, "files": []}');
    writeFileSync(join(dst, 'graphify-out/graph.json'), '{}');
  }
  return dst;
}

const completeCtx = {
  backendVariant: 'spring-boot' as const,
  frontendVariant: 'react' as const,
  includeOpencode: true,
  autoskillsPending: false
};

test('complete destination produces no warnings and full manual steps', () => {
  const dst = buildTarget(true);
  try {
    const r = runPostChecks(dst, completeCtx);
    assert.deepEqual(r.warnings, []);
    assert.ok(r.manualSteps.some((s) => s.includes('npm install')));
    assert.ok(r.manualSteps.some((s) => s.includes('graphify update')));
    assert.ok(r.manualSteps.some((s) => s.includes('REGISTRY.md')));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('missing artifacts are reported file by file', () => {
  const dst = buildTarget(false);
  try {
    const r = runPostChecks(dst, completeCtx);
    const text = r.warnings.join('\n');
    assert.match(text, /openspec\/config.yaml/);
    assert.match(text, /commit\/SKILL\.md/);
    assert.match(text, /INDEX\.md/);
    assert.match(text, /spec-from-note/);
    assert.match(text, /\.opencode\/package\.json/);
    assert.match(text, /backend-standards\.md/);
    assert.match(text, /frontend-standards\.md/);
    assert.match(text, /\.sdd-manifest\.json/);
    assert.match(text, /graphify-out/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('forbidden artifacts in the destination raise warnings', () => {
  const dst = buildTarget(true);
  try {
    writeFileSync(join(dst, 'install.sh'), 'x');
    mkdirSync(join(dst, 'docs-variants'));
    mkdirSync(join(dst, '.opencode/plugins'));
    const text = runPostChecks(dst, completeCtx).warnings.join('\n');
    assert.match(text, /install\.sh/);
    assert.match(text, /docs-variants/);
    assert.match(text, /\.opencode\/plugins/);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('pure backend omits frontend standard checks; generic warns about onboarding', () => {
  const dst = buildTarget(true);
  try {
    const r = runPostChecks(dst, { ...completeCtx, frontendVariant: 'none', backendVariant: 'generic' });
    const text = r.warnings.join('\n');
    assert.match(text, /generic/i);
    assert.equal(r.warnings.filter((w) => w.includes('frontend-standards')).length, 0);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('autoskills pending surfaces in warnings and manual steps', () => {
  const dst = buildTarget(true);
  try {
    const r = runPostChecks(dst, { ...completeCtx, autoskillsPending: true });
    assert.ok(r.warnings.some((w) => w.includes('autoskills')));
    assert.ok(r.manualSteps.some((s) => s.includes('npx autoskills')));
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('opencode payload excluded -> .opencode checks skipped, npm install step absent', () => {
  const dst = buildTarget(true);
  try {
    rmSync(join(dst, '.opencode'), { recursive: true, force: true });
    const r = runPostChecks(dst, { ...completeCtx, includeOpencode: false });
    assert.equal(r.warnings.filter((w) => w.includes('.opencode/package.json')).length, 0);
    assert.equal(r.manualSteps.filter((s) => s.includes('.opencode/')).length, 0);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
