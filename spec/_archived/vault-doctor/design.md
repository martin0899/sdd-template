# Design: vault-doctor

## Context

Motor de validación determinista (`spectralis check`) del flujo SDD.

## Decisions

- **Sub-comando spectralis check --registry**: El sistema SHALL exponer un comando `spectralis check --registry` que ejecute la validación de consistencia del flujo SDD, y `spectralis check` sin flags SHALL ejecutarlo junto al resto de sub-checks disponibles.
- **Change sin registro**: El sistema SHALL detectar cambios presentes en `openspec/changes/` o en `01_Proyectos/<Proyecto>/` que no tengan una fila en `.sdd-registry/REGISTRY.md`.
- **Registrado sin carpeta**: El sistema SHALL detectar referencias en `.sdd-registry/REGISTRY.md` a spec-ids que no existan en ninguna parte: ni como change activo en `openspec/changes/`, ni como change archivado en `openspec/changes/archive/`, ni…
- **Briefing faltante**: El sistema SHALL detectar changes registrados en `.sdd-registry/REGISTRY.md` sin artefacto de documentación en el repo o en `01_Proyectos/<Proyecto>/<spec-id>/`.
- **INDEX desalineado**: El sistema SHALL validar que `05_wiki/_INDEX.json` refleje `01_Proyectos/<Proyecto>/` y `openspec/changes/`, detectando projects faltantes, conteos de `changes` distintos o `updated` desactualizado.
- **Registrado sin destilar**: El sistema SHALL detectar changes registrados en `.sdd-registry/REGISTRY.md` cuyo estado los declare completados y que no tengan un bloque de decisión `### <spec-id>` en `05_wiki/<Proyecto>/decisiones.md`.
- **Salida y exit code del sub-check**: El sistema SHALL presentar la salida del sub-check en una tabla con severidad (warning/error), proyecto, artefacto y sugerencia de acción, y SHALL devolver exit code distinto de 0 cuando exista al menos un error.
- **Validación determinista y de solo lectura**: El sistema SHALL validar de forma determinista (sin LLM, sin red), idempotente y sin modificar el vault, `.sdd-registry/`, `05_wiki/` ni `openspec/`.
- **Sub-comando spectralis check --ids**: El sistema SHALL exponer un comando `spectralis check --ids` que ejecute la validación de IDs del vault, y `spectralis check` sin flags SHALL ejecutarlo junto al resto de sub-checks disponibles.
- **Recorrido de notas del vault**: El sistema SHALL recorrer las notas `.md` del vault excluyendo `docs/`, `05_wiki/` y `.git/`, parseando el frontmatter de forma determinista.
- **ID presente**: El sistema SHALL detectar notas sin `id` en su frontmatter.
- **Formato conforme del ID**: El sistema SHALL validar que cada `id` siga `TYPE-YYYYMMDD-slug` con whitelist de prefijos `nota-|proy-|idea-|doc-|rec-|arc-|res-|brief-|test-|spec-`, fecha `YYYYMMDD` obligatoria salvo excepciones, y slug en minúsculas…
- **Unicidad global del ID**: El sistema SHALL detectar dos o más notas que compartan el mismo `id` en todo el vault.
- **Registro en INDEX_ID**: El sistema SHALL verificar que el `id` de las notas de contenido aparezca en `03_Recursos/_INDEX_ID.md`, excluyendo de este check los artefactos generados por el arnés.
- **Tipo coherente**: El sistema SHALL verificar que el prefijo del `id` corresponda al `Tipo` del frontmatter de la nota.
- **Salida y exit code del sub-check de IDs**: El sistema SHALL presentar la salida del sub-check listando las notas con `id` ausente/duplicado/no conforme y la sugerencia del ID correcto, con severidad warning/error, y SHALL devolver exit code distinto de 0 cuando…
- **Validación determinista con caché por mtime**: El sistema SHALL validar de forma determinista (sin LLM, sin red), idempotente y de solo lectura, reutilizando el patrón de caché por mtime para re-parsear solo las notas cambiadas manteniendo siempre recalculada la…
- **Sub-comando spectralis check --tdd**: El sistema SHALL exponer un comando `spectralis check --tdd` que ejecute la validación del orden TDD de los `tasks.md` de los changes activos de OpenSpec.
- **Salida y exit code del sub-check TDD**: El sistema SHALL presentar la salida del sub-check TDD en la misma tabla que el resto de sub-checks (severidad, proyecto, artefacto, sugerencia) y SHALL devolver exit code distinto de 0 cuando exista al menos un error…
- **Validación determinista y de solo lectura del sub-check TDD**: El sistema SHALL validar el orden TDD de forma determinista (sin LLM, sin red), idempotente y sin modificar `openspec/`.
- **Detección estructural de artefacto generado**: El sistema SHALL identificar como artefacto generado, además de los tres archivos legacy por nombre, al folder note de una spec.
- **Coherencia de contrato del folder note**: El sistema SHALL verificar, en el folder note de una spec, que su frontmatter declara `Tipo: Especificación` y que su `id` usa el prefijo `spec-`.
- **La enumeración de specs sigue siendo por directorio**: El sistema SHALL seguir enumerando las specs de `01_Proyectos/<Proyecto>/` a partir de los **directorios** `<spec-id>/`, y no a partir de archivos.

## Verification

23 requisitos condensados desde
`openspec/specs/vault-doctor/spec.md` (435 líneas en el original).
