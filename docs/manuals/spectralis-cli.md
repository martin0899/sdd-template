# spectralis CLI Manual

Standard usage documentation for the `spectralis` CLI: the tool that installs the SDD template (OpenSpec root, skills, opencode commands, composed standards, managed blocks) into any project without corrupting it.

## Overview

```
git clone sdd-template -> npm i -g .   (ONE TIME per machine)
                                   |
                                   v
spectralis init <destino>          (anywhere; template is embedded in the global install)
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

**Workflow (phases):**

1. Prerequisites gate — aborts without writing when a tool is missing
2. Read-only stack recognition (backend/frontend variants from project indicators)
3. `openspec init` (non-interactive) when the OpenSpec root is missing
4. Spanish context injected by APPEND into `openspec/config.yaml` (comments and user context preserved)
5. Managed blocks in `AGENTS.md` (create / append / refresh, idempotent) and `.gitignore` (incl. `.claude/`)
6. Payload copy — conflict means backup to `.sdd-backup-<date>/` plus per-file confirmation; identical files are skipped
7. Standards composed from `docs-variants/` per detected stack (placeholders filled; unresolvable placeholders stay visible for onboarding)
8. Manifest written with per-file hashes
9. Stack skills (`npx autoskills`) — opt-in prompt; pending if declined, `--yes`, or Node < 22
10. Final verification: warnings plus manual next steps

```
Nothing is written before the user confirms. Re-runs are idempotent
(identical files are skipped, no ghost backups).
```

**Options:**

| Option | Effect |
|--------|--------|
| `--agent <agente>` | Target agent profile (see matrix below). Default: `opencode` |
| `--dry-run` | Full plan, zero writes, destination bit-identical |
| `--yes` | Non-interactive mode; install is still always backed up |

**Agent matrix:**

| Agent | Value | Ships |
|-------|-------|-------|
| OpenCode (default) | `opencode` | `.agents/` + `.opencode/` + `docs/` + AGENTS.md + openspec |
| Antigravity | `antigravity` | `.agents/` + `docs/` + AGENTS.md + openspec (no `.opencode/`) |
| Claude Code | `claude` | same as `antigravity` (plus optional `npx skills`) |
| All | `all` | `.agents/` + `.opencode/` + `docs/` + AGENTS.md + openspec |

Unknown `--agent` values are rejected with the valid list before any write.

### `spectralis update`

Not available yet (TypeScript port, phase 2). Prints the canonical fallback instruction: run `install.sh --update` from a clone of the template repository. It writes nothing.

### `spectralis doctor`

Verifies the host prerequisites and reports each one with its detected version. Missing or insufficient tools get install instructions for the detected operating system (Windows / macOS / Linux). Runs anywhere, without a destination, and never writes to disk.

| Case | Exit code |
|------|-----------|
| All prerequisites satisfied | 0 |
| One or more missing / insufficient | 1 (nothing written) |

### `spectralis --version`

Reports the arnés (CLI) version. Every completed `init` records both relevant versions in the destination manifest:

```
$ spectralis --version
1.0.0

$ head -5 <project>/.sdd-manifest.json
{
  "schemaVersion": 1,
  "spectralisVersion": "1.0.0",   <- arnés (CLI) version that ran the init
  "templateVersion": "1.0.0",     <- template (payload) version installed
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
- `install.sh` and `docs-variants/` never leak into the destination.

## Relationship with the bash installer

`install.sh` remains the canonical fallback during the incremental TypeScript port:

- Fresh installs: prefer `spectralis init` (same contract, multi-platform).
- Updates of already-installed destinations: `install.sh --update` until phase 2 lands.
- Running `spectralis init` over a bash-installed destination is safe: idempotent blocks are recognized, conflicts are backed up and confirmed — but without the full hash-classified update semantics (new/updatable/conflict/retired), which belong to the phase 2 `update` command.
