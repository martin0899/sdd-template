---
name: lessons
description: Gestión de lecciones aprendidas: carga, registro y anti-repetición de _lessons.md.
---

# Lecciones aprendidas

Gestiona el archivo de lecciones del proyecto activo para que el agente aprenda de las correcciones del usuario.

## Carga obligatoria

Antes de actuar en un proyecto, lee `01_Proyectos/<Proyecto>/_Notas/_lessons.md` (vault) y aplica sus reglas. Si no existe, continúa sin error; se crea al registrar la primera corrección.

## Registro

Cuando el usuario corrija al agente, añade una línea `- Cuando X, haz Y` a la sección `Lessons` de ese archivo, sin borrar las lecciones existentes. Si la corrección no se puede expresar como regla accionable, pide precisión antes de escribir; no inventes la lección.

## Anti-repetición

Si el mismo error ocurre dos veces, reescribe la lección existente para hacerla inequívoca; no añadas una línea duplicada.

## Ubicación

`01_Proyectos/<Proyecto>/_Notas/_lessons.md`. Al ser una entrada `_`-prefijada queda excluida del escaneo de IDs y de la destilación a `05_wiki/`.
