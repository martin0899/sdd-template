import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseYaml } from '../helpers/yaml';
import { listDocsFiles } from '../../src/core/copy-payload';

const REPO = join(__dirname, '..', '..', '..');
const CLI = join(REPO, 'dist', 'bin', 'spectralis.js');

let fakeBin: string;
let baseEnv: NodeJS.ProcessEnv;

before(() => {
  fakeBin = mkdtempSync(join(tmpdir(), 'spectralis-fakebin-'));
  writeFileSync(join(fakeBin, 'graphify'), '#!/usr/bin/env node\nprocess.exit(0);\n');
  baseEnv = {
    ...process.env,
    PATH: `${fakeBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`
  };
});

after(() => {
  rmSync(fakeBin, { recursive: true, force: true });
});

function runCli(args: string[], input?: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: baseEnv,
    encoding: 'utf8',
    input
  });
}

function lineCount(text: string): number {
  return text.replace(/\n+$/, '').split('\n').length;
}

/** Product-specific references that must not leak into destination projects. */
const PRODUCT_REFERENCES: RegExp[] = [
  /\bLTI\b/i,
  /\bATS\b/i,
  /Learning Technology Initiative/i,
  /\bcandidates?\b/i,
  /\bapplications?\b/i,
  /\binterviews?\b/i,
  /\bresumes?\b/i,
  /\bworkExperiences?\b/i
];

function assertNoProductReferences(content: string, file: string): void {
  // MIME types (`application/json`) are protocol tokens, not product entities.
  const scrubbed = content.replace(/application\/[a-z0-9.+-]+/gi, '');
  for (const re of PRODUCT_REFERENCES) {
    assert.ok(
      !re.test(scrubbed),
      `${file} must not reference product-specific entities (matched ${re})`
    );
  }
}

function assertOpenApiSkeleton(content: string, file: string): void {
  const doc = parseYaml(content) as {
    openapi?: string;
    info?: { title?: string };
    paths?: Record<string, unknown>;
    components?: { schemas?: Record<string, unknown> };
  };
  assert.equal(doc.openapi, '3.0.0', `${file} must declare openapi 3.0.0`);
  assert.ok(doc.info?.title, `${file} must carry an info.title`);
  assert.ok(doc.paths, `${file} must declare paths`);
  assert.ok('/health' in (doc.paths ?? {}), `${file} must expose a /health path`);
  assert.deepEqual(
    doc.components?.schemas ?? {},
    {},
    `${file} must ship empty components.schemas`
  );
  assertNoProductReferences(content, file);
}

function assertDataModelStub(content: string, file: string): void {
  assert.match(content, /\{\{entities\}\}/, `${file} must keep the {{entities}} placeholder`);
  assert.match(content, /graphify query/, `${file} must instruct how to run graphify query`);
  assert.match(content, /graphify explain/, `${file} must instruct how to run graphify explain`);
  assertNoProductReferences(content, file);
}

function assertDevelopmentGuideStub(content: string, file: string): void {
  for (const section of ['Setup', 'Commands', 'Structure', 'Environment']) {
    assert.match(
      content,
      new RegExp(`^##\\s+${section}\\s*$`, 'm'),
      `${file} must keep the "${section}" section`
    );
  }
  assert.match(content, /\{\{stack\}\}/, `${file} must keep the {{stack}} placeholder`);
  assert.match(content, /\{\{commands\}\}/, `${file} must keep the {{commands}} placeholder`);
  assert.ok(
    !/git\s+clone/i.test(content),
    `${file} must not carry clone instructions for foreign repositories`
  );
  assert.ok(
    !/github\.com|gitlab\.com|bitbucket\.org/i.test(content),
    `${file} must not carry remote repository URLs`
  );
  for (const secret of [/PASSWORD\s*[:=]/i, /SECRET\s*[:=]/i, /TOKEN\s*[:=]/i, /API_?KEY\s*[:=]/i]) {
    assert.ok(!secret.test(content), `${file} must not hardcode credentials (matched ${secret})`);
  }
  assert.ok(
    !content.includes('D1ymf8wyQEGthFR1E9xhCq'),
    `${file} must not carry the previously hardcoded database password`
  );
  assertNoProductReferences(content, file);
}

