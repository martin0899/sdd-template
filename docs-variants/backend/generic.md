---
description: Backend development standards and best practices for the {{PROJECT_NAME}} {{FRAMEWORK}} application, covering architecture, coding conventions, data access, testing, and security
globs: ["src/**/*", "pom.xml", "build.gradle*", "*.json"]
alwaysApply: true
---

# Backend Project Standards and Best Practices

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture Principles](#architecture-principles)
- [Coding Standards](#coding-standards)
- [Data and Persistence](#data-and-persistence)
- [API Design Standards](#api-design-standards)
- [Testing Standards](#testing-standards)
- [Security Best Practices](#security-best-practices)
- [Performance](#performance)

## Overview

This document defines the backend standards for **{{PROJECT_NAME}}**. The backend is implemented with **{{LANGUAGE}}{{LANGUAGE_VERSION}}** using **{{FRAMEWORK}}** and **{{BUILD_TOOL}}** as the build tool.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: {{LANGUAGE}} {{LANGUAGE_VERSION}}
- **Framework**: {{FRAMEWORK}} {{FRAMEWORK_VERSION}}
- **Build tool**: {{BUILD_TOOL}}
- **Testing framework**: {{TEST_FRAMEWORK}}

## Project Structure

- Organize source code by feature or layered architecture; keep one concern per module.
- Keep configuration files, entry points, and business code separated.
- Never place business logic inside framework glue code (controllers, handlers, routes).

## Architecture Principles

- **Single Responsibility**: one module, one reason to change.
- **Dependency Inversion**: business logic depends on interfaces, not on infrastructure details.
- **DRY**: extract repeated patterns into shared helpers or services.
- **Clear boundaries**: HTTP layer (validation, serialization) is separate from domain services and persistence.

## Coding Standards

- Use clear, descriptive names for variables, functions, and modules.
- All code, comments, log messages, and error messages in English.
- All code fully typed when the language supports it (TypeScript strict, type hints, etc.).
- No magic values: use named constants or configuration.
- Handle errors explicitly; never swallow exceptions silently.

## Data and Persistence

- Access data through a repository or data-access layer; do not scatter queries across the codebase.
- Use migrations for every schema change; never edit schema by hand in production.
- ORM (if any): {{ORM}}
- Validate input at the boundary; never trust client data.

## API Design Standards

- REST conventions: plural resource nouns, correct HTTP methods and status codes.
- Version the API from day one (`/api/v1/...`).
- Consistent error envelope: machine-readable code + human-readable message.
- Document endpoints (OpenAPI or equivalent) as part of the change, not after.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}}
- Unit tests for domain logic; integration tests for API endpoints and persistence.
- Tests run in isolation: no shared mutable state between tests.
- Every bug fix comes with a regression test.

## Security Best Practices

- Validate and sanitize every external input.
- Parameterized queries only; no string-concatenated SQL.
- Secrets never in code: use environment variables or a secret manager.
- Authentication and authorization checked at every protected endpoint.

## Performance

- Avoid N+1 query patterns; batch or eager-load as needed.
- Cache expensive computations with explicit invalidation rules.
- Measure before optimizing: profile first, then change.
