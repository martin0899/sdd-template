# Design: optimize-token-consumption

## Context

Reducir el consumo de tokens por conversación mediante un AGENTS.md mínimo como enrutador, la creación de skills enfocadas (subagent-contract, graphify-usage, lessons) y la consolidación de skills duplicadas, manteniendo el índice de skills actualizado.

## Decisions

- **Minimal AGENTS.md as Router**: AGENTS.md serves as a minimal router (22–28 lines) that references docs/base-standards.md as the source of truth for development rules.
- **update.ts Calls manageAgentsMd**: The update command ensures AGENTS.md is managed consistently with init.
- **Skill subagent-contract**: A new skill defines the contract for subagents (inputs, outputs, rules).
- **Skill graphify-usage**: A new skill documents how to use graphify correctly.
- **Skill lessons**: A new skill manages the _lessons.md file (load, register, anti-repetition).
- **Consolidated Skills Index**: INDEX.md reflects the current state of skills after consolidation.
- **Duplicate Skill grill-me**: The skill `grill-me` previously existed as a redirect to `grilling`.
- **Grilling Skill**: The grilling skill absorbs the functionality of the removed grill-me skill.

## Verification

8 requisitos condensados desde
`openspec/specs/optimize-token-consumption/spec.md` (104 líneas en el original).
