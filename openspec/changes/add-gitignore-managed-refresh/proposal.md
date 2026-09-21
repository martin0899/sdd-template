# Proposal: add-gitignore-managed-refresh

## Why

El instalador SDD mantiene un bloque gestionado en el `.gitignore` del destino, pero dos defectos lo dejan incompleto: (1) la carpeta `.claude/` (skills de stack instaladas por `npx autoskills` para Claude Code) no está en la lista de entradas y queda como untracked flotante; (2) cuando el bloque ya existe, `manage_gitignore()` sale sin comparar entradas, por lo que las entradas nuevas nunca llegan a proyectos ya instalados — el mismo defecto de vejez que se corrigió para `AGENTS.md` en `update-installer-managed-agents-block`.

## What Changes

- Añadir `.claude/` a `GITIGNORE_ENTRIES` en `install.sh`.
- `manage_gitignore()`: si el bloque gestionado ya existe y a la lista de entradas del bloque le faltan entradas de la lista actual, reescribir el bloque in situ con la lista completa (backup + confirmación, preservando el resto del `.gitignore`). Si ya está completo, mantener el mensaje de sincronía.
- `update_dry_run_plan()`: reflejar el refresco del bloque gitignore en el plan.
- No se tocan entradas que el `.gitignore` del destino ya cubra fuera del bloque (comportamiento existente se conserva: se omiten del bloque como hoy).

## Capabilities

### New Capabilities

- `sdd-installer-gitignore-sync`: Sincronización del bloque gestionado de `.gitignore` del destino con la lista vigente de entradas del instalador, incluyendo `.claude/`.

### Modified Capabilities

- (ninguna)

## Impact

- **Archivo editado**: `install.sh` (`GITIGNORE_ENTRIES`, `manage_gitignore`, `update_dry_run_plan`)
- Sin cambios en payload ni manifiesto. Los proyectos ya instalados reciben las entradas faltantes en la próxima `--update`.
