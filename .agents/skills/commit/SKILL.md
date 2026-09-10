---
name: commit
description: Create focused commits and pull requests following repository standards.
author: LIDR.co
version: 1.4.0
---
# commit Skill

Use it when this workflow is required in the project.

## Instructions

# Role

You are an expert in version control and release workflows. You create clear, comprehensive commits and Pull Requests that align with project standards and make review and traceability straightforward. You always review the working tree and propose before touching the repository, and you write commit messages and Pull Request content in Spanish.

# Arguments

**Optional.** `$ARGUMENTS` may contain:

- **Nothing (empty)**: Treat all relevant changes in the working tree as the scope, run the review gate (step 4) and execute `git add`/`git commit`/`git push` and open a single PR **only after explicit user confirmation**.
- **Feature/ticket identifiers**: e.g. ticket IDs (e.g. `SCRUM-123`), branch names, or short feature labels. When provided, propose and commit **only** the changes that belong to those features; leave all other changes unstaged and uncommitted.
- **Branch creation**: If the user asks to create a branch (for example, "crear rama", "nueva rama", "branch" or "feature branch"), create `feature/<ticket-or-feature-slug>` from the current branch. The ticket or feature name is required to derive the branch name; ask for it if it was not provided or cannot be inferred from the request.
- **Combined branch and commit flow**: If the user asks for a branch and a commit in the same request (for example, "crear rama y commit" or "rama + commit"), create and switch to the feature branch first, then continue with the normal commit review gate and commit flow on that branch.
- **Version selection**: Do not infer or modify a product version during a branch or commit operation. If a version is explicitly provided, preserve it for the release metadata or commit context. Otherwise, detect it from the project's canonical version file or package manifest only when the request is explicitly about a release or version bump. If no canonical version exists, ask for the target version instead of inventing one. Use Semantic Versioning (`MAJOR.MINOR.PATCH`) for release versions.
- **Release creation**: If the user asks to create a release, first inspect the current version from the canonical version file, package manifest, or latest release/tag. Report the detected version and stop for the user's decision: keep it, update it to an explicit target version, or provide a version if none exists. Do not modify version metadata or create the release until the user confirms the decision.

Branch-name rules:

- Prefer the explicit ticket identifier, then the explicit feature name, then a concise slug inferred from the request.
- Normalize the slug to lowercase, replace spaces and punctuation with hyphens, and remove duplicate separators.
- Preserve the ticket identifier's meaningful characters when possible, for example `SCRUM-123` becomes `feature/scrum-123-add-login` when a feature name is also provided.
- Do not include a version in a feature branch name unless the user explicitly requests it or the branch is a release branch.

Version precedence for release or version-bump requests:

1. An explicit version in the user's request, for example `1.4.0`.
2. The project's canonical version file or package manifest.
3. The current release/tag metadata, if available.
4. Ask the user for the target version; never guess it.
- **Description-only / no-git mode (explicit user override)**: If the user **explicitly** says something like "no PR", "only commit" (meaning only produce the commit text), "only description", "don't touch git", "just the message", or "dry run", then do **not** run any git commands or create a PR. Produce directly the handoff artifact defined in step 4 (staging list + copy-pasteable message) and stop; the user can run the git commands themselves.

# Goal

1. Present a **single, comprehensive review** of the relevant changes: the files that would be staged and the proposed commit message.
2. Obtain **explicit user confirmation** before any `git add`/`git commit` is executed.
3. **Push** the branch and **create (or update) a Pull Request** for review, once confirmed.
4. If arguments were given: **stage and commit only** the changes tied to those features; do not touch other modified files.

# Process and rules

## 0. Description-only / no-git mode (check first)

If the user **explicitly** requested no git operations (e.g. "no PR", "only commit", "only description", "don't touch git", "just the message", "dry run"):

- Perform steps 1-3 plus the review-gate **output** of step 4 (classification and copyable message), but do **not** wait for or require the `[s/N]` answer: this mode is itself the user's decision to run git manually.
- Deliver the handoff artifact from step 4 (exact files/hunks that would be staged + the full commit message in a copy-pasteable block) and stop; skip steps 5-7.
- **Do not** run `git add`, `git commit`, `git push`, or `gh pr create`. Do not modify the repository in any way.

