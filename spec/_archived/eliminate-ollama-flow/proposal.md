# Propuesta: eliminate-ollama-flow

## Why

Eliminar el flujo redundante de Ollama (detección, configuración y clasificación LLM en distill) para simplificar `init.ts`, `update.ts` y `distill.ts`, y sustituir la clasificación por heurísticas deterministas.

## What Changes

- Spectralis Init Command
- Spectralis Update Command
- Spectralis Distill Command
- Deterministic Classification in distill.ts

## Impact

Snapshot histórico de la capability `eliminate-ollama-flow`, consolidado desde
`openspec/specs/eliminate-ollama-flow/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
