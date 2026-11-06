# Propuesta: skill-config-consumption

## Why

Capacidad que obliga a las skills del arnés SDD a resolver las rutas del vault de Obsidian y sus subcarpetas a través de la configuración centralizada (`spectralis config --get <key>`) en lugar de declarar rutas absolutas como valores por defecto. Alinea todas las skills con el patrón ya usado por `obsidian-orchestration` y `sdd-onboard-project`.

## What Changes

- Resolución de rutas por config en skills
- Alineación de las 4 skills afectadas
- Verificación de portabilidad

## Impact

Snapshot histórico de la capability `skill-config-consumption`, consolidado desde
`openspec/specs/skill-config-consumption/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
