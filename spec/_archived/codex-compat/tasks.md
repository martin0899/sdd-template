# Tasks: codex-compat

## 1. Housekeeping (TDD first)

- [x] 1.1 (TDD) test/commands/spec-create.test.ts: test passing `nombre: 'Mi cambio'` asserts the progress registry entry records `nombre === 'Mi cambio'` (not changeId). RED first (current bug: src/commands/spec-create.ts sets `nombre: changeId`).
- [x] 1.2 Fix src/commands/spec-create.ts: registry entry uses `nombre: opts.nombre ?? changeId`. Update the existing assertion accordingly. GREEN.
- [x] 1.3 package.json: add `"build": "tsc -p tsconfig.json"` script alias (no test needed; verified by `npm run build` succeeding).
- [x] 1.4 docs/spec-native.md: new section documenting the orphan-dist caveat (tsc does not prune dist; cleanup: `rm -rf dist && npm run build`). No code change.

## 2. Profile and catalog wiring (TDD)

- [x] 2.1 (TDD) test for AGENT_PROFILES.codex { includeOpencode: false } and resolveAgent('codex') resolving correctly. RED.
- [x] 2.2 Add `codex: { includeOpencode: false }` to AGENT_PROFILES in src/agents/profiles.ts; update --agent help strings in src/bin/spectralis.ts to list codex. GREEN.
- [x] 2.3 (TDD) test for detect-tools: `.codex` detection + TOOLS_CATALOG entry `{ id: 'codex', label: 'Codex CLI', dirs: ['.codex'] }`. RED.
- [x] 2.4 Add the catalog entry in src/agents/detect-tools.ts; interactive menu surfaces codex (tool-selector). GREEN.

## 3. Path mapping wiring (TDD)

- [x] 3.1 (TDD) test for skill-detector: SKILL_AGENT_DIRS gets `{ dir: '.codex/skills', agent: 'codex' }` and detectSkills picks up SKILL.md under .codex/skills/. RED.
- [x] 3.2 Add the SKILL_AGENT_DIRS entry in src/core/skill-detector.ts. GREEN.
- [x] 3.3 (TDD) test for status toolDirs detection of `.codex`. RED.
- [x] 3.4 Add `codex: ['.codex']` to toolDirs in src/commands/status.ts; add `codex: '.codex'` to TOOL_PATHS in src/core/config.ts. GREEN.

## 4. Mirror step .agents/skills -> .codex/skills (TDD)

- [x] 4.1 (TDD) new test (test/core/codex-mirror.test.ts): when codex is among selected tools, init produces `.codex/skills/<name>/SKILL.md` mirroring `.agents/skills/<name>/SKILL.md`, and mirror paths appear in the manifest managedPaths. RED.
- [x] 4.2 Implement the mirror in src/commands/init.ts: after copyPayload, before writeManifest, only when toolSelection.selected includes 'codex': walk the TARGET `.agents/skills/` and copy each SKILL.md tree into `.codex/skills/`; append mirror paths to managedPaths. GREEN.
- [x] 4.3 Add the same guarded mirror step to src/commands/update.ts so update keeps the mirror in sync; targeted test for the update path.
- [x] 4.4 src/commands/plan.ts: mention the `.codex/skills` mirror in the dry-run plan text when codex is selected (init plan test must still pass).

## 5. Docs + verification

- [x] 5.1 README.md: mention `codex` as supported `--agent` value (Codex compatibility note).
- [x] 5.2 docs/spec-native.md: codex mirror behavior section (if tool lists live there).
- [x] 5.3 Review existing unit tests: no hardcoded catalog-length/profile-keys assumptions break (test/agents/detect-tools.test.ts, test/core/tool-selector.test.ts, test/commands/init.test.ts); update to include codex.
- [x] 5.4 Run `npm test` from 622/622 baseline (report real counts); `tsc` clean.
- [x] 5.5 Smoke: in a temp project, `node (dist) init --agent codex --yes` → `.agents/skills/` AND `.codex/skills/` mirrors + `AGENTS.md`; `spec status` lists codex-compat; `spectralis skill detect`/status tool labels correct. Report evidence.
- [x] 5.6 Run `timeout 300 bash qa/qa-coverage-gate.sh` if shell allows (or emulate per its docs; register QA-n in qa/pendientes-verificacion.md); `spectralis check --tdd` clean for this change.
- [x] 5.7 Update spec/codex-compat/change.json `estado` (open → done) and run `spectralis task codex-compat <last-task-id> --estado done` so the registry mirrors completion.

## 6. Notes for the implementer

- Branch: continue on current branch (main) per housekeeping convention — record in your notes.
- Registry sync: after finishing tasks, run `spectralis task codex-compat <id> --estado done` per completed id (or batch at the end) so spec/progress.json reflects reality.
- Never git add/commit.
