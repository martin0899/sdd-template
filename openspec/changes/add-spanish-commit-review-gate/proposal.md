# Proposal: add-spanish-commit-review-gate

## Why

El flujo de commit actual (skill `commit`) exige mensajes en inglés y puede commitear sin que el usuario vea antes qué archivos se van a stagear, lo que arriesga subir archivos no deseados. Para mayor comprensión del historial y control sobre el contenido de cada commit, los mensajes deben ser en español y el agente debe revisar y proponer antes de ejecutar cualquier `git commit`.

## What Changes

- La skill `.agents/skills/commit/SKILL.md` pasa a escribir **mensajes de commit en español** (asunto imperativo corto, opcional prefijo de ticket, cuerpo con qué y por qué).
- **BREAKING** — Se añade una **puerta de revisión obligatoria** antes de cada commit: el agente lista y clasifica los archivos a stagear (esperados / ajenos al alcance / sensibles o generados), muestra el mensaje de commit propuesto y **espera confirmación explícita del usuario** antes de ejecutar `git add`/`git commit`.
- El usuario puede optar por hacer el commit él mismo: el agente entrega la lista de archivos y el mensaje en bloque copiable y no ejecuta comandos git.
- Títulos y descripciones de Pull Requests (`gh`) también en español.
- Creación de rama feature **solo desde la rama base** (`main`/`master`/`develop`): si ya se está en otra rama, el agente no crea ni cambia de rama y lo sugiere al usuario en la revisión previa, permitiendo que una rama acumule múltiples specs/cambios que converjan en un mismo commit/PR.
- **BREAKING** — `docs/openspec-tasks-mandatory-steps.md`: Step 0 (Create Feature Branch) queda condicionado a estar en la rama base (variante "continuar en la rama actual" documentada en checklist y ejemplo).
- **BREAKING** — `docs/base-standards.md` mueve "Git commit messages" de la lista *English Only for Technical Artifacts* a la regla *Spanish for User Interactions* (incluye mensajes de commit, títulos y descripciones de PR).
- `docs/backend-standards.md` y `docs/frontend-standards.md` eliminan "in English" de su regla de *Descriptive Commits*.
- Se conservan los modos existentes de la skill: commit scopeado por argumentos (tickets/features) y modo "solo descripción" sin operaciones git.

## Capabilities

### New Capabilities

- `commit-workflow`: comportamiento del flujo de commit/PR de agentes IA en este proyecto — idioma de mensajes, revisión previa obligatoria, propuesta de mensaje y confirmación explícita.

### Modified Capabilities

(none — las capacidades existentes `sdd-project-onboarding` y `sdd-template-install` no definen requisitos sobre el flujo de commit)

## Impact

- `.agents/skills/commit/SKILL.md` (fuente canónica que viaja a proyectos destino vía `install.sh`).
- `docs/base-standards.md` (sección 2, Language Standards).
- `docs/backend-standards.md` y `docs/frontend-standards.md` (sección Git Workflow).
- `docs/openspec-tasks-mandatory-steps.md` (Step 0 de ramas, checklist §4 y ejemplo §6).
- Sin cambios de código, APIs ni dependencias; `install.sh` sigue funcionando sin modificaciones (copia `docs/` y `.agents/skills/` completos).
