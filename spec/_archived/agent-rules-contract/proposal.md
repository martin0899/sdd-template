# Propuesta: agent-rules-contract

## Why

Centraliza en un contrato compartido las reglas del ciclo SDD/ODD para eliminar la duplicación entre `AGENTS.md`, los comandos `opsx-*`, las skills vendor `openspec-*` y las skills de proyecto, de modo que los agentes invoquen la interfaz central de Spectralis sin reimplementar OpenSpec.

## What Changes

- Contrato compartido de reglas del ciclo
- Agentes invocan la interfaz central
- Detección de reglas duplicadas o contradictorias
- Migración gradual con límites de rol
- OpenSpec como backend SDD no reimplementado

## Impact

Snapshot histórico de la capability `agent-rules-contract`, consolidado desde
`openspec/specs/agent-rules-contract/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
