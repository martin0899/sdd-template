# Design: lean-harness-payload

## Decisiones Técnicas

### 1. Stubs neutros de stack (ruta A: reemplazo de contenido)

**Decisión**: Sustituir el contenido de los tres manuales LTI por stubs neutros, sin cambiar la plomería (`listDocsFiles`, `copyPayload`, `classify-update`).

**Justificación**:
- El mecanismo de distribución ya funciona correctamente; solo el contenido es incorrecto.
- Cambiar la plomería sería un refactor innecesario y aumentaría el riesgo.
- `sdd-onboard-project` conserva su rol de rellenar los stubs con el stack específico.

**Contenido de los stubs**:

| Archivo | Contenido |
| :--- | :--- |
| `docs/api-spec.yml` | Esqueleto OpenAPI 3.0 (~25 líneas): `openapi: 3.0.0`, `info` con título genérico, `paths: { /health: { get: ... } }`, `components.schemas: {}`, comentario indicando que `sdd-onboard-project` lo rellenará. |
| `docs/data-model.md` | Placeholder (~15 líneas): H1, párrafo explicando que el modelo se genera con `graphify`, placeholder `{{entities}}`, instrucciones para ejecutar `graphify query` y `graphify explain`. |
| `docs/development_guide.md` | Secciones con placeholders (~30 líneas): H1, secciones `Setup`, `Commands`, `Structure`, `Environment` con placeholders genéricos (`{{stack}}`, `{{commands}}`, etc.), sin credenciales ni repositorios ajenos. |

**Alternativas consideradas**:
- Ruta B (eliminar los archivos y excluirlos de `listDocsFiles`): rechazada porque los proyectos destino necesitan un punto de partida documental.
- Ruta C (mover a `docs/manuals/` que ya se excluye): rechazada porque `manuals/` es para manuales de referencia, no para plantillas de proyecto.

**Impacto**: Los tres archivos cambian de hash. En el próximo `update` de instalaciones existentes aparecerán como conflictos actualizables. Es esperado y aceptado (ver riesgos).

### 2. AGENTS.md mínimo (~25 líneas)

**Decisión**: Reducir `AGENTS.md` de ~44 a ~25 líneas (rango 22–28).

**Contenido objetivo**:
```
# AGENTS.md - Coding Guidelines

## Core Development Rules
> [`docs/base-standards.md`](./docs/base-standards.md) is the single source of truth. Read it first.

## Skills Index
Consult [`.agents/skills/INDEX.md`](./.agents/skills/INDEX.md). New skills: `.agents/skills/<name>/SKILL.md` only.

## graphify
Always `graphify query` first. Never commit `graphify-out/`. After code changes: `graphify update .`.

## Mandatory OpenSpec
All requirements go through OpenSpec. Enforcement: skill `openspec-gate`.

## Obsidian Orchestration
Check `spectralis config --get obsidianSync`. If active: skill `obsidian-orchestration`.

## Lessons
Read `_lessons.md` before acting. Register corrections as `- Cuando X, haz Y`. Skill: `lessons`.

## Ciclo spec (fachada)
La fachada enruta el ciclo. Un solo ejecutor activo por change. Detalle: skill `subagent-contract`.

## Delegación documental
Request documentary work from coordinador — never publish on your own. Skill: `documenter-delegation`.
```

**Justificación**:
- De 44 a ~25 líneas: ~40 % de reducción.
- Cada sección es un puntero, no una regla duplicada.
- Las 13 subcadenas de la integration test se reducen a las esenciales como enrutador.

**Efecto colateral asumido**: `test/integration/agents-md-reduced.test.ts` fija hoy el rango 35–45 y 13 subcadenas. Se reescribe a rango 22–28 y ~7–8 subcadenas esenciales. No es una regresión: es el contrato nuevo deliberado.

**Restricción**: Los inyectores de `src/core/agents-md.ts` (`managedBlock`, `extractBlock`, `detectAgentsMdDrift`, `manageAgentsMd`) no se tocan. Funcionan con cualquier contenido template.

### 3. Flag `update --prune` con semántica de seguridad

**Decisión**: Añadir `--prune` a `spectralis update` con las siguientes garantías:

#### 3.1 Hash-match only

Solo se borran archivos `retired` cuyo hash en disco coincide con el hash en el manifiesto. Si el usuario editó el archivo, el hash difiere → no se toca.

