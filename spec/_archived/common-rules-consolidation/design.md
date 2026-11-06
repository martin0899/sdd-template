# Design: common-rules-consolidation

## Context

Consolida las reglas de seguridad duplicadas en `_common.md`, reduce su tamaño a ~30 líneas moviendo reglas específicas a los agentes que las consumen, y elimina la duplicación de reglas "No hacer commits" y "No editar archivos" entre `_common.md` y las secciones "Lo que NUNCA haces" de cada agente.

## Decisions

- **`_common.md` optimizado a ~30 líneas**: `_common.md` DEBE contener únicamente: Paso 0 (contrato del proyecto), Superficies canónicas, Reglas Spectralis (comunes), Cascada de rutas, Seguridad (todos), Anti-teléfono-descompuesto, Manejo de fallos, Checkpoint de…
- **Reglas de seguridad duplicadas consolidadas en `_common.md`**: La sección `## Seguridad (todos)` de `_common.md` DEBE incluir explícitamente las reglas "No hacer commits" y "No editar archivos" (actualmente duplicadas en las secciones "Lo que NUNCA haces" de cada agente).
- **Eliminación de duplicación en agentes**: Las secciones "Lo que NUNCA haces" de los 5 agentes DEBEN eliminar las reglas "No hacer commits" y "No editar archivos" que ya están consolidadas en `_common.md`.
- **Regla "Protocolo de recuperación" movida a investigador**: La sección `## Protocolo de recuperación (investigación)` DEBE moverse de `_common.md` a `investigador.md` (bajo un heading apropiado, ej.
- **Regla "Veredictos y fases" movida a gertrudis**: La sección `## Veredictos y fases` DEBE moverse de `_common.md` a `gertrudis.md` (bajo un heading apropiado, ej.

## Verification

5 requisitos condensados desde
`openspec/specs/common-rules-consolidation/spec.md` (70 líneas en el original).
