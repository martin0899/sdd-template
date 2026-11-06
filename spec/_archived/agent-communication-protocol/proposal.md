# Propuesta: agent-communication-protocol

## Why

Establece un protocolo de comunicación interna en inglés entre coordinador y subagentes con output telegráfico estructurado (JSON/template fija), eliminando rehash del contexto recibido y limitando reportes de fallos a 2-3 líneas. Solo el coordinador traduce al lenguaje natural del usuario final.

## What Changes

- Idioma interno en inglés
- Output telegráfico estructurado
- No rehash del contexto recibido
- Reporte de fallos compacto
- Coordinador traduce al usuario
- Actualización de configuración de agentes

## Impact

Snapshot histórico de la capability `agent-communication-protocol`, consolidado desde
`openspec/specs/agent-communication-protocol/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
