# Delta spec: sdd-installer-gitignore-sync

## Purpose

Mantener el bloque gestionado de `.gitignore` del destino sincronizado con la lista vigente de entradas del instalador, de modo que los artefactos locales de agente (incluida `.claude/`) queden descartados del versionado también en proyectos ya instalados.

## ADDED Requirements

### Requirement: Entrada .claude en la lista gestionada
La lista de entradas gestionadas del instalador SHALL incluir `.claude/` junto a las entradas existentes (`graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json`).

#### Scenario: Instalación nueva
- **WHEN** el instalador escribe el bloque gestionado en un `.gitignore` nuevo o sin bloque
- **THEN** el bloque incluye todas las entradas vigentes, incluida `.claude/` (salvo las ya cubiertas por otras secciones del archivo)

### Requirement: Refresco del bloque gestionado existente
Durante instalación o actualización, si el `.gitignore` del destino ya contiene el bloque gestionado y a las entradas del bloque les falta alguna entrada vigente (que no esté ya cubierta por otras secciones del archivo), el instalador SHALL reescribir el bloque in situ con la lista completa, conservando el resto del archivo. El refresco SHALL crear backup del `.gitignore` original y SHALL requerir confirmación. Si el bloque ya contiene todas las entradas aplicables, SHALL reportar sincronía sin escribir.

#### Scenario: Bloque viejo sin .claude se refresca
- **WHEN** un proyecto instalado con la lista anterior ejecuta `--update` y confirma el refresco
- **THEN** el bloque pasa a incluir `.claude/`, el resto del `.gitignore` permanece intacto y existe backup del original

#### Scenario: Bloque ya completo
- **WHEN** el bloque del destino ya contiene todas las entradas aplicables
- **THEN** no se modifica ningún archivo y se reporta sincronía

### Requirement: Plan de actualización refleja el refresco gitignore
El plan en modo dry-run de `--update` SHALL describir que el bloque gestionado de `.gitignore` se refrescará si le faltan entradas vigentes.

#### Scenario: Dry-run muestra el comportamiento
- **WHEN** el usuario ejecuta `--update --dry-run` sobre un destino con bloque incompleto
- **THEN** el plan menciona el refresco del bloque gestionado de `.gitignore` y ningún archivo es modificado
