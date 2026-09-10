---
description: Frontend development standards and best practices for the {{PROJECT_NAME}} {{FRAMEWORK}} user interface, covering component architecture, state management, styling, and testing
globs: ["src/**/*.{jsx,tsx,js,ts,vue,svelte}", "*.{json,yml,yaml}"]
alwaysApply: true
---

# Frontend Project Standards and Best Practices

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Standards](#component-standards)
- [State Management](#state-management)
- [Styling Standards](#styling-standards)
- [Accessibility](#accessibility)
- [Testing Standards](#testing-standards)
- [Performance](#performance)

## Overview

This document defines the frontend standards for **{{PROJECT_NAME}}**. The UI is implemented with **{{FRAMEWORK}} {{FRAMEWORK_VERSION}}** on **{{LANGUAGE}} {{LANGUAGE_VERSION}}**.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: {{LANGUAGE}} {{LANGUAGE_VERSION}}
- **UI framework**: {{FRAMEWORK}} {{FRAMEWORK_VERSION}}
- **Package manager**: {{BUILD_TOOL}}
- **Testing framework**: {{TEST_FRAMEWORK}}

## Project Structure

- Feature-first folders: components, pages/routes, hooks/composables, services, and utilities per feature.
- Shared components in a common library only when reused by two or more features.
- One component per file; file name matches component name.

## Component Standards

- Small, single-purpose components; presentational components receive data via props.
- No business logic in components: delegate to services/hooks or stores.
- Props validated and documented; no prop drilling more than two levels (lift or use a store).
- Keys stable and unique in lists; never array index when the list reorders.

## State Management

- Local state for UI-only concerns; server state cached by a data layer (query library or store).
- Global state only for genuinely global concerns (session, theme, feature flags).
- No duplicated source of truth: derive values instead of mirroring state.

## Styling Standards

- One styling approach for the whole project (utility classes, CSS modules, or component library).
- Design tokens (spacing, colors, typography) from a single theme source.
- Responsive by default: mobile-first breakpoints, no fixed pixel layouts.

## Accessibility

- Semantic HTML first: headings hierarchy, landmarks, native elements over ARIA reinvention.
- All interactive elements keyboard-reachable with visible focus.
- Images with meaningful `alt`; forms with labels and error announcements.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}}
- Unit tests for hooks/logic, component tests for behavior (not implementation details).
- User-centric queries (role, label, text); avoid test-id sprawl.
- Critical user flows covered at minimum; every bug fix ships with a regression test.

## Performance

- Lazy-load routes and heavy components; code-split by feature.
- Avoid unnecessary re-renders: memoization only with measured need.
- Optimize assets: compressed images, font subsetting, bundle budget enforced in CI.
