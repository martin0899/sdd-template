# Proposal: add-spectralis-cli-installer

## Why

The SDD template currently requires cloning the repo and running a bash installer (`install.sh`, 1200+ lines) from inside the clone, which excludes Windows-native environments (no WSL/Git Bash), forces manual clone-and-cd steps for every collaborator, and has no dependency diagnostics before touching a destination. A global CLI installed from the clone (`npm i -g .`) makes onboarding a one-command experience (`spectralis init`) on any OS with Node >= 22, without publishing to the npm registry.

## What Changes

- Add an npm package (in-repo, never published) named `spectralis` with a global binary: `spectralis init`, `spectralis update`, `spectralis doctor`.
- The CLI is written in **TypeScript** (project base-standards mandate type safety and TDD).
- The template payload (`.agents/`, `.opencode/`, `docs/`, `docs-variants/`, `AGENTS.md`) is packaged **inside the npm package**; the CLI resolves it from its install location. No divergent canonical copies: `.agents/` remains the canonical source (base-standards §6).
- **Incremental port** of `install.sh` logic to TypeScript:
  - Phase 1: fresh-install path (`init`) ported first — prereq checks, stack detection, payload copy, standards composition from `docs-variants/`, Spanish context injection, `AGENTS.md` managed block, managed `.gitignore` block, manifest write.
  - Phase 2: `update` path ported (hash classification, conflicts, retired paths, partial-failure recovery). Until Phase 2 reaches parity, `install.sh` remains the canonical fallback and is NOT removed.
- New capability: `spectralis doctor` — verifies git, Node >= 22, openspec CLI, graphify CLI on the host and prints per-OS install instructions for missing tools before anything is written.
- Agent matrix: `--agent opencode` (default) | `antigravity` | `claude` | `all`. Payload adjusts accordingly (`.opencode/` only ships for opencode; `.agents/skills/` is the common base all agents load).
- Distribution contract: `git clone` → `npm i -g .` → `spectralis init <destino>`. The npm registry is never used (`npm publish` is out of scope).
- Anti-corruption policy carries over unchanged: dated `.sdd-backup-*/` backups, per-file confirmation, idempotent managed blocks, manifest with hashes.

## Capabilities

### New Capabilities

- `spectralis-cli`: Global CLI installed from the cloned template repo (`npm i -g .`, never published to npm registry) providing `init` (fresh install), `update` (sync existing installs), and `doctor` (prerequisite diagnostics) commands, with agent selection (`--agent`, default `opencode`), TypeScript implementation, and the template payload embedded in the package.
- `sdd-installer-doctor`: Pre-flight prerequisite diagnostics: verifies git, Node >= 22, openspec CLI, and graphify CLI on the host machine, reporting missing tools with per-OS install instructions before any write occurs.

### Modified Capabilities

- (none — existing `sdd-template-install` behavior is preserved; `install.sh` stays functional as canonical fallback during the incremental port)

## Impact

- **New code**: npm package root (e.g., `cli/`) with `package.json` (`bin: spectralis`, `engines: node >= 22`), TypeScript sources, and embedded template references.
- **Unchanged**: `install.sh` (remains canonical fallback until TS parity is proven), `docs-variants/`, `.agents/`, `.opencode/`, existing tests.
- **Tests**: existing `tests/test-install-update.sh` covers the update path well (conflicts, idempotency, partial failure, retired paths, legacy installs) but fresh install only shallowly — TDD for the TypeScript port must add fresh-install coverage.
- **Docs**: README gains a spectralis quickstart (clone → `npm i -g .` → `spectralis init`); GitHub repo may be renamed to `spectralis` for naming coherence (optional, non-blocking).
- **Risks**: bash→TS behavioral parity (awk-based YAML injection, hash classification edge cases); mitigated incrementally with `install.sh` as fallback and mirror tests per ported function.
