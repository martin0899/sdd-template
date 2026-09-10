---
description: Backend development standards and best practices for the {{PROJECT_NAME}} Spring Boot application, covering layered architecture, Spring MVC, data access, testing, and security
globs: ["src/main/java/**/*.java", "src/main/resources/**/*.{properties,yml,xml}", "src/test/**/*.java", "pom.xml", "build.gradle*"]
alwaysApply: true
---

# Backend Project Standards and Best Practices (Spring Boot)

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture Principles](#architecture-principles)
- [Coding Standards](#coding-standards)
- [Spring MVC and API Design](#spring-mvc-and-api-design)
- [Data Access](#data-access)
- [Testing Standards](#testing-standards)
- [Configuration Standards](#configuration-standards)
- [Security Best Practices](#security-best-practices)

## Overview

This document defines the backend standards for **{{PROJECT_NAME}}**, a Spring Boot application. The backend is implemented with **Java {{LANGUAGE_VERSION}}** and **Spring Boot {{FRAMEWORK_VERSION}}**, built with **{{BUILD_TOOL}}**.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: Java {{LANGUAGE_VERSION}}
- **Framework**: Spring Boot {{FRAMEWORK_VERSION}}
- **Build tool**: {{BUILD_TOOL}}
- **Persistence**: Spring Data JPA / Hibernate
- **Testing**: JUnit 5 + Mockito + Spring Boot Test

## Project Structure

- Layered architecture: `controller` → `service` → `repository` → `domain`.
- Package by feature when the codebase grows; keep layers consistent across features.
- DTOs for the API layer; entities for persistence; never expose entities directly.

## Architecture Principles

- **Single Responsibility**: controllers only translate HTTP; services hold business rules; repositories only access data.
- **Constructor injection** over field injection (`@Autowired` on fields is forbidden).
- **Immutability first**: prefer immutable domain objects and value records.
- Interfaces at service boundaries only where a real alternative implementation exists.

## Coding Standards

- Java naming conventions: `PascalCase` types, `camelCase` members, `SCREAMING_SNAKE_CASE` constants.
- All code, comments, logs, and error messages in English.
- Use `Optional<T>` for possibly-absent return values; never return `null` collections (return empty).
- Prefer streams for transformations when readability holds; do not nest streams.
- All code fully typed; no raw types; no unchecked warnings tolerated.

## Spring MVC and API Design

- REST controllers: `@RestController` + `@RequestMapping("/api/v1/...")`.
- Correct HTTP semantics: 201 + `Location` for creation, 204 for deletion, 400 for validation, 404 for absent resources.
- Centralized exception handling with `@RestControllerAdvice` + `@ExceptionHandler`.
- Request validation with Bean Validation (`@Valid`, `@NotNull`, `@Size`, ...).
- Consistent error envelope: machine-readable code + human-readable message.

## Data Access

- Spring Data repositories; derived queries or `@Query` JPQL; native SQL only with justification.
- Transactions at the service layer (`@Transactional`), never on controllers.
- Schema evolution only through migrations (Flyway/Liquibase); never manual DDL.
- Avoid N+1: use fetch joins or entity graphs for related data.

## Testing Standards

- Unit tests: JUnit 5 + Mockito, fast and isolated, no Spring context.
- Integration tests: `@SpringBootTest` with Testcontainers (or H2 only for read-only legacy coverage).
- Naming: `method_condition_expectedResult`.
- Every bug fix ships with a regression test.
- Coverage gate on changed code; quality over percentage.

## Configuration Standards

- Profiles per environment (`application-dev.yml`, `application-prod.yml`); no secrets in the repo.
- Type-safe configuration with `@ConfigurationProperties`.
- External configuration via environment variables in deployment.

## Security Best Practices

- Spring Security: authentication and authorization declared per endpoint; deny by default.
- Parameterized queries only; never concatenate SQL.
- Secrets via environment/secret manager; never in `application.yml` committed to git.
- Dependency updates: review Spring Boot and dependency CVEs regularly.
