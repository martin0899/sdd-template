# Propuesta: spec-facade

## Why

Fachada única y consciente del modo para iniciar, consultar, validar, completar y cerrar un cambio, delegando en OpenSpec cuando el modo es SDD y operando sobre `odd/changes/<id>/feature.md` cuando es ODD.

## What Changes

- Fachada única consciente del modo
- Delegación en OpenSpec para SDD
- Un solo ejecutor activo
- Apply ejecuta tareas existentes
- Convergencia de entradas

## Impact

Snapshot histórico de la capability `spec-facade`, consolidado desde
`openspec/specs/spec-facade/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
