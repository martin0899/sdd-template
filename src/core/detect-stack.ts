import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

export type BackendVariant = 'spring-boot' | 'express-node' | 'nestjs' | 'generic' | 'none';
export type FrontendVariant = 'react' | 'angular' | 'generic' | 'none';

export interface StackInfo {
  backend: BackendVariant;
  frontend: FrontendVariant;
  projectName: string;
  language?: string;
  languageVersion?: string;
  framework?: string;
  frameworkVersion?: string;
  buildTool?: string;
  testFramework?: string;
  frameworkFe?: string;
  frameworkVersionFe?: string;
}

const INDICATORS = [
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'Gemfile'
];

function indicatorFile(target: string, name: string): string | undefined {
  const root = join(target, name);
  if (existsSync(root)) return root;
  let entries: string[];
  try {
    entries = readdirSync(target, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return undefined;
  }
  for (const sub of entries) {
    if (sub === 'node_modules' || sub === '.opencode' || sub.startsWith('.sdd-backup-')) continue;
    const candidate = join(target, sub, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function findPackageJson(target: string): string | undefined {
  const direct = indicatorFile(target, 'package.json');
  if (direct && !direct.includes(`${target}/.opencode/`)) return direct;
  return undefined;
}

function hasDep(pkgFile: string, dep: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return dep in (pkg.dependencies ?? {}) || dep in (pkg.devDependencies ?? {});
  } catch {
    return false;
  }
}

function depValue(pkgFile: string, dep: string): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return (pkg.dependencies ?? {})[dep] ?? (pkg.devDependencies ?? {})[dep];
  } catch {
    return undefined;
  }
}

function xmlValue(file: string, tag: string): string | undefined {
  const content = readFileSync(file, 'utf8');
  const match = new RegExp(`<${tag}>[^<]*`).exec(content);
  return match ? match[0].replace(`<${tag}>`, '') : undefined;
}

function pomArtifactId(file: string): string | undefined {
  const content = readFileSync(file, 'utf8');
  const afterParent = /<\/parent>[\s\S]*?<artifactId>([^<]+)/.exec(content);
  if (afterParent) return afterParent[1];
  return xmlValue(file, 'artifactId');
}

function pomParentVersion(file: string): string | undefined {
  const content = readFileSync(file, 'utf8');
  const match = /<parent>[\s\S]*?<version>([^<]+)/.exec(content);
  return match ? match[1] : undefined;
}

export function detectStack(target: string): StackInfo {
  const info: StackInfo = { backend: 'generic', frontend: 'generic', projectName: basename(target) };
  let pkgFile: string | undefined;

  // --- backend ---
  const pom = indicatorFile(target, 'pom.xml');
  if (pom) {
    info.buildTool = 'Maven';
    info.language = 'Java';
    info.languageVersion = xmlValue(pom, 'java.version');
    if (readFileSync(pom, 'utf8').includes('spring-boot-starter')) {
      info.backend = 'spring-boot';
      info.framework = 'Spring Boot';
      info.frameworkVersion = pomParentVersion(pom);
    }
  } else {
    const gradle = indicatorFile(target, 'build.gradle') ?? indicatorFile(target, 'build.gradle.kts');
    if (gradle) {
      info.language = 'Java';
      info.buildTool = 'Gradle';
      const gradleContent = readFileSync(gradle, 'utf8');
      if (gradleContent.includes('org.springframework.boot')) {
        info.backend = 'spring-boot';
        info.framework = 'Spring Boot';
        const v = /org\.springframework\.boot['"] version ['"]([^'"]+)/.exec(gradleContent);
        info.frameworkVersion = v ? v[1] : undefined;
        const jvm = /(?:sourceCompatibility\s*=\s*["']?(\d+))|jvmToolchain\((\d+)/.exec(gradleContent);
        info.languageVersion = jvm ? (jvm[1] ?? jvm[2]) : undefined;
      }
    } else if ((pkgFile = findPackageJson(target))) {
      info.language = 'Node.js';
      info.buildTool = 'npm';
      info.languageVersion = depValue(pkgFile, 'node');
      if (hasDep(pkgFile, '@nestjs/core')) {
        info.backend = 'nestjs';
        info.framework = 'NestJS';
        info.frameworkVersion = depValue(pkgFile, '@nestjs/core');
      } else if (hasDep(pkgFile, 'express')) {
        info.backend = 'express-node';
        info.framework = 'Express';
        info.frameworkVersion = depValue(pkgFile, 'express');
      } else if (hasDep(pkgFile, 'fastify')) {
        info.backend = 'express-node';
        info.framework = 'Fastify';
        info.frameworkVersion = depValue(pkgFile, 'fastify');
      }
      for (const tf of ['jest', 'vitest', 'mocha']) {
        if (hasDep(pkgFile, tf)) {
          info.testFramework = tf;
          break;
        }
      }
    } else {
      const req = indicatorFile(target, 'requirements.txt') ?? indicatorFile(target, 'pyproject.toml');
      if (req) {
        info.language = 'Python';
        info.buildTool = req.endsWith('pyproject.toml') ? 'poetry/pip' : 'pip';
        const content = readFileSync(req, 'utf8');
        if (new RegExp('^(django|.*django[=>])', 'im').test(content) || content.includes('django')) {
          info.framework = 'Django';
        } else if (content.toLowerCase().includes('fastapi')) {
          info.framework = 'FastAPI';
        } else if (content.toLowerCase().includes('flask')) {
          info.framework = 'Flask';
        }
      } else {
        const gomod = indicatorFile(target, 'go.mod');
        if (gomod) {
          info.language = 'Go';
          info.buildTool = 'go';
          const content = readFileSync(gomod, 'utf8');
          if (content.includes('gin-gonic')) info.framework = 'Gin';
          else if (content.toLowerCase().includes('echo')) info.framework = 'Echo';
          else if (content.includes('fiber')) info.framework = 'Fiber';
        } else {
          const cargo = indicatorFile(target, 'Cargo.toml');
          if (cargo) {
            info.language = 'Rust';
            info.buildTool = 'cargo';
            const content = readFileSync(cargo, 'utf8');
            if (content.includes('actix')) info.framework = 'Actix';
            else if (content.includes('axum')) info.framework = 'Axum';
            else if (content.includes('rocket')) info.framework = 'Rocket';
          } else {
            const gemfile = indicatorFile(target, 'Gemfile');
            if (gemfile) {
              info.language = 'Ruby';
              info.buildTool = 'bundler';
              const content = readFileSync(gemfile, 'utf8');
              if (content.toLowerCase().includes('rails')) info.framework = 'Rails';
              else if (content.toLowerCase().includes('sinatra')) info.framework = 'Sinatra';
            }
          }
        }
      }
    }
  }

  // --- frontend ---
  const fePkg = pkgFile ?? findPackageJson(target);
  if (fePkg) {
    if (hasDep(fePkg, 'react')) {
      info.frontend = 'react';
      info.frameworkFe = 'React';
      info.frameworkVersionFe = depValue(fePkg, 'react');
    } else if (hasDep(fePkg, '@angular/core')) {
      info.frontend = 'angular';
      info.frameworkFe = 'Angular';
      info.frameworkVersionFe = depValue(fePkg, '@angular/core');
    } else {
      for (const fw of ['vue', 'angular', 'svelte', 'next', 'nuxt']) {
        if (hasDep(fePkg, fw)) {
          info.frontend = 'generic';
          info.frameworkFe = fw.charAt(0).toUpperCase() + fw.slice(1);
          info.frameworkVersionFe = depValue(fePkg, fw);
          break;
        }
      }
    }
    if (info.frameworkFe) {
      if (!info.language) {
        info.backend = 'none';
      } else if (info.language === 'Node.js' && info.backend === 'generic') {
        info.backend = 'none';
      }
    }
  } else if (existsSync(join(target, 'src', 'main', 'webapp'))) {
    info.frontend = 'generic';
  } else if (info.backend === 'spring-boot' || info.language) {
    info.frontend = 'none';
  }

  // --- project name ---
  if (pom) {
    info.projectName = pomArtifactId(pom) ?? info.projectName;
  } else if (fePkg) {
    try {
      const name = (JSON.parse(readFileSync(fePkg, 'utf8')) as { name?: string }).name;
      if (name) info.projectName = name;
    } catch {
      /* keep basename */
    }
  }
  return info;
}
