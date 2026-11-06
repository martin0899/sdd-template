# Design: vault-ids-exclusion-filter

## Context

`vault-ids.ts` escanea el vault buscando IDs en frontmatter.

## Decisions

- **Exclusión de directorios no-nota**: El walker de `walkMarkdown` SHALL omitir los directorios `09_Plantilla` y `graphify-out` además de los ya excluidos (`docs`, `05_wiki`, `.git`, `node_modules`, `.obsidian`).
- **Exclusión de archivos de sistema en raíz**: Los checks `checkIdPresent` y `checkIdFormat` SHALL omitir los archivos de nombre exacto `README.md` y `AGENTS.md` ubicados en la raíz del vault.
- **Compatibilidad hacia atrás**: El comportamiento de validación de notas reales (prefijos, formatos, unicidad, coherencia de Tipo) SHALL permanecer sin cambios.
- **Tests de exclusión**: SHALL existir cobertura que verifique la exclusión de directorios y archivos de sistema sin afectar la validación de notas reales.

## Verification

4 requisitos condensados desde
`openspec/specs/vault-ids-exclusion-filter/spec.md` (63 líneas en el original).
