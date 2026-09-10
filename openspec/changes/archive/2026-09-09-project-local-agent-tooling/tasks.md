## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP, only if on base branch)

- [x] 0.1 If the current branch is the base branch (main/master/develop), create and switch to `feature/project-local-agent-tooling`; if already on another branch, record "continuing on current branch (multi-spec allowed)" and suggest it to the user
- [x] 0.2 Verify and report which branch case applied before making any file change

## 1. Installer: destination .gitignore management

- [x] 1.1 Add `manage_gitignore()` to `install.sh` using the marked-block pattern (BEGIN/END markers + sentinel detection) guaranteeing in the destination `.gitignore` the five exclusions: `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json`; verify the function creates the file when missing and appends the marked block when it exists, preserving all existing content
- [x] 1.2 Make `manage_gitignore()` idempotent (sentinel detects the existing block and skips) and wire it into the main install flow; verify a second run does not duplicate entries or the block
- [x] 1.3 Add the tracked-path warning: when the destination already has harness paths or generated artifacts tracked in git (e.g. `graphify-out/`), print a warning with the suggested `git rm -r --cached` untrack commands; verify the warning is read-only (no file changes)
- [x] 1.4 Extend `--dry-run` to report the `.gitignore` plan (block to add or already present) without writing; verify the destination stays byte-identical after a dry run

## 2. Template: AGENTS.md machine-local graphify rule

- [x] 2.1 Update the graphify rules block in the template `AGENTS.md` to add the machine-local policy (never commit `graphify-out/`; rebuild with `graphify update .` after cloning or changing machines) while keeping the search instructions (`query`, `path`, `explain`) and the sentinel sentence intact; verify the sentinel still matches (`grep -qF` check used by `manage_agents_md`)
- [x] 2.2 Run a real install into a disposable fixture directory and verify the created/appended `AGENTS.md` includes the machine-local rule; remove the fixture afterwards

## 3. Skills: vendor exemption and stale copy removal

- [x] 3.1 Delete the stale `.agents/skills/openspec-sync-specs/` copy (generatedBy 1.3.1) from the template; verify `openspec-*` skills exist only under `.opencode/skills/` and no other `.agents` skill was touched
- [x] 3.2 Amend `docs/base-standards.md` §4 and §6: document the vendor-managed exemption for `openspec-*` skills in `.opencode/skills`, the project-local (unversioned) policy for skills/commands/plugins in destinations, and the promotion flow (local skill -> template `.agents/skills` -> install/update distributes it); verify cross-references inside the document stay consistent

## 4. Payload: no plugins, no skills lock

- [x] 4.1 Add explicit payload manifest exclusions/comments for `.opencode/plugins/` and `skills-lock.json` in `install.sh` so future payload edits cannot ship a plugin accidentally; verify the manifest inspection (dry-run payload listing) shows no plugin entries
- [x] 4.2 Extend the post-install verification to report that the destination received no opencode plugins; verify the summary output states it

## 5. Tests: installer suite coverage (MANDATORY - review and update existing tests)

- [x] 5.1 Update `tests/test-install-update.sh` with a fresh-install case asserting the destination `.gitignore` contains the five exclusions inside the marked block; write the failing assertions first (TDD) and verify they pass once tasks 1.1-1.4 land
- [x] 5.2 Add an idempotence case: run install twice on the same fixture and assert no duplicated entries/blocks and a byte-stable `.gitignore`; verify the test passes
- [x] 5.3 Add a tracked-path case: fixture with a pre-committed `graphify-out/` (fixture-local git repo) asserting the warning prints and the install still completes; verify the test passes
- [x] 5.4 Add a dry-run case asserting the `.gitignore` plan is reported and the fixture is left unchanged; verify the test passes

## 6. Run test suite and record verification report (MANDATORY)

- [x] 6.1 Run the full `tests/test-install-update.sh` suite and capture results; document the adaptation: this repo has no database/endpoints/E2E surface, so state verification is limited to fixture directories restored or removed after each case
- [x] 6.2 Create the verification report at `openspec/changes/project-local-agent-tooling/reports/YYYY-MM-DD-installer-tests-and-fixture-verification.md` with commands executed, pass/fail summary, and fixture cleanup actions; mark this step complete only after the report exists

## 7. Documentation updates (MANDATORY)

- [x] 7.1 Update `docs/manuals/manual-installation.md` and `docs/manuals/git-workflow.md` with the agent-tooling versioning policy (five exclusions, why plugins are not shipped, `graphify-out/` machine-local lifecycle); verify every command/flag mentioned matches `install.sh` usage output
- [x] 7.2 Update `README.md` to mention the policy and the promotion flow for local skills; verify no stale references to versioned `.agents/`/`.opencode/` in destinations remain

## 8. Final verification gate

- [x] 8.1 Run `openspec validate "project-local-agent-tooling" --type change --strict` and the full installer test suite; verify both pass and every task above is completed
