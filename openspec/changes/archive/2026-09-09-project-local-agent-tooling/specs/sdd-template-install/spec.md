# sdd-template-install — Delta Spec

## MODIFIED Requirements

### Requirement: Inyección de reglas de agentes en AGENTS.md

El instalador DEBE (MUST) dejar las reglas de agentes de la plantilla presentes en el `AGENTS.md` del destino, con estas políticas: si el destino no tiene `AGENTS.md`, DEBE crearlo con el contenido íntegro del de la plantilla; si el destino ya lo tiene, DEBE añadir por APPEND las secciones de reglas de la plantilla (sin el título H1) precedidas de un marcador de origen, y NUNCA debe sobrescribir, reordenar ni eliminar el contenido propio del destino. La operación DEBE ser idempotente: si el destino ya contiene las reglas, el instalador no duplica nada. El `AGENTS.md` de la plantilla DEBE (MUST) tener título genérico (sin branding del proyecto de origen), de modo que el mismo archivo sirva como contenido canónico para destinos. El bloque de reglas graphify inyectado DEBE (MUST) incluir la política machine-local del grafo: `graphify-out/` es local al proyecto y a la máquina, nunca se versiona en el repositorio destino, y se reconstruye con `graphify update .` tras clonar o cambiar de máquina; las instrucciones de búsqueda (`graphify query`, `path`, `explain`) se mantienen intactas.

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

#### Scenario: Bloque graphify con regla machine-local
- **WHEN** el instalador inyecta (crea o añade) el bloque de reglas graphify en el `AGENTS.md` del destino
- **THEN** el bloque incluye la regla de que `graphify-out/` nunca se versiona y se reconstruye con `graphify update .` tras clonar o cambiar de máquina
- **AND** las instrucciones de búsqueda del grafo (`query`, `path`, `explain`) permanecen intactas

#### Scenario: Dry-run refleja el plan de AGENTS.md
- **WHEN** se ejecuta con `--dry-run`
- **THEN** el plan indica si se creará `AGENTS.md` o se añadirá el bloque de reglas, sin escribir nada

## ADDED Requirements

### Requirement: Gestión del .gitignore del destino

El instalador DEBE (MUST) garantizar que el `.gitignore` del destino excluya el tooling de agente y los artefactos generados: `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/` y `skills-lock.json`. La operación DEBE (MUST) realizarse mediante un bloque marcado añadido por APPEND (creando el archivo si no existe), PRESERVANDO íntegro cualquier contenido previo del `.gitignore`, y DEBE (MUST) ser idempotente. Si el destino ya tiene versionadas rutas del arnés o artefactos generados, el instalador DEBE (MUST) advertirlo e indicar cómo des-versionarlas.

#### Scenario: Destino sin .gitignore
- **WHEN** el destino no tiene `.gitignore`
- **THEN** se crea con el bloque marcado de las cinco exclusiones

#### Scenario: Destino con .gitignore propio
- **WHEN** el `.gitignore` del destino existe con reglas propias
- **THEN** el bloque marcado se añade por APPEND y el contenido propio queda intacto

#### Scenario: Re-instalación idempotente
- **WHEN** se ejecuta el instalador sobre un destino que ya tiene el bloque
- **THEN** no se duplica ninguna entrada ni el bloque

#### Scenario: Rutas ya versionadas en el destino
- **WHEN** el destino ya tiene versionadas rutas del arnés o artefactos generados (por ejemplo `graphify-out/`)
- **THEN** el instalador advierte y muestra cómo des-versionarlas (por ejemplo `git rm -r --cached`)

#### Scenario: Dry-run refleja el plan de .gitignore
- **WHEN** se ejecuta con `--dry-run`
- **THEN** el plan indica el bloque que se añadiría (o que ya está presente) sin escribir nada

### Requirement: Exclusión de plugins y del lock de skills del payload

El manifiesto de payload DEBE (MUST) excluir cualquier plugin opencode (`.opencode/plugins/`), y `skills-lock.json` no forma parte del payload: el recordatorio de graphify vive en las reglas de `AGENTS.md` y el lock de skills se regenera localmente por la herramienta de skills. La verificación post-instalación DEBE (MUST) reportar que el destino no recibió plugins.

#### Scenario: Payload sin plugins
- **WHEN** se inspecciona el manifiesto de `install.sh` o el resultado de un `--dry-run`
- **THEN** no aparece ningún elemento de `.opencode/plugins/`

#### Scenario: Verificación post-instalación
- **WHEN** se completa la instalación
- **THEN** el destino no contiene plugins opencode y la verificación lo reporta

### Requirement: Exención vendor de skills openspec

La plantilla DEBE (MUST) mantener las skills `openspec-*` únicamente en `.opencode/skills/` como copias gestionadas por el CLI de OpenSpec, y NO DEBE (MUST NOT) mantener copias duplicadas de ellas en `.agents/skills/`. La política (exención vendor de `openspec-*`, skills project-local en destinos y flujo de promoción de skills locales hacia la plantilla) DEBE (MUST) quedar documentada en `docs/base-standards.md` (§4 y §6).

#### Scenario: Sin copias duplicadas en .agents
- **WHEN** se inspecciona `.agents/skills/` en el repo plantilla
- **THEN** no existe ninguna skill `openspec-*` (la copia obsoleta de `openspec-sync-specs` fue retirada)

#### Scenario: Fuente única por skill
- **WHEN** un destino instalado carga skills openspec
- **THEN** las recibe de `.opencode/skills/` (contenido vigente del CLI) y no de una copia divergente en `.agents/`

#### Scenario: Documentación de la exención
- **WHEN** se consulta `docs/base-standards.md`
- **THEN** §4/§6 documentan la exención vendor de `openspec-*`, la política project-local y el flujo de promoción de skills locales hacia la plantilla
