# Propuesta: mode-selection

## Why

Seleccionar la filosofía de trabajo (SDD formal u ODD orgánica) por proyecto mediante un campo persistente y una cascada determinista de precedencia, sin romper los proyectos ya instalados.

## What Changes

- Campo `philosophy` en manifiesto y configuración global
- Cascada determinista del modo efectivo
- Retrocompatibilidad del default `sdd`
- Preservación de `philosophy` en `update`
- Comando `spectralis config` acepta `philosophy`

## Impact

Snapshot histórico de la capability `mode-selection`, consolidado desde
`openspec/specs/mode-selection/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
