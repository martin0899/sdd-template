import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fillPlaceholders,
  resolveVariantFile,
  findUnresolvedPlaceholders,
  reportUnresolved
} from '../../src/core/compose-standards';
import { StackInfo } from '../../src/core/detect-stack';

const base: StackInfo = {
  backend: 'spring-boot',
  frontend: 'react',
  projectName: 'demo-app'
};

test('detectable placeholders are filled from stack info', () => {
  const out = fillPlaceholders(
    'backend',
    '# {{PROJECT_NAME}}\nLanguage: {{LANGUAGE}} {{LANGUAGE_VERSION}}\nFramework: {{FRAMEWORK}} {{FRAMEWORK_VERSION}}\nBuild: {{BUILD_TOOL}} Tests: {{TEST_FRAMEWORK}}\n',
    {
      ...base,
      language: 'Java',
      languageVersion: '21',
      framework: 'Spring Boot',
      frameworkVersion: '3.2.0',
      buildTool: 'Maven',
      testFramework: 'junit'
    }
  );
  assert.ok(!out.includes('{{'));
  assert.match(out, /# demo-app/);
  assert.match(out, /Spring Boot 3\.2\.0/);
  assert.match(out, /Build: Maven Tests: junit/);
});

test('unresolvable placeholders stay visible for onboarding', () => {
  const out = fillPlaceholders(
    'backend',
    'ORM: {{ORM}}\nFramework: {{FRAMEWORK}}\n',
    { ...base, framework: 'Spring Boot' }
  );
  assert.match(out, /\{\{ORM\}\}/);
  assert.match(out, /Spring Boot/);
});

test('placeholder note line is removed only when nothing is left unresolved', () => {
  const note = '> Section values marked with `{{...}}` must be refined during onboarding.\n';
  const full = fillPlaceholders('backend', note + 'Name: {{PROJECT_NAME}}\n', base);
  assert.ok(!full.includes('onboarding'), 'note should disappear');
  const partial = fillPlaceholders('backend', note + 'Name: {{PROJECT_NAME}}\nORM: {{ORM}}\n', base);
  assert.match(partial, /onboarding/, 'note should remain');
});

test('frontend kind takes the framework from frontend fields', () => {
  const out = fillPlaceholders(
    'frontend',
    'Framework: {{FRAMEWORK}} {{FRAMEWORK_VERSION}}\n',
    { ...base, framework: 'Spring Boot', frameworkFe: 'React', frameworkVersionFe: '18.3.0' }
  );
  assert.match(out, /React 18\.3\.0/);
  assert.ok(!out.includes('Spring Boot'));
});

test('resolveVariantFile joins template root with variant kind', () => {
  const p = resolveVariantFile('/tpl', 'backend', 'spring-boot');
  assert.equal(p, '/tpl/docs-variants/backend/spring-boot.md');
});

test('findUnresolvedPlaceholders detects remaining patterns', () => {
  const content = 'Line 1\n{{DATABASE_TYPE}} is here\nLine 3 {{OTHER_TOKEN}}';
  const results = findUnresolvedPlaceholders('test.md', content);
  assert.equal(results.length, 2);
  assert.equal(results[0].placeholder, '{{DATABASE_TYPE}}');
  assert.equal(results[0].line, 2);
});

test('findUnresolvedPlaceholders returns empty when all resolved', () => {
  const content = 'Line 1\nAll resolved here';
  const results = findUnresolvedPlaceholders('test.md', content);
  assert.equal(results.length, 0);
});

test('reportUnresolved formats error message', () => {
  const results = [{ file: 'a.md', line: 5, placeholder: '{{X}}' }];
  const msg = reportUnresolved(results);
  assert.ok(msg.includes('[ERROR]'));
  assert.ok(msg.includes('a.md:5'));
  assert.ok(msg.includes('{{X}}'));
});
