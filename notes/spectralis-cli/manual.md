# spectralis CLI Manual

Standard usage documentation for the `spectralis` CLI: the tool that installs and updates the SDD template (OpenSpec root, skills, opencode commands, composed standards, managed blocks) into any project without corrupting it.

## Overview

```
git clone sdd-template -> npm i -g .   (ONE TIME per machine)
                                   |
                                   v
spectralis init <destino>          (anywhere; template is embedded in the global install)
spectralis update                  (re-sync installed destination with current template)
```

- The CLI is never published to the npm registry. It is installed globally from the cloned repository: `git clone` -> `cd sdd-template` -> `npm i -g .`. The clone can be deleted afterwards; the template payload (`.agents/`, `.opencode/`, `docs/`, `docs-variants/`, `AGENTS.md`) ships inside the installed package.
- Works natively on Windows, macOS and Linux (no WSL, no Git Bash). Only requirement: Node >= 22.

## Requirements

| Tool | Verified by | Minimal version |
|------|-------------|-----------------|
| git | `spectralis doctor` | any recent |
| node | `spectralis doctor` | >= 22 |
| openspec CLI | `spectralis doctor` | current |
| graphify CLI | `spectralis doctor` | current |

## Commands

### `spectralis init [<destino>]`

Installs the SDD template into a project. With no argument, the destination is the current working directory (git-init style). `--dry-run` shows the complete plan without writing anything.

**Tool selection:** During init, an interactive multi-select menu lets you choose which agent tools to configure. Detected tool directories (`.opencode/`, `.claude/`, `.antigravity/`, `.agents/`) are pre-selected. In non-interactive mode (`--yes`, `--agent`), the menu is skipped and the selection is derived from the flag or detection.

**Workflow (phases):**

1. Prerequisites gate — aborts without writing when a tool is missing
2. Read-only stack recognition (backend/frontend variants from project indicators)
3. Tool selection (interactive menu or `--agent` flag)
4. `openspec init` (non-interactive) when the OpenSpec root is missing
5. Spanish context injected by APPEND into `openspec/config.yaml` (comments and user context preserved)
6. Managed blocks in `AGENTS.md` (create / append / refresh, idempotent) and `.gitignore` (incl. `.claude/`)
7. Payload copy — new files copied in batch after confirmation; conflicts shown in a single summary with per-file decisions; identical files are skipped
8. Standards composed from `docs-variants/` per detected stack (placeholders filled; unresolvable placeholders stay visible for onboarding)
9. Manifest written with per-file hashes and selected tools
10. Final verification: warnings plus manual next steps

```
Nothing is written before the user confirms. Re-runs are idempotent
(identical files are skipped, no ghost backups).
```

**Options:**

| Option | Effect |
|--------|--------|
| `--agent <agente>` | Target agent profile (see matrix below). Default: interactive tool selection menu |
| `-d, --dry-run` | Full plan, zero writes, destination bit-identical |
| `--demo`, `--dd` | Alias for `--dry-run` |
| `--yes` | Non-interactive mode; install is still always backed up |

**Agent matrix (for `--agent` flag):**

| Agent | Value | Ships |
|-------|-------|-------|
| OpenCode (default) | `opencode` | `.agents/` + `.opencode/` + `docs/` + AGENTS.md + openspec |
| Antigravity | `antigravity` | `.agents/` + `docs/` + AGENTS.md + openspec (no `.opencode/`) |
| Claude Code | `claude` | same as `antigravity` (plus optional `npx skills`) |
| All | `all` | `.agents/` + `.opencode/` + `docs/` + AGENTS.md + openspec |

Unknown `--agent` values are rejected with the valid list before any write.

### `spectralis update [<destino>]`

Re-syncs an installed destination with the current template. Reads the manifest, classifies files by hash comparison, and applies updates with backups and confirmation. This is the only supported update mechanism.

**File classification:**

