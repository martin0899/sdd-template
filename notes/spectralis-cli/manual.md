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

**Parameters:**

| Parameter / Option | Description | Default | Required |
|--------------------|-------------|---------|----------|
| `<destino>` (positional) | Destination project directory (git-init style when omitted) | current working directory | no |
| `--agent <agente>` | Target agent profile (`opencode` \| `antigravity` \| `claude` \| `all`) | interactive menu | no |
| `-d, --dry-run` | Show the full plan without writing | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |
| `--yes` | Non-interactive mode (always with backup) | off | no |
| `--obsidian` | Force obsidian orchestration for this run | off | no |
| `--no-obsidian` | Disable obsidian orchestration for this run | off | no |

**Examples:**

```text
$ spectralis init
────────────────────────────────────────────────────
  spectralis
  Spec-Driven Development toolkit · no npm registry
  arnés 1.2.35 · project 1.2.35
────────────────────────────────────────────────────
== PLAN (dry-run; nothing written yet) ==   # with -d/--dry-run
```

```text
$ spectralis init my-project
== PLAN ==
  1. Prerequisites verified.
  -- recognition: ./my-project
     openspec/            missing (will be created with openspec init)
     backend : variant generic
     frontend: variant generic
     project : my-project
  2. openspec init (non-interactive) with tools: opencode
  3. Spanish context injected by APPEND into openspec/config.yaml
  ... (confirmation prompt; nothing written until confirmed)
```

```text
$ spectralis init --agent opencode --dry-run
== PLAN (dry-run; nothing written yet) ==
  1. Prerequisites verified.
  -- recognition: /path/to/demo-project
     openspec/            missing (will be created with openspec init)
     graphify-out/        missing (create it later: graphify update .)
     backend : variant generic
     frontend: variant generic
     project : demo-project
  2. openspec init (non-interactive) with tools: opencode
  ...
  4b. Standards composed from docs-variants/ based on the detected stack:
     backend-standards.md  <- docs-variants/backend/generic.md (known placeholders filled)
     frontend-standards.md <- docs-variants/frontend/generic.md (known placeholders filled)
  5. Git hooks: post-merge auto-rebuild (if git repo + tsconfig.json).
```

**Notes:**
- Nothing is written before the user confirms; `--dry-run` never writes at all.
- Re-runs are idempotent: identical files are skipped, no ghost backups.
- Unknown `--agent` values abort with the valid list before any write.
- The destination can be an existing project; only managed files are touched.

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

**Parameters:**

| Parameter / Option | Description | Default | Required |
|--------------------|-------------|---------|----------|
| `<destino>` (positional) | Destination project directory | current working directory | no |
| `-d, --dry-run` | Show the update plan without writing | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |
| `--check` | Read-only check: exit 0=up-to-date, 1=updates, 2=error | off | no |
| `--yes` | Non-interactive; conflicts kept (conservative) | off | no |
| `--agent <agente>` | Target agent profile (same as init) | inherited manifest | no |

**Examples:**

```text
$ spectralis update --check
== Update check ==
  Template 1.2.35 -> destination 1.2.34
  [1] updates available (exit 1)     # exit 0 when up-to-date
```

```text
$ spectralis update --dry-run
== PLAN (dry-run; nothing written yet) ==
  classification:
    unchanged  -> skipped (identical hashes)
    updatable  -> will be replaced after confirmation
    conflict   -> backup + ask before replacing
    retired    -> reported, never deleted
```

```text
$ spectralis update
== PLAN ==
  ... (file-by-file decisions with confirmation)
  [OK] synced to ./my-project
  backups preserved in .sdd-backup-20260929...   # only when conflicts existed
```

**Notes:**
- `update` is the only supported update mechanism; manual edits to managed files are detected as `conflict` and preserved (backup + ask).
- `--yes` never overwrites a conflict silently — conflicts are kept and reported.
- Exit code `2` when the destination has no manifest (run `spectralis init` first).

### `spectralis doctor`

Verifies the host prerequisites and reports each one with its detected version. Missing or insufficient tools get install instructions for the detected operating system (Windows / macOS / Linux). Runs anywhere, without a destination, and never writes to disk.

| Case | Exit code |
|------|-----------|
| All prerequisites satisfied | 0 |
| One or more missing / insufficient | 1 (nothing written) |

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| *(none)* | No arguments or options | — | — |

**Examples:**

```text
$ spectralis doctor
  spectralis doctor · host prerequisites
  [OK] git (git version 2.52.0)
  [OK] node (v22.21.1)
  [OK] openspec (Usage: openspec [options] [command])
  [OK] graphify (Usage: graphify <command>)

[OK] Host is ready. Run: spectralis init
```

