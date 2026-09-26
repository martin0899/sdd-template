# AGENTS.md - Coding Guidelines

## Core Development Rules

> **IMPORTANT**: [`docs/base-standards.md`](./docs/base-standards.md) contains the general rules and is the **core of development rules** for this project. Always read and consider it **first** before any task. It takes precedence over all other guidelines.

## Skills Index

**Before invoking any project skill under `.agents/skills/`, consult [`.agents/skills/INDEX.md`](./.agents/skills/INDEX.md) to choose the right skill from its trigger, and load ONLY the chosen skill's `SKILL.md` — never other skills' files. Skills under `.opencode/skills/` (vendor OpenSpec) always load as usual.**

**Skill destination rule: every new skill — or any skill requested to be created — MUST be placed under `.agents/skills/<name>/SKILL.md` (or the directory corresponding to the selected agent). NEVER place new skills under `.opencode/skills/` (vendor-managed by OpenSpec).**

## Exploration Briefing Gate

**When an OpenSpec exploration crystallizes or the user asks to proceed/capture it: ALWAYS return a briefing proactively (closed decisions, code-grounded findings, open questions, proposed change scope) and NEVER run `openspec new change` or write change artifacts before the user explicitly confirms.** Protocol detail: `.agents/skills/exploration-briefing/SKILL.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- **For any code investigation, understanding, or information search, ALWAYS use graphify first** — run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Only skip graphify if the user explicitly says "no uses graphify" or similar in their prompt.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- graphify-out/ is machine-local: NEVER commit it to the repository (the managed .gitignore block excludes it). Rebuild it with `graphify update .` after cloning the project or changing machines — it is regenerable at no API cost. The search instructions above are unaffected by this policy.

## Mandatory OpenSpec for Requirements

**All requirement-related work MUST go through OpenSpec.** Documentation is the source of truth; OpenSpec enforces it.

When a user request involves any of the following, it is a requirement and must be routed through the OpenSpec workflow:

- New feature or functionality
- Bug fix that changes behavior
- Modification to existing functionality
- Change that affects system behavior, UI, API, or database
- Any work that would produce a deliverable

**Required workflow for requirements:**

1. **Recognize the requirement** — If the request involves building, fixing, or modifying something, it is a requirement.
2. **Route through OpenSpec** — Use `requirements-discovery` to define the requirement, then `spec-from-note` to generate OpenSpec artifacts.
3. **Never skip tasks.md** — When creating or updating OpenSpec changes, always create/update `tasks.md` with verifiable implementation steps.
4. **Verify before implementing** — Before writing code, confirm that an active OpenSpec change exists with updated tasks.

**Enforcement:** The `openspec-gate` skill verifies these conditions before allowing implementation. If no active change exists, the gate blocks code changes and routes to the appropriate OpenSpec workflow.

## Obsidian Integration (Second Brain + Wiki)

**All requirement-related work MUST be documented in Obsidian for cross-machine portability.** OpenSpec files stay in the repository; Obsidian provides the portable wiki.

When working with requirements and specifications:

1. **Capture in Obsidian** — Use `second-brain` skill to capture ideas and notes in `00_Notas/`.
2. **Document requirements** — Use `requirements-discovery` to create requirement notes in Obsidian.
3. **Generate summaries** — Use `obsidian-summary` to create wiki-style summaries after completing specifications.
4. **Document tests** — Use `obsidian-tests` to create test documentation for regression testing.
5. **Technical briefings** — Use `obsidian-briefing` to create portable technical summaries.

**Obsidian Vault Location:** `/home/martinmartinez/Documentos/obsidian_sync_git`

**Vault Structure Rule (MANDATORY):**
- `00_Notas/` = **inbox** — ALL notes arrive here first (proposals, ideas, pendientes)
- `01_Proyectos/<Proyecto>/` = **ONLY spec folders** (`<spec-id>/` with briefing.md, tests.md, resumen.md) + `_README.md` + `_INDEX.md`. **NEVER loose notes.**
- When a note becomes a spec: create `01_Proyectos/<Proyecto>/<spec-id>/`, archive the source note to `04_archivado/`
- `05_wiki/` = distilled knowledge (machine-local, not committed)

**Required workflow for Obsidian documentation:**

1. **After completing a specification** — Generate a summary in Obsidian using `obsidian-summary`.
2. **After creating tests** — Document tests in Obsidian using `obsidian-tests`.
3. **When technical decisions are made** — Create a briefing in Obsidian using `obsidian-briefing`.
4. **When ideas arise** — Capture in Obsidian using `second-brain`.

**Templates location:** `{vault_root}/09_Plantilla/`

**Enforcement:** The `openspec-gate` skill verifies that documentation exists in Obsidian before allowing archiving. If no documentation exists, the gate routes to the appropriate Obsidian skill.

## Obsidian Orchestration (switch obsidianSync)

**Al aplicar (`/opsx-apply`) o archivar (`/opsx-archive`) un change OpenSpec, consulta el switch de orquestación `spectralis config --get obsidianSync` (o los flags `--obsidian`/`--no-obsidian`). Si está activo, consulta la skill `.agents/skills/obsidian-orchestration/SKILL.md` y sigue su protocolo: `obsidian-briefing` al completar apply; `obsidian-summary` + `obsidian-tests` + `spectralis spec complete` antes de archivar. Con el switch en `0` (o `--no-obsidian`), no escribir nada en el cerebro. Los comandos `.opencode/commands/opsx-*` son vendor-managed por OpenSpec y NO se modifican.**
