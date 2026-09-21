# Proposal: update-installer-managed-agents-block

## Why

El instalador SDD (`install.sh`) no refresca el bloque gestionado de `AGENTS.md` en instalaciones existentes: cuando detecta los marcadores BEGIN/END, sale sin actualizar el contenido. El bloque de la plantilla ahora incluye la sección `## Skills Index` (regla de enrutado de skills), por lo que los proyectos ya instalados que ejecuten `--update` recibirían skills e índice nuevos pero **no la regla que los activa**. Además, la ronda final de verificación no cubre los archivos nuevos del sistema de enrutado.

## What Changes

- `manage_agents_md()`: cuando el destino ya tiene el bloque entre marcadores y su contenido difiere del bloque actual de la plantilla, reemplazar el bloque in situ (conservando el contenido propio del destino fuera de los marcadores), con backup previo y confirmación — consistente con la política anti-corrupción del instalador. Si el destino solo tiene la sentinel (reglas sin marcadores), mantener el skip pero advertir que el bloque no puede refrescarse automáticamente.
- `update_dry_run_plan()`: reflejar el nuevo comportamiento del bloque en el plan de actualización.
- `post_checks()`: añadir verificación de `.agents/skills/INDEX.md` y `.agents/skills/spec-from-note/SKILL.md` en el destino; añadir al resumen de pasos manuales el recordatorio de registrar la ruta de la plantilla de notas en `docs/requirements/REGISTRY.md` al primer uso de la skill spec-from-note.

## Capabilities

### New Capabilities

- `sdd-installer-agents-sync`: Sincronización del bloque gestionado de reglas SDD en `AGENTS.md` durante instalación y actualización, y verificación de los archivos del sistema de enrutado de skills en la ronda final.

### Modified Capabilities

- (ninguna — los specs existentes `sdd-template-install` no describían el comportamiento de refresco del bloque; se cubre como capability nueva para no alterar el contrato vigente)

## Impact

- **Archivo editado**: `install.sh` (funciones `manage_agents_md`, `update_dry_run_plan`, `post_checks`)
- Sin cambios en el payload, el manifiesto ni la política de backups. Comportamiento nuevo solo en modo update cuando el bloque difiere; instalaciones nuevas no cambian (el bloque se escribe completo igual que hoy).
