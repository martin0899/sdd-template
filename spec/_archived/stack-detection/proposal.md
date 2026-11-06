# Propuesta: stack-detection

## Why

Detección reproducible del stack de un proyecto: escaneo a profundidad 2 en directorios conocidos, exclusión de carpetas de archivo/caché, caché persistente en `stack.json` con invalidación por mtime, y degradación controlada a `generic` con el stack real trazado en el artefacto.

## What Changes

- Escaneo reproducible del stack
- Exclusión de carpetas de archivo y caché
- Caché persistente con invalidación por mtime
- Degradación controlada a generic
- Artefacto stack.json trazable

## Impact

Snapshot histórico de la capability `stack-detection`, consolidado desde
`openspec/specs/stack-detection/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
