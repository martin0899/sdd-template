# Delta spec: sdd-installer-agents-sync

## Purpose

Garantizar que las reglas SDD gestionadas en `AGENTS.md` del destino se sincronicen con la plantilla durante la actualización (incluida la regla de enrutado de skills), y que la verificación final cubra los archivos del sistema de enrutado.

## ADDED Requirements

### Requirement: Refresco del bloque gestionado de AGENTS.md en actualización
Durante `--update`, si el `AGENTS.md` del destino contiene el bloque entre marcadores BEGIN/END y su contenido difiere del bloque actual de la plantilla, el instalador SHALL reemplazar el bloque in situ, conservando íntegro el contenido del destino fuera de los marcadores. El reemplazo SHALL crear backup del `AGENTS.md` original en `.sdd-backup-<fecha>/` y SHALL requerir confirmación del usuario. Si el contenido coincide, SHALL reportar que ya está sincronizado sin escribir. Si el destino tiene la sentinel de reglas pero no los marcadores, SHALL mantener el skip y SHALL advertir que el bloque no puede refrescarse automáticamente.

#### Scenario: Bloque desactualizado se refresca
- **WHEN** el destino tiene marcadores BEGIN/END con un bloque que no incluye la sección Skills Index y el usuario confirma el reemplazo
- **THEN** el bloque entre marcadores queda idéntico al bloque de la plantilla, el contenido fuera de los marcadores permanece intacto y existe backup del `AGENTS.md` previo

#### Scenario: Contenido propio se preserva
- **WHEN** el `AGENTS.md` del destino tiene secciones propias antes o después del bloque gestionado
- **THEN** tras el refresco esas secciones propias permanecen sin alteración y en su posición original

#### Scenario: Bloque ya sincronizado
- **WHEN** el bloque del destino es idéntico al de la plantilla
- **THEN** no se modifica ningún archivo y se reporta la sincronía

#### Scenario: Reglas sin marcadores
- **WHEN** el `AGENTS.md` del destino contiene la sentinel de reglas pero no los marcadores BEGIN/END
- **THEN** si el contenido es idéntico byte a byte al de la plantilla, el instalador lo reescribe envuelto en marcadores (con backup previo, sin preguntar); si difiere, el instalador no modifica el archivo y emite advertencia de que el bloque requiere revisión manual

#### Scenario: Instalación nueva queda gestionada
- **WHEN** el instalador crea un `AGENTS.md` nuevo en el destino (instalación fresca)
- **THEN** el contenido de la plantilla queda envuelto entre los marcadores BEGIN/END, de modo que futuras actualizaciones puedan refrescarlo

### Requirement: Verificación final del sistema de enrutado de skills
La ronda final de verificación (`post_checks`) SHALL comprobar la existencia de `.agents/skills/INDEX.md` y `.agents/skills/spec-from-note/SKILL.md` en el destino, y SHALL incluir en los pasos manuales pendientes el recordatorio de registrar la ruta de la plantilla de notas en `docs/requirements/REGISTRY.md` al primer uso de la skill spec-from-note.

#### Scenario: Instalación completa pasa la verificación
- **WHEN** la instalación o actualización termina con el índice y la skill presentes en el destino
- **THEN** `post_checks` no emite advertencias por esos archivos y el resumen final menciona el registro de la ruta de plantilla

#### Scenario: Archivo del enrutado faltante
- **WHEN** el destino carece de `INDEX.md` o de la skill spec-from-note tras la operación
- **THEN** `post_checks` emite una advertencia nombrando el archivo faltante

### Requirement: Plan de actualización refleja el refresco
El plan en modo dry-run de `--update` SHALL describir que el bloque gestionado de `AGENTS.md` se refrescará si difiere de la plantilla, con backup y confirmación.

#### Scenario: Dry-run muestra el comportamiento
- **WHEN** el usuario ejecuta `--update --dry-run` sobre un destino con bloque desactualizado
- **THEN** el plan menciona el refresco del bloque gestionado de `AGENTS.md` y ningún archivo es modificado
