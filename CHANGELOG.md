# Changelog

Historial de versiones de **spectralis** (el arnés SDD). Este changelog aplica **solo al arnés** (`sdd-template`), no a los proyectos donde se instala la plantilla.

## Esquema de versionado

- Formato: `MAJOR.MINOR.<N>` donde el **tercer valor es el número de especificaciones (OpenSpec changes) completadas/archivadas**.
- `MAJOR`/`MINOR` siguen la semántica previa del arnés; el tercer valor se incrementa con cada change archivado.
- Los tags git (`v1.2.N`) marcan el estado del arnés con esa cantidad de especificaciones implementadas.
- El **proyecto destino** tiene su propia versión (`projectVersion` en el manifest): PATCH +1 por spec archivada, MINOR +1 al crear release, MAJOR solo por ruptura, máx 99 con carry.

---

## v1.2.41 — 2026-10-06

Conteo de especificaciones: **41**.

### 2026-10-06 (1)

- **add-spec-facade-commands** — fachada común y consciente del modo (`src/core/spec-facade.ts`) para iniciar, consultar, validar, completar y cerrar un cambio: en SDD delega en OpenSpec (sin reimplementarlo; si falta, informa y se detiene) y en ODD opera sobre `odd/changes/<id>/feature.md` sin OpenSpec. Garantiza un solo ejecutor activo por cambio (apply no se relanza tras delegar) y `apply` ejecuta solo las tareas existentes, deteniéndose ante artefactos esenciales incompletos sin llamar al planificador.

---

## v1.2.40 — 2026-10-06

Conteo de especificaciones: **40**.

### 2026-10-06 (1)

- **add-openspec-optional-prereq** — `openspec` deja de ser prerequisito incondicional: solo se exige en modo `sdd`. Añade el parámetro de modo a `checkPrereqs`, reporte condicional en `spectralis doctor` (requerido SDD / opcional ODD), y `init` que omite `openspec init` y la inyección de `openspec/config.yaml` en proyectos odd-only, sin gestionar `openspec/` en el manifest.

---

## v1.2.39 — 2026-10-06

Conteo de especificaciones: **39**.

### 2026-10-06 (1)

- **add-mode-philosophy-cascade** — campo `philosophy` (`sdd`|`odd`) en `.sdd-manifest.json` y en la config global, con cascada determinista `--odd/--sdd` > manifiesto > global > `sdd` (default retrocompatible). Añade `spectralis config --set/--get/--list philosophy`, flags mutuamente excluyentes `--odd`/`--sdd` en `spectralis spec init`, y preservación de `philosophy`/`obsidianSync` en `spectralis update`.

---

## v1.2.38 — 2026-10-06

Conteo de especificaciones: **38**.

### 2026-10-06 (1)

- **add-lessons-log** — regla de Lessons en el `AGENTS.md` de la plantilla: el agente registra cada corrección como `- Cuando X, haz Y` en `01_Proyectos/<Proyecto>/_Notas/_lessons.md`, reescribe la lección ante repetición y carga las lecciones del proyecto antes de actuar. Incluye test de integración que ancla la regla en la plantilla.

---

## v1.2.37 — 2026-09-29

Conteo de especificaciones: **37**.

### 2026-09-29 (1)

- **add-bump-command** — nuevo comando `spectralis bump [patch|minor|major]` para versionar manualmente spectralis (`package.json`) o el proyecto destino (`.sdd-manifest.json`). Opciones: `--dry-run`, `--spectralis`, `--project`.

---

## v1.2.35 — 2026-09-27

Conteo de especificaciones: **35**.

### 2026-09-27 (1)

- **refactor-project-version-rules** — renombra `templateVersion` → `projectVersion` (manifest schema v3 con lectura tolerante de v2), `spectralis init` pregunta la versión del proyecto (default `1.0.0`, sugerencia del `pom.xml`/`package.json`), reglas deterministas de bump (`bumpPatch`/`bumpMinor`/`bumpMajor` con máx 99 y carry), y el flujo commit/release usa `projectVersion` como fuente canónica.

---

## v1.2.34 — 2026-09-27

Conteo de especificaciones: **34**.

### 2026-09-27 (3)

