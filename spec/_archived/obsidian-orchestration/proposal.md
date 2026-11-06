# Propuesta: obsidian-orchestration

## Why

Orquestación opcional entre el flujo OpenSpec y el segundo cerebro, controlada por el switch `obsidianSync` (o flags `--obsidian`/`--no-obsidian`), que dispara las skills `obsidian-briefing`, `obsidian-summary`, `obsidian-tests` y `spectralis spec complete` en los momentos correctos con idempotencia y costo controlado.

## What Changes

- Skill obsidian-orchestration reproducible
- Switch de orquestación
- Orquestación en apply
- Orquestación en archive
- Orquestación de manuales en instalación
- Idempotencia de la orquestación

## Impact

Snapshot histórico de la capability `obsidian-orchestration`, consolidado desde
`openspec/specs/obsidian-orchestration/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
