## Purpose

Reducir el `AGENTS.md` template de ~44 a ~25 líneas, manteniendo su función de enrutador mínimo. El mecanismo de managed block (marcadores BEGIN/END, `manageAgentsMd`, detección de deriva) no cambia; solo cambia el contenido del template y las aserciones de la integration test que fija el contrato de líneas y secciones.

## MODIFIED Requirements

### Requirement: AGENTS.md es un enrutador mínimo (~25 líneas)

El `AGENTS.md` template del arnés SDD DEBE ser un enrutador mínimo de ~25 líneas (rango aceptado: 22–28) que delegue el detalle en `docs/base-standards.md` y en las skills. El contenido objetivo es:

- **One-liner** del proyecto (CLI TypeScript, `node:test`, build a `dist`).
- **3 reglas globales** destiladas (base-standards como fuente de verdad, skills en `.agents/skills/`, OpenSpec obligatorio).
- **Bloque graphify** de 2 líneas (siempre graphify primero, nunca commit graphify-out).
- **Mapa "cuándo leer qué"** → punteros a `base-standards`, `subagent-contract`, `agent-rules-contract`, `INDEX.md` de skills.
- **Un único puntero al ciclo** (fachada), sin repetir el ciclo.

NO DEBE duplicar contenido de `docs/base-standards.md` (líneas ≥40 caracteres no compartidas).

#### Scenario: AGENTS.md tiene entre 22 y 28 líneas

- **WHEN** se lee `AGENTS.md` del template
- **THEN** el conteo de líneas (sin trailing newlines) está entre 22 y 28
- **AND** la integration test `test/integration/agents-md-reduced.test.ts` refleja este rango

#### Scenario: AGENTS.md mantiene las secciones críticas como enrutador

- **WHEN** se lee `AGENTS.md` del template
- **THEN** contiene al menos las siguientes referencias/secciones (como H2 o en texto):
  - `docs/base-standards.md`
  - `.agents/skills/INDEX.md`
  - `graphify`
  - `OpenSpec` / `Mandatory OpenSpec`
  - `Obsidian Orchestration` / `obsidianSync`
  - `Lessons` / `_lessons.md`
  - `Fachada` / `ciclo spec`

#### Scenario: `manageAgentsMd` sigue funcionando con el template reducido

- **WHEN** `manageAgentsMd` crea o refresca el managed block
- **THEN** el bloque entre marcadores refleja el contenido reducido del template
- **AND** los inyectores de `src/core/agents-md.ts` no requieren cambios

#### Scenario: La integration test se reescribe al nuevo contrato

- **WHEN** se ejecuta `test/integration/agents-md-reduced.test.ts`
- **THEN** las aserciones de rango de líneas, secciones obligatorias y no-duplicación pasan con el nuevo template de ~25 líneas
- **AND** las aserciones anteriores (rango 35–45, 13 subcadenas) se sustituyen por las nuevas

### Requirement: No se altera el mecanismo de managed block

El mecanismo de managed block (marcadores `<!-- BEGIN/END: SDD template rules -->`, `detectAgentsMdDrift`, `manageAgentsMd`, `--repair-agents`) NO DEBE modificarse. Solo cambia el contenido del template que se inyecta entre los marcadores.

#### Scenario: Init con el nuevo template produce un managed block reducido

- **WHEN** `spectralis init` crea `AGENTS.md` en un destino nuevo
- **THEN** el archivo tiene H1 + managed block con el contenido reducido (~25 líneas en total)
- **AND** los marcadores BEGIN/END están presentes

#### Scenario: Update refresca el bloque reducido igual que el anterior

- **WHEN** `spectralis update` detecta deriva del managed block
- **THEN** reemplaza el bloque con el contenido reducido del template
- **AND** el comportamiento es idéntico al actual (backup, confirmación, etc.)
