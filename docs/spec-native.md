# Spec-native mode

The **spec-native** mode lets the harness work on its own changes without the
external OpenSpec CLI: it creates, migrates and archives them, keeps their
progress in a single registry and publishes a portable summary in the vault.

This document describes the capability as it stands after F1 (progress
registry, `view` and `task`), F2 (the full lifecycle) and F3 (the engine
config, the demotion of `openspec` and the native `status` and `validate`
commands).

## Layout

| Path | Content |
| :--- | :--- |
| `spec/<change-id>/` | Change folder: `proposal.md`, `design.md`, `tasks.md`, `change.json` |
| `spec/progress.json` | Progress registry: the source of truth of every change |
| `spec/_archived/<change-id>/` | Archived changes |
| `spec/config.yaml` | Config of a spec-native project (Spanish context) |
| `openspec/changes/<change-id>/` | Legacy layout, read during the migration window |

The changes directory is resolved by `resolveChangesDir` with a deterministic
cascade: explicit value > `spec_dir` of the manifest (`.sdd-manifest.json`) >
`spec_dir` of the global config > **`spec/`** (the native default).

A project that keeps the historical layout pins it explicitly:

```bash
spectralis config --set spec_dir=openspec/changes
```

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
(repo flow, changes of a repository) coexist: `spec archive` never invokes the
`openspec` binary.

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

## `spec status`

```bash
spectralis spec status
spectralis spec status mi-cambio
```

The status is **native**: it never invokes the `openspec` binary and it is
**read-only** (it never writes `progress.json`, never writes `REGISTRY.md` and
never rewrites `tasks.md`).

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
`missingSddEssentials` (the same contract the facade applies before delegating
an apply) with the resolved directory of the change, and it never validates the
schema nor the content of the artifacts.

| Result | Output | Exit code |
| :--- | :--- | :--- |
| Every artifact is present | `change <id> is valid` | `0` |
| An artifact is missing | `change <id> is missing: <artifacts>` | `1` |

The artifacts it looks for are `proposal.md`, `design.md` and `tasks.md`.

## The engine

The key `engine` decides how the harness treats the external OpenSpec CLI. It
is resolved with a deterministic cascade (the mirror of `resolveChangesDir`):

1. `engine` in the manifest of the project (`.sdd-manifest.json`)
2. `engine` in the global configuration
3. Default: `native`

```bash
spectralis config --set engine=openspec   # project (or --global)
spectralis config --get engine            # prints the value and its origin
```

An unknown value is rejected with a descriptive error (nothing is written).

The engine only decides two things: how `openspec` is **labelled** and whether
it is **probed** at all. The native paths of the harness never spawn it.

| Engine | `openspec` in the prerequisites | Doctor label | Missing binary |
| :--- | :--- | :--- | :--- |
| `native` (default) | Not probed | `optional` | Warning, exit `0` |
| `openspec` | Probed | `required` | Error, exit `1` and explicit warning |

`REQUIRED_TOOLS` keeps `openspec` in the list: the list documents the full
toolchain of the harness, the *probe* is what became conditional.

## Migration window

The native layout is the default, but the readers that validate the history of
a project (the REGISTRY doctor, `spectralis check --tdd`, the OpenSpec facade
and the counters of `spectralis projects` / `spectralis seed`) read **both**
layouts while the migration is open. A project that has not migrated yet does
not lose its checks.

The config of the project is read the same way: the Spanish context is
injected in `spec/config.yaml` of a spec-native project, it stays in
`openspec/config.yaml` of a legacy one, and the post-checks accept the block
in both places.

## Archive order

F1 must be archived before F2: F2's delta adds requirements to the
`spec-native` capability created by F1, and the merge fails when the target
spec does not exist yet. F3 follows the same rule: its delta adds requirements
to the same capability, so the order is **F1 → F2 → F3**.
