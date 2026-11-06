# Propuesta: agent-permissions-format

## Why

Formato V2 para permisos de agentes: Los agentes SDD deben tener sus permisos en formato V2 de OpenCode (array de objetos con action, resource, effect) para ser reconocidos en el catálogo de subagentes. Preservación de lógica de permisos: La conversión al formato V2 no debe alterar la lógica de permisos existente.

## What Changes

- Formato V2 para permisos de agentes
- Preservación de lógica de permisos

## Impact

Snapshot histórico de la capability `agent-permissions-format`, consolidado desde
`openspec/specs/agent-permissions-format/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