```text
$ spectralis doctor        # when a tool is missing
  spectralis doctor · host prerequisites
  [OK] git (git version 2.52.0)
  [FAIL] openspec (not found)
  -> Install instructions for the detected OS are printed below.

[FAIL] Host not ready. Install the missing tools and re-run.
```

**Notes:**
- Runs anywhere (no destination required) and never writes to disk.
- `doctor` gates `init`/`update`: installation aborts before writing when a prerequisite is missing.

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

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `<destino>` (positional) | Destination project directory | current working directory | no |

**Examples:**

```text
$ spectralis status
  spectralis status
  arnés version : 1.2.35
  template      : 1.2.35
  tools         : opencode
  health        : [OK] .opencode/ [OK] .agents/
  managed files : 44
```

```text
$ spectralis status my-project
  spectralis status
  arnés version : 1.2.35
  template      : 1.2.34
  tools         : opencode, claude
  health        : [OK] .opencode/ [WARN] .agents/ (missing)
  managed files : 44
```

```text
$ spectralis status      # not installed
[ERROR] No .sdd-manifest.json found in the destination.
spectralis has not been installed here. Run spectralis init first.
```

**Notes:**
- Health check only verifies tool directories exist; use `spectralis doctor` for host prerequisites.
- Without a manifest the command exits `2` and prints the init hint.

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

**Parameters:**

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `<destino>` (positional) | Destination project directory | current working directory | no |
| `--list` | List effective routes with origin | off | no |
| `--get <key>` | Print effective value of a route/switch | — | no |
| `--set <key>=<value>` | Set a route or switch (`obsidianSync=0\|1`) | — | no |
| `--vault <path>` | Shorthand to set `vault_root` | — | no |
| `--resources <path>` | Shorthand to set `resources_dir` | — | no |
| `--global` | Apply to global config instead of project manifest | off | no |

**Examples:**

```text
$ spectralis config --list
== spectralis config --list ==
  obsidianSync: 1  [config]
  vault_root: /home/martinmartinez/Documentos/obsidian_sync_git  [global]
  templates_dir: (not set)  [not set]
  requirements_dir: (not set)  [not set]
  projects_dir: (not set)  [not set]
  resources_dir: (not set)  [not set]
  projects_base: /home/martinmartinez/Documentos/Proyectos  [global]
```

```text
$ spectralis config --get vault_root
/home/martinmartinez/Documentos/obsidian_sync_git
```

```text
$ spectralis config --set obsidianSync=1
  obsidianSync: 1  [manifest]     # per-project; add --global for machine-wide
```

**Notes:**
- Read-only by default; only `--set`, `--vault`, `--resources` write.
- Origins shown: `global` (machine-wide config), `manifest` (project), `config`, `detected`, `derived`, `not set`.
- Without a manifest the command exits `2`.

### `spectralis check`

Deterministic, LLM-free doctor that validates the SDD flow consistency and the vault note ID conventions. Runs anywhere, never writes to the vault, `.sdd-registry/`, `05_wiki/`, or `openspec/`.

| Option | Effect |
|--------|--------|
| *(no flags)* | Run both sub-checks |
| `--registry` | Consistency of the triangle repo ↔ `.sdd-registry/REGISTRY.md` ↔ brain ↔ openspec |
| `--ids` | Validate vault note IDs (format `TYPE-YYYYMMDD-slug`, uniqueness, registration) |

- Exit code `0` when there are no errors (warnings do not block); `1` when at least one finding has severity error.
- `--ids` keeps an mtime cache (`.spectralis/ids-cache.json`) to re-parse only changed notes while always recomputing global uniqueness.

**Parameters:**

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| *(no flags)* | Run both sub-checks (`--registry` + `--ids`) | active | — |
| `--registry` | Consistency of repo ↔ REGISTRY.md ↔ brain ↔ openspec | off | no |
| `--ids` | Validate vault note IDs (format, uniqueness, registration) | off | no |
| `--tdd` | Validate TDD ordering (Step K) in `tasks.md` of active changes | off | no |
| `-v, --vault-root <path>` | Vault root path override | from config | no |
| `-p, --project-root <path>` | Project root override | from config/cwd | no |

**Examples:**

```text
$ spectralis check --registry
  spectralis check --registry · consistencia del triángulo (spectralis)
  [FAIL] 9 error(es)
  error   openspec/changes/add-foo (spectralis)
         -> Registra el change add-foo en .sdd-registry/REGISTRY.md
```

