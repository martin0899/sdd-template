# Propuesta: agent-roles

## Why

Definir el contrato de entradas y salidas de los roles del flujo, reutilizando los agentes existentes, y la compuerta de revisión de `gertrudis` condicionada por riesgo, con veredicto y hallazgos reproducibles.

## What Changes

- Contrato de roles con entradas y salidas
- Reutilización de agentes existentes
- Gertrudis reporta y no modifica
- Revisión condicional por riesgo
- Flujo de trabajo por modo
- Coordinador identifica el estado antes de actuar

## Impact

Snapshot histórico de la capability `agent-roles`, consolidado desde
`openspec/specs/agent-roles/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
