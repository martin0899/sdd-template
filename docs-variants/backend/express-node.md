---
description: Backend development standards and best practices for the {{PROJECT_NAME}} Node.js {{FRAMEWORK}} API, covering architecture, routing, middleware, data access, testing, and security
globs: ["src/**/*.{js,ts,mjs}", "*.{json,yml,yaml}", "tests/**/*"]
alwaysApply: true
---

# Backend Project Standards and Best Practices (Node.js API)

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture Principles](#architecture-principles)
- [Coding Standards](#coding-standards)
- [Routing and Middleware](#routing-and-middleware)
- [Data Access](#data-access)
- [Testing Standards](#testing-standards)
- [Configuration Standards](#configuration-standards)
- [Security Best Practices](#security-best-practices)

## Overview

This document defines the backend standards for **{{PROJECT_NAME}}**, a Node.js API. The backend is implemented with **Node.js {{LANGUAGE_VERSION}}** using **{{FRAMEWORK}} {{FRAMEWORK_VERSION}}**, with **npm** as package manager.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: Node.js {{LANGUAGE_VERSION}}
- **Framework**: {{FRAMEWORK}} {{FRAMEWORK_VERSION}}
- **Package manager**: npm
- **ORM / query layer**: {{ORM}}
- **Testing**: {{TEST_FRAMEWORK}}

## Project Structure

- Separate HTTP layer (routes, controllers) from services (business rules) and data access.
- One module per domain concept; avoid a single `index.js` growing without limits.
- `src/routes`, `src/controllers`, `src/services`, `src/repositories`, `src/middlewares` as baseline layout.

## Architecture Principles

- Controllers only parse/validate/serialize; business rules live in services.
- Dependency injection via constructor parameters or a small container; avoid module-level singletons for testable state.
- Errors flow to a central error middleware; handlers never send raw responses on failure paths.

## Coding Standards

- All code fully typed (TypeScript strict mode preferred; JSDoc types at minimum in JS).
- All code, comments, logs, and error messages in English.
- `async/await` over raw promise chains; every promise handled (no floating promises).
- Early returns over deep nesting; functions small and single-purpose.

## Routing and Middleware

- Versioned routers (`/api/v1/...`), one router per resource, mounted in a single entry point.
- Middleware chain kept minimal and ordered: security headers → parsing → auth → validation → handler.
- Request validation at the boundary with a schema library (Zod, Joi, or equivalent).
- Consistent error envelope: machine-readable code + human-readable message.

## Data Access

- All persistence behind a repository/data-access layer; no queries inside controllers.
- Migrations for every schema change (managed by the ORM or migration tool).
- Parameterized queries only; never build SQL by string concatenation.
- Connection pooling configured; no ad-hoc connections per request.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}}
- Unit tests for services; integration tests for routes against a test database.
- Supertest (or framework-native client) for endpoint tests.
- Tests isolated and repeatable; cleanup or transactions per test.
- Every bug fix ships with a regression test.

## Configuration Standards

- Configuration via environment variables validated at startup (fail fast on missing config).
- `.env` files never committed; `.env.example` documents every variable.
- Per-environment settings grouped, no scattered magic values.

## Security Best Practices

- Security middleware enabled (helmet or equivalent).
- Validate and sanitize every external input; rate-limit public endpoints.
- Authentication (JWT/session) and authorization checked per route, deny by default.
- Secrets only via environment/secret manager; dependency audit in CI.
