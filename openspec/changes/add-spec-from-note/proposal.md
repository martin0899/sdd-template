# Proposal: add-spec-from-note

## Why

Los requerimientos se escriben en notas de Obsidian (plantilla `Requerimiento.md` existente) y hoy el paso hacia especificaciones OpenSpec es manual: leer la nota, investigar el código, proponer desglose y redactar specs a mano. Además, las skills del proyecto se cargan completas sin un flujo que las guíe desde el requerimiento. Se necesita una skill que convierta una nota de requerimiento en changes OpenSpec con specs por capa (frontend/backend/db), reduciendo el ruido y anclando cada spec a la realidad del código.

## What Changes

- Crear skill `.agents/skills/spec-from-note/SKILL.md` con flujo de 7 pasos: leer nota → investigar repo (graphify) → generar briefing → revisión con el usuario → desglose ID-xx → generar changes OpenSpec con `openspec new change` → actualizar registro.
- Reglas de confirmación obligatoria dentro de la skill: tecnologías, patrones de implementación, ubicación de código, esquema de BD, contratos API y desglose requieren confirmación explícita del usuario antes de escribir specs; si la nota ya trae el detalle, se respeta sin preguntar.
- Cada change generado incluye sistemáticamente: `## Impact` (áreas/archivos afectados), `## Risks / Trade-offs`, `## Migration Plan` con estrategia de rollback y escenarios de error en las specs.
- Mecanismo de trazabilidad sin copiar notas: `docs/requirements/REGISTRY.md` (por proyecto destino) registra ruta de la nota, briefing, changes generados y estado; la ruta de la plantilla también vive en el registro.
- Briefings por requerimiento en `docs/requirements/briefings/<req-id>.md`.
- Crear plantilla de nota en Obsidian: `Requerimiento para Specs.md` en `~/Documentos/Obsidian Vault/obsidian_sync_git/Recursos/Plantilla/` (fuera de este repo), fusionando la plantilla `Requerimiento.md` existente con: contratos de API (bloques estilo `API Response.md` con IDs API-xx), detalle opcional por actividad y secciones por capa opcionales.
- Añadir fila de la skill en `.agents/skills/INDEX.md`.
- Crear manual `docs/manuals/spec-from-note-workflow.md` (en inglés, kebab-case según convención del directorio) y añadirlo al índice de `docs/manuals/README.md`.
- **No** se modifican skills existentes (enrich-us mantiene su ciclo de vida propio), ni schemas de OpenSpec.

## Capabilities

### New Capabilities

- `spec-from-note`: Flujo que convierte notas de requerimiento de Obsidian en changes y especificaciones OpenSpec por capa, con investigación previa del código (briefing), reglas de confirmación obligatoria y trazabilidad vía registro de notas.

### Modified Capabilities

- (ninguna — no cambia el comportamiento de capabilities existentes)

## Impact

- **Archivos nuevos**: `.agents/skills/spec-from-note/SKILL.md`, plantilla Obsidian (ruta externa al repo), `docs/manuals/spec-from-note-workflow.md`
- **Archivos editados**: `.agents/skills/INDEX.md` (una fila), `docs/manuals/README.md` (una fila en el índice)
- **Mecanismos runtime** (definidos por la skill, se crean al usarse en cada proyecto destino): `docs/requirements/REGISTRY.md`, `docs/requirements/briefings/<req-id>.md`
- Sin impacto en código de aplicación ni dependencias. Riesgo bajo: si la skill no se invoca, el flujo actual de trabajo manual no cambia.
