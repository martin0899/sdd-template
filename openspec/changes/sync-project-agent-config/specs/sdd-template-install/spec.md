# sdd-template-install — Delta Spec

## MODIFIED Requirements

### Requirement: Copia de payload con política anti-corrupción

El instalador DEBE (MUST) copiar el payload de la plantilla (`.agents/skills/`, `.opencode/`, `docs/`) al destino aplicando una política explícita para instalación inicial y actualización: ante archivo existente, DEBE (MUST) comparar el contenido, crear backup del original a `.sdd-backup-<fecha>/` antes de reemplazarlo y consultar al usuario; ante archivo nuevo, puede copiarlo después de presentar el plan y obtener confirmación. El instalador NUNCA debe sobrescribir sin backup previo, y DEBE (MUST) excluir secretos, configuración local y artefactos generados del payload ejecutable.

#### Scenario: Archivo nuevo en destino

- **WHEN** el archivo del payload no existe en el destino
- **THEN** el plan lo clasifica como nuevo y, tras la confirmación correspondiente, se copia al destino

#### Scenario: Archivo sin cambios

- **WHEN** el archivo del payload existe y su contenido coincide con la plantilla
- **THEN** el instalador lo clasifica como sin cambios y no crea un backup ni lo vuelve a copiar

#### Scenario: Archivo en conflicto

- **WHEN** el archivo del payload ya existe en el destino
- **THEN** el original se copia a `.sdd-backup-<fecha>/` preservando su ruta relativa
- **AND** se pregunta al usuario antes de reemplazar; el usuario puede mantener el original

#### Scenario: Instalación interrumpida

- **WHEN** la copia falla a mitad de proceso
- **THEN** los archivos ya respaldados permanecen en `.sdd-backup-<fecha>/` y el instalador reporta el estado parcial sin ocultar los errores

### Requirement: Reconocimiento previo sin escritura

El instalador DEBE (MUST) examinar el proyecto destino y presentar un mapa de instalación o actualización ANTES de escribir cualquier archivo, sin modificar nada durante el reconocimiento. El mapa DEBE (MUST) distinguir una instalación inicial de una actualización de una configuración SDD existente.

#### Scenario: Destino limpio

- **WHEN** el destino no contiene `openspec/`, `.agents/`, `.opencode/` ni `docs/`
- **THEN** el reconocimiento reporta destino limpio y propone instalación completa

#### Scenario: Destino con configuración SDD parcial

- **WHEN** el destino ya contiene uno o más elementos del payload, pero no una instalación completa
- **THEN** el reconocimiento lista cada elemento existente, detecta si coincide con la plantilla y clasifica la operación como actualización o conflicto potencial
- **AND** ningún archivo es modificado hasta que el usuario apruebe el plan