| Status | Meaning |
|--------|---------|
| unchanged | Hash identical to plantilla — skipped |
| updatable | User hasn't modified it; safe to update |
| conflict | User has modified it locally — backup + ask before replacing |
| new | In plantilla but not in destination — copied after confirmation |
| retired | In manifest/destination but removed from plantilla — reported, never deleted |

**Options:**

| Option | Effect |
|--------|--------|
| `-d, --dry-run` | Show the update plan without writing anything |
| `--demo`, `--dd` | Alias for `--dry-run` |
| `--check` | Check for updates without applying (read-only) |
| `--yes` | Non-interactive mode; conflicts are kept (conservative) |
| `--agent <agente>` | Target agent profile (same as init) |

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | Success or up-to-date |
| 1 | Partial update, error, or updates available (`--check`) |
| 2 | Destination not installed (no manifest) |

### `spectralis doctor`

Verifies the host prerequisites and reports each one with its detected version. Missing or insufficient tools get install instructions for the detected operating system (Windows / macOS / Linux). Runs anywhere, without a destination, and never writes to disk.

| Case | Exit code |
|------|-----------|
| All prerequisites satisfied | 0 |
| One or more missing / insufficient | 1 (nothing written) |

### `spectralis status [<destino>]`

Shows the installed SDD harness status: spectralis version, template version, selected tools, and a basic health check verifying tool directories exist. With no argument, checks the current working directory.

**Output includes:**
- Spectralis version that installed the harness
- Template version installed
- Registered tools (opencode, claude, etc.)
- Health check results for each tool
- Count of managed files

| Case | Exit code |
|------|-----------|
| Installed and healthy | 0 |
| Installed with warnings | 0 |
| Not installed (no manifest) | 2 |

### `spectralis config [<destino>]`

Shows the installed SDD harness configuration: versions, registered tools, tool directories, and managed file count. Read-only by default.

**Options:**

| Option | Effect |
|--------|--------|
| `--list` | List the effective routes (`vault_root`, `templates_dir`, `requirements_dir`, `projects_dir`, `resources_dir`, `projects_base`) with their origin (global / detected / derived / not set), plus the `obsidianSync` switch |
| `--get <key>` | Print the effective value of a route or switch with its origin |
| `--set <key>=<value>` | Set a route or switch (`obsidianSync=0|1`); use `--global` for machine-wide config |
| `--vault <path>` | Shorthand to set `vault_root` |
| `--resources <path>` | Shorthand to set `resources_dir` |
| `--global` | Apply to global config instead of the project manifest |

| Case | Exit code |
|------|-----------|
| Installed | 0 |
| Not installed (no manifest) | 2 |

### `spectralis check`

Deterministic, LLM-free doctor that validates the SDD flow consistency and the vault note ID conventions. Runs anywhere, never writes to the vault, `.sdd-registry/`, `05_wiki/`, or `openspec/`.

| Option | Effect |
|--------|--------|
| *(no flags)* | Run both sub-checks |
| `--registry` | Consistency of the triangle repo ↔ `.sdd-registry/REGISTRY.md` ↔ brain ↔ openspec |
| `--ids` | Validate vault note IDs (format `TYPE-YYYYMMDD-slug`, uniqueness, registration) |

- Exit code `0` when there are no errors (warnings do not block); `1` when at least one finding has severity error.
- `--ids` keeps an mtime cache (`.spectralis/ids-cache.json`) to re-parse only changed notes while always recomputing global uniqueness.

### `spectralis notes init` / `spectralis notes sync`

Manage the manual folders of the harness in the **cerebro** (the second brain, `03_Recursos/02_Sistemas_info/`):

- `notes init` — creates the subfolder structure (one per manual topic) where the manuals live; falls back to `info/` inside the project when no second brain is detected.
- `notes sync` — copies the canonical manuals from `notes/` in the template into the target folder (conflict → backup + ask; identical → skip).

