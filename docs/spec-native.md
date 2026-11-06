# Spec-native mode

The harness works on its own changes: it creates, migrates and archives them,
keeps their progress in a single registry and publishes a portable summary in
the vault. There is a single engine — the native one — and no external CLI is
spawned for any operation.

This document describes the capability as it stands after F1 (progress
registry, `view` and `task`), F2 (the full lifecycle), F3 (the native `status`
and `validate` commands) and F5 (the retirement of the external engine).

## Layout

| Path | Content |
| :--- | :--- |
| `spec/<change-id>/` | Change folder: `proposal.md`, `design.md`, `tasks.md`, `change.json` |
| `spec/progress.json` | Progress registry: the source of truth of every change |
| `spec/_archived/<change-id>/` | Archived changes |
| `spec/config.yaml` | Config of the project (Spanish context) |
| `openspec/changes/<change-id>/` | Historical layout: read only by `spec migrate` |

The changes directory is resolved by `resolveChangesDir` with a deterministic
cascade: explicit value > `spec_dir` of the manifest (`.sdd-manifest.json`) >
`spec_dir` of the global config > **`spec/`** (the native default).

There is a single changes directory per project: the operational commands
(doctor, `check --tdd`, `projects`, `seed`, `view`, `status`, `validate`) never
inspect the historical layout. A project that keeps it pins it explicitly:

```bash
spectralis config --set spec_dir=openspec/changes
```

and migrates it with `spectralis spec migrate`.

## The `spec` command

```bash
spectralis spec <action> [project] [specId]
```

The action decides which arguments are required:

| Action | Arguments | What it does |
| :--- | :--- | :--- |
| `init` | `<project> <specId>` | Creates the folder note of a spec in the vault |
| `complete` | `<project> <specId>` | Validates the spec, registers it and distills it |
| `create` | `<change-id>` [--nombre <text>] | Creates a change in the native layout |
| `migrate` | — [--dry-run] | Moves the legacy changes into the native layout |
| `archive` | `<change-id>` [--force] | Archives a finished change and publishes it |
| `status` | `[change-id]` | Reports the state of the native changes (read-only) |
| `validate` | `<change-id>` | Checks that the artifacts of a change exist |

A missing argument is a usage error (exit code `1`); an unknown action exits
with `1` and lists the valid ones.

`spec complete` (brain flow, specs that live in the vault) and `spec archive`
(repo flow, changes of a repository) coexist.

## `spec create`

```bash
spectralis spec create mi-cambio --nombre "Mi cambio"
```

It creates `spec/mi-cambio/` with the minimal seeds (`proposal.md`,
`tasks.md`, `design.md`), the metadata of the change and the first entry of
the progress registry:

```json
{
  "id": "mi-cambio",
  "nombre": "Mi cambio",
  "fecha": "2026-11-05",
  "estado": "open",
  "resumen": { "abstracto": "" },
  "enlaces": []
}
```

The schema of `change.json` is exact. It travels with the change when it is
archived and `resumen.abstracto` feeds the summary published in the wiki.

Exit codes: `0` success, `1` invalid id (it must be kebab-case), `2` the
change already exists (nothing is ever overwritten).

## `spec migrate`

```bash
spectralis spec migrate --dry-run
spectralis spec migrate
```

The migration reads `openspec/changes/` **explicitly** (never through
`resolveChangesDir`, which already resolves the native layout) and, for every
change that is not migrated yet:

1. moves the files that are present (`proposal.md`, `design.md`, `tasks.md`)
   into `spec/<id>/`;
2. creates the `change.json` when the legacy change has none;
3. merges the entry in `spec/progress.json`, seeding its tasks from
   `tasks.md`;
4. records the id in the manifest `spec/migrated.json`.

Properties:

- **Idempotent**: a change that already has an entry in the registry, or that
  is recorded in the manifest, is skipped.
