---
description: This document contains all development rules and guidelines for this project, applicable to all AI agents (Claude, Cursor, Codex, Gemini, etc.).
alwaysApply: true
---

## 1. Core Principles

- **Small tasks, one at a time**: Always work in baby steps, one at a time. Never go forward more than one step.
- **Test-Driven Development**: Start with failing tests for any new functionality (TDD), according to the task details.
- **Type Safety**: All code must be fully typed.
- **Clear Naming**: Use clear, descriptive names for all variables and functions.
- **Incremental Changes**: Prefer incremental, focused changes over large, complex modifications.
- **Question Assumptions**: Always question assumptions and inferences.
- **Pattern Detection**: Detect and highlight repeated code patterns.

## 2. Language Standards

### Guiding Principle

- **English** → Everything technical: code, skills, internal docs, configuration, development tools.
- **Spanish** → Everything the user reads or reviews: Obsidian, OpenSpec, README, agent interactions.

### Language Matrix

| Content | Language | Reason |
|---|---|---|
| **Source code** (`.ts`, `.js`, `.py`) | **English** | Industry standard |
| Code comments | **English** | Development convention |
| Variable / function names | **English** | Development convention |
| Error messages / logs (internal) | **English** | Technical standard |
| `package.json`, `tsconfig.json`, configs | **English** | npm/node convention |
| Data schemas / database names | **English** | Technical standard |
| Test names / descriptions | **English** | Testing convention |
| **Skills** (`SKILL.md`) — built-in and user-created | **English** | Development tools, not vault content |
| **`docs/`** (usage guides, manuals) | **English** | Internal technical documentation |
| **`AGENTS.md`** | **English** | Agent technical configuration |
| API docs / technical docs | **English** | International technical reference |
| **README.md** | **Spanish** | User-facing entry point |
| **Obsidian notes** (`00_Notas/` – `03_Recursos/`) | **Spanish** | Second Brain content |
| **Documentation exported to Obsidian** | **Spanish** | Lives in the vault, reviewed by user |
| **OpenSpec** (specs, tasks, reports) | **Spanish** | User reviews directly |
| **Agent prompts / responses** | **Spanish** | Agent operates in Spanish with user |
| **Git commit messages / PR titles** | **Spanish** | User-facing, reviewed by user |
| **Error messages shown to user** | **Spanish** | User-facing |
| **Summaries / results** | **Spanish** | User-facing |
| Jira tickets (titles, descriptions, comments) | **English** | Technical management artifact |

### Why

- **English tokens are cheaper** than Spanish in most models.
- **Skills and docs are development tools** → English (even if user-created).
- **What lives in Obsidian and OpenSpec is review content** → Spanish.
- **README is the user's entry point** → Spanish.
- **Commits, PRs, user errors** → Spanish because the user reads them.

### Example Flow

```
spectralis init
  → Detects project stack
  → Generates config files in ENGLISH
  → Generates skills with SKILL.md in ENGLISH
  → Generates internal docs/ in ENGLISH
  → Creates Obsidian notes in SPANISH
  → Generates OpenSpec specs in SPANISH
  → Generates README in SPANISH
  → Commits and PRs in SPANISH
```

## 3. Specific standards

For detailed standards and guidelines specific to different areas of the project, refer to:

- [Backend Standards](./backend-standards.md) - API development, database patterns, testing, security and backend best practices (composed at install time from the template's stack variant: `spring-boot`, `express-node`, or `generic`)
- [Frontend Standards](./frontend-standards.md) - UI/UX guidelines and frontend architecture (composed at install time from the template's stack variant: `react` or `generic`; omitted for backend-only projects)
- [Documentation Standards](./documentation-standards.md) - Technical documentation structure, formatting, and maintenance guidelines, including AI standards like this document
- [OpenSpec Tasks Mandatory Steps](./openspec-tasks-mandatory-steps.md) - Required checklist and execution rules when creating or updating OpenSpec `tasks.md` files

## 4. Project Skills

- Skills live in `.agents/skills` (this template repository is the canonical registry).
- When a request matches a skill, load and follow the corresponding `SKILL.md` automatically before continuing.
- Also load any referenced files in the skill folder (for example, `references/*.md`) when the skill requires them.
- **Vendor exemption**: OpenSpec CLI skills (`openspec-*`) are managed exclusively in `.opencode/skills/` by the OpenSpec CLI. Never keep copies, mirrors, or symlinks of them in `.agents/skills/` — duplicates already diverged once (v1.3.1 vs v1.11.0) and served stale instructions.
- **Project-local policy**: in installed destination projects, skills, commands, plugins, `skills-lock.json` and the `openspec/` tree (main specs, changes, planning artifacts) are machine-local and never committed (the installer-managed `.gitignore` block enforces this). Only `AGENTS.md` and `docs/` are project content and remain versioned. The OpenSpec SDD workflow keeps working locally (`openspec/` stays on disk; it just travels with the local machine, not the repository).
- **Promotion flow**: a skill created locally in a destination stays local until promoted — copy it into this template's `.agents/skills/`, then distribute it via `spectralis init` or `spectralis update`.

## 5. Planning Model Requirement

Planning workflows must run with Opus high reasoning.

This requirement applies to:
- `enrich-us`
- `openspec-ff-change`
- `openspec-continue-change`

## 6. Symlink Integrity and Multi-Agent Portability

- **Canonical Source**: Keep reusable artifacts in `.agents` as the canonical source. Agent-specific paths (such as `.claude` and `.cursor`) should reference them through symlinks when possible.
- **Update Safety**: Whenever a file is renamed, moved, or its suffix changes, verify and update all symlinks that target it before considering the change complete.
- **New Artifact Linking**: Whenever creating a new artifact that requires multi-agent exposure (for example new agents or skills in `.agents`), create the corresponding symlinks from the expected agent-specific reference paths.
- **External Customization Review**: Whenever customization is introduced outside `.agents`, evaluate whether it should be moved into `.agents` and replaced with symlinks from the original locations.
- **Vendor-managed exceptions**: artifacts owned by external CLIs (for example `.opencode/skills/openspec-*`, generated and updated by the OpenSpec CLI) are exempt from `.agents` canonicalization — do not duplicate or symlink them into `.agents`.
- **Completion Gate**: A change is incomplete if it leaves broken symlinks, stale targets, or duplicated canonical artifacts across agent-specific folders.

## 7. Mandatory OpenSpec Artifact Updates for Post-Apply Changes

When a new fix/change request appears after `opsx:apply` (or `/apply`) and before `opsx:archive` (or `/archive`), agents must treat it as a spec update first, not as an informal "fix this quickly". It's the core principle of openspec, documentation is the source of truth.

Required order:

1. Update the current OpenSpec change artifacts that are affected (for example: scenarios, requirements/specs, and `tasks.md`). Don't add tasks as "bugfixes" but as part of the initial design, thus in the proper section
2. If artifact regeneration is needed, run the corresponding OpenSpec step (`opsx:continue`, `opsx:ff`, or equivalent) before coding.
3. Implement code only after artifacts reflect the new request.
4. Re-run verification against the updated artifacts before archiving.

Do not apply direct code-only fixes in this window without updating OpenSpec artifacts.