Both work in any installed project and return `0` on success, `1` if no storage root is available.

### `spectralis seed`

Initial load of the machine-local wiki layer (`05_wiki/`): discovers projects under `projects_base` (recursively, up to depth 5) that have an `openspec/` root, creates the wiki skeleton (`decisiones/`, `errores/`, `log/`), reads each project's `stack.json`, and writes `05_wiki/_INDEX.json` with per-project `changes` count and `updated` timestamp.

| Option | Effect |
|--------|--------|
| `-d, --dry-run` | Show the projects that would be seeded without writing |
| `--project <name>` | Seed only the given project |

Requires `projects_base` to be configured (`spectralis config --set projects_base=<path> --global`).

### `spectralis projects`

Shows OpenSpec status across local projects found under `projects_base`: name, number of changes, and how many are complete/pending (by checking `tasks.md` checkboxes). `--json` prints the same data as JSON. Requires `projects_base` to be configured.

### `spectralis spec init` / `spectralis spec complete`

Creates and validates the spec folder of a requirement in the brain (`01_Proyectos/<project>/<spec-id>/`):

- `spec init <project> <spec-id>` — creates the folder with `briefing.md`, `tests.md`, and `resumen.md`.
- `spec complete <project> <spec-id>` — validates the files are filled, registers the spec in `.sdd-registry/REGISTRY.md`, and runs the distillation into `05_wiki/`.

Return `0` on success, `1` on error (e.g., empty files in `spec complete`).

### `spectralis skills [<destino>]`

Detects the skills present in a project (from `.agents/skills/`, `.opencode/skills/`, and agent-specific folders), writes `_INDEX_SKILLS.json`, and updates the `<system-reminder>` block in `AGENTS.md` so agents know which skills are available. `--dry-run` only lists what would change.

### `spectralis distill <project>`

Extracts knowledge from completed specifications in `01_Proyectos/<project>/` and writes distilled, optimized notes to `05_wiki/<project>/`. Uses a hybrid deterministic + semantic approach to minimize LLM token usage. The command is idempotent and supports `--dry-run`.

**Organization entries ignored:** `distill` reads only `<spec-id>/` folders. Entries whose name starts with `_` — `_Notas/`, `_INDEX.md`, `_README.md` — are treated as vault organization and never distilled into `05_wiki/`.

**Stack detection:** scans the real project code (via `--project-root` or `projects_base` convention) to populate the `stack` field in `_INDEX.json`.

**LLM classification:** when Ollama is configured (`llm.enabled: true`), ambiguous entries are classified via LLM. Without LLM, ambiguous entries are discarded.

**Output files:**
- `05_wiki/<project>/arquitectura.md` — system overview (overwrite)
- `05_wiki/<project>/decisiones/<spec-id>.md` — architecture decisions (merge by spec-id)
- `05_wiki/<project>/errores/<spec-id>.md` — post-mortems (merge by spec-id)
- `05_wiki/<project>/log/YYYY-MM.md` — significant changes (append-only)
- `05_wiki/<project>/restricciones.md` — hard constraints (overwrite)
- `05_wiki/_INDEX.json` — metadata index (includes `stack` field)
- `01_Proyectos/<project>/_README.md` — auto-generated project summary

**Options:**

| Option | Effect |
|--------|--------|
| `-d, --dry-run` | Show what would be written without modifying files |
| `--demo`, `--dd` | Alias for `--dry-run` |
| `-p, --project-root <path>` | Path to the real project code for stack detection |

**LLM configuration** (in `~/.config/spectralis/config.json`):

```json
{
  "llm": {
    "host": "http://localhost:11434",
    "model": "llama3.1:8b",
    "enabled": true
  }
}
```

Auto-detected on `spectralis init` and `spectralis update` via `OLLAMA_HOST`.

### `spectralis --version`

Reports the arnés (CLI) version. Use `--v` as a shorthand alias.

