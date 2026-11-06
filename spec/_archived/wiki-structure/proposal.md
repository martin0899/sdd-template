# Propuesta: wiki-structure

## Why

Define la convención de estructura de `05_wiki/<Proyecto>/`: los cuatro documentos agregados planos (`arquitectura.md`, `decisiones.md`, `operacion.md`, `historial.md`) como único esquema de contenido generado por `seed` y `distill`, y el formato del índice `_INDEX.json` que lo refleja.

## What Changes

- Estructura de 4 agregados al sembrar
- _INDEX.json con contenido de 4 agregados
- createWikiDir alineado
- Escritura atómica de _INDEX.json

## Impact

Snapshot histórico de la capability `wiki-structure`, consolidado desde
`openspec/specs/wiki-structure/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