- **add-check-registry-consistencia** — `spectralis check --registry`: doctor determinista sin LLM que valida la consistencia del triángulo repo ↔ `.sdd-registry/REGISTRY.md` ↔ brain ↔ `openspec` (change sin registro, huérfano, briefing faltante, `_INDEX.json` desalineado, sin destilar).
- **add-check-vault-ids** — `spectralis check --ids`: valida conformidad/unicidad de IDs del vault (whitelist ampliada `res-`/`brief-`/`test-`, caché por mtime en `.spectralis/`).
- **move-registry-machine-local** — mueve `docs/requirements/REGISTRY.md` y briefings a `.sdd-registry/` (machine-local, sin versionar ni distribuir); actualiza skills, `copy-payload`, `post-checks`, `spec-workflow`.

### 2026-09-25 (21)

- **orchestrate-obsidian-sync** — switch `obsidianSync` que orquesta el cerebro en `/opsx-apply` y `/opsx-archive`.
- **add-05-wiki-distill** — capa `05_wiki/` (LLM Wiki) consumible por proyectos externos, separada del Second Brain.
- **add-seed-and-distill-complete** — `spectralis seed` (carga inicial `05_wiki/`) y `spectralis distill` completo (determinista + LLM).
- **add-spec-workflow-commands** — comandos `spectralis spec init/complete` para el flujo de especificación.
- **add-manuals-second-brain-sync** — manuales del arnés sincronizados al cerebro (`spectralis notes`).
- **add-spectralis-config-vault-routes** — rutas del vault configurables (config → manifiesto → vault → fallback).
- **add-spectralis-projects-dashboard** — `spectralis projects` con estado OpenSpec por proyecto.
- **add-spectralis-skills-command** — `spectralis skills` detecta skills y refresca `_INDEX_SKILLS.json`.
- **add-spectralis-update-auto** — actualización automática y clasificación de archivos gestionados.
- **add-project-ids** — IDs de proyecto (`proy-YYYYMMDD-slug`) en el flujo del cerebro.
- **add-project-cwd-detection** — detección del proyecto desde el cwd actual.
- **add-openspec-local-policy** — política local: `openspec/` deja de versionarse.
- **add-stack-json-artifact** — artefacto `stack.json` con detección reproducible del stack.
- **improve-stack-detection-reproducibility** — caché por mtime y escaneo a profundidad 2 en monorepos.
- **enhance-distill-llm-and-stack** — clasificación LLM (Ollama) para entradas ambiguas del distill.
- **improve-spectralis-ux-update-tools-menu** — mejoras de UX en el menú de herramientas de `update`.
- **spectralis-cli-ux-aliases** — aliases de flags del CLI (`--demo`, `--dd`, `--v`).
- **add-compose-standards-placeholders** — reporte de placeholders pendientes en estándares compuestos.
- **add-readme-third-party-tools** — README con herramientas de terceros.
- **remove-autoskills** — eliminación del autoskills automático.
- **update-skill-index-spec** — actualización del índice de skills.

### 2026-09-21 (10)

- **add-spectralis-cli-installer** — instalador CLI multiplataforma (init, update, doctor) en Node puro.
- **add-spectralis-init-ui** — UI del instalador: banner, fases marcadas, prompts.
- **add-stack-detection-and-docs-variants** — detección de stack y variantes de `docs/`.
- **add-spec-from-note** — skill que convierte nota de requerimiento en changes OpenSpec.
- **add-skill-index** — índice de skills del proyecto.
- **add-exploration-briefing-gate** — gate de briefing antes de `openspec new change`.
- **add-spanish-commit-review-gate** — revisión de commits en español.
- **add-gitignore-managed-refresh** — refresco del bloque gestionado de `.gitignore`.
- **sync-project-agent-config** — sincronización de config de agentes.
- **update-installer-managed-agents-block** — bloque gestionado de agentes en el instalador.

---

## v1.2.0 — 2026-09-23

- Alias de flags, selector de tools y comandos `status`/`config`. Bump a `1.2.0` sin correlato de spec archivada.

## v1.0.0 — 2026-09-21

- Implementación inicial del CLI spectralis: instalador SDD multiplataforma con `doctor` y matriz de agentes.