```text
$ spectralis check --ids
  spectralis check --ids · validación de IDs del vault
  31 nota(s) re-parseada(s)
  [FAIL] 82 error(es)
  error   02_Ideas/some-note.md (obsidian_sync_git)
         -> Añade id: nota-YYYYMMDD-slug al frontmatter
  ...  [OK] 20 warning(s)
```

```text
$ spectralis check           # all green
  [OK] 0 error(s) · 0 warning(s)
```

**Notes:**
- Read-only: never writes to the vault, `.sdd-registry/`, `05_wiki/`, or `openspec/`.
- Warnings do not affect the exit code; any severity `error` forces exit `1`.
- `--tdd` is explicit (not part of the no-flag default).

### `spectralis notes init` / `spectralis notes sync`

Manage the manual folders of the harness in the **cerebro** (the second brain, `03_Recursos/02_Sistemas_info/`):

- `notes init` — creates the subfolder structure (one per manual topic) where the manuals live; falls back to `info/` inside the project when no second brain is detected.
- `notes sync` — copies the canonical manuals from `notes/` in the template into the target folder (conflict → backup + ask; identical → skip).

Both work in any installed project and return `0` on success, `1` if no storage root is available.

**Parameters:**

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `init` / `sync` (subcommand) | Create structure vs. copy manuals | — | yes |
| `<destino>` (positional) | Project directory to resolve the target | current working directory | no |
| `-d, --dry-run` | Show the target/subfolders or manuals without writing | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |
| `--yes` (sync) | Non-interactive; conflicts kept | off | no |

**Examples:**

```text
$ spectralis notes init --dry-run
== spectralis notes init ==
  ✔ notes target (vault): .../03_Recursos/02_Sistemas_info
  [DRY RUN] Would create subfolders:
    .../architecture
    .../local-ai
    .../spectralis-cli
```

```text
$ spectralis notes sync --dry-run
== spectralis notes sync ==
  ✔ notes target (vault): .../03_Recursos/02_Sistemas_info
  [DRY RUN] Would sync the following manuals:
    architecture/manual.md
    local-ai/manual.md
    spectralis-cli/manual.md
```

```text
$ spectralis notes sync
== spectralis notes sync ==
  ✔ synced to .../03_Recursos/02_Sistemas_info
    created: 3 · identical: 0 · conflicts: 0 · kept: 0 · backups: 0
```

**Notes:**
- Without a second brain (no `resources_dir`, no detected vault), the target falls back to `info/` inside the project and prints a warning.
- `sync` copies only the canonical manuals in `notes/` of the template; it never deletes manuals already present in the target.
- Exit `1` when no storage root folder is available (nothing written).

### `spectralis seed`

Initial load of the machine-local wiki layer (`05_wiki/`): discovers projects under `projects_base` (recursively, up to depth 5) that have an `openspec/` root, creates the wiki skeleton (`decisiones/`, `errores/`, `log/`), reads each project's `stack.json`, and writes `05_wiki/_INDEX.json` with per-project `changes` count and `updated` timestamp.

| Option | Effect |
|--------|--------|
| `-d, --dry-run` | Show the projects that would be seeded without writing |
| `--project <name>` | Seed only the given project |

Requires `projects_base` to be configured (`spectralis config --set projects_base=<path> --global`).

**Parameters:**

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `-d, --dry-run` | Show projects that would be seeded without writing | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |
| `--project <name>` | Seed only the given project | all discovered | no |

**Examples:**

```text
$ spectralis seed --dry-run
[OK] Detected project from cwd: spectralis (...)
[DRY RUN] Would seed 6 projects:
  - procesador_estimacion (3 changes)
  - spectralis (4 changes)
  - Personal_Dotfiles (1 changes)
  - chapur_pay (0 changes)
```

```text
$ spectralis seed --project spectralis
  ✔ seeded 05_wiki/ for spectralis
  skeleton: decisiones/, errores/, log/
  _INDEX.json updated (changes count + timestamp)
```

```text
$ spectralis seed
  ✔ seeded 6 project(s) into 05_wiki/
  _INDEX.json written with per-project changes/updated
```

**Notes:**
- Discovers projects with an `openspec/` root under `projects_base`, recursively up to depth 5.
- Writes `05_wiki/_INDEX.json` with per-project `changes` count and `updated` timestamp.
- Fails fast with a hint if `projects_base` is not configured.

### `spectralis projects`

Shows OpenSpec status across local projects found under `projects_base`: name, number of changes, and how many are complete/pending (by checking `tasks.md` checkboxes). `--json` prints the same data as JSON. Requires `projects_base` to be configured.

**Parameters:**

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--json` | Print the dashboard as JSON | off | no |

**Examples:**

```text
$ spectralis projects
  Project                Changes   Complete   Pending
  chapur_pay              3         1          2
  spectralis              4         4          0
  procesador_estimacion   3         2          1
