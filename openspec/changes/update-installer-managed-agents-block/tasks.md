# Tasks: update-installer-managed-agents-block

## 1. Refresco del bloque gestionado (manage_agents_md)

- [x] 1.1 Modificar `manage_agents_md()` en `install.sh`: cuando existan marcadores BEGIN y END (exactamente una vez cada uno), extraer contenido del destino fuera del bloque, comparar el bloque con el de la plantilla (`\nBEGIN\n` + `tail -n +2 AGENTS.md` + `\nEND\n`), y si difiere: backup con `backup_file`, confirmación, y reemplazo in situ conservando el contenido propio. Si coincide: reportar sincronía sin escribir. Verificar con un destino temporal que el contenido propio sobrevive y el bloque queda idéntico a la plantilla.
- [x] 1.2 Implementar el caso sentinel sin marcadores: si el contenido del destino es idéntico byte a byte a la plantilla, reescribirlo envuelto en marcadores con backup previo y sin preguntar; si difiere, skip con advertencia explícita de revisión manual (sin modificar el archivo). Verificar con dos destinos temporales: uno con contenido exacto de plantilla y otro con sentinel más contenido propio.
- [x] 1.3 Cubrir el caso de marcadores malformados (duplicados o ausentes de uno): advertir y saltar sin escribir. Verificar con un destino temporal con marcador duplicado.
- [x] 1.4 Envolver el bloque en marcadores al crear `AGENTS.md` nuevo en instalación fresca (la plantilla completa, título incluido, entre BEGIN/END). Verificar con una instalación fresca temporal que el archivo nace gestionado y que un `--update` posterior lo reconoce como bloque gestionado.

## 2. Verificación final y plan

- [x] 2.1 Añadir en `post_checks()` las comprobaciones de `.agents/skills/INDEX.md` y `.agents/skills/spec-from-note/SKILL.md` (advertencia nombrando el archivo faltante) y el recordatorio en pasos manuales de registrar la ruta de la plantilla de notas en `docs/requirements/REGISTRY.md`. Verificar leyendo el archivo.
- [x] 2.2 Actualizar el mensaje de `update_dry_run_plan()` para describir el refresco del bloque gestionado con backup y confirmación. Verificar ejecutando dry-run contra un destino temporal con bloque desactualizado y confirmando que el plan lo menciona y que ningún archivo cambia.

## 3. Validación end-to-end

- [x] 3.1 Ejecutar sobre un destino temporal completo: instalación nueva, luego modificación simulada del bloque (quitar la sección Skills Index del bloque marcado), luego `--update` confirmando el refresh; verificar que el bloque queda sincronizado, el contenido propio intacto y `post_checks` sin advertencias nuevas. Ejecutar `bash -n install.sh` para validar sintaxis.
- [x] 3.2 Ejecutar `openspec validate update-installer-managed-agents-block` y verificar que pasa sin errores.
