# Design: eliminate-ollama-flow

## Context

Eliminar el flujo redundante de Ollama (detección, configuración y clasificación LLM en distill) para simplificar `init.ts`, `update.ts` y `distill.ts`, y sustituir la clasificación por heurísticas deterministas.

## Decisions

- **Spectralis Init Command**: The init command no longer includes Ollama detection and configuration steps.
- **Spectralis Update Command**: The update command no longer includes Ollama detection and now calls manageAgentsMd.
- **Spectralis Distill Command**: The distill command uses deterministic classification instead of LLM.
- **Deterministic Classification in distill.ts**: The distill command uses heuristic-based classification instead of LLM.

## Verification

4 requisitos condensados desde
`openspec/specs/eliminate-ollama-flow/spec.md` (58 líneas en el original).
