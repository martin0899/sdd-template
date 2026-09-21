# Proposal: add-skill-index

## Why

Las skills del proyecto (`.agents/skills/`) suman ~100 KB de documentación interna. Cuando el orquestador debe decidir qué skill invocar, termina leyendo archivos completos "por si acaso", lo que satura el contexto y ralentiza el proceso — especialmente con skills grandes (writing-skills: 22 KB, using-git-worktrees: 14 KB). Se necesita una capa de enrutado ligera que permita decidir qué skill usar sin cargar su contenido.

## What Changes

- Crear `.agents/skills/INDEX.md`: tabla índice de las 12 skills del proyecto con columnas **skill**, **trigger/description que la detona** y **ruta completa al SKILL.md**.
- Editar `AGENTS.md`: añadir una regla de una línea que ordene consultar `INDEX.md` antes de invocar cualquier skill y cargar únicamente el `SKILL.md` elegido.
- La actualización del índice será **manual**: cuando se añada o edite una skill, se actualiza la tabla (sin hooks ni automatización por ahora).
- **No** se incluyen las skills globales (`~/.claude/skills`, `~/.agents/skills`) ni el workflow OpenSpec (no se toca `opsx`).
- **No** se modifican los `SKILL.md` ni sus frontmatter descriptions (el índice es una capa nueva encima).

## Capabilities

### New Capabilities

- `skill-index`: Capacidad de enrutado de skills del proyecto mediante un índice manual en `.agents/skills/INDEX.md` y una regla de consulta en `AGENTS.md`.

### Modified Capabilities

- (ninguna — no cambia el comportamiento de skills existentes ni de specs previas)

## Impact

- **Archivos nuevos**: `.agents/skills/INDEX.md`
- **Archivos editados**: `AGENTS.md` (una regla de una línea)
- **Sin impacto en código**, APIs ni dependencias. Riesgo bajo: si el índice queda desactualizado, el comportamiento degrada al actual (el agente lee los SKILL.md como hoy).
