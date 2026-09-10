---
description: Backend development standards and best practices for the {{PROJECT_NAME}} NestJS application, covering modules, controllers, providers and DI, guards and interceptors, data access, and testing
globs: ["src/**/*.{ts,js}", "*.{json,yml,yaml}", "test/**/*"]
alwaysApply: true
---

# Backend Project Standards and Best Practices (NestJS)

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Module and DI Standards](#module-and-di-standards)
- [Controllers and DTOs](#controllers-and-dtos)
- [Guards, Interceptors, Pipes and Filters](#guards-interceptors-pipes-and-filters)
- [Data Access](#data-access)
- [Configuration Standards](#configuration-standards)
- [Testing Standards](#testing-standards)
- [Security Best Practices](#security-best-practices)

## Overview

This document defines the backend standards for **{{PROJECT_NAME}}**, a NestJS application. The backend is implemented with **Node.js {{LANGUAGE_VERSION}}** using **NestJS {{FRAMEWORK_VERSION}}**.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: Node.js {{LANGUAGE_VERSION}}
- **Framework**: NestJS {{FRAMEWORK_VERSION}}
- **Package manager**: {{BUILD_TOOL}}
- **ORM / data layer**: {{ORM}} (TypeORM, Prisma, Mongoose, or Knex as applicable)
- **Testing**: {{TEST_FRAMEWORK}} (Nest default: Jest)

## Project Structure

- One Nest **module per domain feature** (`users`, `orders`, ...); modules encapsulate controllers, providers, and entities.
- Shared cross-cutting providers in a `common/` or `shared/` module; no cross-feature imports of internals.
- DTOs in `dto/`, entities in `entities/` (or domain models), per feature.

## Module and DI Standards

- Everything is a provider injected via constructor; never instantiate dependencies manually.
- `@Module()` metadata complete and minimal: export only what other modules need.
- Use `useClass`/`useFactory`/`useValue` tokens for swappable implementations (e.g., mail sender, storage).
- Circular dependencies resolved by restructuring, not by `forwardRef` (only with documented justification).

## Controllers and DTOs

- Controllers only orchestrate: parse, delegate to services, return DTOs. Business rules live in services.
- DTOs with `class-validator`/`class-transformer` (or Zod) validated globally via `ValidationPipe`.
- Correct HTTP semantics: 201 for creation, 204 for deletion, 400 validation, 404 absent, 409 conflicts.
- Versioned routes (`/api/v1/...`); resource nouns, no verbs in paths.

## Guards, Interceptors, Pipes and Filters

- **Guards** for authentication/authorization (`JwtAuthGuard`, roles via `@Roles` + `RolesGuard`).
- **Interceptors** for cross-cutting response mapping, logging, and timeouts — not for business logic.
- **Pipes** for validation and transformation (global `ValidationPipe` with `whitelist` + `transform`).
- **Filters** for a global exception filter producing a consistent error envelope (code + message + details).

## Data Access

- All persistence behind repositories/providers of the chosen ORM: {{ORM}}
- Transactions at the service layer; no transaction logic inside controllers.
- Migrations for every schema change; no manual DDL on deployed databases.
- Relations loaded explicitly (eager where justified); watch for N+1 query patterns.

## Configuration Standards

- `ConfigModule` typed with schemas; validate required variables at startup (fail fast).
- Secrets via environment/secret manager; `.env` never committed (`.env.example` documents every key).
- Per-environment settings grouped; no magic values scattered in providers.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}}
- Unit tests for services with mocked providers (`Test.createTestingModule`); no real HTTP or DB.
- E2E tests (`test/`) for modules: real app instance, mocked external services, test database.
- Tests isolated and repeatable; every bug fix ships with a regression test.

## Security Best Practices

- Global guard for protected resources; declare public routes explicitly, deny by default.
- `helmet` (or equivalent) and CORS restricted to known origins.
- Rate limiting on public endpoints; request size limits configured.
- Secrets and tokens only via configuration; dependency audit in CI.
