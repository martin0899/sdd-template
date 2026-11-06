# Propuesta: sdd-installer-agents-sync

## Why

Garantizar que las reglas SDD gestionadas en `AGENTS.md` del destino se sincronicen con la plantilla durante la actualización (incluida la regla de enrutado de skills), y que la verificación final cubra los archivos del sistema de enrutado.

## What Changes

- Refresco del bloque gestionado de AGENTS.md en actualización
- Verificación final del sistema de enrutado de skills
- Plan de actualización refleja el refresco

## Impact

Snapshot histórico de la capability `sdd-installer-agents-sync`, consolidado desde
`openspec/specs/sdd-installer-agents-sync/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
