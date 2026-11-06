# Propuesta: agent-permissions-v2

## Why

Define la sintaxis operativa de permisos V2 para los agentes SDD y los subagentes de apoyo, reemplazando la sintaxis inerte V1 (`permission:` singular) y añadiendo control explícito de invocación entre agentes.

## What Changes

- Sintaxis V2 de permisos en todos los agentes
- Permisos de edición conservados tras migración
- Permiso `subagent` explícito en el coordinador
- Subagente `tareas-baja` con modelo local/free
- Backup previo a la migración

## Impact

Snapshot histórico de la capability `agent-permissions-v2`, consolidado desde
`openspec/specs/agent-permissions-v2/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
