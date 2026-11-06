# Design: mode-selection

## Context

Seleccionar la filosofía de trabajo (SDD formal u ODD orgánica) por proyecto mediante un campo persistente y una cascada determinista de precedencia, sin romper los proyectos ya instalados.

## Decisions

- **Campo `philosophy` en manifiesto y configuración global**: El sistema SHALL admitir un campo `philosophy` con valor `"sdd"` en `.sdd-manifest.json` (por proyecto) y en la configuración global, y SHALL exponerlo en `spectralis config --list`.
- **Cascada determinista del modo efectivo**: El sistema SHALL resolver el modo efectivo con la precedencia `philosophy` del manifiesto > `philosophy` de la configuración global > default `sdd`.
- **Retrocompatibilidad del default `sdd`**: El sistema SHALL tratar la ausencia de `philosophy` como `sdd`, de modo que los proyectos instalados antes de este cambio conserven su comportamiento sin migración manual.
- **Preservación de `philosophy` en `update`**: El sistema SHALL preservar el valor existente de `philosophy` del manifiesto al re-ejecutar `spectralis update`, del mismo modo que preserva `projectVersion`.
- **Comando `spectralis config` acepta `philosophy`**: El sistema SHALL permitir `spectralis config --set philosophy=sdd` (con `--global` para toda la máquina) y `spectralis config --get philosophy`, validando el valor contra `sdd`.

## Verification

5 requisitos condensados desde
`openspec/specs/mode-selection/spec.md` (99 líneas en el original).