- **Atomic per change**: the changes migrated before a failure stay
  migrated, and the error names the change that failed.
- **Archive aware**: the folders of `openspec/changes/archive/` are reported
  as *already closed* and never moved.
- **Collision aware**: a change that lives in both layouts is reported and
  never duplicated.
- `--dry-run` lists the plan and writes nothing.

## `spec archive`

```bash
spectralis spec archive mi-cambio
spectralis spec archive mi-cambio --force
```

The archive validates that every task of the change is `done` in the registry
(or checked in `tasks.md`). Pending tasks stop the archive with exit code `2`
and a list of the pending tasks; `--force` goes ahead with a warning.

The change id is validated too: it must be kebab-case in lowercase. An id that
would escape its folder (`..`, `/`, `\`, a null byte, an absolute path) stops
the archive with exit code `2` before anything is written.

Then it writes the row of the REGISTRY, moves `spec/<id>/` to
`spec/_archived/<id>/` and writes the summary of the change **directly** into
the vault:

```
05_wiki/Spectralis/<change-id>.md
```

The REGISTRY is written **before** the move: when it cannot be written the
archive aborts with an explicit error and the local state stays untouched
(the change is not moved and no summary is published). The entry of the change
is removed from `spec/progress.json` when the archive completes: `estado` is a
closed enum (`todo`, `in-progress`, `done`), there is no `archived` state.

The summary is portable: frontmatter with `id: wiki-<change-id>`, the tags
`wiki`/`spectralis`, `estado: completado`, `fecha_cierre` and `commits: []`,
and the sections *Qué cambió*, *Por qué*, *Decisiones*, *Verificación*,
*Estado y riesgos vivos*, *Commits* and *Enlaces*.

A summary that already exists is **never overwritten**: the archive warns,
prints the path of the existing file and skips the brain write (the local
archive still completes). `--force` overwrites it.

The vault root is resolved with `resolveRoute('vault_root')`, then with the
global config and finally with the detection of the vault. When it cannot be
resolved, the archive warns, **skips the brain write and still succeeds**: the
repository move and the REGISTRY row are always done.

## Registry and worklist

`spec/progress.json` is the source of truth of the progress: the percentage
and the state of a change are always derived from its tasks. `tasks.md` is the
detailed worklist and the mirror of the checkboxes (`spectralis task` keeps
both in sync).

## `view`

```bash
spectralis view                       # active changes (read-only)
spectralis view mi-cambio             # detail of an active change
spectralis view --archived            # archived changes under spec/_archived/
spectralis view mi-cambio --archived  # detail of an archived change
```

Without a flag, `view` lists the active changes of the resolved directory and
excludes `_archived/` and `archive/`. With `--archived` it lists the folders of
`spec/_archived/` with `Change | Fecha | Tareas | Estado | Nombre`: the date,
state and name come from the `change.json` that travels with the change, the
task counter is derived from the checkboxes of `tasks.md`, and a change with no
`change.json` falls back to `—` (date and name) and `done` (state). With an id,
`--archived` renders the detail of the archived change from its own `tasks.md`
(the progress registry no longer holds it, so the detail is labelled
`sin registro`).

`view` is always read-only: it never writes `progress.json`, `tasks.md` nor the
REGISTRY. When `spec/_archived/` is missing or empty it reports
`no hay changes archived` and exits with `0`.

## `spec status`

```bash
spectralis spec status
spectralis spec status mi-cambio
```

The status is **native** and **read-only** (it never writes `progress.json`,
never writes `REGISTRY.md` and never rewrites `tasks.md`).

Without a change id it lists every active change of the resolved changes
directory (`_archived/` and `archive/` are excluded):

```
  Change              | Percent | Estado      | Tasks   | Artifacts
  --------------------|---------|-------------|---------|----------------
  mi-cambio           |    50%  | in-progress | 1/2     | proposal.md, design.md, tasks.md
```

With a change id it reports the detail of that change: its state, its
completed and pending tasks and the artifacts present in its folder.

The state comes from the progress registry (`spec/progress.json`), reusing the
derivation of `progress-registry` (the percentage and the state of a change are
always derived from its tasks). A change that has **no entry** in the registry
is a legacy one: its state is derived from the checkboxes of its `tasks.md` and
it is labelled `sin registro`.

The REGISTRY of the project (`.sdd-registry/REGISTRY.md`) is only cross-checked
**when it exists**: a change it references is labelled `archivado`. A project
without a REGISTRY is not blocked by the check.

## `spec validate`

```bash
spectralis spec validate mi-cambio
```

The validation is **native** and **existence-only**: it reuses
`missingSddEssentials` (`src/core/sdd-essentials.ts`) with the resolved
directory of the change, and it never validates the schema nor the content of
the artifacts.

| Result | Output | Exit code |
| :--- | :--- | :--- |
| Every artifact is present | `change <id> is valid` | `0` |
| An artifact is missing | `change <id> is missing: <artifacts>` | `1` |

The artifacts it looks for are `proposal.md`, `design.md` and `tasks.md`.

## The engine

There is no engine to select: the harness always operates in native mode.

- The `engine` configuration key no longer exists: `config --set engine` and
  `config --get engine` report it as an unknown key, and `config list` does
  not expose it. A manifest that declares `engine` is ignored.
- No module resolves an engine: `src/core/resolve-engine.ts` does not exist.
- The external CLI is never probed: `spectralis doctor` reports `git`, `node`
  and `graphify`, and nothing else.

## Migration support

The native layout is the default and the only one the operational commands
read. The historical layout is still supported in a migration-only way:

- **Detection marker**: a project that has an `openspec/` directory is still
  detected as a project of the harness. The marker never selects a mode.
- **Gitignore**: the pattern `openspec/` stays in the managed block so a legacy
  installation keeps ignoring its historical directory.
- **`spec migrate`**: the only command that reads `openspec/changes/`, through
  a reader that lives inside the command itself.
- **Retired config**: `openspec/config.yaml` is never written nor read. In an
  existing installation it is a retired file: `spectralis update --prune`
  deletes it (with a backup) because its hash still matches the manifest.

The Spanish context is injected in `spec/config.yaml` only, and the post-checks
look for it there only.

## Codex mirror

Codex CLI reads the project skills from `.codex/skills/` (and the open Agent
Skills standard from `.agents/skills/`). When `codex` is among the selected
tools, the installer mirrors the shared skills:

```
.agents/skills/<skill>/  ->  .codex/skills/<skill>/
```

- **Copy, never symlink**: Codex project mode must work on Windows and on
  filesystems without symlink support. The whole skill tree travels with the
  `SKILL.md`.
- **Guarded**: the mirror only runs when `codex` is one of the selected tools
  (`init --agent codex`, or `codex` among the tools of the interactive menu).
- **Managed**: the mirror paths are part of the `managedPaths` of the manifest,
  so `spectralis update` keeps them in sync and `spectralis update --prune`
  retires them when codex is no longer among the tools.
- **Conflicts**: a mirror file edited by hand is a conflict, never a silent
  overwrite: `update` backs it up and asks (in `--yes` mode the hand-edited
  file is preserved).
- **Not ignored**: `.codex/` is **not** part of the managed `.gitignore` block.
  The mirror is the committed copy of the skills in Codex format, so a fresh
  clone works without running `spectralis init` again.

## Build caveats

`tsc -p tsconfig.json` (the `npm run build` alias) **does not prune `dist/`**:
a renamed or deleted source leaves its compiled `.js` behind as a ghost file.
A stale `dist/` can therefore serve an old implementation at runtime (the
orphan-dist caveat, with the close-out residuals lesson as precedent).

Clean the output before a release build:

```bash
rm -rf dist && npm run build
```
