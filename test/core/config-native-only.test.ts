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
  const dir = mkdtempSync(join(tmpdir(), 'sp-config-native-'));
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

test('the legacy config is never written', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec'), { recursive: true });
  const written = injectSpanishContextInProject(root);
  assert.deepEqual(written, [], 'a project without spec/ has no config to write');
  assert.equal(
    existsSync(join(root, 'openspec', 'config.yaml')),
    false,
    'the legacy config is never created'
  );
});

test('a project with both layouts gets the context in the native config only', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n', 'utf8');
  const written = injectSpanishContextInProject(root);
  assert.deepEqual(written, [join(root, 'spec', 'config.yaml')]);
  assert.match(readFileSync(join(root, 'spec', 'config.yaml'), 'utf8'), /All interactions/);
  assert.equal(
    readFileSync(join(root, 'openspec', 'config.yaml'), 'utf8'),
    'schema: spec-driven\n',
    'the legacy config is left untouched'
  );
});

test('the native config is never seeded with the content of the legacy config', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\nproyecto: demo\n', 'utf8');
  injectSpanishContextInProject(root);
  const content = readFileSync(join(root, 'spec', 'config.yaml'), 'utf8');
  assert.match(content, /schema: spec-driven/);
  assert.ok(!content.includes('proyecto: demo'), 'the legacy config is never read');
});

test('the injection is idempotent', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  injectSpanishContextInProject(root);
  const first = readFileSync(join(root, 'spec', 'config.yaml'), 'utf8');
  injectSpanishContextInProject(root);
  assert.equal(readFileSync(join(root, 'spec', 'config.yaml'), 'utf8'), first);
});

test('resolveConfigTargets reports the native config only', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  assert.deepEqual(resolveConfigTargets(root), { native: join(root, 'spec', 'config.yaml') });
  mkdirSync(join(root, 'openspec'), { recursive: true });
  assert.deepEqual(resolveConfigTargets(root), { native: join(root, 'spec', 'config.yaml') });
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

test('post-checks does not accept the Spanish context of the legacy config', () => {
  const root = scratch();
  mkdirSync(join(root, 'openspec'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'config.yaml'), 'context: |\n  Language preference: All interactions\n', 'utf8');
  const warnings = runPostChecks(root, postCheckCtx).warnings;
  assert.equal(warnings.filter((w) => w.includes('Spanish context')).length, 1);
});

test('post-checks warns when no config carries the Spanish context', () => {
  const root = scratch();
  mkdirSync(join(root, 'spec'), { recursive: true });
  const warnings = runPostChecks(root, postCheckCtx).warnings;
  assert.equal(warnings.filter((w) => w.includes('Spanish context')).length, 1);
});
