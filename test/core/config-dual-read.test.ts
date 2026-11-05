import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  injectSpanishContextInProject,
  resolveConfigTargets
} from '../../src/core/spanish-context';
import { runPostChecks } from '../../src/core/post-checks';

const created: string[] = [];

afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-config-dual-'));
  created.push(dir);
  return dir;
}

const SPANISH = 'Language preference: All interactions';

test('a spec-native project gets the Spanish context in its own config', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  const written = injectSpanishContextInProject(root);
  assert.deepEqual(written, [join(root, 'spec', 'config.yaml')]);
  const content = readFileSync(join(root, 'spec', 'config.yaml'), 'utf8');
  assert.match(content, /All interactions/);
});

test('a legacy project keeps the Spanish context in openspec/config.yaml', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n', 'utf8');
  const written = injectSpanishContextInProject(root);
  assert.deepEqual(written, [join(root, 'openspec', 'config.yaml')]);
  const content = readFileSync(join(root, 'openspec', 'config.yaml'), 'utf8');
  assert.match(content, /All interactions/);
  assert.equal(existsSync(join(root, 'spec', 'config.yaml')), false, 'the native config is not created');
});

test('a project with both layouts gets the context in both configs', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n', 'utf8');
  const written = injectSpanishContextInProject(root);
  assert.equal(written.length, 2);
  assert.match(readFileSync(join(root, 'spec', 'config.yaml'), 'utf8'), /All interactions/);
  assert.match(readFileSync(join(root, 'openspec', 'config.yaml'), 'utf8'), /All interactions/);
});

test('the native config is seeded with the content of the legacy config', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\nproyecto: demo\n', 'utf8');
  injectSpanishContextInProject(root);
  const content = readFileSync(join(root, 'spec', 'config.yaml'), 'utf8');
  assert.match(content, /schema: spec-driven/);
  assert.match(content, /proyecto: demo/);
});

test('the injection is idempotent', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  injectSpanishContextInProject(root);
  const first = readFileSync(join(root, 'spec', 'config.yaml'), 'utf8');
  injectSpanishContextInProject(root);
  assert.equal(readFileSync(join(root, 'spec', 'config.yaml'), 'utf8'), first);
});

test('resolveConfigTargets reports the config of each layout', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  assert.deepEqual(resolveConfigTargets(root), { native: join(root, 'spec', 'config.yaml') });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  assert.deepEqual(resolveConfigTargets(root), {
    native: join(root, 'spec', 'config.yaml'),
    legacy: join(root, 'openspec', 'config.yaml')
  });
});

const postCheckCtx = {
  backendVariant: 'none' as const,
  frontendVariant: 'none' as const,
  includeOpencode: false
};

test('post-checks accepts the Spanish context in the native config', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  writeFileSync(join(root, 'spec', 'config.yaml'), 'context: |\n  Language preference: All interactions\n', 'utf8');
  const warnings = runPostChecks(root, postCheckCtx).warnings;
  assert.equal(warnings.filter((w) => w.includes('Spanish context')).length, 0);
});

test('post-checks accepts the Spanish context in the legacy config', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'context: |\n  Language preference: All interactions\n', 'utf8');
  const warnings = runPostChecks(root, postCheckCtx).warnings;
  assert.equal(warnings.filter((w) => w.includes('Spanish context')).length, 0);
});

test('post-checks warns when no config carries the Spanish context', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  const warnings = runPostChecks(root, postCheckCtx).warnings;
  assert.equal(warnings.filter((w) => w.includes('Spanish context')).length, 1);
});
