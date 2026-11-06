# Design: lessons-log

## Context

Registrar de forma portable las correcciones del usuario como lecciones accionables (`Cuando X, haz Y`) que el agente carga para no repetir errores.

## Decisions

- **Registro de correcciones como lecciones**: El agente SHALL registrar cada corrección del usuario como una línea con el formato `- Cuando X, haz Y` bajo la sección `Lessons` del archivo de lecciones del proyecto.
- **Ubicación y formato del archivo de lecciones**: El archivo de lecciones SHALL vivir en `01_Proyectos/<Proyecto>/_Notas/_lessons.md`, respetando la convención de entradas `_`-prefijadas del vault, y SHALL contener una sección `Lessons`.
- **Reescritura ante repetición**: Cuando el mismo error ocurre dos veces, el agente SHALL reescribir la lección existente en lugar de añadir un duplicado.
- **Carga de lecciones antes de actuar**: El agente SHALL cargar el archivo de lecciones del proyecto antes de ejecutar el trabajo, resolviendo su ruta desde la configuración del arnés.

## Verification

4 requisitos condensados desde
`openspec/specs/lessons-log/spec.md` (47 líneas en el original).
