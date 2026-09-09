# Manual SDD Installation (No Bash Environments)

Use this guide when `install.sh` cannot run on your system (e.g., native Windows without WSL or Git Bash). Following these steps produces the **same result** as the scripted installation: an OpenSpec root with the Spanish language context and the complete SDD payload copied into your project, without overwriting your files.

## Prerequisites

| Tool | Check | Notes |
|------|-------|-------|
| git | `git --version` | Required to clone the template |
| openspec CLI | `openspec --help` | Node-based, cross-platform |
| graphify | `graphify --help` | Required later for code onboarding |

If any tool is missing, install it before continuing. Nothing has been written yet.

## Steps

### 1. Clone the template (temporary location)

```bash
git clone https://github.com/martin0899/sdd-template.git sdd-template
cd sdd-template
```

### 2. Copy the payload to your project

Copy **exactly** these items into your project root (File Explorer drag-and-drop, or `robocopy` on Windows):

| Source (template) | Destination (your project) |
|-------------------|----------------------------|
| `.agents/skills/` | `.agents/skills/` |
| `.opencode/commands/` | `.opencode/commands/` |
| `.opencode/skills/` | `.opencode/skills/` |
| `.opencode/package.json` | `.opencode/package.json` |
| `.opencode/package-lock.json` | `.opencode/package-lock.json` |
| `.opencode/.gitignore` | `.opencode/.gitignore` |
| `docs/` | `docs/` |

**Never copy**: `install.sh`, `README.md`, `openspec/changes/`, `node_modules/`, `graphify-out/`, `.sdd-backup-*/`.

With `robocopy` (run from the template root, adjust paths):

```bat
robocopy .agents C:\path\to\your-project\.agents /E
robocopy .opencode\commands C:\path\to\your-project\.opencode\commands /E
robocopy .opencode\skills C:\path\to\your-project\.opencode\skills /E
copy .opencode\package.json C:\path\to\your-project\.opencode\
copy .opencode\package-lock.json C:\path\to\your-project\.opencode\
copy .opencode\.gitignore C:\path\to\your-project\.opencode\
robocopy docs C:\path\to\your-project\docs /E
```

### 3. Handle existing files (backup before replacing)

If a destination file already exists (e.g., you already have `docs/base-standards.md`):

1. Create a dated backup folder at your project root: `.sdd-backup-YYYYMMDD-HHMMSS/`
2. Copy the original file there **preserving its relative path** (e.g., `.sdd-backup-20260909-120000/docs/base-standards.md`)
3. Only then replace it with the template version
4. Keep the original if you prefer your version; the backup is your rollback

### 4. Initialize OpenSpec (only if your project has no `openspec/` folder)

From your project root:

```bash
openspec init --tools opencode --no-animation
```

If `openspec/` already exists in your project, **skip this step** — it will be preserved.

### 5. Add the Spanish language context

Open `openspec/config.yaml` in a text editor. Never delete existing content.

- If there is **no `context:` field**, add at the end of the file:

```yaml
# Language context (injected by the SDD template)
context: |
  Language preference: All interactions, questions, summaries, and results must be displayed in Spanish.
  Even if the files and configurations are in English, the user interface and AI responses should be in Spanish.
  When showing artifacts, status, or any output, translate to Spanish while preserving technical terms in English when appropriate.
```

- If there **is a `context:` block-scalar field** (`context: |`), append the three `Language preference...` lines **at the end of that block** (keep the same 2-space indentation), preserving every existing line.

Validate the file loads as YAML before finishing (optional but recommended):

```bash
python -c "import yaml; yaml.safe_load(open('openspec/config.yaml')); print('YAML OK')"
```

### 6. Add the agent rules (AGENTS.md)

- If your project has **no `AGENTS.md`**: copy the template's `AGENTS.md` to your project root as-is.
- If your project **already has one**: append the template's rule sections at the end (everything **except** the template's `# ` title line), wrapped in these markers so future re-installs detect them:

```markdown
<!-- BEGIN: SDD template rules (agregado por install.sh) -->
(sections from the template's AGENTS.md, without its H1 title)
<!-- END: SDD template rules -->
```

Your own rules (and your `# ` title) stay untouched. Skip this step if your `AGENTS.md` already contains the graphify-first rules.

### 7. Finish up

```bash
cd .opencode && npm install && cd ..
```

- Optional, only for Claude Code: run `npx skills` in your project (see template README).
- Onboarding: run `graphify update .` and follow the `sdd-onboard-project` skill with your agent.

## Parity Checklist

Confirm all items to match the scripted installation:

- [ ] `openspec/config.yaml` exists and contains the three Spanish `Language preference` lines (YAML valid)
- [ ] `.agents/skills/` contains the 13 template skills (no `sync-agent-symlinks`, no `sdd-bootstrap-docs`)
- [ ] `.opencode/` contains `commands/`, `skills/`, `package.json`, `package-lock.json`, `.gitignore` — and no `node_modules/`
- [ ] `docs/` is complete (standards, manuals)
- [ ] No `install.sh` in your project root
- [ ] `AGENTS.md` present with the SDD rules (full copy if it did not exist, or appended block between BEGIN/END markers — never duplicated)
- [ ] Your own pre-existing files were preserved or backed up under `.sdd-backup-<date>/`
- [ ] `npm install` done inside `.opencode/`

## Rollback

Delete the copied payload items and restore originals from `.sdd-backup-<date>/`. The template adds configuration only; it never touches your project's source code.