```
$ spectralis --version
1.2.0

$ spectralis --v
1.2.34
```

Every completed `init` records both relevant versions in the destination manifest:

```
$ spectralis --version
1.2.34

$ head -5 <project>/.sdd-manifest.json
{
  "schemaVersion": 2,
  "spectralisVersion": "1.2.34",  <- arnés (CLI) version that ran the init
  "templateVersion": "1.2.34",    <- template (payload) version installed
  "tools": ["opencode"],           <- selected agent tools
  ...
}
```

## Versioning policy

### Arnés (this template repo)

- The package is born at `1.0.0`.
- Format: `MAJOR.MINOR.<N>`, where **`N` (the PATCH value) is the count of completed/archived OpenSpec changes**. Every archived change increments `N`; there is no manual judgment about whether a change is "minor" or "patch".
- `MINOR` bumps: reserved for explicit, user-approved re-scoping (e.g. a contract change or major restructuring) and are never inferred from change count.
- `MAJOR` bumps: only on explicit user confirmation; the agent may suggest them when accumulated project changes justify it.

### Proyecto destino (projectVersion)

- `spectralis init` asks for the current project version; pressing Enter without a value defaults to `1.0.0`. The detected version from `pom.xml`/`package.json` is shown as a suggestion.
- Stored as `projectVersion` in `.sdd-manifest.json` (schema v3). Manifest v1/v2 are read tolerantly, deriving `projectVersion` from the legacy `templateVersion` or defaulting to `1.0.0`.
- **PATCH** increments by 1 per archived spec (with its commit) — there is no reliable bug detection, so every completed spec counts. Carry: `1.2.99` + spec → `1.3.0`.
- **MINOR** increments by 1 (PATCH resets to 0) when the user requests a version release. Carry: `1.99.5` → `2.0.0`.
- **MAJOR** increments only on explicit compatibility-breaking decisions.
- Each component is capped at `99`; the bump carries to the next component.
- The commit/release skill uses `.sdd-manifest.json → projectVersion` as the canonical version source (fallback: `pom.xml`/`package.json`). Bumps are available in `src/core/project-version.ts` (`bumpPatch`/`bumpMinor`/`bumpMajor`).

## Obsidian orchestration switch (`obsidianSync`)

The `obsidianSync` switch (default `0` = off) controls whether the CLI and the OpenSpec workflow synchronize with the **cerebro** (the second brain) automatically. Off by default means **zero extra token cost**.

| Value | Behavior |
|-------|----------|
| `0` (default) | No orchestration. Nothing is written to the brain unless a command runs manually. |
| `1` | Orchestration on. `init`/`update` run `notes init` + `notes sync`; `/opsx-apply` invokes `obsidian-briefing`; `/opsx-archive` invokes `obsidian-summary` + `obsidian-tests` + `spec complete`. |

Configure and inspect it:

```bash
spectralis config --set obsidianSync=1        # per project (--global for machine-wide)
spectralis config --get obsidianSync          # effective value and origin (config/manifest/default)
spectralis config --list                      # shows obsidianSync alongside the routes
```

Per-command overrides (do not change the stored switch):

```bash
spectralis init --obsidian                    # force orchestration for this run
spectralis init --no-obsidian                # disable for this run
spectralis update --obsidian                  # force for this run
spectralis update --no-obsidian             # disable for this run
```

The orchestration logic lives in the `obsidian-orchestration` skill (`.agents/skills/`), referenced from the managed `AGENTS.md` block; it is idempotent and never modifies the vendor-managed `.opencode/commands/opsx-*` files.

## Reproducible stack detection (`stack.json`)

`spectralis init` (and `distill`) detect the project stack deterministically and persist it to `stack.json` at the project root. The artifact is the single source of truth consumed by `seed`, `distill` and the `sdd-onboard-project` skill.

**Detection contract:**

