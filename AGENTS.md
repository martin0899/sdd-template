# AGENTS.md - Coding Guidelines

## Core Development Rules

> **IMPORTANT**: [`docs/base-standards.md`](./docs/base-standards.md) contains the general rules and is the **core of development rules**. Read it **first** before any task; it takes precedence over all other guidelines.

## Skills Index
Consult [`.agents/skills/INDEX.md`](./.agents/skills/INDEX.md) to pick the right skill from its trigger and load ONLY the chosen skill's `SKILL.md`. Skills under `.opencode/skills/` (vendor OpenSpec) always load as usual. **Skill destination rule: every new skill MUST live under `.agents/skills/<name>/SKILL.md`, never under `.opencode/skills/`.**

## Exploration Briefing Gate
**When an OpenSpec exploration crystallizes or the user asks to proceed/capture it: return a briefing proactively (closed decisions, code-grounded findings, open questions, proposed scope) and NEVER run `openspec new change` or write change artifacts before explicit user confirmation.** Detail: skill `exploration-briefing`.

## graphify
For any code investigation ALWAYS use graphify first: `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`. Skip only if the user says so or if the task is about stale/incorrect graph output; after code changes run `graphify update .`. Never commit `graphify-out/`. Detail: skill `graphify-usage`.

## Mandatory OpenSpec for Requirements
**All requirement-related work MUST go through OpenSpec**: define it with `requirements-discovery`, then generate artifacts with `spec-from-note`, and never skip a verifiable `tasks.md`. Enforcement: skill `openspec-gate`.

## Obsidian Integration (Second Brain + Wiki)
Requirement work is documented in Obsidian for cross-machine portability (skills: `second-brain`, `requirements-discovery`, `obsidian-summary`, `obsidian-tests`, `obsidian-briefing`). Vault: `/home/martinmartinez/Documentos/obsidian_sync_git`.

## Obsidian Orchestration (switch obsidianSync)
**Check `spectralis config --get obsidianSync` (or `--obsidian`/`--no-obsidian`): if active, follow skill `obsidian-orchestration` (briefing on apply; summary + tests + `spectralis spec complete` before archiving). With the switch off, write nothing to the brain.**

## Lessons
Read and apply `01_Proyectos/<Proyecto>/_Notas/_lessons.md` before acting; register corrections as `- Cuando X, haz Y` and rewrite an existing lesson if the same error repeats. Detail: skill `lessons`.

## Fachada del ciclo spec (límites)
La fachada enruta el ciclo; no planifica ni reimplementa OpenSpec. Un solo ejecutor activo por cambio; `apply` ejecuta solo las tareas existentes; SDD delega en OpenSpec y ODD opera sobre `odd/changes/<id>/feature.md`.

## Contrato de roles y compuerta de revisión (skill `subagent-contract`)
- **coordinador**: consume el pedido y el estado (vía la fachada) → produce clasificación, enrutado y fase. **planificador**: consume un pedido autorizado → produce proposal, specs, design y tasks. **implementador**: consume las tareas → produce código con pruebas. **revisor (gertrudis)**: consume modo, ID, diff, pruebas y riesgo → produce veredicto.
- Reutiliza y mejora los agentes existentes; no crees agentes nuevos (documentador es el único rol nuevo). gertrudis reporta y NO modifica; veredicto APROBADO | CAMBIOS NECESARIOS | BLOQUEO DE ENTORNO; hallazgos `archivo:línea` con evidencia reproducible; nunca emitas APROBADO sin evidencia.
- ODD bajo riesgo: diff + checks mínimos; riesgo medio/alto: gertrudis; SDD: compuertas formales. SDD: pending → spec_ready → ⏸ aprobación humana → in_progress → done; nunca lances al implementador en pending; anuncia el modo en la primera línea y un solo ejecutor activo por cambio.
- ODD sin OpenSpec: cambio sustancial usa odd/changes/<id>/feature.md; cierre propone migración; no publicar sin despacho. Antes de actuar, el coordinador identifica modo, ID, estado y fase vía la fachada; no crea plan ni checklist paralelos.

## Delegación documental
If you detect documentary work, REQUEST it from the coordinador — never publish on your own. Detail: skill `documenter-delegation`.

## Contrato de reglas del ciclo
Follow the central rules contract (skill `agent-rules-contract`) and validate with `spectralis check --rules`; do not duplicate the cycle or invent per-repo conventions.

## Briefing técnico en la propuesta
Al proponer un cambio (sdd u odd), rellena el briefing del folder note (`## Contexto`, `## Decisiones técnicas`, `## Impacto`) antes de invocar al planificador y antes de crear proposal/specs/design/tasks; en el apply se refresca sin duplicar. Detalle: skill `obsidian-briefing`.
