# Propuesta: codex-compat

## Why

Codex CLI reads project skills from `.codex/skills/` (and `~/.codex/skills/` globally). Newer versions also read the open Agent Skills standard at `.agents/skills/`, whose SKILL.md frontmatter is identical to spectralis' — so the format is already compatible. However, spectralis does not yet know about Codex as a tool: there is no agent profile, no catalog entry, no path mapping, and no mirror step that populates `.codex/skills/` so Codex project mode works out of the box. Users who want to use Codex alongside spectralis currently have to wire it up by hand.

## What Changes

- **T1**: Add a `codex` profile to `AGENT_PROFILES` with `includeOpencode: false` (Codex reads `.agents/skills/` directly, so it does not need the `.opencode/` payload) and extend the `--agent` help strings of `init`/`update` to list `codex`.
- **T2**: Add `codex` to the `TOOLS_CATALOG` (dir `.codex`) so detection and the interactive menu surface it.
- **T3**: Wire `codex` into the path maps: `TOOL_PATHS` (config.ts), `toolDirs` (status.ts), `SKILL_AGENT_DIRS` (skill-detector.ts).
- **T4**: When `codex` is among the selected tools, mirror `.agents/skills/<name>/SKILL.md` → `.codex/skills/<name>/` at init (copy, not symlink). Add the mirror paths to the manifest `managedPaths` so `update` handles diffs. Do not add `.codex/` to `GITIGNORE_ENTRIES` — the mirror is committed to the project repo so Codex project mode works without extra setup.
- **T5 (housekeeping bundle)**: (a) add a `build` script alias to `package.json` (`tsc -p tsconfig.json`); (b) fix the `spec-create` bug where `progress.json` records `nombre=changeId` instead of the human `--nombre`; (c) document the orphan-dist caveat in `docs/spec-native.md` (tsc does not prune `dist/`).

## Impact

- **Users**: Codex becomes a first-class tool. `spectralis init --agent codex` produces `.agents/skills/` (shared) + `.codex/skills/` (mirror) and Codex reads the skills with no extra wiring.
- **Code**: small additive changes across `profiles.ts`, `detect-tools.ts`, `config.ts`, `status.ts`, `skill-detector.ts`, `copy-payload.ts`/`init.ts` (mirror step), `plan.ts` (text), `spec-create.ts` (bug fix), `package.json` (script). No breaking changes.
- **Tests**: extend existing seams (`detect-tools.test.ts`, `tool-selector.test.ts`, `copy-payload.test.ts`, `init.test.ts`, `spec-create.test.ts`); add a mirror-specific test. Acceptance: `npm test` green from 622/622 baseline; `tsc` clean; smoke: `init --agent codex` in a temp project yields `.agents/skills/` + `.codex/skills/` mirrors + `AGENTS.md`, and `spec status` lists `codex-compat`.