## 1. Inspect current state

- Run `git status` and `git diff` (and `git diff --staged` if needed) to list all modified, added, and deleted files.
- Identify the current branch:
  - **If the user requested branch creation**: create and switch to `feature/<ticket-or-feature-slug>` from the current branch, regardless of whether the current branch is `main`, `master`, `develop`, or another feature branch.
  - **If branch creation was not requested and the current branch is a base branch** (`main`, `master` or `develop`): create and switch to `feature/<ticket-or-feature-slug>` before staging, using the ticket or feature argument. Ask for the name if it cannot be inferred.
  - **If branch creation was not requested and the current branch is not a base branch**: do not create or switch branches. Continue on the current branch and surface this in the review gate (step 4).
  - When the request combines branch creation and commit, complete the branch operation before resolving scope or presenting the review gate. The review proposal must identify the new branch and its source branch.
- Apart from the branch creation explicitly required by the request or by the base-branch rule, this step is read-only: no staging happens yet.

## 1.5 Release version gate

When the request includes release creation (for example, "crear release", "crear versión" or "publicar release"), perform this gate after inspecting the repository and before changing files or creating Git metadata:

- Detect the current version using the precedence defined above. Report the source and value, or explicitly report that no canonical version was found.
- Ask the user one direct question in Spanish:
  - If a version exists: `La versión detectada es <version> desde <source>. ¿Quieres mantenerla o actualizarla? Si deseas actualizarla, indica la nueva versión.`
  - If no version exists: `No se encontró una versión canónica. ¿Qué versión SemVer deseas usar para esta release?`
- If the user chooses to update, validate the target as `MAJOR.MINOR.PATCH`, identify the exact metadata file to change, and include that file in the later review proposal.
- If the user chooses to keep the version, do not modify version metadata.
- Do not continue to release creation until the user has answered this version question. The normal review gate and explicit confirmation remain mandatory before `git add`, `git commit`, `git push`, tag creation, or `gh release create`.

## 2. Resolve scope: full commit vs feature-scoped commit

- **If `$ARGUMENTS` is empty or not provided**
  - Treat all relevant changes (excluding files that should never be committed, e.g. `.env`, build artifacts, local config) as the scope for this commit.
  - The resulting set goes to the review gate (step 4) as bucket (a); nothing is staged yet.

- **If `$ARGUMENTS` is provided (e.g. ticket IDs or feature names)**
  - Map each argument to the changes that clearly belong to it (by path, ticket id in branch name, or context in diffs).
  - Only the files/hunks that belong to those features go to bucket (a) of the review gate.
  - Any other modified files go to bucket (b) of the review gate: **unstaged**, left in the working tree.
  - If a file contains both feature-related and unrelated changes, the commit will later use `git add -p` (or equivalent) in step 5 to stage only the hunks that belong to the requested features.
  - If no changes clearly match the given arguments, report this and do not commit.

## 3. Commit message

- Write the commit message **in Spanish** (per `docs/base-standards.md`, section "Language Standards").
- Make it **descriptive** (per Git Workflow in `backend-standards.md` and `frontend-standards.md`).
- Structure it so that:
  - **Subject line**: Short, imperative summary **in Spanish** (e.g. "Añadir filtros de candidatura a la lista de posiciones", "Corregir validación de fecha límite"). Optionally prefix with a scope or ticket id (e.g. `SCRUM-123: Añadir filtros de candidatura`). Preserve technical terms, identifiers and ticket IDs in their original form.
  - **Body** (if needed): Bullet points or short paragraphs describing what changed and why (areas touched, new behavior, fixes) **in Spanish**. Reference ticket IDs here if they apply.
- Do not commit secrets, `.env`, or other sensitive or generated artifacts.

## 4. Pre-commit review gate (MANDATORY — block until the user confirms)

Before executing `git add`, `git commit`, or `git push`, present to the user a single review proposal **in Spanish** containing:

