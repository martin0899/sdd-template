import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyFiles } from '../../src/core/classify-update';
import { writeManifest } from '../../src/core/manifest';
import { injectSpanishContextInProject } from '../../src/core/spanish-context';
import { runPostChecks } from '../../src/core/post-checks';

const REPO = join(__dirname, '..', '..', '..');

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `spectralis-${prefix}-`));
}

/**
 * The legacy config of an existing installation: it exists on disk and it is
 * registered in the manifest of a project installed by an older version.
 */
function seedLegacyConfig(dst: string): void {
  mkdirSync(join(dst, 'openspec'), { recursive: true });
  writeFileSync(join(dst, 'openspec', 'config.yaml'), 'schema: spec-driven\n', 'utf8');
  writeManifest(dst, ['openspec/config.yaml'], '1.0.0', '1.0.0');
}

test('the legacy config is classified as retired, not as a special managed path', () => {
  const dst = scratch('retired-cfg');
  try {
    seedLegacyConfig(dst);
    const { files } = classifyFiles(dst, REPO, true);
    const legacy = files.find((f) => f.rel === 'openspec/config.yaml');
    assert.ok(legacy, 'the legacy config is classified');
    assert.equal(legacy?.status, 'retired');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('the spanish context is written to the native config only', () => {
  const dst = scratch('spanish-native');
  try {
    mkdirSync(join(dst, 'spec'), { recursive: true });
    const written = injectSpanishContextInProject(dst);
    assert.deepEqual(written, [join(dst, 'spec', 'config.yaml')]);
    assert.match(readFileSync(join(dst, 'spec', 'config.yaml'), 'utf8'), /All interactions/);
    assert.ok(!existsSync(join(dst, 'openspec')), 'no legacy directory is created');
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('a legacy config is never read nor written by the spanish context', () => {
  const dst = scratch('spanish-legacy');
  try {
    mkdirSync(join(dst, 'spec'), { recursive: true });
    mkdirSync(join(dst, 'openspec'), { recursive: true });
    const legacy = join(dst, 'openspec', 'config.yaml');
    writeFileSync(legacy, 'schema: spec-driven\n', 'utf8');

    const written = injectSpanishContextInProject(dst);
    assert.deepEqual(written, [join(dst, 'spec', 'config.yaml')]);
    assert.equal(
      readFileSync(legacy, 'utf8'),
      'schema: spec-driven\n',
      'the legacy config is left untouched'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('post-checks look for the spanish context in the native config only', () => {
  const dst = scratch('post-checks-native');
  try {
    mkdirSync(join(dst, 'openspec'), { recursive: true });
    writeFileSync(
      join(dst, 'openspec', 'config.yaml'),
      'context: |\n  Language preference: All interactions\n',
      'utf8'
    );

    const warnings = runPostChecks(dst, {
      backendVariant: 'none',
      frontendVariant: 'none',
      includeOpencode: false
    }).warnings;

    assert.ok(
      warnings.some((w) => /spec\/config\.yaml/.test(w)),
      'the native config is the only one inspected'
    );
    assert.ok(
      !warnings.some((w) => /openspec\/config\.yaml/.test(w)),
      'the legacy config is never inspected'
    );
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});
