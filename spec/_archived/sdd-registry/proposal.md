# Propuesta: sdd-registry

## Why

Registro machine-local (`.sdd-registry/`) de requerimientos y briefings de un proyecto: no se versiona ni se distribuye con el instalador, y el brain (`01_Proyectos/<proyecto>/<change>/`) actúa como respaldo portable.

## What Changes

- Registro de requerimientos machine-local

## Impact

Snapshot histórico de la capability `sdd-registry`, consolidado desde
`openspec/specs/sdd-registry/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
