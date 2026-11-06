# Design: codex-compat

## Context

Spectralis ships agent-specific payloads (`.opencode/`, `.agents/`) via `copyPayload` and profiles each supported agent in `AGENT_PROFILES`. Codex CLI is a new target that reads `.codex/skills/` (project) and `.agents/skills/` (open standard). The SKILL.md frontmatter is byte-compatible, so no format conversion is needed — only wiring and a mirror.

## Goals / Non-Goals

**Goals**:
- Make `codex` a first-class `--agent` value and detectable tool.
- Mirror `.agents/skills/` → `.codex/skills/` at init so Codex project mode works out of the box.
- Bundle three small housekeeping fixes (build script alias, spec-create `nombre` bug, orphan-dist docs).

**Non-Goals**:
- No global `~/.codex/` installs (project-local only).
- No slash-command / `$`-command generation differences (Codex reads skills only).
- No remap for other agents (claude, cursor, antigravity).

## Decisions

### D1: Mirror-copies vs symlinks
**Decision**: copy, not symlink.
**Rationale**: Codex project mode must work on Windows and on filesystems without symlink support; copies are also what `copyPayload` already does, so the mirror reuses the same mechanics (walk + copyFileSync) and the manifest hash-check handles diffs on `update`. Symlinks would break portability and add a new code path for no gain.

### D2: Committed mirror (no gitignore entry)
**Decision**: do NOT add `.codex/` to `GITIGNORE_ENTRIES`.
**Rationale**: the mirror is the project's committed copy of its skills in Codex format. Ignoring it would defeat the purpose — Codex project mode needs the files present in the working tree, and a fresh clone must work without a post-clone `spectralis init` step. The mirror is managed (hashed in the manifest) so `update --prune` can retire it if the user later drops Codex.

### D3: `includeOpencode: false` for the codex profile
**Decision**: the `codex` profile sets `includeOpencode: false`.
**Rationale**: Codex reads `.agents/skills/` natively (open standard); it does not need the `.opencode/` payload. This matches the `claude` and `antigravity` profiles. The `all` profile keeps `includeOpencode: true` and would also produce the mirror when Codex is among the selected tools.

### D4: Catalog wiring
**Decision**: add `{ id: 'codex', label: 'Codex CLI', dirs: ['.codex'] }` to `TOOLS_CATALOG`; add `codex: ['.codex']` to `status.ts` `toolDirs`; add `{ dir: '.codex/skills', agent: 'codex' }` to `SKILL_AGENT_DIRS`. No new config key — the existing `TOOL_PATHS` map in `config.ts` gains a `codex` entry.

### D5: Mirror step placement
**Decision**: the mirror runs inside `runInit` after `copyPayload` and before `writeManifest`, only when `toolSelection.selected.includes('codex')`. It walks `.agents/skills/` in the *target* (not the template) and copies each `SKILL.md` tree into `.codex/skills/`. The mirror paths are appended to `managedPaths` so the manifest tracks them. `update` reuses the same step (added to `runUpdate` with the same guard).

### D6: Housekeeping bundle (T5)
**Decision**: bundle three small fixes in one task group to avoid three separate changes:
- (a) `package.json` gets a `"build": "tsc -p tsconfig.json"` script alias; `build` is the conventional name and lets `npm run build` work without remembering the tsc incantation.
- (b) `spec-create.ts:68` passes `opts.nombre ?? changeId` instead of `changeId` to the registry entry's `nombre` field. The existing test at `test/commands/spec-create.test.ts` that asserts `entry.nombre === changeId` must be updated to assert the human `--nombre` value.
- (c) `docs/spec-native.md` gets a new section documenting the orphan-dist caveat: `tsc -p tsconfig.json` does not prune stale files from `dist/` (ghost `.js` of renamed/deleted sources — precedent lesson from close-out-residuals). Recommended cleanup: `rm -rf dist && npm run build`. No code change.

## Risks

- **Mirror drift**: if a user edits `.codex/skills/<name>/SKILL.md` by hand, the mirror and the source diverge. Mitigated by the manifest hash: `spectralis update` detects the conflict and offers the usual backup-and-replace flow.
- **Double counting in status**: if both `.agents/skills/` and `.codex/skills/` exist, `detectSkills` reports the same skill twice (once per agent label). Acceptable — they are different agent views and the user opted into both.
