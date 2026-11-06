# Design: sdd-installer-agents-sync

## Context

Garantizar que las reglas SDD gestionadas en `AGENTS.md` del destino se sincronicen con la plantilla durante la actualización (incluida la regla de enrutado de skills), y que la verificación final cubra los archivos del sistema de enrutado.

## Decisions

- **Refresco del bloque gestionado de AGENTS.md en actualización**: Durante `--update`, el instalador SHALL SIEMPRE ejecutar `manageAgentsMd` para gestionar el bloque de `AGENTS.md`, independientemente de si `hasChanges` retorna verdadero o falso (todos los archivos clasificados estén…
- **Verificación final del sistema de enrutado de skills**: La ronda final de verificación (`post_checks`) SHALL comprobar la existencia de `.agents/skills/INDEX.md` y `.agents/skills/spec-from-note/SKILL.md` en el destino, y SHALL incluir en los pasos manuales pendientes el…
- **Plan de actualización refleja el refresco**: El plan en modo dry-run de `--update` SHALL describir que el bloque gestionado de `AGENTS.md` se refrescará si difiere de la plantilla, con backup y confirmación.

## Verification

3 requisitos condensados desde
`openspec/specs/sdd-installer-agents-sync/spec.md` (88 líneas en el original).
