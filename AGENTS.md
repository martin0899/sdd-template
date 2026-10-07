# AGENTS.md - Coding Guidelines

## Core Development Rules

> **IMPORTANT**: [`docs/base-standards.md`](./docs/base-standards.md) contains the general rules and is the **core of development rules** for this project. Always read and consider it **first** before any task. It takes precedence over all other guidelines.

## Skills Index

**Before invoking any project skill under `.agents/skills/`, consult [`.agents/skills/INDEX.md`](./.agents/skills/INDEX.md) to choose the right skill from its trigger, and load ONLY the chosen skill's `SKILL.md` — never other skills' files. Skills under `.opencode/skills/` (vendor OpenSpec) always load as usual.**

**Skill destination rule: every new skill — or any skill requested to be created — MUST be placed under `.agents/skills/<name>/SKILL.md` (or the directory corresponding to the selected agent). NEVER place new skills under `.opencode/skills/` (vendor-managed by OpenSpec).**

## Exploration Briefing Gate

**When an OpenSpec exploration crystallizes or the user asks to proceed/capture it: ALWAYS return a briefing proactively (closed decisions, code-grounded findings, open questions, proposed change scope) and NEVER run `openspec new change` or write change artifacts before the user explicitly confirms.** Protocol detail: `.agents/skills/exploration-briefing/SKILL.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- **For any code investigation, understanding, or information search, ALWAYS use graphify first** — run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Only skip graphify if the user explicitly says "no uses graphify" or similar in their prompt.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- graphify-out/ is machine-local: NEVER commit it to the repository (the managed .gitignore block excludes it). Rebuild it with `graphify update .` after cloning the project or changing machines — it is regenerable at no API cost. The search instructions above are unaffected by this policy.

## Mandatory OpenSpec for Requirements

**All requirement-related work MUST go through OpenSpec.** Documentation is the source of truth; OpenSpec enforces it.

When a user request involves any of the following, it is a requirement and must be routed through the OpenSpec workflow:

- New feature or functionality
- Bug fix that changes behavior
- Modification to existing functionality
- Change that affects system behavior, UI, API, or database
- Any work that would produce a deliverable

**Required workflow for requirements:**

1. **Recognize the requirement** — If the request involves building, fixing, or modifying something, it is a requirement.
2. **Route through OpenSpec** — Use `requirements-discovery` to define the requirement, then `spec-from-note` to generate OpenSpec artifacts.
3. **Never skip tasks.md** — When creating or updating OpenSpec changes, always create/update `tasks.md` with verifiable implementation steps.
4. **Verify before implementing** — Before writing code, confirm that an active OpenSpec change exists with updated tasks.

**Enforcement:** The `openspec-gate` skill verifies these conditions before allowing implementation. If no active change exists, the gate blocks code changes and routes to the appropriate OpenSpec workflow.

## Obsidian Integration (Second Brain + Wiki)

**All requirement-related work MUST be documented in Obsidian for cross-machine portability.** OpenSpec files stay in the repository; Obsidian provides the portable wiki.

When working with requirements and specifications:

1. **Capture in Obsidian** — Use `second-brain` skill to capture ideas and notes in `00_Notas/`.
2. **Document requirements** — Use `requirements-discovery` to create requirement notes in Obsidian.
3. **Generate summaries** — Use `obsidian-summary` to create wiki-style summaries after completing specifications.
4. **Document tests** — Use `obsidian-tests` to create test documentation for regression testing.
5. **Technical briefings** — Use `obsidian-briefing` to create portable technical summaries.

**Obsidian Vault Location:** `/home/martinmartinez/Documentos/obsidian_sync_git`

**Vault Structure Rule (MANDATORY):**
- `00_Notas/` = **inbox** — casual captures arrive here first (proposals, ideas, pendientes)
- `01_Proyectos/<Proyecto>/` = **spec folders** (`<spec-id>/` with briefing.md, tests.md, resumen.md) + organization entries (underscore-prefixed): `_README.md`, `_INDEX.md`, and `_Notas/` (active project decisions/proposals — deliberate material, exception to the capture flow). NEVER loose casual notes. `spectralis distill` reads only `<spec-id>/`; it ignores `_Notas/` and `_`-prefixed entries.
- When a note becomes a spec: create `01_Proyectos/<Proyecto>/<spec-id>/`, archive the source note to `04_archivado/`
- `05_wiki/` = distilled knowledge (machine-local, not committed)

**Required workflow for Obsidian documentation:**

1. **After completing a specification** — Generate a summary in Obsidian using `obsidian-summary`.
2. **After creating tests** — Document tests in Obsidian using `obsidian-tests`.
3. **When technical decisions are made** — Create a briefing in Obsidian using `obsidian-briefing`.
4. **When ideas arise** — Capture in Obsidian using `second-brain`.

**Templates location:** `{vault_root}/09_Plantilla/`

**Enforcement:** The `openspec-gate` skill verifies that documentation exists in Obsidian before allowing archiving. If no documentation exists, the gate routes to the appropriate Obsidian skill.

## Obsidian Orchestration (switch obsidianSync)

**Al aplicar (`/opsx-apply`) o archivar (`/opsx-archive`) un change OpenSpec, consulta el switch de orquestación `spectralis config --get obsidianSync` (o los flags `--obsidian`/`--no-obsidian`). Si está activo, consulta la skill `.agents/skills/obsidian-orchestration/SKILL.md` y sigue su protocolo: `obsidian-briefing` al completar apply; `obsidian-summary` + `obsidian-tests` + `spectralis spec complete` antes de archivar. Con el switch en `0` (o `--no-obsidian`), no escribir nada en el cerebro. Los comandos `.opencode/commands/opsx-*` son vendor-managed por OpenSpec y NO se modifican.**

## Lessons

**Carga obligatoria:** antes de actuar en un proyecto, lee `01_Proyectos/<Proyecto>/_Notas/_lessons.md` (vault) y aplica sus reglas. Si no existe, continúa sin error; se crea al registrar la primera corrección.

**Registro:** cuando el usuario corrija al agente, añade una línea `- Cuando X, haz Y` a la sección `Lessons` de ese archivo, sin borrar las lecciones existentes. Si la corrección no se puede expresar como regla accionable, pide precisión antes de escribir; no inventes la lección.

**Anti-repetición:** si el mismo error ocurre dos veces, reescribe la lección existente para hacerla inequívoca; no añadas una línea duplicada.

**Ubicación:** `01_Proyectos/<Proyecto>/_Notas/_lessons.md`. Al ser una entrada `_`-prefijada queda excluida del escaneo de IDs y de la destilación a `05_wiki/`.

## Fachada del ciclo spec (límites)

**La fachada enruta el ciclo; no planifica ni reimplementa OpenSpec.**
- **Un solo ejecutor activo por cambio:** nunca ejecutes la misma fase por dos rutas a la vez ni relances `apply` una vez delegado a un ejecutor.
- **`apply` ejecuta solo las tareas existentes:** ante artefactos esenciales incompletos (SDD: `proposal`/`design`/`tasks`; ODD: `feature.md`) detente e informa qué falta; nunca llames al planificador ni regeneres el plan en un apply.
- **SDD delega en OpenSpec** (validación y estado los decide OpenSpec, no la fachada). **ODD** opera sobre `odd/changes/<id>/feature.md` sin invocar, detectar ni requerir OpenSpec.

## Contrato de roles y compuerta de revisión

### Entradas y salidas por rol
- **coordinador**: consume el pedido y el estado del cambio (vía la fachada) → produce clasificación, enrutado y fase.
- **planificador**: consume un pedido autorizado a planificar → produce `proposal`, specs, `design` y `tasks`.
- **implementador**: consume las tareas existentes → produce cambios de código con sus pruebas ejecutadas.
- **revisor (gertrudis)**: consume modo, ID del cambio, documento fuente, diff, pruebas y riesgo → produce veredicto con hallazgos.

### Reutilización de agentes
Reutiliza y mejora los agentes existentes; **no crees agentes nuevos**. El único rol nuevo del programa es `documentador`, definido en otro change.

### Compuerta de gertrudis (solo lectura)
gertrudis **reporta y NO modifica** código ni artefactos. Emite un veredicto cerrado: `APROBADO` | `CAMBIOS NECESARIOS` | `BLOQUEO DE ENTORNO`. Los hallazgos usan el formato `archivo:línea`, nombran el criterio incumplido y adjuntan evidencia reproducible. Nunca emitas `APROBADO` sin evidencia reproducible: si no hay evidencia, reporta la carencia.

### Revisión por riesgo
- **ODD de bajo riesgo**: basta el diff con checks mínimos, sin revisión pesada bloqueante.
- **Riesgo medio/alto**: invoca a **gertrudis** con su contrato de entrada y salida.
- **SDD**: aplica las compuertas formales del modo, con independencia del tamaño percibido.

### Flujos por modo
El coordinador **anuncia el modo efectivo en la primera línea** antes de enrutar.

- **SDD**: `pending → spec_ready → ⏸ aprobación humana → in_progress → [implementador → gertrudis] → done`. **NUNCA** lances al implementador en `pending`: los artefactos deben completarse y validarse (`spec_ready`) y ser aprobados antes de implementar.
- **ODD**: ciclo orgánico **sin OpenSpec**. Cambio pequeño: ruta directa al implementador (diff + checks mínimos, sin documentación formal). Cambio sustancial: `odd/changes/<id>/feature.md` como fuente de verdad (se crea antes del primer write y se registra cada commit como evidencia). Cierre ODD: propón al humano la migración propuesta y, si se confirma, despáchala al `documentador`.
- Reglas duras: **NUNCA** invocar OpenSpec en ODD; **NUNCA**: no publicar al brain ni a `05_wiki/` sin despacho del coordinador; **un solo ejecutor activo** por cambio (no relances apply).

### Identificación de estado
Antes de actuar, el coordinador identifica modo, ID del cambio, estado de artefactos/tareas y fase consultando la fachada de Spectralis; no crea plan ni checklist paralelos y reanuda desde la primera tarea pendiente.

## Delegación documental

**Si detectas trabajo documental, SOLICITA — nunca publiques por tu cuenta.** Entrega al `coordinador` una solicitud estructurada (modo, changeId, affectedPaths, testEvidence, risk, pending) y deja que consolide y despache al rol `documentador`. Detalle: skill `.agents/skills/documenter-delegation/SKILL.md`.

## Contrato de reglas del ciclo

**Sigue las reglas del ciclo desde el contrato central** (skill `.agents/skills/agent-rules-contract/SKILL.md`), invoca la interfaz central de Spectralis y **no dupliques el ciclo ni inventes convenciones por repo**. Valida con `spectralis check --rules`.

## Briefing técnico en la propuesta

**Al proponer un cambio (modo `sdd` u `odd`), rellena el briefing técnico del folder note** —`## Contexto`, `## Decisiones técnicas`, `## Impacto`— **ANTES de invocar al planificador** y antes de crear `proposal`/specs/`design`/`tasks`; en el apply se refresca sin duplicar. Detalle: skill `.agents/skills/obsidian-briefing/SKILL.md`.
