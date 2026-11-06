# Design: obsidian-orchestration

## Context

Orquestación opcional entre el flujo OpenSpec y el segundo cerebro, controlada por el switch `obsidianSync` (o flags `--obsidian`/`--no-obsidian`), que dispara las skills `obsidian-briefing`, `obsidian-summary`, `obsidian-tests` y `spectralis spec complete` en los momentos correctos con…

## Decisions

- **Skill obsidian-orchestration reproducible**: El sistema SHALL proveer la skill `.agents/skills/obsidian-orchestration/SKILL.md` con la lógica de orquestación: leer el switch (`spectralis config --get obsidianSync` o flags), invocar `obsidian-briefing` en apply, e…
- **Switch de orquestación**: El sistema SHALL tener un switch de orquestación `obsidianSync` con valores `0` (no orquestar) y `1` (orquestar), con default `0`.
- **Orquestación en apply**: El sistema SHALL hacer que el agente invoque la skill `obsidian-briefing` al completar la implementación de un change cuando la orquestación está activa.
- **Orquestación en archive**: El sistema SHALL hacer que el agente invoque `obsidian-summary` y `obsidian-tests` antes de archivar un change, y ejecute `spectralis spec complete` para validar, registrar y destilar, cuando la orquestación está…
- **Orquestación de manuales en instalación**: El sistema SHALL ejecutar `spectralis notes init` y `spectralis notes sync` automáticamente después de `spectralis init` y `spectralis update` cuando la orquestación está activa, sincronizando los manuales canónicos al…
- **Idempotencia de la orquestación**: El sistema SHALL ser idempotente en la orquestación: los documentos del cerebro que ya existen con el contenido correcto no se regeneran, y los manuales idénticos no se re-copian.

## Verification

6 requisitos condensados desde
`openspec/specs/obsidian-orchestration/spec.md` (139 líneas en el original).
