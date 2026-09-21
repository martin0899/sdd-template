# Delta spec: spectralis-cli

## Purpose

CLI global instalable desde el repositorio clonado de la plantilla (`npm i -g .`, sin publicar en el registry de npm) que distribuye e instala la configuración SDD con comandos `init`, `update` y `doctor`, selección de agente y plantilla embebida en el paquete.

## ADDED Requirements

### Requirement: Distribución por instalación local desde el clone

El paquete `spectralis` DEBE (MUST) instalarse globalmente desde el repositorio clonado (`npm i -g .`) y DEBE (MUST) resolver la plantilla (`.agents/`, `.opencode/`, `docs/`, `docs-variants/`, `AGENTS.md`) desde su ubicación de instalación global, sin requerir que el repo clonado permanezca en disco. El flujo de distribución DEBE (MUST) ser: clonar el repositorio, `npm i -g .`, ejecutar `spectralis`. El paquete NUNCA DEBE (MUST NOT) publicarse en el registry de npm (`npm publish` queda fuera de alcance), y NUNCA DEBE (MUST NOT) duplicar artefactos canónicos de forma divergente (`.agents/` permanece como fuente canónica).

#### Scenario: Instalación desde clone

- **WHEN** el usuario clona el repositorio y ejecuta `npm i -g .`
- **THEN** el comando `spectralis` queda disponible globalmente
- **AND** `spectralis init <destino>` funciona aunque el directorio clonado se elimine después de la instalación

#### Scenario: La plantilla viaja con el paquete

- **WHEN** el paquete se instala globalmente
- **THEN** el CLI resuelve la plantilla embebida dentro del paquete (campo `files` del `package.json`)
- **AND** la versión de la plantilla corresponde al commit de git del clone desde el que se instaló

#### Scenario: Sin registro público

- **WHEN** se intenta instalar el paquete en una máquina sin acceso al registry de npm
- **THEN** la instalación desde el clone funciona igualmente (cero dependencia del registry)

### Requirement: Comando init con política anti-corrupción

El comando `spectralis init <destino>` DEBE (MUST) ejecutar la instalación fresca aplicando la misma política del instalador canónico (ver `sdd-template-install`): verificación de prerrequisitos antes de escribir, reconocimiento previo sin escritura, copia del payload con backup en `.sdd-backup-<fecha>/` y confirmación ante conflicto, inyección del contexto español por APPEND, bloque gestionado de `AGENTS.md` y bloque gestionado de `.gitignore` idempotentes, y manifiesto `.sdd-manifest.json` con hashes.

#### Scenario: Init en destino limpio

- **WHEN** `spectralis init` se ejecuta sobre un proyecto sin configuración SDD previa
- **THEN** el destino queda con el payload completo según el manifiesto (equivalente a `install.sh`)
- **AND** el resultado satisface los requisitos de `sdd-template-install` (contexto español, AGENTS.md, .gitignore gestionado, manifiesto)

#### Scenario: Init con conflicto

- **WHEN** un archivo del payload ya existe en el destino con contenido distinto
- **THEN** el original se respalda en `.sdd-backup-<fecha>/` y se pregunta antes de reemplazar

#### Scenario: Init sin prerrequisitos

- **WHEN** falta una herramienta requerida en el destino/host
- **THEN** el comando aborta sin haber escrito nada e indica qué falta

### Requirement: Selección de agente

El CLI DEBE (MUST) aceptar `--agent <agente>` con valores soportados `opencode` (por defecto), `antigravity`, `claude` y `all`. El payload DEBE (MUST) ajustarse al agente seleccionado: `.agents/skills/`, `docs/` y `AGENTS.md` son comunes a todos; `.opencode/` (comandos, skills y configuración de paquete) SOLO DEBE (MUST) instalarse cuando el agente es `opencode` o `all`. La inicialización de OpenSpec DEBE (MUST) usar las herramientas correspondientes al agente seleccionado.

#### Scenario: Agente por defecto

- **WHEN** `spectralis init` se ejecuta sin `--agent`
- **THEN** el destino recibe el payload completo de opencode (incluido `.opencode/`)

#### Scenario: Agente sin accesorios específicos

- **WHEN** `spectralis init --agent antigravity` se ejecuta sobre un destino limpio
- **THEN** el destino recibe `.agents/skills/`, `docs/`, `AGENTS.md` y la raíz OpenSpec
- **AND** el destino NO contiene `.opencode/`

#### Scenario: Agente no soportado

- **WHEN** se pasa un valor de `--agent` fuera de la lista soportada
- **THEN** el CLI reporta error con la lista de valores válidos y no escribe nada

### Requirement: Comando update en fase de port incremental

Hasta que el port a TypeScript alcance paridad con el modo `--update` del instalador bash, `spectralis update` DEBE (MUST) reportar que no está disponible y DEBE (MUST) dirigir al usuario a `install.sh --update` como mecanismo canónico. `install.sh` NO DEBE (MUST NOT) eliminarse ni degradarse durante el port.

#### Scenario: Update pre-paridad

- **WHEN** `spectralis update` se ejecuta antes de completar la paridad del port
- **THEN** el CLI no escribe nada en el destino y muestra la instrucción equivalente con `install.sh --update`

#### Scenario: Fallback canónico disponible

- **WHEN** el usuario necesita actualizar una instalación existente durante el port
- **THEN** `install.sh --update` sigue operativo con todos sus requisitos vigentes
