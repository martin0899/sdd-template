# Propuesta: vault-ids-exclusion-filter

## Why

`vault-ids.ts` escanea el vault buscando IDs en frontmatter. Hoy excluye directorios de infraestructura (`docs`, `05_wiki`, `.git`, `node_modules`, `.obsidian`) y ficheros `_`-prefijados, pero no filtra plantillas (`09_Plantilla/`), artefactos generados locales (`graphify-out/`) ni archivos de sistema en raíz (`README.md`, `AGENTS.md`), produciendo falsos positivos. Este delta amplía el filtro de escaneo sin cambiar la validación de notas reales.

## What Changes

- Exclusión de directorios no-nota
- Exclusión de archivos de sistema en raíz
- Compatibilidad hacia atrás
- Tests de exclusión

## Impact

Snapshot histórico de la capability `vault-ids-exclusion-filter`, consolidado desde
`openspec/specs/vault-ids-exclusion-filter/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
