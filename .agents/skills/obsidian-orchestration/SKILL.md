---
name: obsidian-orchestration
description: Orquesta la sincronización entre el flujo de specs y el segundo cerebro (cerebro) controlada por el switch obsidianSync. Invoca obsidian-briefing al completar un apply y, al archivar, el archive nativo (que escribe el resumen del cerebro) más obsidian-summary y obsidian-tests sobre el folder note. Use when applying or archiving a change with obsidianSync=1 (or --obsidian).
---

# obsidian-orchestration

Orquesta la documentación del **cerebro** (el segundo cerebro) durante el ciclo de specs, controlada por el switch `obsidianSync` o los flags `--obsidian` / `--no-obsidian`.

## Cuándo se dispara

- Al **proponer** un change: `obsidian-briefing` rellena el briefing del folder note **antes** de crear los artefactos formales, en modo `sdd`.
- Al **completar** la implementación de un change (apply) con la orquestación activa.
- **Antes** de archivar un change (archive) con la orquestación activa.
- La regla persistente vive en el bloque gestionado de `AGENTS.md` y ordena consultar esta skill en esos momentos.

## Cómo determinar si la orquestación está activa

```bash
spectralis config --get obsidianSync
# → "0 [default]" | "1 [config]" | "1 [manifest]"
```

Regla de precedencia:

1. `--no-obsidian` → desactivada (anula todo).
2. `--obsidian` → activada (anula el switch).
3. `obsidianSync=1` (config o manifiesto) → activada.
4. Cualquier otro caso → desactivada (**no escribir nada en el cerebro**).

## Comportamiento

### Al completar la implementación (orquestación activa)

1. Invoca la skill `obsidian-briefing`.
2. Escribe/actualiza la sección de briefing **dentro del folder note único** `01_Proyectos/<Proyecto>/<change>/<change>.md` (headings canónicos `## Contexto`, `## Decisiones técnicas`, `## Impacto`), creándolo si falta.
3. **Idempotente**: si la sección ya existe y está completa, no la regenera ni duplica.

### Al archivar el change (orquestación activa)

**Motor nativo (default):**

1. Ejecuta `spectralis spec archive <change-id>`: mueve el change a `spec/_archived/<change-id>/`, completa la fila del REGISTRY y **escribe el resumen del cerebro directamente** (`05_wiki/<wiki-project>/<change-id>.md`), a partir del `change.json` del change (`resumen.abstracto`) y de sus artefactos.
2. **No hace falta `spectralis spec complete`**: el archive nativo valida, registra y destila en un solo paso.
3. Invoca `obsidian-summary` y `obsidian-tests` para **revisar y completar el folder note único** (`## Cambios realizados`/`## Lecciones aprendidas` y `## Tests de regresión`): en nativo ya no generan ficheros aparte, trabajan sobre el folder note vivo.
4. Si el archive falla (tareas pendientes sin `--force`, REGISTRY no escribible): informa del fallo y **NO fuerces el cierre** sin confirmación.

**Motor `engine: openspec`:**

1. Invoca la skill `obsidian-summary` → sección `## Cambios realizados`/`## Lecciones aprendidas` **en el mismo folder note**.
2. Invoca la skill `obsidian-tests` → sección `## Tests de regresión` **en el mismo folder note** (las tres skills escriben en el único artefacto de la spec).
3. Ejecuta `spectralis spec complete <proyecto> <change>` para validar, registrar en REGISTRY.md y destilar a `05_wiki/`.
4. **Si `spec complete` falla** (archivos vacíos o faltantes): informa el fallo pero **NO bloquea el archive**.

### Con orquestación desactivada

No invoces ninguna skill de Obsidian ni `spec complete`. No escribas nada en el cerebro. El flujo de apply/archive queda igual que sin orquestación.

## Notas de nomenclatura

- **cerebro** = Second Brain (sinónimos: brain, second-brain, sb) — manuales y docs del vault.
- **biblioteca** = LLM Wiki (sinónimos: book, library, wiki, llm-wiki, lib) — `05_wiki/` destilada.

## Relación con otras skills

- `obsidian-briefing`, `obsidian-summary`, `obsidian-tests` se invocan desde aquí; no cambian su comportamiento propio.
- `spectralis notes init`/`notes sync` se orquestan desde `spectralis init`/`update` (código del CLI), no desde esta skill.
- Esta skill NO modifica los comandos `.opencode/commands/opsx-*` (vendor-managed por OpenSpec): son *extras* del motor `openspec` y se siguen distribuyendo sin cambios.