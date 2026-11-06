# Propuesta: update-agents-repair

## Why

Permite al comando `spectralis update` reparar y mantener el bloque gestionado de `AGENTS.md` incluso cuando el árbol de archivos está actualizado o cuando el bloque presenta inconsistencias (duplicados, incompleto, legacy sin marcadores). Introduce el flag `--repair-agents` para forzar la reconstrucción del bloque con confirmación explícita y migración de casos edge.

## What Changes

- Flag --repair-agents para reconstrucción forzada
- manageAgentsMd no suprimido por partial
- Excepciones de manageAgentsMd no tragadas
- Detección de deriva en --check
- Manifest preserva entradas especiales

## Impact

Snapshot histórico de la capability `update-agents-repair`, consolidado desde
`openspec/specs/update-agents-repair/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
