# Tasks: add-spec-from-note

## 1. Plantilla de Obsidian

- [x] 1.1 Crear `Requerimiento para Specs.md` en `~/Documentos/Obsidian Vault/obsidian_sync_git/Recursos/Plantilla/` fusionando la estructura de `Requerimiento.md` (frontmatter id/Tipo/Proyecto/Fecha/tags, Información General, Descripción con repos/sandbox, Arquitectura y Tecnologías, Objetivos, Matriz de Actividades con ID/Componente/Actividad/Descripción/Prioridad/Estado, Reglas de Negocio, Bloqueos y "lo que espera el usuario") con: sección `## Contratos de API` con bloques estilo `API Response.md` identificadas como API-01, API-02..., detalle opcional por actividad (sub-secciones `#### ID-xx` con formato por capa: endpoints/patrones para backend, pantallas/estados para frontend, DDL + SELECT de verificación para db) y sección Fuera de alcance por actividad. Verificar que el archivo existe y su markdown renderiza.

## 2. Skill spec-from-note

- [x] 2.1 Crear `.agents/skills/spec-from-note/SKILL.md` con frontmatter (name, description con triggers, version) y el flujo de 7 pasos: (1) leer nota desde la ruta indicada sin copiarla, (2) investigar el repo con graphify + specs vigentes, (3) generar briefing en `docs/requirements/briefings/<req-id>.md` con las seis secciones, (4) revisión del briefing con el usuario, (5) desglose ID-xx a changes con confirmación, (6) crear changes con `openspec new change` y artefactos que siempre rellenan Impact, Risks/Trade-offs, Migration Plan con rollback y escenarios de error, (7) actualizar `docs/requirements/REGISTRY.md`. Verificar que el archivo existe y describe los 7 pasos en orden.
- [x] 2.2 Incluir en el SKILL.md las reglas de confirmación obligatoria (lista cerrada: tecnologías, patrones de implementación, ubicación de código, esquema de BD, contratos API, desglose) con el contrapeso: lo que la nota ya trae explícito se respeta sin preguntar y solo se señalan contradicciones con el código real. Verificar que las seis categorías están listadas textualmente.
- [x] 2.3 Incluir en el SKILL.md el manejo de los tres niveles de detalle de nota (detallada, parcial, mínima) y la regla de contratos API compartidos (viven en la nota, evolucionan por copia, el briefing detecta reuso vs evolución). Verificar leyendo el archivo.

## 3. Integración con índice y manuales

- [x] 3.1 Añadir fila de `spec-from-note` en la tabla de `.agents/skills/INDEX.md` con trigger condensado y ruta completa `.agents/skills/spec-from-note/SKILL.md`. Verificar con `test -f`.
- [x] 3.2 Crear `docs/manuals/spec-from-note-workflow.md` en inglés, kebab-case, explicando el flujo completo: dónde vive la plantilla, estructura de la nota (matriz + contratos API), los 7 pasos, el briefing, el REGISTRY.md, las reglas de confirmación y cómo encaja con OpenSpec (new change -> apply -> archive). Verificar que el archivo existe.
- [x] 3.3 Añadir fila al índice de `docs/manuals/README.md` (tabla Index) con enlace a `spec-from-note-workflow.md`. Verificar leyendo el archivo.

## 4. Validación

- [x] 4.1 Ejecutar `openspec validate add-spec-from-note` y verificar que pasa sin errores.
- [x] 4.2 Verificar trazabilidad cruzada: la ruta de plantilla citada en el manual coincide con la escrita en la tarea 1.1, y la skill referenciada en INDEX.md existe.
