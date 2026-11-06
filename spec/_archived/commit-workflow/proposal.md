# Propuesta: commit-workflow

## Why

Define el comportamiento del flujo de commit y Pull Request ejecutado por agentes de IA en proyectos con esta plantilla: idioma de los mensajes, revisión obligatoria de archivos antes de commitear y confirmación explícita del usuario antes de cualquier operación git que modifique el historial.

## What Changes

- Mensajes de commit en español
- Revisión obligatoria antes de commit
- Entrega de la propuesta para commit manual
- Pull Requests en español
- Conservación del commit scopeado por argumentos
- Creación de rama condicionada a la rama base

## Impact

Snapshot histórico de la capability `commit-workflow`, consolidado desde
`openspec/specs/commit-workflow/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
