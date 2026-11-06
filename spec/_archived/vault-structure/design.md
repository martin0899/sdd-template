# Design: vault-structure

## Context

Define la convención de organización de `01_Proyectos/<Proyecto>/` en el vault: carpetas `<spec-id>/` de cambio más entradas de organización `_`-prefijadas (`_Notas/`, `_INDEX.md`, `_README.md`), que quedan excluidas de la destilación a `05_wiki/`.

## Decisions

- **Entradas de organización en 01_Proyectos**: El sistema SHALL tratar cualquier entrada (carpeta o archivo) de `01_Proyectos/<Proyecto>/` cuyo nombre empiece por `_` como archivo de organización (`_Notas/`, `_INDEX.md`, `_README.md`), no como carpeta de cambio…
- **Destilación excluye entradas de organización**: El comando `spectralis distill <Proyecto>` SHALL leer solo las carpetas `<spec-id>/` de `01_Proyectos/<Proyecto>/` y excluir de la destilación a `05_wiki/` cualquier entrada cuyo nombre empiece por `_` (`_Notas/`,…
- **Notas de proyecto como excepción de captura**: Las decisiones y propuestas activas de un proyecto SHALL poder escribirse directamente en `01_Proyectos/<Proyecto>/_Notas/` sin pasar por `00_Notas/` (material deliberado, excepción al flujo de captura casual).
- **Folder note como artefacto único de spec**: El sistema SHALL representar el artefacto de una spec en el cerebro como un **único archivo** `01_Proyectos/<Proyecto>/<spec-id>/<spec-id>.md`, conservando la carpeta `<spec-id>/` como contenedor.
- **Headings canónicos del folder note**: El folder note de una spec SHALL usar, como encabezados de nivel dos, los headings que la destilación ya reconoce: `## Contexto`, `## Decisiones técnicas`, `## Impacto`, `## Lecciones aprendidas`, `## Cambios…
- **Coexistencia con el layout legacy de tres archivos**: Como la migración de las carpetas existentes se difiere, el sistema SHALL aceptar ambos layouts como válidos.

## Verification

6 requisitos condensados desde
`openspec/specs/vault-structure/spec.md` (122 líneas en el original).
