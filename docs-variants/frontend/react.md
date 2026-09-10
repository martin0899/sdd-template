---
description: Frontend development standards and best practices for the {{PROJECT_NAME}} React application, covering component architecture, hooks, state management, routing, and testing
globs: ["src/**/*.{jsx,tsx,js,ts}", "*.{json,yml,yaml}"]
alwaysApply: true
---

# Frontend Project Standards and Best Practices (React)

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Standards](#component-standards)
- [Hooks and State Management](#hooks-and-state-management)
- [Routing](#routing)
- [Styling Standards](#styling-standards)
- [Accessibility](#accessibility)
- [Testing Standards](#testing-standards)
- [Performance](#performance)

## Overview

This document defines the frontend standards for **{{PROJECT_NAME}}**, a React application. The UI is implemented with **React {{FRAMEWORK_VERSION}}** on **{{LANGUAGE}} {{LANGUAGE_VERSION}}**.

> Section values marked with `{{...}}` were not detectable during installation. Refine them during onboarding (skill `sdd-onboard-project`) using the real project evidence.

## Technology Stack

- **Language**: {{LANGUAGE}} {{LANGUAGE_VERSION}}
- **UI framework**: React {{FRAMEWORK_VERSION}}
- **Build tool / package manager**: {{BUILD_TOOL}}
- **State/data**: server state via a query library; client state only when truly global
- **Testing**: {{TEST_FRAMEWORK}} (+ React Testing Library)

## Project Structure

- Feature-first: `src/features/<feature>/{components,hooks,services}`; shared UI in `src/components/ui`.
- One component per file; component name matches file name in `PascalCase`.
- Custom hooks prefixed with `use`; colocated with the feature that owns them.

## Component Standards

- Function components only (no class components).
- Components receive data via typed props; no business logic inside components — delegate to hooks or services.
- Single responsibility; extract subcomponents when JSX grows past one screen.
- Stable, unique `key`s in lists; never the array index when order can change.

## Hooks and State Management

- `useState` for local UI state; `useReducer` for state machines with several transitions.
- Effects only for synchronization with external systems; derive values during render instead of storing them.
- Effects declare complete dependency arrays; cleanup subscriptions and timers on unmount.
- No prop drilling beyond two levels: lift state or introduce a store (Zustand/Redux Toolkit) for global concerns.
- Server state via a query library (React Query/SWR); never mirrored into local state.

## Routing

- File-based or declarative router (React Router / TanStack Router), lazy-loaded routes with `React.lazy` + `Suspense`.
- Route guards implemented as wrappers; redirects preserve intended destination.
- Nested layouts for shared chrome; 404 route always present.

## Styling Standards

- One styling approach for the whole project (Tailwind, CSS Modules, or styled-components); never mixed ad hoc.
- Design tokens (colors, spacing, typography) from a single theme source.
- Responsive, mobile-first; no fixed pixel layout widths.

## Accessibility

- Semantic HTML first; landmarks and a single `h1` per page.
- All interactive elements keyboard-operable with visible focus ring.
- Forms with labels, described errors, and announced status changes.
- Images meaningful `alt`; decorative images empty `alt`.

## Testing Standards

- Framework: {{TEST_FRAMEWORK}} with React Testing Library.
- Query by role, label, or text (user-centric); avoid implementation-detail selectors.
- Unit tests for custom hooks; component tests for user-visible behavior.
- Mock network at the HTTP layer (MSW); every bug fix ships with a regression test.

## Performance

- Lazy-load routes and heavy widgets; keep the initial bundle lean.
- Memoize only with measured need (`memo`, `useMemo`, `useCallback` are not defaults).
- Virtualize long lists; compress images; enforce bundle budget in CI.
