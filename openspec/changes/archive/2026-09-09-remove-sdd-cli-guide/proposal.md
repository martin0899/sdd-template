# Proposal: remove-sdd-cli-guide

## Why

`sdd-cli-guide.md` (399 líneas, ~25 KB) viaja en el payload a cada proyecto destino, pero su contenido es redundante con fuentes que sí se mantienen actualizadas: los comandos del CLI están en `openspec --help` / `openspec <comando> --help` (siempre vigentes), el workflow lo ejecutan las skills y comandos `opsx-*`, y la instalación ya está documentada en `README.md` y `docs/manuals/manual-installation.md`. Además la guía ya se desactualizó durante la implementación: documenta `openspec validate --change "<name>"`, que no existe (la forma vigente es `openspec validate <name> --type change` / `--changes`), evidencia de que la documentación estática duplicada deriva del CLI real. El usuario decide eliminarla.

## What Changes

- **Eliminar `sdd-cli-guide.md`** del repo plantilla.
- **Quitar del payload** en el manifiesto de `install.sh` (ya no viaja a destinos).
- **Actualizar `README.md`**: quitar el archivo del árbol "Qué contiene" y de la lista "Qué viaja".
- **Actualizar `docs/manuals/manual-installation.md`**: quitar la fila del payload copiable y el ítem de la lista de paridad.
- **Sin reemplazo nuevo**: el punto de entrada único pasa a ser `README.md` (+ ayuda del CLI y skills, ya existentes). Ver design.md para el análisis de qué cubría la guía y por qué no se sustituye con un documento nuevo.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `sdd-template-install`: el Requirement "Manifiesto de payload" cambia — `sdd-cli-guide.md` deja de viajar en el payload; el destino ya no debe contenerlo.

## Impact

- **Repo plantilla**: se elimina un archivo raíz; se editan `install.sh`, `README.md`, `docs/manuals/manual-installation.md`.
- **Proyectos destino**: reciben ~25 KB menos; ninguno lo recibió aún en producción (la plantilla no se ha publicado/clonado todavía), por lo que no hay migración retroactiva.
- **Orden de archivado**: este change debe archivarse DESPUÉS de `add-sdd-template-installer` (que introduce el requirement que aquí se modifica); los artefactos de planificación históricos de ese change NO se editan (son registro).
- **Dependencias**: ninguna nueva.
