# sdd-template-install — Delta

## ADDED Requirements

### Requirement: Inyección de reglas de agentes en AGENTS.md

El instalador DEBE (MUST) dejar las reglas de agentes de la plantilla presentes en el `AGENTS.md` del destino, con estas políticas: si el destino no tiene `AGENTS.md`, DEBE crearlo con el contenido íntegro del de la plantilla; si el destino ya lo tiene, DEBE añadir por APPEND las secciones de reglas de la plantilla (sin el título H1) precedidas de un marcador de origen, y NUNCA debe sobrescribir, reordenar ni eliminar el contenido propio del destino. La operación DEBE ser idempotente: si el destino ya contiene las reglas, el instalador no duplica nada. El `AGENTS.md` de la plantilla DEBE (MUST) tener título genérico (sin branding del proyecto de origen), de modo que el mismo archivo sirva como contenido canónico para destinos.

#### Scenario: Destino sin AGENTS.md
- **WHEN** el proyecto destino no tiene archivo `AGENTS.md`
- **THEN** el instalador lo crea con el contenido completo del `AGENTS.md` de la plantilla (título genérico incluido)

#### Scenario: Destino con AGENTS.md propio
- **WHEN** el proyecto destino ya tiene `AGENTS.md` con sus propias reglas
- **THEN** el contenido propio queda intacto y las secciones de reglas de la plantilla (puntero a `docs/base-standards.md` y reglas graphify) se añaden al final bajo un marcador de origen
- **AND** el archivo resultante mantiene el título H1 original del destino

#### Scenario: Re-instalación idempotente
- **WHEN** se ejecuta el instalador sobre un destino que ya recibió las reglas (su `AGENTS.md` ya las contiene)
- **THEN** el instalador detecta las reglas existentes y no añade duplicados

#### Scenario: Dry-run refleja el plan de AGENTS.md
- **WHEN** se ejecuta con `--dry-run`
- **THEN** el plan indica si se creará `AGENTS.md` o se añadirá el bloque de reglas, sin escribir nada
