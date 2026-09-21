# Manual SDD Installation (No Bash Environments)

Use this guide when `install.sh` cannot run on your system (e.g., native Windows without WSL or Git Bash). Following these steps produces the **same result** as the scripted installation: an OpenSpec root with the Spanish language context and the complete SDD payload copied into your project, without overwriting your files.

> **Note:** on hosts with Node >= 22, the `spectralis` CLI replaces this manual path entirely (it runs natively on Windows, macOS and Linux). Clone the template, run `npm i -g .`, then `spectralis init <destino>`. Keep this guide for environments where Node is not available.

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

**Never copy**: `install.sh`, `README.md`, `openspec/changes/`, `docs-variants/`, `node_modules/`, `graphify-out/`, `.sdd-backup-*/`.

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

### 2b. Compose the stack standards (replaces what install.sh automates)

The scripted installer detects your stack and composes `docs/backend-standards.md` and `docs/frontend-standards.md` from the template's `docs-variants/`. In a manual installation, do it by hand:

1. Check your project for stack indicators (`pom.xml`, `package.json`, `requirements.txt`, `go.mod`, ...).
2. Pick the matching variant from the template repo:
   - Backend: `docs-variants/backend/spring-boot.md` (pom.xml/Gradle + Spring Boot), `docs-variants/backend/nestjs.md` (package.json with `@nestjs/core`), `docs-variants/backend/express-node.md` (package.json with express/fastify), or `docs-variants/backend/generic.md`.
   - Frontend: `docs-variants/frontend/react.md` (package.json with react), `docs-variants/frontend/angular.md` (package.json with `@angular/core`), `docs-variants/frontend/generic.md` (other/no framework). For a backend-only project, skip `frontend-standards.md`.
3. Copy the chosen variant into your project as `docs/backend-standards.md` / `docs/frontend-standards.md` (back up an existing file first — see step 3).
4. Replace the `{{PROJECT_NAME}}`, `{{LANGUAGE}}`, `{{LANGUAGE_VERSION}}`, `{{FRAMEWORK}}`, `{{FRAMEWORK_VERSION}}`, `{{BUILD_TOOL}}`, `{{TEST_FRAMEWORK}}` placeholders with your real values; leave unknown ones visible — the onboarding skill refines them later.

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

### 6b. Add the managed `.gitignore` block (agent tooling policy)

Agent tooling and generated artifacts stay **out of your repository**: skills, commands, plugins, the skills lock, dated backups, and the graphify graph are machine-local — you keep them on disk, but git never versions them. If your project has no `.gitignore`, create one; then append this marked block (add only the entries your own rules do not already cover):

```gitignore
# BEGIN: SDD managed gitignore (agregado por install.sh; no editar a mano)
graphify-out/
.sdd-backup-*/
.agents/
.opencode/
skills-lock.json
# END: SDD managed gitignore
```

Policy summary:

- **Versioned project content**: `AGENTS.md`, `openspec/` (specs and changes), and your source code.
- **Machine-local (never committed)**: `.agents/`, `.opencode/` (skills, commands, plugins), `skills-lock.json`, `.sdd-backup-*/`, and `graphify-out/`.
- **No opencode plugins**: the graphify reminder lives in the `AGENTS.md` rules; the template ships no plugin and mutates no bash commands.
- `graphify-out/` lifecycle: rebuild it with `graphify update .` after cloning the project or changing machines (AST-only, no API cost). Never commit it.

### 7. Finish up

```bash
cd .opencode && npm install && cd ..
```

- Optional, recommended: run `npx autoskills` in your project (Node >= 22) to auto-install curated skills for your detected stack.
- Optional, only for Claude Code: run `npx skills` in your project (see template README).
- Onboarding: run `graphify update .` and follow the `sdd-onboard-project` skill with your agent.

### 8. Update an Existing Installation

Run the update from the template root. Use dry-run first:

```bash
./install.sh C:\path\to\your-project --update --dry-run
./install.sh C:\path\to\your-project --update
```

The update compares managed files by hash and reports new, unchanged, updateable, customized, retired, and excluded paths before writing. A customized file is never replaced without an explicit decision. Existing files are backed up under `.sdd-backup-YYYYMMDD-HHMMSS/` before replacement.

Each confirmed installation or update writes `.sdd-manifest.json` in the project root. It contains the template source, version, timestamp, managed paths, and hashes, but no file contents or secrets. Projects installed before the manifest existed are detected through their SDD markers and are reported as legacy installations with limited confidence.

Retired template paths are reported only and are not deleted automatically. If an update fails partway through, keep the backup directory, resolve the reported error, and run the same `--update` command again.

The update also keeps the managed `.gitignore` block idempotent (no duplicated entries) and warns if your repository already tracks agent tooling or generated artifacts (for example `graphify-out/`), printing the `git rm -r --cached` commands to untrack them. Already-tracked files are never untracked automatically.

## Parity Checklist

Confirm all items to match the scripted installation:

- [ ] `openspec/config.yaml` exists and contains the three Spanish `Language preference` lines (YAML valid)
- [ ] `.agents/skills/` contains the 13 template skills (no `sync-agent-symlinks`, no `sdd-bootstrap-docs`)
- [ ] `.opencode/` contains `commands/`, `skills/`, `package.json`, `package-lock.json`, `.gitignore` — and no `node_modules/`
- [ ] `docs/` is complete (standards composed from the detected stack variants, manuals)
- [ ] Standards placeholders resolved where detectable (or left visible for onboarding refinement)
- [ ] No `install.sh`, no `docs-variants/` in your project root
- [ ] `AGENTS.md` present with the SDD rules (full copy if it did not exist, or appended block between BEGIN/END markers — never duplicated)
- [ ] `.gitignore` contains the managed SDD block with the five exclusions (`graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json`)
- [ ] No `.opencode/plugins/` directory in your project (the template ships no plugins; `skills-lock.json` is local to the machine that ran `npx autoskills`)
- [ ] Your own pre-existing files were preserved or backed up under `.sdd-backup-<date>/`
- [ ] `npm install` done inside `.opencode/`

## Rollback

Restore originals from `.sdd-backup-<date>/` while preserving their relative paths. Remove `.sdd-manifest.json` only if reverting the complete SDD installation; otherwise keep it and rerun `--update` after restoring. Retired files are never removed by the updater. The template adds configuration only; it never touches your project's source code.
