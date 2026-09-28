# Spectralis Architecture

Spectralis is the canonical source of the **SDD (Spec-Driven Development)** harness — OpenSpec + skills + commands + documentation standards — distributed as a pure Node CLI (>= 22) with no platform dependencies.

This document describes how the repository is organized and how the pieces fit together. It is the architecture reference for the **template repository itself** (the arnés), not for the projects it installs into.

---

## 1. High-level design

```
                ┌──────────────────────────────────────────────────┐
                │                  spectralis CLI                  │
                │            src/bin/spectralis.ts (commander)     │
                └──────────────────────┬───────────────────────────┘
                                       │ dispatches to
        ┌──────────┬──────────┬────────┴───────┬──────────┬───────────┐
        ▼          ▼          ▼                ▼          ▼           ▼
    init/update status/config doctor/check  notes      seed/distill  spec/projects
        │          │                             │          │           │
        ▼          ▼                             ▼          ▼           ▼
   ┌─────────┐ ┌─────────┐                 ┌─────────┐ ┌─────────┐  ┌─────────┐
   │ install │ │ update  │                 │ second  │ │ 05_wiki │  │ spec    │
   │ payload │ │ classify│                 │ brain   │ │ distil- │  │ work-   │
   └────┬────┘ └────┬────┘                 │ sync    │ │ lation  │  │ flow    │
        │           │                      └─────────┘ └─────────┘  └─────────┘
        ▼           ▼
   ┌─────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ core/*  │ │ core/*  │   │ core/*  │   │ core/*  │   │ core/*  │   shared
   │ plan,   │ │ classify│   │ config, │   │ distill,│   │ spec-   │   helpers
   │ copy-   │ │ update, │   │ notes,  │   │ detect- │   │ workflow│
   │ payload,│ │ manifest│   │ seed,   │   │ stack   │   │ project-│
   │ compose │ │ ...     │   │ ...     │   │ ...     │   │ id      │
   └─────────┘ └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

Two clear layers:

- **`src/bin/`** — the CLI entry point. Registers every subcommand with commander; keeps interface concerns only. One file: `spectralis.ts`.
- **`src/commands/`** — one module per user-facing command. Thin orchestration: parse options, resolve paths via `src/core/config.ts`, call core logic, format output, return an exit code.
- **`src/core/`** — domain logic, pure and testable (no CLI parsing). Each module owns one concern.
- **`src/agents/`** — agent profile resolution (`opencode | antigravity | claude | all`) and tool detection used at install time.
- **`src/util/`** — cross-cutting helpers (UI palette, color support).

The rule: **commands orchestrate, core implements**. A `src/commands/*.ts` file must stay thin; anything reusable goes to `src/core/*.ts` and is covered by `test/core/*.test.ts`.

---

## 2. Command inventory

| Command | Module | Purpose | Exit codes |
|---|---|---|---|
| `init [destino]` | `src/commands/init.ts` | Install the SDD harness into a destination project | `0` ok, `1` error, `2` blocked |
| `update [destino]` | `src/commands/update.ts` | Sync an installed destination with the template | `0` ok, `1` changes available (`--check`), `2` error |
| `doctor` | `src/commands/doctor.ts` | Verify host prerequisites (git, node, openspec, graphify) | `0` ready, `1` missing tools |
| `check` | `src/commands/check.ts` | Validate SDD flow consistency and vault note IDs | `0` ok, `1` findings with errors |
| `status [destino]` | `src/commands/status.ts` | Show installed harness state (version, tools, health) | `0` ok, `2` not installed |
| `config [destino]` | `src/commands/config.ts` | Show/modify harness configuration (routes, obsidianSync) | `0` ok |
| `notes init/sync` | `src/commands/notes.ts` | Create/sync manual folders in the second brain | `0` ok, `1` error |
| `seed` | `src/commands/seed.ts` | Initial load: populate `05_wiki/` from discovered projects | `0` ok, `1` error |
| `distill <project>` | `src/commands/distill.ts` | Extract knowledge from specs into `05_wiki/` | `0` ok, `1` error |
| `projects` | `src/commands/projects.ts` | Show OpenSpec status across local projects | `0` ok |
| `spec init/complete` | `src/commands/spec.ts` | Create/validate a spec folder in the brain | `0` ok, `1` error |
| `skills [destino]` | `src/commands/skills.ts` | Detect skills, write `_INDEX_SKILLS.json` + system-reminder | `0` ok |

**Flag conventions**: `--dry-run` with aliases `--demo` and `--dd`; `--yes` for non-interactive; `--agent <name>` for agent matrix; `--obsidian`/`--no-obsidian` to override the orchestration switch.

---

## 3. Install flow (`spectralis init`)

Read → ask → write. Nothing is written before explicit confirmation.

1. **Prerequisites gate** (`src/core/prereqs.ts`) — probe `git`, `node`, `openspec`, `graphify`; abort without writing if any is missing.
2. **Recognition (read-only)** (`src/core/detect-stack.ts`) — scan the target for backend/frontend indicators (`pom.xml`, `package.json`, `go.mod`, …), depth-2 in known monorepo dirs, excluding cache/build dirs. Result is persisted in `stack.json` with a mtime-based cache (`detected_at`).
3. **Plan** (`src/commands/plan.ts`) — build the install plan (files to copy, compose, append).
4. **Confirmation** — interactive unless `--yes`.
5. **OpenSpec init** — create `openspec/` if missing (`--tools` from the agent matrix).
6. **Spanish context** (`src/core/spanish-context.ts`) — APPEND a Spanish-language context block to `openspec/config.yaml`, preserving user content and comments.
7. **Managed blocks** — `AGENTS.md` (`src/core/agents-md.ts`) and `.gitignore` (`src/core/gitignore.ts`) get sentinel-marked blocks, idempotent and non-destructive.
8. **Payload copy** (`src/core/copy-payload.ts`) — copy `.agents/`, `.opencode/`, `docs/` per the agent matrix; conflict → backup + ask; identical → skip.
9. **Composed standards** (`src/core/compose-standards.ts`) — compose `docs/backend-standards.md` and `docs/frontend-standards.md` from the detected stack variant, filling placeholders; unresolved ones are reported for onboarding.
10. **Manifest** (`src/core/manifest.ts`) — `.sdd-manifest.json` with SHA-256 hashes per managed file (`spectralisVersion`, `templateVersion`, `tools`, `files`).
11. **Post-checks** (`src/core/post-checks.ts`) — report warnings and manual next steps.

### Update flow (`spectralis update`)

Reuses the same core, but first classifies each managed file via `src/core/classify-update.ts` (new / update / unchanged / conflict / removed / sensitive), backs up before replacing, and preserves the destination's customizations. `--check` only reports, never writes.

---

## 4. Configuration and route resolution

`src/core/config.ts` owns all configuration:

- Global config lives in `~/.config/spectralis/config.json` (`SpectralisConfig`).
- Per-project overrides live in `.sdd-manifest.json` (`RouteConfig` keys).
- Routes resolve with a **deterministic cascade**: project manifest → global config → auto-detected Obsidian vault (`detectVaultRoot`) → fallback (`info/` inside the project).
- `resolveNotesDir`, `resolveRoute`, `resolveObsidianSync`, `resolveProjectRoot` are the public resolution primitives used across commands and core.
- `obsidianSync` (`0|1`) controls automatic second-brain orchestration; `--obsidian`/`--no-obsidian` override per invocation.

---

## 5. Second brain and 05_wiki

### Second brain sync (`notes`, `seed`, `distill`, `spec`)

The Obsidian vault (second brain) is the portable knowledge layer; `05_wiki/` is the machine-local distilled wiki (never committed).

- `notes init/sync` keep canonical manuals (`notes/`) mirrored into `03_Recursos/02_Sistemas_info/` (or `info/` fallback).
- `seed` discovers projects under `projects_base`, writes the `05_wiki/` skeleton and `_INDEX.json` (per-project `changes` count + `updated`).
- `distill` reads spec sources from the brain (`01_Proyectos/<project>/<spec-id>/`, ignoring `_Notas/` and `_`-prefixed entries), classifies content deterministically (`src/core/distill.ts`) and, when enabled, uses a local LLM (Ollama) only for ambiguous entries; writes optimized notes to `05_wiki/`.
- `spec init/complete` create the spec folder (`briefing.md`, `tests.md`, `resumen.md`) and register the spec in `.sdd-registry/REGISTRY.md` (`src/core/spec-workflow.ts`).

### `.sdd-registry/`

Machine-local registry of requirements and briefings (never versioned or distributed), moved from the legacy `docs/requirements/`. `REGISTRY.md` rows track: note path → requirement id → briefing path → generated changes → status.

---

## 6. Validation doctor (`spectralis check`)

The doctor is a deterministic, LLM-free validator of the SDD flow. It has two sub-checks, run together (no flags) or separately:

- `--registry` (`src/core/vault-doctor.ts`) — consistency of the triangle **repo ↔ `.sdd-registry/REGISTRY.md` ↔ brain ↔ openspec**:
  - change without registry row (in `openspec/changes/` or the brain but not in REGISTRY) → error;
  - registered change with no folder (orphan) → warning;
  - registered change without `briefing.md` → error;
  - `05_wiki/_INDEX.json` misaligned with `01_Proyectos/` + `openspec/changes/` (missing projects, stale `changes`, stale `updated`) → warning;
  - completed change without a decision in `05_wiki/<project>/decisiones/` → warning.
- `--ids` (`src/core/vault-ids.ts`) — vault note ID convention (`docs/base-standards.md` §4, extended with the harness-generated prefixes `res-`/`brief-`/`test-`):
  - missing `id` in frontmatter → error;
  - non-conformant format `TYPE-YYYYMMDD-slug` (invalid prefix, missing/malformed date where required, slug with uppercase/accents/spaces) → error;
  - duplicated global `id` → error;
  - content note `id` not registered in `03_Recursos/_INDEX_ID.md` → warning (generated artifacts are exempt);
  - prefix inconsistent with the frontmatter `Tipo` → error.

Both sub-checks are read-only, idempotent, and exit `1` only when at least one error is present (warnings do not block). `--ids` keeps an mtime cache at `.spectralis/ids-cache.json` to re-parse only changed notes while always recomputing global uniqueness.

### Doctor internals

- `vault-doctor.ts`: `VaultDoctorFinding` (`severity`, `project`, `artifact`, `suggestion`), registry parsing, and one check function per rule; `checkRegistryConsistency` aggregates them.
- `vault-ids.ts`: vault walker (excludes `docs/`, `05_wiki/`, `.git/`, dot-dirs), `validateIdFormat`, generated-artifact recognition by path (`<spec-id>/briefing.md`, `tests.md`, `resumen.md`), mtime cache (`loadIdsCache`/`saveIdsCache`), and one check function per rule; `checkVaultIds` aggregates them.

---

## 7. Test strategy

- **`test/core/*.test.ts`** — unit tests for domain logic using `node:test` + `node:assert/strict`, building scratch fixtures in a temp dir (`mkdtempSync`) cleaned up in `afterEach`.
- **`test/commands/*.test.ts`** — command-level integration over scratch vaults/repos (e.g., `check --registry`/`--ids` exit codes).
- **`test/fixtures/`** — reusable fixtures (e.g., `registry-doctor/` and `vault-ids/`) consumed by tests without writing back into them.
- **`test/helpers/`**, **`test/agents/`**, **`test/util/`**, **`test/bin/`**, **`test/integration/`** — additional coverage layers.
- Run with `npm test` (compiles `tsconfig.test.json` → `dist-test/`, then `node --test`). The `prepare` script compiles `dist/` for the CLI.

Fixtures are **read-only from the tests' perspective**: tests that need to write a cache pass an explicit `cacheRoot` (scratch dir) so the fixture tree stays clean.

---

## 8. Conventions and invariants

- **English**: all code, comments, and `docs/` content.
- **Spanish**: everything the user reads — README, Obsidian notes, OpenSpec artifacts, CLI user-facing messages.
- **Read-only where it matters**: install/update never touch the destination before confirmation; the doctor never modifies the vault, `.sdd-registry/`, `05_wiki/`, or `openspec/`.
- **Idempotence**: managed blocks, payload copies, note syncs, and validations are safe to re-run.
- **Machine-local policy**: `openspec/`, `.sdd-registry/`, `graphify-out/`, `05_wiki/`, and `.spectralis/` are never versioned or distributed (managed `.gitignore` block).
- **Exit codes are the contract**: commands return an integer that the CLI maps to `process.exitCode`; automation (e.g., `update --check`, `check`) relies on them.