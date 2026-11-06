# Design: stack-detection

## Context

Detección reproducible del stack de un proyecto: escaneo a profundidad 2 en directorios conocidos, exclusión de carpetas de archivo/caché, caché persistente en `stack.json` con invalidación por mtime, y degradación controlada a `generic` con el stack real trazado en el artefacto.

## Decisions

- **Escaneo reproducible del stack**: El sistema SHALL detectar el stack de un proyecto escaneando la raíz y, a profundidad 2, los directorios conocidos de monorepo (`packages`, `apps`, `services`, `libs`), de forma determinista y sin costo de tokens.
- **Exclusión de carpetas de archivo y caché**: El sistema SHALL excluir del análisis las carpetas de archivo/caché que no representan el código fuente del proyecto: `node_modules`, `.opencode`, `.git`, `dist`, `build`, `.next`, `__pycache__`, `vendor`,…
- **Caché persistente con invalidación por mtime**: El sistema SHALL persistir el resultado en `stack.json` y SHALL invalidar la caché cuando un archivo indicador cambie después de la fecha de detección (`detected_at`), re-detectando en ese caso.
- **Degradación controlada a generic**: El sistema SHALL degradar a la variante `generic` los stacks detectados pero sin variante soportada en `docs-variants/`, conservando el stack real (lenguaje y framework) en `stack.json` para trazabilidad.
- **Artefacto stack.json trazable**: El sistema SHALL emitir `stack.json` con el esquema actual (backend, frontend, language, languageVersion, buildTool, testFramework, framework, frameworkVersion, frameworkFe, frameworkVersionFe, projectName, detected_at)…

## Verification

5 requisitos condensados desde
`openspec/specs/stack-detection/spec.md` (82 líneas en el original).
