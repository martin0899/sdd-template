# Design: add-skill-index

## Context

Las 12 skills del proyecto viven en `.agents/skills/<nombre>/SKILL.md` y suman ~100 KB. Cuatro de ellas (writing-skills, using-git-worktrees, thermo-nuclear-code-quality-review, commit) concentran ~64 KB. Las descriptions del frontmatter ya aparecen en el system prompt, pero son prosa heterogénea y solo indican cuándo sí usar la skill, nunca cuándo no. Ver proposal.md para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Reducir la carga de contexto al elegir skills: una tabla de ~12 filas en lugar de múltiples SKILL.md
- Que el índice sea la fuente de verdad de qué existe, qué lo dispara y dónde está
- Mantener actualización manual y simple

**Non-Goals:**
- No acortar ni editar las descriptions de los frontmatter de las skills existentes
- No incluir skills globales (`~/.claude/skills`, `~/.agents/skills`)
- No enrutrar comandos del workflow OpenSpec (opsx) — el índice es solo para skills
- No automatizar la regeneración del índice (sin hooks)

## Decisions

### D1: El índice vive en `.agents/skills/INDEX.md`, junto a las skills
Indexa lo que hay en esa carpeta; mantenerlo junto a las skills mantiene la unidad autocontenida. Alternativa: `openspec/` como artefacto del proyecto — descartado porque acoplaría skills y workflow.

### D2: Ruta completa al SKILL.md en la columna de ubicación
El usuario pidió ruta completa (no solo carpeta) por si en el futuro hay skills en otras ubicaciones. La tabla no asume la convención `<carpeta>/SKILL.md`.

### D3: Solo skills del proyecto
Las skills globales ya llegan por el system prompt del entorno y varían por máquina. El índice es local y autocontenido.

### D4: Regla de consulta en `AGENTS.md`, no en el índice
El índice es un dato; la obligación de consultarlo es un comportamiento. Una línea en `AGENTS.md` garantiza que el orquestador lo lea antes de invocar skills. Alternativa: confiar en que el agente lo descubra solo — frágil.

### D5: Trigger condensado, frontmatter intacto
La columna "trigger" resume la description en una línea. Los SKILL.md no se tocan: el índice es una capa de solo lectura encima, lo que minimiza el riesgo y el diff.

## Risks / Trade-offs

- [Índice desactualizado tras añadir/editar skills sin actualizarlo] → Riesgo aceptado: degrada al comportamiento actual (leer SKILL.md). Mitigación: la regla en `AGENTS.md` puede mencionar que el índice debe actualizarse cuando cambien las skills.
- [Trigger condensado pierde matices de la description original] → El frontmatter sigue siendo la fuente completa; el índice solo enruta. Si hay ambigüedad, el agente puede leer el SKILL.md elegido (que era el objetivo).
- [El agente ignora la regla y carga skills igual] → La regla es corta y está en el archivo de instrucciones principal; verificación manual tras implementar.

## Migration Plan

Sin migración: dos archivos nuevos/editados, revert trivial (borrar `INDEX.md` y la línea de `AGENTS.md`).

## Open Questions

Ninguna.
