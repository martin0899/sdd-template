# Tasks: add-gitignore-managed-refresh

## 1. Lista y refresco

- [x] 1.1 Añadir `.claude/` a `GITIGNORE_ENTRIES` en `install.sh`. Verificar leyendo el archivo.
- [x] 1.2 Modificar `manage_gitignore()`: cuando el bloque gestionado existe, extraer las entradas del bloque, calcular las entradas vigentes aplicables (excluyendo las ya cubiertas por otras secciones del `.gitignore` fuera del bloque) y si faltan, reescribir el bloque in situ con backup + confirmación preservando el resto del archivo; si está completo, reportar sincronía sin escribir. Verificar con un `.gitignore` temporal con bloque viejo de 4 entradas: el bloque pasa a 5-6 entradas según cobertura, el resto intacto y con backup.
- [x] 1.3 Verificar el caso de bloque ya completo (idempotencia, sin escritura) y el caso de entradas cubiertas por secciones propias (no se duplican en el bloque). Verificar con destinos temporales.

## 2. Plan y validación

- [x] 2.1 Actualizar el mensaje de `update_dry_run_plan()` para describir el refresco del bloque gitignore. Verificar con dry-run sobre destino temporal con bloque incompleto: el plan lo menciona y ningún archivo cambia.
- [x] 2.2 Ejecutar `--update --yes` real contra `Personal_Dotfiles` y verificar: `.claude/` dentro del bloque, resto del `.gitignore` intacto, backup creado, `git status` ya no lista `.claude/` como untracked, y segunda pasada idempotente. Ejecutar `bash -n install.sh`.
- [x] 2.3 Ejecutar `openspec validate add-gitignore-managed-refresh` y verificar que pasa sin errores.
