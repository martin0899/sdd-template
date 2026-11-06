# Propuesta: skill-index

## Why

Proporcionar un índice de enrutado de skills del proyecto que permita al orquestador decidir qué skill invocar consultando una representación ligera del catálogo de skills, sin cargar el contenido completo de los SKILL.md. El índice soporta detección automática vía `spectralis skills`, múltiples agentes (`.agents/skills/`, `.claude/skills/`, `.cursor/skills/`), formato JSON y markdown, e integración con el system-reminder del agente, manteniendo backward compatibility con el índice manual existente.

## What Changes

- Índice de skills del proyecto
- Dual format support
- Multi-agent support
- Detección automática de skills
- JSON schema definition
- Priority rules
- System-reminder integration
- Regla de consulta obligatoria del índice
- Backward compatibility con el índice manual

## Impact

Snapshot histórico de la capability `skill-index`, consolidado desde
`openspec/specs/skill-index/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
