---
name: obsidian-summary
description: Review and complete the live folder-note details in Obsidian after a change is finished. In the native flow the portable wiki summary is written by the native archive; this skill completes what is missing in the single folder note (no separate files). Use when a change is completed, tasks are done, or when the user asks for a summary of completed work.
---

# Obsidian Summary

> **Orquestada**: cuando `obsidianSync=1` (o `--obsidian`), esta skill se invoca automáticamente desde `obsidian-orchestration` al archivar un change. Con el switch en `0`, se usa solo por invocación explícita.

Revisa y completa los detalles del **folder note vivo** en Obsidian después de cerrar un change. En el flujo **nativo** el resumen portátil del wiki lo escribe directamente el archive (`spectralis spec archive`), así que esta skill ya **no genera documentos aparte**: consolida en el folder note único (`## Cambios realizados`, `## Lecciones aprendidas`) lo que el archive no puede dejar escrito allí. Con `engine: openspec` su comportamiento es el legacy: generar el resumen a partir de los artefactos del change.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "el vault está en <ruta>" o "los resúmenes van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Resolución |
|---|---|---|
| `vault_root` | Raíz del vault de Obsidian | `spectralis config --get vault_root` |
| `templates_dir` | Carpeta de plantillas | `spectralis config --get templates_dir` (default `{vault_root}/09_Plantilla`) |
| `projects_dir` | Carpeta de proyectos | `spectralis config --get projects_dir` (default `{vault_root}/01_Proyectos`) |
| `project_registry` | Registro de requerimientos | `.sdd-registry/REGISTRY.md` (dentro del repo) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si `spectralis config --get <key>` devuelve la ruta (config global o manifest del proyecto) → usar esa.
3. Si existe `.sdd-registry/REGISTRY.md` en el proyecto → leer las rutas registradas.
4. Si se detecta un vault (`.obsidian` o `09_Plantilla`) → usar la ruta por defecto derivada.
5. Si ninguna aplica → preguntar al usuario.

## When to Use

- After completing a change (all tasks done)
- When the user asks for a summary of completed work
- Before archiving a change
- When documenting what was accomplished for cross-machine reference

## Workflow

### Step 1: Gather Context

Read the change artifacts to understand what was done:

```bash
spectralis spec status <change-id>
```

In the native flow the archive has already written the portable summary in the brain (`05_wiki/<wiki-project>/<change-id>.md`): read it as the source of truth and complete the folder note with what is missing. With `engine: openspec`, the context comes from the external CLI's own status command.

Extract:
- Change name and description
- Tasks completed
- Specs implemented
- Design decisions made
- Any changes during implementation

### Step 2: Read Change Artifacts

Read the following files from the change directory (native: `spec/<change-id>/`, or `spec/_archived/<change-id>/` once archived; `engine: openspec`: `openspec/changes/<change-name>/`):

1. `proposal.md` - What was proposed
2. `design.md` - How it was designed
3. `tasks.md` - What was implemented
4. `specs/*/spec.md` - Specifications
5. `change.json` (native only) - Metadata: `nombre` and `resumen.abstracto`

### Step 3: Generate Summary

Create a summary **section inside the folder note** at:
`{projects_dir}/<Proyecto>/<spec-id>/<spec-id>.md` — escribe/actualiza los headings canónicos `## Cambios realizados` y `## Lecciones aprendidas`. No crees `resumen.md` ni un archivo aparte (folder note único con `id: spec-<spec-id>`, `Tipo: Especificación`). Idempotente: no añadas un segundo heading igual.

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
- Folder note updated (no separate file created)
- Key sections filled
- Links added

## Summary Template Structure

> Plantilla de referencia (`{templates_dir}/Resumen de Especificacion.md`). En el flujo actual la información vive en las secciones canónicas del folder note único; este esquema documenta qué datos cubrir, no un fichero aparte.

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
- **Change**: `spec/<change-name>` (nativo) · `openspec/changes/<change-name>` (`engine: openspec`)
- **Briefing**: `.sdd-registry/briefings/<req-id>.md`
- **Requerimiento Original**: <requirement-link>
```

## Integration with Other Skills

### After spec-from-note

When `spec-from-note` completes and the changes are created, this skill can complete the summary automatically.

### Before the archive

Before archiving a change, complete the summary to preserve the work in Obsidian.

### With obsidian-tests

Complete the tests section alongside the summary for complete documentation.

## Enforcement Rules

1. **Always use template** - Use the template from `09_Plantilla/Resumen de Especificacion.md`
2. **Context max 500 chars** - Keep the context section concise
3. **Link to source** - Always link back to the change (native: `spec/<id>/`; `engine: openspec`: `openspec/changes/<id>/`) and the requirement
4. **Portable format** - Ensure the document is readable without the spec context
5. **Spanish content** - Write the summary in Spanish for the user

## Common Scenarios

### Scenario: Change completed

1. User says "la especificación está completa"
2. Skill reads the change artifacts (native: the archived change and the brain summary)
3. Completes the folder note sections in Obsidian
4. Shows confirmation

### Scenario: User asks for summary

1. User says "genera un resumen de lo que hicimos"
2. Skill finds the active change
3. Completes the folder note sections in Obsidian
4. Shows confirmation

### Scenario: Before archiving

1. User says "vamos a archivar este cambio"
2. Skill completes the summary sections first
3. Then proceeds with the archive workflow

## Notes

- This skill updates documentation in Obsidian, not in the repository
- The summary is portable and can be read on any machine with Obsidian
- The change files stay in the repository; the folder note is a mirror for reference
- Use this skill to maintain the "Wiki del Proyecto" in Obsidian
