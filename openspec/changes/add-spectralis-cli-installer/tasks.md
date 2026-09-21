# Tasks: add-spectralis-cli-installer

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP, only if on base branch)

- [ ] 0.1 If current branch is `main`/`master`/`develop`, create feature branch `feature/add-spectralis-cli-installer`; if already on another branch, record "continuing on current branch (multi-spec allowed)" and suggest it to the user. Verify with `git branch --show-current`.

## 1. Package Scaffolding (Design D1, D2, D5)

- [ ] 1.1 Create root `package.json` (name `spectralis`, bin `spectralis`, `engines: node >= 22`, `files`: `dist/`, `.agents/`, `.opencode/`, `docs/`, `docs-variants/`, `AGENTS.md`, `README.md`, `prepare` script running `tsc`) and `tsconfig.json` (strict mode, outDir `dist`). Verify: `npm i -g .` succeeds and `spectralis --help` prints usage; `npm pack --dry-run` lists exactly the payload template plus `dist/`.
- [ ] 1.2 Create minimal entrypoint `src/bin/spectralis.ts` with `commander` (`init`, `update`, `doctor`, `--agent`, `--dry-run`, `--yes`) and wire `agents/profiles.ts` with `AGENT_PROFILES` (opencode default | antigravity | claude | all; `.opencode/` only for opencode/all). Verify: unknown `--agent` value exits with error and valid list before any write (spec scenario "Agente no soportado").

## 2. Doctor (Design D8, TDD)

- [ ] 2.1 Write failing unit tests for `core/prereqs` (detect git, node >= 22, openspec, graphify via PATH; structured report; per-OS install instructions). Verify: tests fail before implementation, pass after (`node --test`).
- [ ] 2.2 Implement `core/prereqs` and `commands/doctor.ts` (standalone, zero writes to disk). Verify: unit tests green; manual run `spectralis doctor` with a tool removed from PATH reports the missing tool with OS instructions and exits non-zero (spec scenarios "Herramientas faltantes", "Node con versión insuficiente").

## 3. Init Port — Fresh Install (Design D3, D4, D7, TDD per unit)

- [ ] 3.1 Write failing unit tests for `core/detect-stack` (pom.xml/spring-boot, package.json/express and nestjs precedence, react frontend-pure → backend `none`, no indicators → `generic`, read-only). Implement until green. Verify: `node --test` green; detection reads without writing (spec requirement "Detección de stack del destino").
- [ ] 3.2 Write failing unit tests for `core/compose-standards` (variant composition, placeholder fill `PROJECT_NAME`/`LANGUAGE`/`FRAMEWORK`/etc., unresolved placeholders stay visible, backend-pure omits frontend file). Implement until green. Verify: unit tests green (spec requirement "Composición de estándares desde docs-variants").
- [ ] 3.3 Write failing unit tests for `core/spanish-context` using the `yaml` Document API (append to `context:` field preserving comments and existing content; field missing → create; idempotent). Implement until green. Verify: unit tests green including comment-preservation case (spec requirement "Inyección de contexto español por APPEND").
- [ ] 3.4 Write failing unit tests for `core/copy-payload` + `core/manifest` (new file → direct copy; conflict → backup to `.sdd-backup-<fecha>/` + confirm prompt; identical → skip; manifest with sha256 hashes and semver templateVersion per Design D5). Implement until green. Verify: unit tests green; no overwrite without backup (spec requirement "Copia de payload con política anti-corrupción").
- [ ] 3.5 Write failing unit tests for `core/agents-md` and `core/gitignore` (managed blocks idempotent; create/append/refresh behaviors per `sdd-installer-agents-sync` and `sdd-installer-gitignore-sync` requirements incl. `.claude/` entry). Implement until green. Verify: unit tests green.
- [ ] 3.6 Write failing unit tests for `core/post-checks` (routing files present, autoskills pending notice, generic-standards warning). Implement until green. Verify: unit tests green.
- [ ] 3.7 Implement `commands/init.ts` orchestrating: prereqs gate → dry-run plan (recognition + plan without writes) → recognition → confirm → openspec init (non-interactive) → injections → payload copy → standards composition → manifest → autoskills opt-in prompt (opt-in, Node >= 22, failure never aborts) → post-checks. Verify: full unit suite green; autoskills scenarios covered (accept/reject/`--yes`/Node insufficient per spec requirement "Sugerencia opt-in de autoskills").

## 4. Integration Mirror Suite (Design D6)

- [ ] 4.1 Write integration tests running the compiled CLI against temp destinations with fake bins (`openspec`, `graphify`) mirroring `tests/test-install-update.sh` fresh-install scenarios: clean destination, `--yes`, `--dry-run` leaves destination bit-identical, conflict keeps destination version, interrupted copy reports partial state with backups preserved, idempotent re-run creates no backups. Verify: suite green.
- [ ] 4.2 Packaging integration test: `npm pack` + global install into a temp prefix, delete the clone, run `spectralis doctor` and `spectralis init --dry-run` from a scratch cwd. Verify: CLI resolves embedded template and variants without the clone (spec requirement "Distribución por instalación local desde el clone").
- [ ] 4.3 Implement `commands/update.ts` stub: prints not-available notice with `install.sh --update` instruction, writes nothing (spec requirement "Comando update en fase de port incremental"). Verify: test asserts zero writes and correct message.

## 5. Verification (MANDATORY - AGENT MUST EXECUTE)

- [ ] 5.1 Review and update existing verification assets: run `bash tests/test-install-update.sh` and confirm `install.sh` behavior is untouched (all pass). Verify: exit 0.
- [ ] 5.2 Run full TypeScript suite (`npm test`) and record counts (passed/failed/skipped, runtime, flakiness). No database exists in this repository and none is added — record this N/A exception explicitly (per openspec-tasks-mandatory-steps, DB-state step) in the report.
- [ ] 5.3 Manual end-to-end rehearsal (AGENT MUST EXECUTE): in a scratch temp project, run `spectralis init` (fake bins), then re-run to confirm idempotency, and run `spectralis init --agent antigravity` verifying no `.opencode/` is created. No backend endpoints exist — curl step N/A; no frontend — Playwright E2E N/A. Document commands and outcomes in report `openspec/changes/add-spectralis-cli-installer/reports/YYYY-MM-DD-step-N+1-unit-test-and-db-verification.md` following the mandatory report template.

## 6. Update Technical Documentation (MANDATORY)

- [ ] 6.1 Rewrite `README.md` quickstart: clone → `npm i -g .` → `spectralis init|update|doctor` (never `npm publish`), agent matrix table, `install.sh` documented as canonical fallback during the port. Verify: quickstart commands match the implemented CLI exactly.
- [ ] 6.2 Review whether `docs/manuals/manual-installation.md` needs a spectralis note (CLI replaces the manual path on Node >= 22 hosts; manual guide remains for no-Node environments). Verify: README and manual are consistent, no contradictions with the bash installer docs.
