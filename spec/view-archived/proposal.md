# Propuesta: view-archived

## Why

Los changes archivados en `spec/_archived/` son invisibles para el CLI: `view`
los excluye (view.ts:23) y `spec status` también. Tras consolidar 36
capabilities legacy en `_archivado`, el usuario no puede consultarlas con el
arnés; solo con `ls`/grep o el REGISTRY. `view` ya es el visor read-only del
ciclo; el archive es parte natural de su dominio, solo que hoy es un cementerio
de escritura.

## What Changes

- `spectralis view --archived`: lista `spec/_archived/*` leyendo el
  `change.json` de cada carpeta (id, fecha, estado, disponibilidad de tareas)
  y el progreso derivado de los checkboxes de `tasks.md`.
- `spectralis view <id> --archived`: detalle de un change archivado
  (tareas del `tasks.md`; estado `sin registro` porque el archive borra la
  entrada de `progress.json`).
- El comportamiento por defecto de `view` no cambia: sin flag solo lista
  activos y sigue excluyendo `_archived/` (test existente línea 138 intacto).
- Read-only se mantiene: nada escribe `progress.json`, `tasks.md` ni REGISTRY.

## Impact

### Superficies afectadas

- `src/commands/view.ts`: `ViewOptions.archived`, `listArchivedChanges`,
  `renderArchivedList`, parametrización del base dir de `renderDetail`.
- `src/bin/spectralis.ts`: option `--archived` en `view`.
- `test/commands/view.test.ts`: 5 tests nuevos (TDD).
- `README.md` + `docs/spec-native.md` + help del bin.

### Fuera de alcance

- Cambiar el default de `view`; tocar `spec status`/`projects`/`seed`;
- escribir cualquier state; exponer `resumen.abstracto` completo.