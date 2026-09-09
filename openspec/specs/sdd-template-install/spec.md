# sdd-template-install Specification

## Purpose
Define el comportamiento del instalador no destructivo que inyecta la configuración SDD (OpenSpec, skills, comandos opencode, estándares de documentación) desde este repo plantilla hacia proyectos nuevos o existentes, sin corromper el proyecto destino y garantizando la persistencia de las reglas de idioma español.

## Requirements

### Requirement: Verificación de prerrequisitos

El instalador DEBE (MUST) verificar la disponibilidad de las herramientas requeridas antes de realizar cualquier operación de escritura en el proyecto destino, y DEBE (MUST) abortar sin haber escrito nada si falta alguna.

#### Scenario: Prerrequisitos completos
- **WHEN** `git`, el CLI `openspec` y `graphify` están disponibles en PATH
- **THEN** el instalador continúa con el reconocimiento del destino

#### Scenario: Falta un prerrequisito
- **WHEN** alguna herramienta requerida no está en PATH
- **THEN** el instalador aborta, indica cuál falta y muestra instrucciones de instalación
- **AND** el proyecto destino queda intacto (cero archivos escritos)

### Requirement: Reconocimiento previo sin escritura

El instalador DEBE (MUST) examinar el proyecto destino y presentar un mapa de conflictos ANTES de escribir cualquier archivo, sin modificar nada durante el reconocimiento.

#### Scenario: Destino limpio
- **WHEN** el destino no contiene `openspec/`, `.agents/`, `.opencode/` ni `docs/`
- **THEN** el reconocimiento reporta destino limpio y procede con instalación completa

#### Scenario: Destino con configuración SDD parcial
- **WHEN** el destino ya contiene uno o más elementos del payload (por ejemplo `openspec/config.yaml` existente)
- **THEN** el reconocimiento lista cada elemento existente clasificado como conflicto potencial
- **AND** ningún archivo es modificado hasta que el usuario apruebe el plan

### Requirement: Modo dry-run

El instalador DEBE (MUST) ofrecer `--dry-run` que muestre el plan completo de instalación (archivos a copiar, archivos en conflicto, inyecciones de contexto) sin escribir nada en disco.

#### Scenario: Dry-run en proyecto existente
- **WHEN** se ejecuta con `--dry-run` sobre un proyecto que ya tiene `openspec/config.yaml`
- **THEN** se muestra el plan: copias previstas, conflictos detectados, y el bloque de contexto que sería añadido
- **AND** el destino queda bit a bit idéntico a su estado previo

### Requirement: Inicialización normal de OpenSpec

El instalador DEBE (MUST) usar `openspec init` (modo no interactivo) para crear la raíz OpenSpec en el destino cuando esta no existe, en lugar de copiar a mano el directorio.

#### Scenario: Destino sin raíz OpenSpec
- **WHEN** el destino no tiene directorio `openspec/`
- **THEN** el instalador ejecuta `openspec init` no interactivo y este crea `config.yaml`, `changes/` y `specs/`

### Requirement: Inyección de contexto español por APPEND

El instalador DEBE (MUST) inyectar las reglas de idioma español (todas las interacciones en español) en `openspec/config.yaml` del destino mediante adición (append) al campo `context`, y NUNCA mediante reemplazo del archivo completo.

#### Scenario: Destino sin contexto previo
- **WHEN** el `config.yaml` recién creado no tiene reglas de contexto
- **THEN** las reglas de español se añaden al campo `context` y el resto del archivo permanece con formato válido

#### Scenario: Destino con contexto previo del proyecto
- **WHEN** el `config.yaml` del destino ya contiene un campo `context` con contenido propio
- **THEN** las reglas de español se añaden PRESERVANDO íntegro el contenido existente
- **AND** el resultado es un YAML válido con ambos contextos

### Requirement: Copia de payload con política anti-corrupción

El instalador DEBE (MUST) copiar el payload de la plantilla (`.agents/skills/`, `.opencode/`, `docs/`) al destino aplicando: ante archivo existente, backup del original a `.sdd-backup-<fecha>/` y consulta al usuario; ante archivo nuevo, copia directa. El instalador NUNCA debe sobrescribir sin backup previo.

#### Scenario: Archivo nuevo en destino
- **WHEN** el archivo del payload no existe en el destino
- **THEN** se copia directamente

