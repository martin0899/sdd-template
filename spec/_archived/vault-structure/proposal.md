# Propuesta: vault-structure

## Why

Define la convención de organización de `01_Proyectos/<Proyecto>/` en el vault: carpetas `<spec-id>/` de cambio más entradas de organización `_`-prefijadas (`_Notas/`, `_INDEX.md`, `_README.md`), que quedan excluidas de la destilación a `05_wiki/`.

## What Changes

- Entradas de organización en 01_Proyectos
- Destilación excluye entradas de organización
- Notas de proyecto como excepción de captura
- Folder note como artefacto único de spec
- Headings canónicos del folder note
- Coexistencia con el layout legacy de tres archivos

## Impact

Snapshot histórico de la capability `vault-structure`, consolidado desde
`openspec/specs/vault-structure/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
