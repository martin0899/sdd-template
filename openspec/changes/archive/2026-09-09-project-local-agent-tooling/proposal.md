# Proposal: project-local-agent-tooling

## Why

Una revisión a un proyecto destino donde se instaló el arnés (chapur_pay_plataforma) evidenció que la plantilla no gestiona el versionado de las herramientas de agente: el commit del destino versionó 649 archivos (+626k líneas) de `graphify-out/` —grafo completo duplicado con un snapshot fechado y ~500 cachés AST— porque nada lo excluye; el `.gitignore` del destino quedó inconsistente (`.agents/` ignorado a mano, `.opencode/` y `skills-lock.json` versionados sin criterio); y un plugin opencode creado a mano en el destino muta el comando bash del usuario con un `echo`, contaminando la salida del primer comando y contradiciendo su propia documentación. Además, la skill `openspec-sync-specs` duplicada entre `.agents/skills` y `.opencode/skills` ya divergió (v1.3.1 vs v1.11.0): los agentes están recibiendo la versión obsoleta.

## What Changes

- Añadir al instalador un paso idempotente y marcado (`manage_gitignore`) que garantiza en el `.gitignore` del destino las exclusiones: `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json`.
- Política de versionado: `AGENTS.md` y `openspec/` siguen versionándose (contenido del proyecto); skills, comandos, plugins y artefactos generados quedan project-local (una copia por proyecto y máquina, nunca versionados en el repo destino).
- Añadir al bloque graphify inyectado en `AGENTS.md` la regla machine-local: `graphify-out/` nunca se commitea y se reconstruye con `graphify update .` tras clonar o cambiar de máquina; las instrucciones de búsqueda (`query`, `path`, `explain`) se mantienen intactas.
- Retirar la copia obsoleta `.agents/skills/openspec-sync-specs` (v1.3.1); las skills `openspec-*` quedan gestionadas exclusivamente por el CLI de OpenSpec en `.opencode/skills`, con la exención documentada en `docs/base-standards.md` (§4 y §6).
- No incluir ningún plugin opencode en el payload; documentar la decisión (el recordatorio de graphify vive en las reglas de `AGENTS.md`; la mutación de comandos bash se rechaza por contaminar la salida del primer comando).
- Tests de instalación: un destino recién instalado termina con las cinco exclusiones en su `.gitignore`; una re-instalación idempotente no duplica entradas.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `sdd-template-install`: el instalador gestiona el `.gitignore` del destino de forma idempotente y marcada (cinco exclusiones), el bloque de reglas inyectado en `AGENTS.md` incorpora la regla machine-local de `graphify-out/`, y el manifiesto de payload garantiza que ningún plugin opencode viaja al destino.
- `sdd-project-onboarding`: el onboarding define el ciclo de vida del grafo en el destino (rebuild con `graphify update .` tras clonar o cambiar de máquina; nunca commit).

## Impact

- `install.sh` (nuevo `manage_gitignore`, bloque AGENTS.md actualizado) y `AGENTS.md` de la plantilla.
- `.agents/skills/openspec-sync-specs/` (eliminación de la copia obsoleta) y `docs/base-standards.md` (§4 y §6: exención vendor de skills `openspec-*`, política project-local y flujo de promoción de skills locales hacia la plantilla).
- `docs/manuals/` (política de versionado de herramientas de agente, decisión sobre plugins).
- `tests/test-install-update.sh` (nuevos casos: exclusiones en `.gitignore` e idempotencia).
- Los destinos ya instalados (p. ej. chapur_pay_plataforma) quedan fuera de este change: su corrección git (untrack de `graphify-out/` y, si procede, reescritura de historia) se ejecutará aparte cuando se decida.
