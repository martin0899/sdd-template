# Propuesta: spec-native

## Why

Capability **spec-native**: comandos nativos del arnés para operar sobre changes OpenSpec sin invocar el CLI externo. Cubre visualización (read-only), gestión de tareas (atomic write + mirror), registro de progreso (`spec/progress.json`: esquema + derivación) y resolución centralizada del directorio de changes.

## What Changes

- resolveChangesDir — resolución centralizada del directorio de changes
- progress.json — esquema de registro de progreso
- spectralis task — gestión de tareas desde el CLI
- spectralis view — visor read-only de changes
- spec_dir config key — clave de configuración para el directorio de changes
- Fixtures refactor — helpers compartidos de test
- spectralis spec — firma reconciliada con dispatch por action
- spectralis spec create — creación nativa de changes
- spectralis spec migrate — migración nativa de changes legacy
- spectralis spec archive — archive nativo con brain-write
- change.json — schema por change
- resolveChangesDir — flip del default a spec/
- dual-read legacy durante migración
- spanish-context retarget
- config key `engine` — cascada manifest > config > default
- prereqs — `openspec` condicional al engine
- doctor labels — `openspec` condicional al engine
- spectralis spec status — estado nativo de changes
- spectralis spec validate — validación nativa de artifacts
- CLI dispatch — actions `status` y `validate`
- Native flow documentation alignment — skill rewrites
- Vendor payload retention — openspec engine extras
- base-standards §8 storage neutrality
- CHANGELOG Unreleased entry
- Test-pinned headers and phrases preservation

## Impact

Snapshot histórico de la capability `spec-native`, consolidado desde
`openspec/specs/spec-native/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
