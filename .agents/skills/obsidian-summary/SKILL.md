---
name: obsidian-summary
description: Generate summary document in Obsidian after completing an OpenSpec specification. Creates a portable wiki-style summary for cross-machine reference. Use when a specification is completed, tasks are done, or when the user asks for a summary of completed work.
---

# Obsidian Summary

> **Orquestada**: cuando `obsidianSync=1` (o `--obsidian`), esta skill se invoca automáticamente desde `obsidian-orchestration` al archivar un change (`/opsx-archive`). Con el switch en `0`, se usa solo por invocación explícita.

Genera un documento resumen en Obsidian después de completar una especificación OpenSpec. Crea un wiki portátil para referencia entre máquinas.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "el vault está en <ruta>" o "los resúmenes van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `vault_root` | Raíz del vault de Obsidian | `/home/martinmartinez/Documentos/obsidian_sync_git` |
| `templates_dir` | Carpeta de plantillas | `{vault_root}/09_Plantilla` |
| `projects_dir` | Carpeta de proyectos | `{vault_root}/01_Proyectos` |
| `project_registry` | Registro de requerimientos | `docs/requirements/REGISTRY.md` (dentro del repo) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si existe `docs/requirements/REGISTRY.md` en el proyecto → leer las rutas registradas.
3. Si existe el vault en la ruta por defecto → usarlo.
4. Si ninguna aplica → preguntar al usuario.

## When to Use

- After completing an OpenSpec specification (all tasks done)
- When the user asks for a summary of completed work
- Before archiving an OpenSpec change
- When documenting what was accomplished for cross-machine reference

## Workflow

### Step 1: Gather Context

Read the OpenSpec change artifacts to understand what was done:

```bash
openspec status --change "<change-name>" --json
```

Extract:
- Change name and description
- Tasks completed
- Specs implemented
- Design decisions made
- Any changes during implementation

### Step 2: Read Change Artifacts

Read the following files from the change directory:

1. `proposal.md` - What was proposed
2. `design.md` - How it was designed
3. `tasks.md` - What was implemented
4. `specs/*/spec.md` - Specifications

### Step 3: Generate Summary

Create a summary document at:
`{projects_dir}/<Proyecto>/<subtema>/<change-name>-resumen.md`

Use the template from `{templates_dir}/Resumen de Especificacion.md`.

### Step 4: Fill Summary Content

**Context (max 500 characters):**
- What problem was solved
- Why it was important
- Key decisions made

**Tasks Completed:**
- List each task with status
- Note any deviations from original plan

**Changes During Specification:**
- What changed from the original plan
- Why changes were made

**Pending Items:**
- What wasn't completed
- What needs follow-up

### Step 5: Link to Obsidian

Add wikilinks to related notes:
- Link to original requirement note
- Link to other project summaries
- Link to relevant resources

### Step 6: Confirm Creation

Show the user:
- File created
- Key sections filled
- Links added

## Summary Template Structure

```markdown
---
id: "<change-name>"
Tipo: Resumen
Proyecto: "<proy-YYYYMMDD-slug>"
Fecha: YYYY-MM-DD
tags:
  - resumen
  - especificacion
  - <project-name>
---

# Resumen: <change-name>

> Resumen ejecutivo de la especificación completada.

## 1. Información General
| Campo | Detalle |
| :--- | :--- |
| **Proyecto** | <project> |
| **Especificación** | <change-name> |
| **Fecha Inicio** | <start-date> |
| **Fecha Fin** | <end-date> |
| **Estado** | Completado |

## 2. Contexto
> Max 500 characters describing what was done and why.

<context>

## 3. Tareas Realizadas
| ID | Tarea | Estado | Notas |
| :--- | :--- | :--- | :--- |
| ID-01 | <task> | ✓ | |

## 4. Cambios Durante la Especificación
- **Cambio 1**: <description>
- **Cambio 2**: <description>

## 5. Detalles No Finalizados
- <pending-item>

## 6. Enlaces
- **OpenSpec**: `openspec/changes/<change-name>`
- **Briefing**: `docs/requirements/briefings/<req-id>.md`
- **Requerimiento Original**: <requirement-link>
```

## Integration with Other Skills

### After spec-from-note

When `spec-from-note` completes and OpenSpec changes are created, this skill can generate the summary automatically.

### Before openspec-archive

Before archiving a change, generate the summary to preserve the work in Obsidian.

### With obsidian-tests

Generate tests alongside the summary for complete documentation.

## Enforcement Rules

1. **Always use template** - Use the template from `09_Plantilla/Resumen de Especificacion.md`
2. **Context max 500 chars** - Keep the context section concise
3. **Link to source** - Always link back to the OpenSpec change and requirement
4. **Portable format** - Ensure the document is readable without OpenSpec context
5. **Spanish content** - Write the summary in Spanish for the user

## Common Scenarios

### Scenario: Specification completed

1. User says "la especificación está completa"
2. Skill reads OpenSpec change artifacts
3. Generates summary in Obsidian
4. Shows confirmation

### Scenario: User asks for summary

1. User says "genera un resumen de lo que hicimos"
2. Skill finds the active change
3. Generates summary in Obsidian
4. Shows confirmation

### Scenario: Before archiving

1. User says "vamos a archivar este cambio"
2. Skill generates summary first
3. Then proceeds with archive workflow

## Notes

- This skill creates documentation in Obsidian, not in the repository
- The summary is portable and can be read on any machine with Obsidian
- OpenSpec files stay in the repository; the summary is a mirror for reference
- Use this skill to maintain the "Wiki del Proyecto" in Obsidian