**Implementación**: Reutilizar `sha256File()` de `src/core/manifest.ts` y la comparación ya existente en `classify-update.ts:52-78`. Para archivos `retired`, el hash del manifiesto es la última referencia conocida; si el archivo en disco no coincide, fue editado post-instalación.

#### 3.2 Backup previo en `.sdd-backup-*`

Antes de borrar cualquier archivo, se crea un directorio `.sdd-backup-<timestamp>-<pid>` y se copia el archivo allí con su ruta relativa. El patrón de nombre sigue el ya usado en `copyPayload` (`src/core/copy-payload.ts:95-98`) y `update.ts:192-195`.

**Implementación**: Reutilizar `backupFile()` de `src/commands/update.ts:48-53` (o extraerlo a un helper compartido si es necesario).

#### 3.3 fs-only, nunca git

El borrado se realiza con `rmSync` de `node:fs`. Nunca se invoca `git rm`, `git add` ni ningún otro comando git. Esto es consistente con el resto del arnés, que opera a nivel de filesystem.

#### 3.4 `--dry-run` y `--check` honrados

- `--check`: reporta cuántos archivos retirados serían borrados (hash-match) y cuántos se preservarían (hash distinto). No escribe nada.
- `--dry-run`: mismo comportamiento que `--check` para `--prune`, pero en el contexto del plan completo de update.
- En ambos modos, no se crea backup ni se borra nada.

#### 3.5 Confirmación salvo flag explícito

Sin `--yes` ni `--auto`, `--prune` pide confirmación explícita mostrando la lista de archivos a borrar. Con `--yes`/`--auto`, borra sin preguntar pero con backup igual.

#### 3.6 Interacción con el manifiesto

Tras un `--prune` exitoso, el manifiesto reescrito excluye los archivos borrados. Los archivos no borrados (hash distinto, backup fallido) permanecen en el manifiesto y se reportan como `retired` en el próximo `update`.

**Alternativas consideradas**:
- Borrado incondicional de retirados: rechazado porque destruiría ediciones del usuario.
- Borrado con prompt por archivo: rechazado porque sería tedioso con muchos archivos; un prompt global con lista es suficiente.
- Borrado vía `git rm`: rechazado porque el arnés opera a nivel fs y no todos los destinos son repos git.

### 4. Orden TDD

1. **Payload tests → stubs**: primero las pruebas que verifican el contenido de los stubs (OpenAPI esqueleto, placeholder con graphify, secciones con placeholders), luego la implementación (los archivos stub).
2. **Integration test rewrite → AGENTS.md rewrite**: primero se reescribe `test/integration/agents-md-reduced.test.ts` al nuevo rango 22–28 y secciones reducidas, luego se reescribe `AGENTS.md`.
3. **e2e `update --prune` → flag**: primero el test e2e (init → borrar un archivo → `update --prune`, reutilizando el fixture de `test/commands/update.test.ts:52-77`), luego la implementación del flag en `update.ts` y `spectralis.ts`.
4. **Docs/CHANGELOG/manual**: último, cuando el comportamiento está fijado.

### 5. Documentación del cambio

- `CHANGELOG.md`: entrada bajo `Unreleased`, describiendo los tres puntos.
- `README.md:~110`: mencionar que los stubs son neutros y `sdd-onboard-project` los rellena.
- `README.md:~372`: documentar `--prune` y su semántica de seguridad.
- `notes/spectralis-cli/manual.md`: actualizar la sección de `update` con `--prune`.

## Interacción con `consolidate-rules-eliminate-ollama-optimize-tokens`

El change activo-pero-completo ya implementó:
- Reducción de AGENTS.md de 143 a ~44 líneas.
- `manageAgentsMd` en `update.ts`.
- Integration test con rango 35–45 y 13 subcadenas.

Este change **no modifica el mecanismo**: no toca `manageAgentsMd`, `detectAgentsMdDrift`, los marcadores, ni `--repair-agents`. Solo cambia el contenido template y las aserciones de la integration test.

**Punto de fricción**: la integration test `agents-md-reduced.test.ts` tendrá que actualizarse. El change anterior la fijó en 35–45 líneas; este change la mueve a 22–28. Es un cambio deliberado del contrato, no una regresión.

**Sin conflicto en superficias de código**: `update.ts` se modifica solo para añadir `--prune` (nueva rama en el loop de archivos `retired`). `classify-update.ts` no se modifica. `agents-md.ts` no se modifica. `copy-payload.ts` no se modifica.
