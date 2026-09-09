# Proposal: inject-agents-md-rules

## Why

Las reglas de agentes de la plantilla (el puntero a `docs/base-standards.md` como núcleo de reglas y las reglas graphify-first para cualquier investigación de código) hoy viven solo en el `AGENTS.md` del repo plantilla y NO viajan a los proyectos instalados: ni el manifiesto de payload las incluye ni el instalador las gestiona. El usuario quiere que todo proyecto donde se instale la plantilla termine con esas reglas en su `AGENTS.md`, respetando el archivo si el proyecto ya tiene uno.

## What Changes

- **Neutralizar el `AGENTS.md` de la plantilla**: el título actual dice "Coding Guidelines for Chapur Pay" (branding heredado del proyecto origen). Pasa a título genérico; el contenido (reglas) se mantiene.
- **Nuevo paso en `install.sh`**: gestión de `AGENTS.md` en el destino —
  - Si el destino **no tiene** `AGENTS.md` → se crea a partir del de la plantilla (contenido completo).
  - Si el destino **ya tiene** `AGENTS.md` → se añaden por APPEND las secciones de reglas (sin el título H1), con marcador de origen, y solo si las reglas no están ya presentes (idempotente, sin duplicar).
- **Actualizar `README.md`**: describir el comportamiento de AGENTS.md en la sección del instalador.
- **Actualizar `docs/manuals/manual-installation.md`**: paso manual equivalente (crear o añadir el bloque) + ítem en la lista de paridad.
- Respetado en `--dry-run` (muestra el plan de AGENTS.md) y en la política anti-corrupción (append/solo-crear, jamás sobrescribir reglas propias del destino).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `sdd-template-install`: se añade comportamiento al instalador → nuevo Requirement "Inyección de reglas de agentes en AGENTS.md" (creación si falta, APPEND marcado e idempotente si existe).

## Impact

- **Repo plantilla**: `AGENTS.md` retitulado (contenido intacto); `install.sh` con paso nuevo; `README.md` y `docs/manuals/manual-installation.md` actualizados.
- **Proyectos destino**: terminan con las reglas de agentes presentes (propias preservadas + bloque SDD añadido, o archivo nuevo con las reglas).
- **Dependencias**: ninguna nueva (las reglas referencian `docs/base-standards.md`, que ya viaja en `docs/`, y graphify, que ya es prerrequisito del instalador).
- **Orden de archivado**: archivar después de `add-sdd-template-installer` y `remove-sdd-cli-guide` (extiende la capacidad que ellos introducen).
