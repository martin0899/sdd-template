# Design: agent-permissions-format

## Context

Formato V2 para permisos de agentes: Los agentes SDD deben tener sus permisos en formato V2 de OpenCode (array de objetos con action, resource, effect) para ser reconocidos en el catálogo de subagentes.

## Decisions

- **Formato V2 para permisos de agentes**: Los agentes SDD deben tener sus permisos en formato V2 de OpenCode (array de objetos con action, resource, effect) para ser reconocidos en el catálogo de subagentes.
- **Preservación de lógica de permisos**: La conversión al formato V2 no debe alterar la lógica de permisos existente.

## Verification

2 requisitos condensados desde
`openspec/specs/agent-permissions-format/spec.md` (76 líneas en el original).
