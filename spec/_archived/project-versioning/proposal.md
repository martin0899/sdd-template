# Propuesta: project-versioning

## Why

Gestión de la versión del proyecto destino en `.sdd-manifest.json` con reglas deterministas: PATCH auto-incrementa con cada spec archivada, MINOR sube al crear una versión release, MAJOR solo por ruptura de compatibilidad explícita, cada componente topa en 99 con carry. Es la fuente canónica de versión para el flujo commit/release.

## What Changes

- Versión del proyecto en el manifest
- Prompt de versión en init
- Regla de bump por spec archivada
- Regla de bump por release
- Regla de bump por MAJOR
- Límite máximo por componente
- Fuente canónica para commit/release

## Impact

Snapshot histórico de la capability `project-versioning`, consolidado desde
`openspec/specs/project-versioning/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
