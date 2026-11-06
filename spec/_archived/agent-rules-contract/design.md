# Design: agent-rules-contract

## Context

Centraliza en un contrato compartido las reglas del ciclo SDD/ODD para eliminar la duplicación entre `AGENTS.md`, los comandos `opsx-*`, las skills vendor `openspec-*` y las skills de proyecto, de modo que los agentes invoquen la interfaz central de Spectralis sin reimplementar OpenSpec.

## Decisions

- **Contrato compartido de reglas del ciclo**: El sistema SHALL mantener un contrato compartido y único de las reglas del ciclo que hoy se definen por separado en `AGENTS.md`, `.opencode/commands/opsx-*.md`, `.opencode/skills/openspec-*` y `.agents/skills/*`.
- **Agentes invocan la interfaz central**: Los agentes SHALL invocar la interfaz central de Spectralis para conducir el ciclo y NO SHALL duplicar el ciclo ni inventar convenciones distintas por repositorio.
- **Detección de reglas duplicadas o contradictorias**: El sistema SHALL detectar reglas del ciclo duplicadas o contradictorias entre los archivos gobernados y SHALL unificarlas en el contrato.
- **Migración gradual con límites de rol**: El sistema SHALL migrar los archivos gobernados al contrato de forma gradual, conservando los límites de rol de `coordinador`, `planificador`, `implementador`, `gertrudis` y `documentador`.
- **OpenSpec como backend SDD no reimplementado**: El sistema NO SHALL reimplementar OpenSpec.

## Verification

5 requisitos condensados desde
`openspec/specs/agent-rules-contract/spec.md` (76 líneas en el original).
