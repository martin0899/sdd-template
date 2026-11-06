# Propuesta: common-rules-consolidation

## Why

Consolida las reglas de seguridad duplicadas en `_common.md`, reduce su tamaño a ~30 líneas moviendo reglas específicas a los agentes que las consumen, y elimina la duplicación de reglas "No hacer commits" y "No editar archivos" entre `_common.md` y las secciones "Lo que NUNCA haces" de cada agente.

## What Changes

- `_common.md` optimizado a ~30 líneas
- Reglas de seguridad duplicadas consolidadas en `_common.md`
- Eliminación de duplicación en agentes
- Regla "Protocolo de recuperación" movida a investigador
- Regla "Veredictos y fases" movida a gertrudis

## Impact

Snapshot histórico de la capability `common-rules-consolidation`, consolidado desde
`openspec/specs/common-rules-consolidation/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
