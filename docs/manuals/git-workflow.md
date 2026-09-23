# Git Workflow Requests

Use the `commit` skill to manage feature branches, commits, pull requests, and releases.

## Create a Feature Branch

Ask the agent to create a branch and include the ticket or feature name:

```text
Crear rama para SCRUM-123: agregar login
```

The branch is derived from the current branch using this format:

```text
feature/scrum-123-agregar-login
```

Branch names are normalized to lowercase and use hyphens instead of spaces or punctuation. If no ticket or feature name can be inferred, the agent asks for one.

To create a branch from the current branch even when already on another feature branch, say explicitly:

```text
Crear una nueva feature desde la rama actual para actualizar el dashboard
```

## Create a Commit

Ask for a commit after the changes are ready:

```text
Haz el commit de estos cambios
```

The agent reviews the working tree, proposes the files and the commit message in Spanish, and waits for explicit confirmation. Respond with `s` to allow `git add`, `git commit`, and push. Respond with `N` to receive the commands and message without changing Git.

## Create a Branch and Commit

Combine both operations in one request:

```text
Crear rama para SCRUM-123: agregar login y hacer commit
```

The agent creates and switches to the feature branch first, then performs the normal commit review on that branch. The review identifies the new branch and the branch from which it was created.

Other equivalent requests include:

```text
Rama + commit para la migración de usuarios
Crear feature y luego commit para BUG-42
```

## Scope a Commit

Provide a ticket or feature label when only part of the working tree should be committed:

```text
Commit SCRUM-123 solamente
```

Changes unrelated to that ticket remain unstaged. Sensitive files, `.env` files, and generated artifacts are always excluded.

## Agent Tooling and Generated Artifacts Are Never Committed

Destination projects carry a managed `.gitignore` block (installed by the SDD template) that excludes agent tooling and generated artifacts from version control:

```gitignore
graphify-out/
.sdd-backup-*/
.agents/
.opencode/
skills-lock.json
```

Rules the agent follows when committing:

- Only `AGENTS.md`, `openspec/` (specs), and project source are versioned; the managed block keeps everything else out of the commit.
- `graphify-out/` is machine-local: if the repository already tracks it (for example, from a commit made before this policy), suggest the untrack command instead of committing more graph artifacts: `git rm -r --cached graphify-out/` (repeat for `.agents/`, `.opencode/`, `skills-lock.json` as needed).
- The graph is rebuilt locally with `graphify update .` after cloning the project or changing machines (AST-only, no API cost) — never restored from git.

## Create a Release

Ask explicitly for a release:

```text
Crear release
```

The agent first detects the current version from the canonical version file, package manifest, or latest release/tag. It then asks whether to keep the detected version or update it. If no version exists, it asks for a Semantic Versioning value such as `1.4.0`.

Examples:

```text
Crear release y mantener la versión actual
Crear release y actualizar a 1.4.0
```

The agent does not modify version metadata or create the release until the version decision and the normal Git review confirmation are explicit.

## Useful No-Operation Requests

Use these phrases when only the proposal is wanted:

```text
Solo dame la descripción del commit
Commit en modo dry run
Solo el mensaje, no ejecutes Git
No hagas PR
```

## Update an Installed SDD Configuration

When the template repository has newer skills, commands, definitions, or documentation, update an existing project from the template root:

```text
Actualizar la configuración SDD del proyecto /ruta/al/proyecto
```

The equivalent commands are:

```bash
spectralis update --dry-run
spectralis update
```

Use `--dry-run` (alias `--demo` or `--d`) first. The updater compares the managed files, preserves customized files after an explicit decision, creates dated backups before replacements, and records the resulting inventory in `.sdd-manifest.json`. Retired files are reported but not deleted automatically.