1. **Archivos a stagear** — the exact list of files (and hunks, if partial staging) classified as:
   - **(a) Del alcance**: changes that belong to the current commit scope (bucket from step 2).
   - **(b) Ajenos al alcance**: modified files that do not belong to this scope — they are **never** staged here; they remain in the working tree for a separate commit or PR.
   - **(c) Sensibles o generados**: `.env` files, credentials or tokens, build artifacts, local config, generated outputs. The agent MUST exclude bucket (c) from the proposal unconditionally: a generic `[s/N]` confirmation does **not** include them; only a separate, explicit user instruction naming those specific files may do so.
2. **Mensaje de commit propuesto** — the complete message from step 3 in a copy-pasteable code block (subject + body).
3. **Nota de rama** — state the current branch and its source branch. If a new feature branch was created, identify its name and the branch from which it was created. If the session continues on a pre-existing non-base branch, state that explicitly so the user can decide whether to request a fresh branch.
4. **Pregunta**: `¿Confirmas? [s/N] — responde "s" para que el agente ejecute add/commit/push, o "N" para hacerlo tú mismo.`

The agent MUST NOT run `git add`, `git commit`, `git push`, or any `gh` command before the user replies with an explicit "s" (or equivalent unambiguous affirmative). No step before this gate performs write operations on the repository.

**Handoff for manual commit:** if the user answers "N", declines agent execution, or says they prefer to do it themselves, deliver the handoff artifact — (1) the exact list of files/hunks that would be staged and (2) the full commit message in a copy-pasteable block — and end the workflow without running any git or `gh` command.

## 5. Commit and push

- Only after the explicit confirmation from step 4: stage the in-scope files (using `git add -p` or equivalent for partial hunks when needed), create the commit with the confirmed message, and push the current branch to the remote (`git push origin <branch>`). If the branch does not exist on the remote, push with `-u` to set upstream.

## 6. Pull Request

- Use the **GitHub CLI (`gh`)** for all GitHub operations (per repository standards).
- Create or update the PR for the current branch:
  - **Title**: **In Spanish**, clear, aligned with the commit subject (e.g. include ticket ID if applicable: `[SCRUM-123] Añadir filtros de candidatura a la lista de posiciones`).
  - **Description**: **In Spanish**. Summarize the change set, link to the ticket if relevant, and note any testing or follow-ups. Preserve technical terms in English when appropriate.
- If the repo uses branch protection or required checks, mention that the PR is ready for review once checks pass.

### 6.1 Release

- For a release request, use the confirmed version to create or update the version metadata only if the user chose `actualizar` during the release version gate.
- After the normal review gate and any required commit/push, create the GitHub release with `gh release create <tag>`, using a `v<version>` tag unless the repository already uses another documented tag convention.
- If the requested tag or release already exists, do not overwrite it. Report the conflict and ask whether to update the existing release or choose another version.

## 7. Summary for the user

- Report what was committed (files and scope).
- If arguments were provided: confirm which features/tickets were included and that other changes were left unstaged.
- Provide the PR URL (from `gh` output).

# References

- `docs/base-standards.md`: Spanish for user-facing interactions, including Git commit messages and Pull Request titles and descriptions; English-only remains for code and other technical artifacts.
- `docs/backend-standards.md` and `docs/frontend-standards.md`: Git Workflow (feature branches, descriptive commits, small focused branches).
- Repository git workflow conventions: Use `gh` for GitHub and PR creation; optional ticket-based branch and PR linking.

# Notes

- **Review gate is absolute**: never `git add`/`git commit` without the user's explicit confirmation from step 4. Description-only mode (step 0) skips the gate because the user already chose to run git themselves.
- **Description-only**: When the user asks for no PR or only the commit text, output the staging plan and message only; do not run any git or `gh` commands.
- Do not run destructive git commands (e.g. `git push --force` without explicit user request).
- If there are conflicts or the push is rejected, report the situation and suggest next steps (e.g. pull/rebase then push), but do not force-push unless the user asks.
- When arguments are provided, **only** the changes tied to those features are staged and committed; everything else remains in the working tree for a separate commit or PR.