- **Root scan**: indicators (`package.json`, `pom.xml`, `build.gradle(.kts)`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`) at the project root.
- **Monorepo depth 2**: the same indicators are searched up to 2 levels deep, but ONLY under known monorepo dirs (`packages`, `apps`, `services`, `libs`).
- **Excluded dirs** (never scanned): `node_modules`, `.opencode`, `.git`, `dist`, `build`, `.next`, `.nuxt`, `__pycache__`, `vendor`, `target`, `.cache`, `.sdd-backup-*`.
- **Cache invalidation**: `stack.json` is re-detected when any indicator has a modification time newer than `detected_at`.
- **Generic degradation**: stacks without a supported variant (Django, FastAPI, Flask, Gin, Axum, Rails, ...) degrade `backend`/`frontend` to `generic`; the real `language`/`framework` remain recorded in `stack.json` for onboarding refinement. No new variants are added.

**Artifact schema:**

```json
{
  "backend": "spring-boot|express-node|nestjs|react|angular|generic|none",
  "frontend": "react|angular|generic|none",
  "language": "Java", "languageVersion": "21",
  "buildTool": "Maven", "testFramework": "JUnit",
  "framework": "Spring Boot", "frameworkVersion": "3.2.0",
  "frameworkFe": "", "frameworkVersionFe": "",
  "projectName": "demo-app", "detected_at": "2026-09-25T..."
}
```

`stack.json` is machine-local and gitignored.

## Anti-corruption guarantees

- Nothing is written before the user confirms the plan (except with `--dry-run`, which never writes at all; and `--yes`, which still backs up first).
- Any existing file that differs is backed up to `.sdd-backup-<fecha>/` before being questioned.
- Idempotent re-runs: identical files are skipped, managed blocks are never duplicated.
- `.sdd-manifest.json` inventories every managed file with a SHA-256 hash — the exact payload that traveled to the destination.
- Managed `.gitignore` block includes `openspec/`, `.claude/`, and `05_wiki/`: the SDD spec/changes tree and the biblioteca (LLM Wiki) layer are machine-local and never committed.
- `notes/` (this file, and all other manuals in the template) never leak into the destination — they live in the cerebro (the second brain) and are synced with `spectralis notes sync`.
- `install.sh` (removed) and `docs-variants/` never leak into the destination.

## Migrating from install.sh

`spectralis` is the only supported installer. If your project was previously installed with `install.sh`:

1. Clone the template: `git clone https://github.com/martin0899/sdd-template.git && cd sdd-template`
2. Install the CLI: `npm i -g .`
3. Run `spectralis update` in your project — it reads the existing `.sdd-manifest.json` (if present) and syncs with the current template.
4. If no manifest exists, run `spectralis init` instead.

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `spectralis init` | Install SDD template into a project |
| `spectralis update` | Sync installed destination with template |
| `spectralis update --check` | Check for updates without applying |
| `spectralis status` | Show installed harness status |
| `spectralis config` | Show/modify harness configuration |
| `spectralis doctor` | Verify host prerequisites |
| `spectralis check` | Validate SDD flow consistency and vault note IDs |
| `spectralis notes init/sync` | Create/sync manual folders in the second brain |
| `spectralis seed` | Initial load of `05_wiki/` from discovered projects |
| `spectralis projects` | Show OpenSpec status across local projects |
| `spectralis spec init/complete` | Create/validate a spec folder in the brain |
| `spectralis skills` | Detect skills and write `_INDEX_SKILLS.json` + system-reminder |
| `spectralis distill` | Extract knowledge from specs into 05_wiki/ |

### Common Flags

| Flag | Aliases | Description |
|------|---------|-------------|
| `--dry-run` | `--demo`, `--dd` | Show plan without writing |
| `--version` | `--v` | Show CLI version |
| `--check` | — | Read-only update check |
| `--yes` | — | Non-interactive mode |
| `--agent <name>` | — | Target agent profile |
