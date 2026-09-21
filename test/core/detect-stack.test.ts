import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack } from '../../src/core/detect-stack';

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'spectralis-stack-'));
}

test('pom.xml with spring-boot-starter -> spring-boot variant', () => {
  const dir = scratch();
  try {
    writeFileSync(
      join(dir, 'pom.xml'),
      `<project><parent><groupId>g</groupId><artifactId>parent</artifactId><version>3.2.0</version></parent>
       <artifactId>demo-app</artifactId><properties><java.version>21</java.version></properties>
       <dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>`
    );
    const s = detectStack(dir);
    assert.equal(s.backend, 'spring-boot');
    assert.equal(s.projectName, 'demo-app');
    assert.equal(s.buildTool, 'Maven');
    assert.equal(s.language, 'Java');
    assert.equal(s.languageVersion, '21');
    assert.equal(s.frontend, 'none');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('package.json with express -> express-node (before generic)', () => {
  const dir = scratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'api', dependencies: { express: '4.19.0', jest: '29' } })
    );
    const s = detectStack(dir);
    assert.equal(s.backend, 'express-node');
    assert.equal(s.framework, 'Express');
    assert.equal(s.frameworkVersion, '4.19.0');
    assert.equal(s.language, 'Node.js');
    assert.equal(s.testFramework, 'jest');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('nestjs wins over express adapter', () => {
  const dir = scratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { '@nestjs/core': '10.0.0', express: '4.18.0' }
      })
    );
    const s = detectStack(dir);
    assert.equal(s.backend, 'nestjs');
    assert.equal(s.framework, 'NestJS');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('react-only project -> frontend react, backend none', () => {
  const dir = scratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { react: '18.3.0' } })
    );
    const s = detectStack(dir);
    assert.equal(s.frontend, 'react');
    assert.equal(s.backend, 'none');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('no indicators -> generic/generic, nothing written', () => {
  const dir = scratch();
  try {
    const s = detectStack(dir);
    assert.equal(s.backend, 'generic');
    assert.equal(s.frontend, 'generic');
    assert.equal(s.projectName, dir.split('/').pop());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detection is read-only (no files created)', () => {
  const dir = scratch();
  try {
    writeFileSync(join(dir, 'go.mod'), 'module demo\nrequire github.com/gin-gonic/gin v1.9.0\n');
    const before: string[] = [];
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    readdirSync(dir).forEach((f) => before.push(f));
    detectStack(dir);
    const after: string[] = [];
    readdirSync(dir).forEach((f) => after.push(f));
    assert.deepEqual(after.sort(), before.sort());
    const s = detectStack(dir);
    assert.equal(s.language, 'Go');
    assert.equal(s.framework, 'Gin');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pyproject.toml with fastapi -> Python backend', () => {
  const dir = scratch();
  try {
    writeFileSync(join(dir, 'pyproject.toml'), '[tool.poetry]\ndependencies = { fastapi = "^0.110" }\n');
    const s = detectStack(dir);
    assert.equal(s.language, 'Python');
    assert.equal(s.framework, 'FastAPI');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('package.json is not picked from .opencode or node_modules', () => {
  const dir = scratch();
  try {
    mkdirSync(join(dir, '.opencode'));
    writeFileSync(
      join(dir, '.opencode', 'package.json'),
      JSON.stringify({ dependencies: { react: '18.0.0' } })
    );
    const s = detectStack(dir);
    assert.equal(s.frontend, 'generic');
    assert.equal(s.backend, 'generic');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
