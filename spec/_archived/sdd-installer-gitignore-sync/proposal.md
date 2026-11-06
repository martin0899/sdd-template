# Propuesta: sdd-installer-gitignore-sync

## Why

Mantener el bloque gestionado de `.gitignore` del destino sincronizado con la lista vigente de entradas del instalador, de modo que los artefactos locales de agente (incluida `.claude/`) queden descartados del versionado también en proyectos ya instalados.

## What Changes

- Entrada .claude en la lista gestionada
- Refresco del bloque gestionado existente
- Plan de actualización refleja el refresco gitignore

## Impact

Snapshot histórico de la capability `sdd-installer-gitignore-sync`, consolidado desde
`openspec/specs/sdd-installer-gitignore-sync/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
