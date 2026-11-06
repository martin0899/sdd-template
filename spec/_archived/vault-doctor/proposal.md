# Propuesta: vault-doctor

## Why

Motor de validación determinista (`spectralis check`) del flujo SDD. Este cambio introduce el sub-check `--registry`, que detecta desalineaciones del triángulo repo ↔ `.sdd-registry` ↔ brain ↔ `openspec`. Sin LLM, idempotente y de solo lectura.

## What Changes

- Sub-comando spectralis check --registry
- Change sin registro
- Registrado sin carpeta
- Briefing faltante
- INDEX desalineado
- Registrado sin destilar
- Salida y exit code del sub-check
- Validación determinista y de solo lectura
- Sub-comando spectralis check --ids
- Recorrido de notas del vault
- ID presente
- Formato conforme del ID
- Unicidad global del ID
- Registro en INDEX_ID
- Tipo coherente
- Salida y exit code del sub-check de IDs
- Validación determinista con caché por mtime
- Sub-comando spectralis check --tdd
- Salida y exit code del sub-check TDD
- Validación determinista y de solo lectura del sub-check TDD
- Detección estructural de artefacto generado
- Coherencia de contrato del folder note
- La enumeración de specs sigue siendo por directorio

## Impact

Snapshot histórico de la capability `vault-doctor`, consolidado desde
`openspec/specs/vault-doctor/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
