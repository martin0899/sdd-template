# Design: proposal-briefing

## Context

Garantizar que el coordinador genera el briefing técnico al **proponer** un cambio —tanto en SDD como en ODD— rellenando las secciones del folder note **antes** de crear los artefactos formales de la propuesta.

## Decisions

- **Briefing técnico en la propuesta, antes de los artefactos**: El sistema SHALL hacer que el coordinador rellene el briefing técnico del cambio al proponerlo, antes de que el planificador escriba `proposal`, specs, `design` y `tasks`.
- **Reuso de obsidian-briefing (idempotente)**: El briefing de la propuesta SHALL reutilizar la skill `obsidian-briefing` (mismo formato y secciones que en el apply) y SHALL ser idempotente: proponer rellena; aplicar refresca; nunca duplica un heading ni crea un…

## Verification

2 requisitos condensados desde
`openspec/specs/proposal-briefing/spec.md` (35 líneas en el original).
