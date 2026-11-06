# Propuesta: sdd-config-sync

## Why

Permite mantener actualizada la configuración SDD de proyectos existentes a partir de una plantilla más reciente, con comparación previa, protección de personalizaciones y confirmación explícita de cada operación con riesgo.

## What Changes

- Detección de actualización disponible
- Plan de sincronización revisable
- Sincronización selectiva y segura
- Sincronización idempotente
- Verificación posterior
- Resolución de configuración de orquestación
- Consumo de stack.json por la orquestación del wiki
- Resolución de rutas del segundo cerebro

## Impact

Snapshot histórico de la capability `sdd-config-sync`, consolidado desde
`openspec/specs/sdd-config-sync/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
