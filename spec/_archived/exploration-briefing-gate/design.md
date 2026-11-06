# Design: exploration-briefing-gate

## Context

Puerta de briefing obligatoria antes de convertir una exploración OpenSpec en un change: al cristalizar una exploración o pedir proceder, el agente devuelve un briefing proactivo (decisiones cerradas, hallazgos anclados al código, preguntas abiertas y alcance propuesto) y no crea artefactos hasta…

## Decisions

- **Proactive Briefing at Exploration Close**: When an OpenSpec exploration session crystallizes (decisions emerge, or the user signals intent to proceed toward a change), the agent SHALL produce a briefing in the chat proactively, without waiting for the user to…
- **Clarifying Questions Before Capture**: When ambiguity remains after exploration, the agent SHALL ask clarifying questions in the briefing before requesting confirmation to create artifacts.
- **Confirmation Gate Before Change Creation**: The agent SHALL NOT run `openspec new change` or write any OpenSpec change artifact until the user explicitly confirms the briefing.
- **Rule-Based Activation Without Invocation**: The briefing gate SHALL be enforced through a project agent rule (AGENTS.md) that applies automatically in every session, so that the gate does not depend on the user or agent explicitly invoking a skill.

## Verification

4 requisitos condensados desde
`openspec/specs/exploration-briefing-gate/spec.md` (68 líneas en el original).