```

```text
$ spectralis projects --json
[{"project":"chapur_pay","changes":3,"complete":1,"pending":2}, ...]
```

**Notes:**
- Requires `projects_base` configured (`spectralis config --set projects_base=<path> --global`).
- Completeness derives from `tasks.md` checkboxes of each change.

### `spectralis spec init` / `spectralis spec complete`

Creates and validates the spec folder of a requirement in the brain (`01_Proyectos/<project>/<spec-id>/`):

- `spec init <project> <spec-id>` — creates the folder with `briefing.md`, `tests.md`, and `resumen.md`.
- `spec complete <project> <spec-id>` — validates the files are filled, registers the spec in `.sdd-registry/REGISTRY.md`, and runs the distillation into `05_wiki/`.

Return `0` on success, `1` on error (e.g., empty files in `spec complete`).

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `init` / `complete` (action) | Create folder vs. validate + register + distill | — | yes |
| `<project>` (positional) | Brain project folder name (`01_Proyectos/<project>/`) | — | yes |
| `<spec-id>` (positional) | Spec id folder (`01_Proyectos/<project>/<spec-id>/`) | — | yes |
| `-v, --vault-root <path>` | Vault root override | from config | no |
| `-p, --project-root <path>` | Project root for REGISTRY.md | from config/cwd | no |

**Examples:**

```text
$ spectralis spec init myproject add-auth
  ✔ created 01_Proyectos/myproject/add-auth/
    briefing.md · tests.md · resumen.md
```

```text
$ spectralis spec complete myproject add-auth
  ✔ files validated
  ✔ registered in .sdd-registry/REGISTRY.md
  ✔ distilled into 05_wiki/myproject/
```

```text
$ spectralis spec complete myproject add-auth   # empty files
[ERROR] Empty file: briefing.md. Fill all three files before completing.
```

**Notes:**
- `spec init` only creates the three-file structure; content must be filled before `spec complete`.
- `spec complete` fails with exit `1` when any of the files is empty.

### `spectralis skills [<destino>]`

Detects the skills present in a project (from `.agents/skills/`, `.opencode/skills/`, and agent-specific folders), writes `_INDEX_SKILLS.json`, and updates the `<system-reminder>` block in `AGENTS.md` so agents know which skills are available. `--dry-run` only lists what would change.

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `<destino>` (positional) | Project directory to scan | current working directory | no |
| `-d, --dry-run` | List what would change without writing | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |

**Examples:**

```text
$ spectralis skills
  ✔ detected 24 skills
  ✔ wrote _INDEX_SKILLS.json
  ✔ updated <system-reminder> in AGENTS.md
```

```text
$ spectralis skills --dry-run
  [DRY RUN] Would index:
    .agents/skills/commit/SKILL.md
    .agents/skills/explain/SKILL.md
    ... (24 skills)
  no writes performed
```

**Notes:**
- Sources: `.agents/skills/`, `.opencode/skills/`, and agent-specific skill folders.
- Keeps `AGENTS.md`'s `<system-reminder>` block in sync so agents know which skills are available.

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

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `<project>` (positional) | Brain project folder to distill (`01_Proyectos/<project>/`) | — | yes |
| `-d, --dry-run` | Show what would be written without modifying files | off | no |
| `--demo`, `--dd` | Alias for `--dry-run` | — | no |
| `-p, --project-root <path>` | Path to the real project code for stack detection | `projects_base` convention | no |
| `-v, --vault-root <path>` | Vault root override | from config | no |

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

**Examples:**

```text
$ spectralis distill myproject
  ✔ distilled myproject into 05_wiki/myproject/
    arquitectura.md · decisiones/ · errores/ · log/ · restricciones.md
  ✔ updated 01_Proyectos/myproject/_README.md
  ✔ updated 05_wiki/_INDEX.json (stack field)
```

```text
$ spectralis distill myproject --dry-run
  [DRY RUN] Would write for myproject:
    05_wiki/myproject/arquitectura.md         (overwrite)
    05_wiki/myproject/decisiones/add-auth.md  (merge by spec-id)
    ... 
  no writes performed
```

```text
$ spectralis distill myproject --project-root ./code/myproject --dry-run
  [DRY RUN] stack detection from ./code/myproject:
    backend: spring-boot · frontend: react · language: Java
```

**Notes:**
- Idempotent: re-running merges by `spec-id` instead of duplicating.
- Ignores vault organization entries (`_Notas/`, `_INDEX.md`, `_README.md`).
- Without LLM configured, ambiguous entries are discarded instead of classified.

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
