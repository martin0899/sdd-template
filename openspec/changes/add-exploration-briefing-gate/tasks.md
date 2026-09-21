# Tasks: add-exploration-briefing-gate

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP, only if on base branch)

- [x] 0.1 If current branch is `main`/`master`/`develop`, create feature branch `feature/add-exploration-briefing-gate`; if already on another branch, record "continuing on current branch (multi-spec allowed)" and suggest it to the user. Verify with `git branch --show-current`.

## 1. Skill: exploration-briefing

- [x] 1.1 Create `.agents/skills/exploration-briefing/SKILL.md` with frontmatter (`name`, `description`, `author`, `version`) implementing the briefing protocol from specs: proactive briefing at exploration close (decisions closed with values, code-grounded findings with file/function references, open questions, proposed change scope), clarifying questions when ambiguous, direct yes/no when clear, and no-write-until-confirmed gate. Verify: file exists with valid frontmatter matching the Agent Skills convention used by sibling skills.
- [x] 1.2 Write the briefing-gate rule in the template's `AGENTS.md` managed block (2-3 lines, imperative, same style as the graphify-first rule): return the briefing in chat proactively without being asked, and never run `openspec new change` or write change artifacts before explicit user confirmation. Verify: rule present inside the managed block markers; `grep -c` returns 1 occurrence.

## 2. Skill Index Registration

- [x] 2.1 Add `exploration-briefing` row to `.agents/skills/INDEX.md` with trigger ("closing an OpenSpec exploration", "briefing", "resumen de exploración", "before `openspec new change` after an explore session") and full path. Verify: table row present; path points to the existing SKILL.md.

## 3. Verification (MANDATORY - AGENT MUST EXECUTE)

- [x] 3.1 Review and update existing verification assets: this project has no unit test suite and no database (docs/skill-only change), so existing tests `tests/test-install-update.sh` are unaffected; confirm no managed payload assertion breaks because of the new skill (the installer ships `.agents/skills/` whole). Verify: run `bash tests/test-install-update.sh` and confirm it still passes.
- [x] 3.2 Run `openspec validate add-exploration-briefing-gate` and confirm the change reports valid. Verify: command exits successfully.
- [x] 3.3 Manual workflow rehearsal (AGENT MUST EXECUTE): in a scratch directory outside this repo, simulate an exploration close and confirm the AGENTS.md rule + skill produce the gate behavior (briefing in chat, yes/no question, no write before confirmation). No endpoints/DB involved (N/A for curl step per openspec-tasks-mandatory-steps; no frontend, N/A for Playwright E2E). Record the rehearsal outcome in `openspec/changes/add-exploration-briefing-gate/reports/` following the `YYYY-MM-DD-step-N+1-verification.md` naming pattern.
- [x] 3.4 Database state verification: N/A - this repository contains no database and this change adds none. Record this exception explicitly in the report created in 3.3.

## 4. Update Technical Documentation (MANDATORY)

- [x] 4.1 Review `README.md` "Mantenimiento del repo plantilla" section: add a one-line note that new explorations must pass the briefing gate before `openspec new change` (keep it minimal; full protocol lives in the skill). Verify: README line present and consistent with the managed rule wording.
