# Design: spec-from-note

## Context

Convertir notas de requerimiento escritas en Obsidian en changes y especificaciones OpenSpec por capa (frontend, backend, db), ancladas a la realidad del código mediante un briefing investigado, con confirmación obligatoria de decisiones no definidas en la nota y trazabilidad sin copiar las notas.

## Decisions

- **Lectura de nota de requerimiento sin copiarla**: La skill SHALL leer la nota de requerimiento desde la ruta que el usuario indique (en su vault de Obsidian u otra ubicación) sin copiarla al repositorio.
- **Briefing investigado antes de especificar**: Antes de proponer el desglose, la skill SHALL investigar el repositorio destino y generar un briefing en `docs/requirements/briefings/<req-id>.md` que incluya: módulos y patrones existentes relacionados (vía graphify…
- **Confirmación obligatoria de decisiones no definidas**: La skill SHALL preguntar y esperar confirmación explícita del usuario antes de escribir cualquier spec cuando deba elegir: tecnologías o librerías, patrones de implementación, ubicación de código nuevo, esquema de BD…
- **Changes OpenSpec por actividad con artefactos completos**: Cada actividad ID-xx de la matriz SHALL convertirse en un change OpenSpec creado con `openspec new change` (nunca carpetas manuales), con una capability por capa afectada.
- **Registro de trazabilidad de notas**: La skill SHALL mantener un registro `docs/requirements/REGISTRY.md` por proyecto destino que documente: la ruta de la plantilla de notas en el vault, y por cada requerimiento procesado: ruta de la nota, id del…

## Verification

5 requisitos condensados desde
`openspec/specs/spec-from-note/spec.md` (63 líneas en el original).
