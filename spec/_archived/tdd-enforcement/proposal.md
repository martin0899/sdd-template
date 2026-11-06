# Propuesta: tdd-enforcement

## Why

Capacidad que adopta TDD de forma enforceable: obliga a escribir pruebas antes del código en los `tasks.md` de los changes OpenSpec y lo valida mecánicamente con `spectralis check --tdd`.

## What Changes

- Step K obligatorio en tasks.md
- Marcador mecánico TDD
- Sub-comando spectralis check --tdd
- Alcance sobre changes activos
- Secciones exentas
- Salida y exit code del sub-check TDD

## Impact

Snapshot histórico de la capability `tdd-enforcement`, consolidado desde
`openspec/specs/tdd-enforcement/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
