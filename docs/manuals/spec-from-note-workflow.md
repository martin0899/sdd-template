# Spec-from-Note Workflow

This manual explains how requirement notes written in Obsidian are converted into OpenSpec changes and specifications through the `spec-from-note` skill.

## Overview

```
+---------------------------+
| Obsidian note             |   ONE template, one path in the vault
| (Requerimiento para Specs)|
+---------------------------+
            |
            v  "read the file <note-path>"
+---------------------------+
| spec-from-note skill      |
| 1. Read note (no copy)    |
| 2. Investigate repo       |
| 3. Generate briefing      |
| 4. Review with user       |
| 5. Split ID-xx -> changes |
| 6. Create OpenSpec changes|
| 7. Update REGISTRY.md     |
+---------------------------+
            |
            v
  openspec new change -> /opsx-apply -> /opsx-archive
```

The skill feeds OpenSpec; it does not replace it. Everything downstream (apply, archive, spec syncing) is the standard OpenSpec workflow.

## Note Template

- **Location**: single copy in the Obsidian vault, at `~/Documentos/Obsidian Vault/obsidian_sync_git/Recursos/Plantilla/Requerimiento para Specs.md`. The authoritative path is also recorded as the first line of each project's `docs/requirements/REGISTRY.md`.
- **One note = one requirement** with an activity matrix (ID-01, ID-02, ...). Each row's `Componente` column declares its layer (`Backend`, `Frontend`, `DB`).
- **API contracts** live inside the note (section 7) as blocks identified `API-01`, `API-02`, ... using request/response JSON pairs. Activities reference them ("Crea API-01", "Consume API-01"). Contracts evolve **by copy**: a later note that changes API-01 carries the updated block; OpenSpec archives keep the evolution history.
- **Optional per-activity detail** (section 8): backend endpoints/patterns, frontend screens/states, DB DDL with a verification SELECT before any UPDATE.

Notes can arrive at any detail level (detailed, partial, minimal). The flow works in all cases; the difference is how much gets resolved in conversation versus the note.

## Traceability (no note copying)

Notes are never copied into the repository. Two artifacts hold references:

- **`docs/requirements/REGISTRY.md`** (per target project): template path plus one row per requirement — note path, requirement id, briefing path, generated changes, status.
- **`proposal.md` of each generated change**: a provenance line `Fuente: <note-path> · Actividad: ID-xx`.

## Briefing

Before proposing any split, the skill investigates the target repository and writes `docs/requirements/briefings/<req-id>.md` with six sections:

1. Code state (modules, patterns — via Graphify when available)
2. Existing specs (capabilities being evolved or reused)
3. API contracts in play (new vs evolution)
4. Database reality (schema conflicts, destructive risk)
5. Risks and open questions
6. Proposed map (ID-xx -> change -> layer -> affected files)

## Mandatory Confirmation Rules

The agent MUST ask and wait for explicit user confirmation before writing any spec when it must choose:

1. **Technologies** (libraries, frameworks, tools)
2. **Implementation patterns** (internal architecture, module structure)
3. **Location** (where new code lives)
4. **Database schema** (tables, fields, indexes, migration type)
5. **API contracts** (routes, payloads, response codes) — if the note does not define them
6. **The split** (ID-xx -> changes and layer mapping)

Counterweight: anything the note already defines explicitly is respected without asking. Only contradictions with real code are flagged. Destructive data changes or rollback procedures are always confirmed.

## Generated Change Artifacts

Every generated change systematically includes:

- `proposal.md` with `## Impact` (affected areas and files, from the briefing)
- `design.md` with `## Risks / Trade-offs` and `## Migration Plan` including concrete rollback steps (inverse queries or reverts)
- `specs/<layer>/spec.md` with WHEN/THEN scenarios, including error scenarios; backend scenarios derive from the API contract blocks, frontend specs describe UI behavior without duplicating JSON
- `tasks.md` with verifiable tasks

Each activity ID-xx becomes one independent OpenSpec change, kept small and separately appliable/archivable.

## Relation to OpenSpec

```
note -> briefing -> conversation -> openspec new change (per ID-xx)
                                  -> proposal / specs / design / tasks
                                  -> /opsx-apply (implementation)
                                  -> /opsx-archive (spec syncing)
```

The skill stops at OpenSpec artifacts. Implementation and archiving follow the standard OpenSpec workflow commands.
