# Design: agent-communication-protocol

## Context

Establece un protocolo de comunicación interna en inglés entre coordinador y subagentes con output telegráfico estructurado (JSON/template fija), eliminando rehash del contexto recibido y limitando reportes de fallos a 2-3 líneas.

## Decisions

- **Idioma interno en inglés**: Coordinador ↔ subagentes DEBEN comunicarse en inglés para todos los mensajes internos, incluyendo solicitudes, respuestas, reportes de progreso y errores.
- **Output telegráfico estructurado**: Todo subagente DEBE retornar output en formato JSON estructurado o template fija, omitiendo proceso de razonamiento y contexto rehash.
- **No rehash del contexto recibido**: Subagentes NO DEBEN repetir o parafrasear el brief/contexto recibido del coordinador en su respuesta.
- **Reporte de fallos compacto**: Reportes de fallos DEBEN limitarse a 2-3 líneas máximo, indicando: qué falló, qué intentó, qué necesita.
- **Coordinador traduce al usuario**: Coordinador DEBE traducir resultados de subagentes al lenguaje natural del usuario final (español o inglés según preferencia del usuario).
- **Actualización de configuración de agentes**: Todos los archivos de configuración de agentes (`coordinador.md`, `planificador.md`, `implementador.md`, `investigador.md`, `gertrudis.md`) y documento compartido (`_common.md`) DEBEN incorporar el protocolo de…

## Verification

6 requisitos condensados desde
`openspec/specs/agent-communication-protocol/spec.md` (130 líneas en el original).
