# Design: sdd-registry

## Context

Registro machine-local (`.sdd-registry/`) de requerimientos y briefings de un proyecto: no se versiona ni se distribuye con el instalador, y el brain (`01_Proyectos/<proyecto>/<change>/`) actúa como respaldo portable.

## Decisions

- **Registro de requerimientos machine-local**: El sistema SHALL almacenar el registro de requerimientos (`REGISTRY.md`) y los briefings técnicos en `.sdd-registry/` en la raíz del proyecto, en lugar de `docs/requirements/`.

## Verification

1 requisitos condensados desde
`openspec/specs/sdd-registry/spec.md` (31 líneas en el original).