test('docs/api-spec.yml is a neutral OpenAPI 3 skeleton under 30 lines', () => {
  const file = join(REPO, 'docs', 'api-spec.yml');
  const content = readFileSync(file, 'utf8');
  assertOpenApiSkeleton(content, 'docs/api-spec.yml');
  assert.ok(
    lineCount(content) < 30,
    `docs/api-spec.yml must be under 30 lines, got ${lineCount(content)}`
  );
});

test('docs/data-model.md is a neutral placeholder under 20 lines', () => {
  const file = join(REPO, 'docs', 'data-model.md');
  const content = readFileSync(file, 'utf8');
  assertDataModelStub(content, 'docs/data-model.md');
  assert.ok(
    lineCount(content) < 20,
    `docs/data-model.md must be under 20 lines, got ${lineCount(content)}`
  );
});

test('docs/development_guide.md has neutral placeholder sections under 40 lines', () => {
  const file = join(REPO, 'docs', 'development_guide.md');
  const content = readFileSync(file, 'utf8');
  assertDevelopmentGuideStub(content, 'docs/development_guide.md');
  assert.ok(
    lineCount(content) < 40,
    `docs/development_guide.md must be under 40 lines, got ${lineCount(content)}`
  );
});

test('init installs the neutral stubs in the destination project', () => {
  const dst = mkdtempSync(join(tmpdir(), 'spectralis-stubs-'));
  try {
    const init = runCli(['init', dst, '--yes'], 's\n');
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const api = readFileSync(join(dst, 'docs', 'api-spec.yml'), 'utf8');
    assertOpenApiSkeleton(api, 'docs/api-spec.yml (destination)');
    assert.ok(lineCount(api) < 30);

    const model = readFileSync(join(dst, 'docs', 'data-model.md'), 'utf8');
    assertDataModelStub(model, 'docs/data-model.md (destination)');
    assert.ok(lineCount(model) < 20);

    const guide = readFileSync(join(dst, 'docs', 'development_guide.md'), 'utf8');
    assertDevelopmentGuideStub(guide, 'docs/development_guide.md (destination)');
    assert.ok(lineCount(guide) < 40);
  } finally {
    rmSync(dst, { recursive: true, force: true });
  }
});

test('listDocsFiles ships the stubs and still excludes graphify-out and manuals', () => {
  const tpl = mkdtempSync(join(tmpdir(), 'spectralis-stubs-tpl-'));
  try {
    mkdirSync(join(tpl, 'docs', 'manuals'), { recursive: true });
    mkdirSync(join(tpl, 'docs', 'graphify-out'), { recursive: true });
    writeFileSync(join(tpl, 'docs', 'manuals', 'x.md'), 'manual\n');
    writeFileSync(join(tpl, 'docs', 'graphify-out', 'graph.json'), '{}\n');
    writeFileSync(join(tpl, 'docs', 'api-spec.yml'), 'openapi: 3.0.0\n');
    writeFileSync(join(tpl, 'docs', 'data-model.md'), '# stub\n');
    writeFileSync(join(tpl, 'docs', 'development_guide.md'), '# stub\n');

    const rels = listDocsFiles(tpl);
    assert.ok(rels.includes('docs/api-spec.yml'), 'api-spec stub travels in the payload');
    assert.ok(rels.includes('docs/data-model.md'), 'data-model stub travels in the payload');
    assert.ok(rels.includes('docs/development_guide.md'), 'development guide stub travels in the payload');
    assert.ok(!rels.includes('docs/manuals/x.md'), 'manuals stay excluded');
    assert.ok(!rels.includes('docs/graphify-out/graph.json'), 'graphify-out stays excluded');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
  }
});

test('the real template payload exposes the three stubs to init', () => {
  const rels = listDocsFiles(REPO);
  for (const rel of ['docs/api-spec.yml', 'docs/data-model.md', 'docs/development_guide.md']) {
    assert.ok(rels.includes(rel), `${rel} must be part of the distributed payload`);
  }
  assert.ok(existsSync(join(REPO, 'docs', 'api-spec.yml')));
});
