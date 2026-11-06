# Design: skill-index

## Context

Proporcionar un índice de enrutado de skills del proyecto que permita al orquestador decidir qué skill invocar consultando una representación ligera del catálogo de skills, sin cargar el contenido completo de los SKILL.md.

## Decisions

- **Índice de skills del proyecto**: El proyecto SHALL mantener un índice de skills consultable por el orquestador, con `.agents/skills/INDEX.md` como fuente manual.
- **Dual format support**: El spec SHALL soportar tanto el formato markdown manual como el formato JSON automático.
- **Multi-agent support**: El spec SHALL documentar soporte para múltiples agentes, cada uno con su directorio de skills.
- **Detección automática de skills**: El sistema SHALL detectar automáticamente las skills disponibles escaneando los directorios de skills de cada agente soportado y extrayendo su metadata (nombre, descripción, trigger, ruta y agente) desde cada `SKILL.md`.
- **JSON schema definition**: El spec SHALL definir el esquema JSON del índice generado.
- **Priority rules**: El spec SHALL definir reglas de prioridad entre fuentes.
- **System-reminder integration**: El spec SHALL documentar la integración con system-reminder.
- **Regla de consulta obligatoria del índice**: `AGENTS.md` SHALL incluir una regla que ordene consultar el índice antes de invocar cualquier skill del proyecto y cargar únicamente el `SKILL.md` de la skill elegida.
- **Backward compatibility con el índice manual**: El spec SHALL mantener backward compatibility: el índice manual `.agents/skills/INDEX.md` SHALL seguir siendo una fuente válida y consultable incluso cuando existe el índice JSON automático.

## Verification

9 requisitos condensados desde
`openspec/specs/skill-index/spec.md` (111 líneas en el original).
