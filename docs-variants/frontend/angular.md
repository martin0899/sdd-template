---
description: Frontend development standards and best practices for the {{PROJECT_NAME}} Angular application, covering standalone components, services and DI, signals and RxJS, routing, and testing
globs: ["src/**/*.{ts,html,scss,css}", "angular.json", "*.json"]
alwaysApply: true
---

# Frontend Project Standards and Best Practices (Angular)

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Standards](#component-standards)
- [Services and Dependency Injection](#services-and-dependency-injection)
- [State: Signals and RxJS](#state-signals-and-rxjs)
- [Routing](#routing)
- [Forms](#forms)
- [Styling Standards](#styling-standards)
- [Accessibility](#accessibility)
- [Testing Standards](#testing-standards)
- [Performance](#performance)

## Overview

This document defines the frontend standards for **{{PROJECT_NAME}}**, an Angular application. The UI is implemented with **Angular {{FRAMEWORK_VERSION}}** on **{{LANGUAGE}} {{LANGUAGE_VERSION}}**.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: {{LANGUAGE}} {{LANGUAGE_VERSION}}
- **UI framework**: Angular {{FRAMEWORK_VERSION}}
- **Build tool / CLI**: {{BUILD_TOOL}} (Angular CLI)
- **Testing**: {{TEST_FRAMEWORK}} (Angular CLI default: Karma + Jasmine; migrated projects often use Jest or Vitest)

## Project Structure

- Feature-first: `src/app/features/<feature>/{components,services,models}`; shared UI in `src/app/shared`.
- One class per file; file names follow Angular conventions (`*.component.ts`, `*.service.ts`, `*.guard.ts`).
- `core/` for singleton services and interceptors; `shared/` for reusable components, pipes, directives.

## Component Standards

- **Standalone components** by default (`standalone: true`); NgModules only for legacy boundaries.
- Use the new control flow (`@if`, `@for`, `@switch`) over structural directives where the Angular version supports it.
- `ChangeDetectionStrategy.OnPush` for every component; keep templates pure.
- Templates declarative: no logic beyond simple bindings; extract complex expressions to the component or a computed signal.
- `input()` / `output()` signal-based APIs preferred over decorators; no two-way property mutation.

## Services and Dependency Injection

- Services provided with `providedIn: 'root'` for singletons; feature-scoped providers only for isolated state.
- Constructor injection via `inject()`; no manual instantiation.
- Services own data access: components never call `HttpClient` directly.
- One responsibility per service; compose services instead of god-services.

## State: Signals and RxJS

- `signal` / `computed` / `effect` for local and derived state; expose read-only signals from services.
- RxJS for event streams and async orchestration; `HttpClient` returns observables — convert to signals at the boundary (`toSignal`) when appropriate.
- No `.subscribe()` in templates or services for view state: use the `async` pipe or `toSignal` to avoid leaks.
- Unsubscribe on teardown (`takeUntilDestroyed`, complete subjects) — no dangling subscriptions.

## Routing

- Lazy-loaded routes with `loadComponent` / `loadChildren` per feature.
- Functional guards and resolvers (`CanActivateFn`, ...); redirects preserve intended destination.
- Route parameters typed via typed router helpers; 404 wildcard route always present.
- Feature routes colocated with the feature and registered in the app config.

## Forms

- **Reactive forms** for any non-trivial form: typed `FormGroup`/`FormControl`, validation in the form model.
- Cross-field validation via validators attached to the group; error messages centralized.
- Never read `NgModel`-style two-way bindings for complex forms.

## Styling Standards

- Component-scoped styles (view encapsulation) by default; global styles only for theming and resets.
- Design tokens (colors, spacing, typography) from a single theme source (Material theme or SCSS variables).
- SCSS with meaningful nesting depth (max 3 levels); mobile-first responsive rules.

## Accessibility

- Semantic HTML and Angular Material/native ARIA patterns; single `h1` per page.
- Keyboard navigation and visible focus for every interactive element.
- Forms: labels tied to inputs, errors announced (`aria-live`); images with meaningful `alt`.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}}
- Unit tests per component/service with the Angular `TestBed`; shallow-render with stubs over deep integration where possible.
- Component tests assert DOM behavior, not internal state; router and HTTP mocked at their public APIs.
- Every bug fix ships with a regression test; critical user flows covered end-to-end (Cypress/Playwright if present).

## Performance

- Lazy-load feature routes and heavy third-party widgets.
- `OnPush` + signals to minimize change detection work; avoid deep object mutations.
- Image placeholders / `NgOptimizedImage` for images; bundle budget enforced in `angular.json`.
