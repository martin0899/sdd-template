# Design: agent-permissions-v2

## Context

Define la sintaxis operativa de permisos V2 para los agentes SDD y los subagentes de apoyo, reemplazando la sintaxis inerte V1 (`permission:` singular) y añadiendo control explícito de invocación entre agentes.

## Decisions

- **Sintaxis V2 de permisos en todos los agentes**: Los 5 agentes SDD (`coordinador`, `gertrudis`, `implementador`, `investigador`, `planificador`) DEBEN declarar permisos usando la clave V2 `permissions:` (plural) en el frontmatter.
- **Permisos de edición conservados tras migración**: Cada agente DEBE conservar en `permissions:` V2 las mismas reglas de edición que declaraba en `permission:` V1.
- **Permiso `subagent` explícito en el coordinador**: El coordinador DEBE declarar `permissions.subagent` con una lista cerrada de subagentes permitidos: `implementador`, `investigador`, `gertrudis`, `planificador`.
- **Subagente `tareas-baja` con modelo local/free**: DEBE existir un subagente `tareas-baja.md` en `~/.config/opencode/agents/` con `model: ollama/qwen3.5:4b` (o fallback `opencode/mimo-v2.6-flash-free`).
- **Backup previo a la migración**: Antes de modificar cualquier archivo de agente o agent-docs, el implementador DEBE crear un backup fechado en `/tmp/opencode/agents-backup-YYYYMMDD-HHMMSS/` con copia de `_common.md` y los 5 archivos de agentes.

## Verification

5 requisitos condensados desde
`openspec/specs/agent-permissions-v2/spec.md` (62 líneas en el original).
