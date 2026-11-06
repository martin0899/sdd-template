# Design: sdd-installer-gitignore-sync

## Context

Mantener el bloque gestionado de `.gitignore` del destino sincronizado con la lista vigente de entradas del instalador, de modo que los artefactos locales de agente (incluida `.claude/`) queden descartados del versionado también en proyectos ya instalados.

## Decisions

- **Entrada .claude en la lista gestionada**: La lista de entradas gestionadas del instalador SHALL incluir `openspec/`, `.claude/`, `05_wiki/` y `.sdd-registry/` junto a las entradas existentes (`graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`,…
- **Refresco del bloque gestionado existente**: Durante instalación o actualización, si el `.gitignore` del destino ya contiene el bloque gestionado y a las entradas del bloque les falta alguna entrada vigente (que no esté ya cubierta por otras secciones del…
- **Plan de actualización refleja el refresco gitignore**: El plan en modo dry-run de `--update` SHALL describir que el bloque gestionado de `.gitignore` se refrescará si le faltan entradas vigentes.

## Verification

3 requisitos condensados desde
`openspec/specs/sdd-installer-gitignore-sync/spec.md` (46 líneas en el original).
