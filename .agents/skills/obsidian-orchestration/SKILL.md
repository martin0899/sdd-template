---
name: obsidian-orchestration
description: Orquesta la sincronización entre el flujo OpenSpec y el segundo cerebro (cerebro) controlada por el switch obsidianSync. Invoca obsidian-briefing al completar un apply y obsidian-summary + obsidian-tests + spectralis spec complete antes de archivar. Use when applying or archiving an OpenSpec change with obsidianSync=1 (or --obsidian).
---

# obsidian-orchestration

Orquesta la documentación del **cerebro** (el segundo cerebro) durante el flujo OpenSpec, controlada por el switch `obsidianSync` o los flags `--obsidian` / `--no-obsidian`.

## Cuándo se dispara

- Al **completar** la implementación de un change (`/opsx-apply`) con la orquestación activa.
- **Antes** de archivar un change (`/opsx-archive`) con la orquestación activa.
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

### Al completar `/opsx-apply` (orquestación activa)

1. Invoca la skill `obsidian-briefing`.
2. Genera `briefing.md` en `01_Proyectos/<proyecto>/<change>/` con contexto, decisiones técnicas e impacto.
3. **Idempotente**: si el `briefing.md` ya existe y está completo, no lo regenera ni lo duplica.

### Antes de `/opsx-archive` (orquestación activa)

1. Invoca la skill `obsidian-summary` → resumen del change.
2. Invoca la skill `obsidian-tests` → documentación de tests.
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
- Esta skill NO modifica los comandos `.opencode/commands/opsx-*` (vendor-managed por OpenSpec).