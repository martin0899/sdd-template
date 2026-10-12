---
name: graphify-usage
description: Guía de uso de graphify: cuándo usar graphify query, path y explain para investigar código.
---

# Uso de graphify

Este proyecto tiene un grafo de conocimiento en `graphify-out/` con god nodes, comunidades y relaciones entre archivos.

Cuando el usuario escribe `/graphify`, usa primero la skill de graphify.

## Cuándo usar graphify

- **Para cualquier investigación, entendimiento o búsqueda de código, usa graphify primero** cuando exista `graphify-out/graph.json`.
- Si el usuario dice explícitamente "no uses graphify" o similar, omítelo.

## Comandos

- `graphify query "<pregunta>"` — para preguntas sobre el código o la arquitectura.
- `graphify path "<A>" "<B>"` — para relaciones entre dos conceptos o archivos.
- `graphify explain "<concepto>"` — para un concepto concreto.

## Cómo interpretar resultados

- Si existe `graphify-out/wiki/index.md`, úsalo para navegación amplia en lugar de leer el código fuente en bruto.
- Lee `graphify-out/GRAPH_REPORT.md` solo para revisión de arquitectura amplia o cuando query/path/explain no den suficiente contexto.
- Archivos sucios en `graphify-out/` tras hooks o actualizaciones incrementales son esperados: no son razón para saltar graphify. Solo sáltalo si la tarea trata de salida del grafo obsoleta o incorrecta.

## Mantenimiento

- Tras modificar código, ejecuta `graphify update .` para mantener el grafo al día (solo AST, sin coste de API).

## Cuándo NO usar graphify

- Tareas de escritura o de proceso (redactar, planificar, documentar): graphify es para **investigación**, no para producción de contenido.

## Git

- `graphify-out/` es machine-local: **NUNCA** lo comitees (el bloque gitignore gestionado lo excluye). Recupera el grafo con `graphify update .` al clonar el proyecto o cambiar de máquina; es regenerable sin coste de API.
