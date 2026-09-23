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
10. Stack skills (`npx autoskills`) — opt-in prompt; pending if declined, `--yes`, or Node < 22
11. Final verification: warnings plus manual next steps

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

Shows the installed SDD harness configuration (read-only). Displays tool directories, managed files, and version information. This is an MVP; future versions may include interactive configuration.

| Case | Exit code |
|------|-----------|
| Installed | 0 |
| Not installed (no manifest) | 2 |

### `spectralis --version`

Reports the arnés (CLI) version. Use `--v` as a shorthand alias.

```
$ spectralis --version
1.1.0

$ spectralis --v
1.1.0
```

Every completed `init` records both relevant versions in the destination manifest:

```
$ spectralis --version
1.0.0

$ head -5 <project>/.sdd-manifest.json
{
  "schemaVersion": 2,
  "spectralisVersion": "1.0.0",   <- arnés (CLI) version that ran the init
  "templateVersion": "1.0.0",     <- template (payload) version installed
  "tools": ["opencode"],           <- selected agent tools
  ...
}
```

## Versioning policy

- The package is born at `1.0.0`.
- `MINOR` bumps: approved spec deltas that add requirements or capabilities (scaled by change count and risk).
- `PATCH` bumps: contract-preserving fixes.
- `MAJOR` bumps: only on explicit user confirmation; the agent may suggest them when accumulated project changes justify it.
- The arnés version and the template version are conceptually independent and today share the same value; the manifest schema keeps them separate so they can diverge without a format change.

## Anti-corruption guarantees

- Nothing is written before the user confirms the plan (except with `--dry-run`, which never writes at all; and `--yes`, which still backs up first).
- Any existing file that differs is backed up to `.sdd-backup-<fecha>/` before being questioned.
- Idempotent re-runs: identical files are skipped, managed blocks are never duplicated.
- `.sdd-manifest.json` inventories every managed file with a SHA-256 hash — the exact payload that traveled to the destination.
- Managed `.gitignore` block includes `openspec/` and `.claude/`: the SDD spec/changes tree is machine-local and never committed.
- `docs/manuals/` (this file, and all other manuals in the template) never leak into the destination — they remain in the template repository for reference only.
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
| `spectralis config` | Show harness configuration |
| `spectralis doctor` | Verify host prerequisites |

### Common Flags

| Flag | Aliases | Description |
|------|---------|-------------|
| `--dry-run` | `--demo`, `--dd` | Show plan without writing |
| `--version` | `--v` | Show CLI version |
| `--check` | — | Read-only update check |
| `--yes` | — | Non-interactive mode |
| `--agent <name>` | — | Target agent profile |