#### Scenario: Archivo en conflicto
- **WHEN** el archivo del payload ya existe en el destino
- **THEN** el original se copia a `.sdd-backup-<fecha>/` preservando su ruta relativa
- **AND** se pregunta al usuario antes de reemplazar; el usuario puede mantener el original

#### Scenario: Instalación interrumpida
- **WHEN** la copia falla a mitad de proceso
- **THEN** los archivos ya respaldados permanecen en `.sdd-backup-<fecha>/` y el instalador reporta el estado parcial

### Requirement: Manifiesto de payload

El instalador DEBE (MUST) basarse en un manifiesto explícito que define qué viaja al destino y qué se queda en el repo plantilla. El instalador (`install.sh`), el README de la plantilla y los artefactos de trabajo de `openspec/changes/` del repo plantilla NO viajan al destino. La documentación de referencia del proyecto destino es `README.md` y los manuales de `docs/`; NO existe un archivo-guía de CLI suelto (`sdd-cli-guide.md` ya no forma parte de la plantilla).

#### Scenario: Payload exacto
- **WHEN** se completa la instalación
- **THEN** el destino contiene exactamente: `openspec/` (con contexto español), `.agents/skills/` (sin las skills retiradas), `.opencode/` (comandos, skills y configuración de paquete), `docs/`
- **AND** el destino NO contiene `install.sh`, ni los cambios activos del repo plantilla, ni `sdd-cli-guide.md`

#### Scenario: Manifiesto sin guía de CLI
- **WHEN** se inspecciona el manifiesto de `install.sh` o el resultado de un `--dry-run`
- **THEN** `sdd-cli-guide.md` no aparece como elemento del payload

### Requirement: Soporte opt-in para Claude Code vía npx skills

El flujo de la plantilla DEBE (MUST) documentar `npx skills` (skills.sh) como el mecanismo para exponer los skills a Claude Code, y DEBE (MUST) presentarla como paso opcional activado por el usuario; los demás agentes (Cursor, OpenCode, Codex CLI, Gemini CLI, Kiro, Antigravity, OpenClaw) cargan `.agents/skills/` nativamente sin paso adicional.

#### Scenario: Usuario con Claude Code
- **WHEN** el usuario desea usar los skills desde Claude Code
- **THEN** la documentación de la plantilla instruye ejecutar `npx skills` en el proyecto destino como paso único opt-in
- **AND** el instalador no crea symlinks hacia `.claude/skills/`

#### Scenario: Usuario sin Claude Code
- **WHEN** el usuario solo usa agentes con soporte nativo de `.agents/skills/`
- **THEN** no se requiere ningún paso adicional ni herramienta externa

### Requirement: Guía de instalación manual multi-OS

La plantilla DEBE (MUST) incluir una guía de instalación manual que documente los pasos equivalentes a `install.sh` para entornos donde el script no puede ejecutarse (por ejemplo, Windows nativo sin WSL ni Git Bash), logrando el mismo resultado final: raíz OpenSpec creada, contexto español añadido por APPEND, payload copiado y conflicto manejado con backup.

#### Scenario: Windows sin bash
- **WHEN** el usuario no puede ejecutar `install.sh` (por ejemplo, Windows nativo sin WSL ni Git Bash)
- **THEN** la guía manual indica los pasos equivalentes (copia del payload con herramientas del sistema, `openspec init` no interactivo, añadido del bloque de contexto español a `config.yaml`)
- **AND** el resultado final es equivalente al de la instalación por script

#### Scenario: Conflicto durante instalación manual
- **WHEN** durante la instalación manual el usuario encuentra un archivo del payload ya existente en el destino
- **THEN** la guía instruye respaldar el original antes de reemplazarlo (directorio de backup con fecha) y cómo restaurarlo si algo sale mal

#### Scenario: Verificación post-instalación manual
- **WHEN** se completa la instalación manual
- **THEN** la guía incluye una lista de verificación para confirmar la paridad con la instalación por script (payload exacto según el manifiesto, contexto español presente, sin `install.sh` en el destino)

### Requirement: Retiro de skills obsoletas del payload

La plantilla DEBE (MUST) eliminar `sync-agent-symlinks` y `sdd-bootstrap-docs` de `.agents/skills/` antes de exponerse como fuente canónica, de modo que ningún proyecto destino las reciba.

#### Scenario: Payload sin skills retiradas
- **WHEN** se inspecciona `.agents/skills/` en el repo plantilla o en un destino instalado
- **THEN** `sync-agent-symlinks` y `sdd-bootstrap-docs` no existen
- **AND** el resto de skills portables permanecen intactas

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
