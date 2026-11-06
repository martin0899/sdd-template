# Design: investigator-graphify-audit

## Context

Garantiza la trazabilidad del uso de graphify por el investigador mediante la cita literal de los comandos ejecutados y sus respuestas en el Estado, e instruye al coordinador a copiar el hallazgo completo del investigador a la nota del change para auditoría posterior.

## Decisions

- **Cita literal del comando graphify en Estado del investigador**: El agente investigador (`~/.config/opencode/agents/investigador.md`) DEBE incluir en su `Estado` final una cita literal de cada comando graphify ejecutado durante la investigación, con el formato `graphify <subcomando>…
- **Coordinador copia hallazgo del investigador a la nota**: El documento compartido de reglas (`~/.config/opencode/agent-docs/_common.md`) DEBE instruir al coordinador a copiar el hallazgo completo del investigador (incluyendo las citas literales de graphify) a la nota del…
- **Hallazgo del investigador persistente en nota**: La nota del change creada por el coordinador DEBE contener las secciones Contexto, Decisión, Impacto, y Verificación, e incluir el hallazgo completo del investigador como evidencia de la Decisión.

## Verification

3 requisitos condensados desde
`openspec/specs/investigator-graphify-audit/spec.md` (43 líneas en el original).
