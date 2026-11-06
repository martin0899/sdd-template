# Tasks: lean-harness-payload

## 1. Workstream A — Payload stubs (TDD: tests → stubs)

### 1.1 Tests for neutral stubs
- [x] Write test: `docs/api-spec.yml` is a valid OpenAPI 3 skeleton with `/health` and empty `schemas`, under 30 lines, no LTI/ATS references
- [x] Write test: `docs/data-model.md` contains `{{entities}}` placeholder and `graphify` instruction, under 20 lines, no LTI references
- [x] Write test: `docs/development_guide.md` contains sections `Setup`, `Commands`, `Structure`, `Environment` with placeholders, under 40 lines, no cloned repo URLs or hardcoded credentials

### 1.2 Implement neutral stubs
- [x] Replace `docs/api-spec.yml` with OpenAPI 3 skeleton (~25 lines): `openapi: 3.0.0`, `info`, `/health` endpoint, empty `components.schemas`, comment pointing to `sdd-onboard-project`
- [x] Replace `docs/data-model.md` with placeholder (~15 lines): H1, graphify instruction, `{{entities}}` placeholder
- [x] Replace `docs/development_guide.md` with sectioned placeholders (~30 lines): H1, `Setup`/`Commands`/`Structure`/`Environment` with `{{stack}}`/`{{commands}}` placeholders, no LTI content

---

## 2. Workstream B — AGENTS.md reduction (TDD: integration test rewrite → AGENTS.md rewrite)

### 2.1 Rewrite integration test to new contract
- [x] Update `test/integration/agents-md-reduced.test.ts`: change line count range from `35–45` to `22–28`
- [x] Update `test/integration/agents-md-reduced.test.ts`: reduce the 13 mandatory sections to ~7–8 essential routing references (`docs/base-standards.md`, `.agents/skills/INDEX.md`, `graphify`, `OpenSpec`, `Obsidian Orchestration`, `Lessons`, `Fachada`/`ciclo spec`)
- [x] Update test description from `~40 lines` to `~25 lines`

### 2.2 Rewrite AGENTS.md template
- [x] Rewrite `AGENTS.md` to ~25 lines: one-liner + 3 global rules + graphify block (2 lines) + "when to read what" map + single cycle pointer
- [x] Verify no content duplication with `docs/base-standards.md` (lines ≥40 chars not shared)
- [x] Verify `src/core/agents-md.ts` injectors still work (no code change needed)

---

## 3. Workstream C — `update --prune` (TDD: e2e test → flag implementation)

### 3.1 E2E test for `--prune`
- [x] Write e2e test in `test/commands/update.test.ts`: `init` → delete a payload file from disk → add it as retired entry in manifest with matching hash → `update --prune --yes` → file is NOT present, backup exists in `.sdd-backup-*/`
- [x] Write e2e test: `--prune` preserves retired files whose hash differs from manifest (user-edited)
- [x] Write e2e test: `--prune --dry-run` reports prunable files without writing
- [x] Write e2e test: `--prune --check` reports retired count without writing
- [x] Write e2e test: `--prune` without `--yes` asks for confirmation (input `n\n` → nothing deleted)
- [x] Write e2e test: without `--prune`, retired files are reported but NOT deleted (existing behavior preserved)
- [x] Extra e2e tests (spec scenarios): manifest after prune (pruned excluded / preserved kept with its reference hash), `--prune` without retired files, and fs-only deletion (never staged in git)

### 3.2 Implement `--prune` flag
- [x] Add `prune?: boolean` to `UpdateOptions` interface in `src/commands/update.ts`
- [x] Add `--prune` option to the `update` command in `src/bin/spectralis.ts`
- [x] Implement prune logic in `src/commands/update.ts`: for each `retired` file, compare `sha256File(destFile)` with manifest hash → if match: backup + `rmSync`; if mismatch: report and skip
- [x] Ensure `--dry-run` and `--check` short-circuit the prune logic (report only, no writes)
- [x] Ensure confirmation prompt before prune unless `--yes`/`--auto`
- [x] Update manifest rewrite to exclude successfully pruned files
- [x] Ensure backup directory follows existing pattern: `.sdd-backup-<timestamp>-<pid>`

---

## 4. Documentation (last, after behavior is fixed)

### 4.1 CHANGELOG.md
- [x] Add entry under `## Unreleased` describing: neutral stubs replacing LTI manuals, AGENTS.md reduced to ~25 lines, `update --prune` flag with hash-match + backup semantics

### 4.2 README.md
- [x] Update `README.md:~110` (init section): mention that docs/ contains neutral stubs filled by `sdd-onboard-project`
- [x] Update `README.md:~372` (update section): document `--prune` flag, its hash-match safety, backup behavior, and `--dry-run`/`--check` interaction

### 4.3 notes/spectralis-cli/manual.md
- [x] Update the `update` command section with `--prune` documentation
