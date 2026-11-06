# Design: view-archived

## Context

`view` lista y detalla changes activos usando `resolveChangesDir` y filtrando
`archive`/`_archived`. El archive nativo mueve `spec/<id>` →
`spec/_archived/<id>`, escribe `change.json` (estado cerrado: done) y borra la
entrada de `progress.json`, así que el detalle archivado deriva su progreso
únicamente del `tasks.md`.

## Goals / Non-Goals

- Goal: consulta read-only del historial archivado sin nueva carpeta ni
  metadata nueva.
- Non-Goal: uncommentar/editar archivados desde el CLI; índice masivo.

## Decisions

1. **El flag es ortogonal al `<id>`**: `--archived` sin id lista; con id
   renderiza el detalle desde `spec/_archived/<id>`. Reutiliza `renderDetail`
   cambiando el directorio base (hoy hardcoded a `changesDir` en la línea 82).
2. **Datos desde `change.json`** (readChangeJson de core/change-json): fallback
   cuando falta → id de carpeta, '—', estado `done`. Nunca lanza: el archive
   legacy antiguo puede no traerlo.
3. **Columnas del listado**: `Change | Fecha | Tareas | Estado | Nombre`
   (nombre truncado a ~50 de largura). El resumen completo no se muestra.
4. **`_archived/` ausente**: mensaje informativo "no hay changes archived",
   exit 0 (instalaciones recién creadas lo tienen vacío).
5. **Cero escrituras**: readProgress solo lecturas; no se crea progress.json
   para archivados (regresión cubierta por el patrón del test "never writes").

## Verification / Tests (TDD)

- 1.1 listado: fixture con `_archived/commit-workflow/` muestra id, fecha y
  `1/1`; no aparece el change activo.
- 1.2 fallback sin change.json → fila con `—`.
- 1.3 detalle con flag → tareas `[x]` del tasks.md del archive.
- 1.4 sin `_archived` → mensaje y exit 0, sin escribir nada.
- 1.5 inmutabilidad: `readdirSync(root)` igual al final (patrón del test
  "view never writes anything").
- 1.6 regresión: el test existente que excluye `_archived` del listado
  default sigue pasando sin tocarlo.