# Tasks: remove-sdd-cli-guide

## 1. Referencias activas

- [x] 1.1 Quitar `sdd-cli-guide.md` de `PAYLOAD_FILES` en `install.sh` (manifiesto); verificar con `bash -n install.sh` y que el resto del manifiesto queda intacto
- [x] 1.2 Actualizar `README.md`: quitar el archivo del árbol "Qué contiene" y de la lista "Qué viaja"; verificar que no queda ninguna mención con `grep -n sdd-cli-guide README.md` (sin resultados)
- [x] 1.3 Actualizar `docs/manuals/manual-installation.md`: quitar la fila `sdd-cli-guide.md` de la tabla de copia manual y el ítem correspondiente de la lista de paridad; verificar con `grep -n sdd-cli-guide docs/manuals/manual-installation.md` (sin resultados)

## 2. Eliminación del archivo

- [x] 2.1 Eliminar `sdd-cli-guide.md` del repo; verificar con `ls sdd-cli-guide.md` (no existe) y `git status` mostrando el borrado trazable

## 3. Verificación

- [x] 3.1 Grep de referencias activas en todo el repo (excluyendo `openspec/changes/` histórico y `node_modules`): debe devolver solo los hits del histórico de `add-sdd-template-installer`; verificar con el comando de grep y revisando la lista
- [x] 3.2 `--dry-run` del instalador sobre un dummy temporal: el plan NO lista `sdd-cli-guide.md`; verificar ejecutando `./install.sh /tmp/opencode/dummy-noguide --dry-run` y confirmando la ausencia en la salida
- [x] 3.3 Validar el change: `openspec validate remove-sdd-cli-guide --type change --strict` sin errores
