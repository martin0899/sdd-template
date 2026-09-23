# Manual SDD Installation / Update

This guide covers installing and updating the SDD template using the `spectralis` CLI. `spectralis` works natively on Windows, macOS and Linux — no WSL or Git Bash required.

## Prerequisites

| Tool | Check | Notes |
|------|-------|-------|
| git | `git --version` | Required to clone the template |
| node | `node --version` | >= 22 |
| openspec CLI | `openspec --help` | Node-based, cross-platform |
| graphify | `graphify --help` | Required later for code onboarding |

## Installation

### 1. Clone and install the CLI (one time per machine)

```bash
git clone https://github.com/martin0899/sdd-template.git sdd-template
cd sdd-template
npm i -g .
```

### 2. Install in your project

```bash
cd /path/to/your-project
spectralis init
# or: spectralis init /path/to/your-project
```

`spectralis init` will:
- Verify prerequisites
- Detect your project stack (backend/frontend)
- Show an interactive tool selection menu
- Create the OpenSpec root if missing
- Inject Spanish language context
- Copy the payload (`.agents/`, `.opencode/`, `docs/`)
- Compose stack-specific standards from `docs-variants/`
- Write the manifest with per-file hashes

Use `--dry-run` to see the plan without writing anything.

### 3. Handle existing files

If a destination file already exists (e.g., you already have `docs/base-standards.md`):
- `spectralis` backs it up to `.sdd-backup-<date>/` before asking
- You decide per-file: replace or keep

### 4. Finish up

```bash
cd .opencode && npm install && cd ..
```

- Optional: run `npx autoskills` in your project (Node >= 22) for curated stack skills
- Optional: run `npx skills` for Claude Code support
- Onboarding: run `graphify update .` and follow the `sdd-onboard-project` skill

## Updating an Existing Installation

```bash
cd /path/to/your-project
spectralis update
# or: spectralis update /path/to/your-project
```

Use `--dry-run` (alias `--demo` or `--d`) first to see what would change.

The update compares managed files by hash and classifies them:

| Status | Meaning |
|--------|---------|
| unchanged | Identical to plantilla — skipped |
| updatable | Safe to update (user hasn't modified it) |
| conflict | User modified it — backup + ask before replacing |
| new | In plantilla but not in destination — copied |
| retired | Removed from plantilla — reported, never deleted |

In non-interactive mode (`--yes`), conflicts are kept (conservative default).

## Parity Checklist

Confirm all items to match the scripted installation:

- [ ] `openspec/config.yaml` exists and contains the Spanish `Language preference` lines (YAML valid)
- [ ] `.agents/skills/` contains the template skills
- [ ] `.opencode/` contains `commands/`, `skills/`, `package.json`, `package-lock.json`, `.gitignore`
- [ ] `docs/` has standards composed from detected stack variants (no `docs/manuals/` in destination)
- [ ] No `install.sh` or `docs-variants/` in your project root
- [ ] `AGENTS.md` present with SDD rules (managed block between BEGIN/END markers)
- [ ] `.gitignore` contains the managed SDD block
- [ ] Your pre-existing files preserved or backed up under `.sdd-backup-<date>/`
- [ ] `.sdd-manifest.json` present with `schemaVersion: 2` and `tools` field

## Rollback

Restore originals from `.sdd-backup-<date>/` while preserving their relative paths. Remove `.sdd-manifest.json` only if reverting the complete SDD installation; otherwise keep it and rerun `spectralis update` after restoring. Retired files are never removed by the updater.
