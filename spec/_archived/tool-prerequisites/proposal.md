# Propuesta: tool-prerequisites

## Why

Determinar qué herramientas externas son prerequisito según la filosofía del proyecto, de modo que el ciclo ODD funcione sin OpenSpec y el modo SDD lo exija de forma explícita.

## What Changes

- OpenSpec como prerequisito incondicional
- `doctor` reporta OpenSpec como requisito
- Error claro cuando falta OpenSpec
- `init` ejecuta `openspec init`

## Impact

Snapshot histórico de la capability `tool-prerequisites`, consolidado desde
`openspec/specs/tool-prerequisites/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
