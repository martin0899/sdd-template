# Design: inject-agents-md-rules

## Context

El repo plantilla tiene un `AGENTS.md` raíz (18 líneas) con dos secciones de reglas: (1) el puntero a `docs/base-standards.md` como núcleo de reglas de desarrollo, y (2) las reglas graphify-first (usar graphify antes que nada para investigación de código, `graphify update .` tras cambios, wiki/GRAPH_REPORT para navegación). El título actual — "Coding Guidelines for Chapur Pay" — es branding heredado del proyecto origen. El instalador actual (`install.sh`) no gestiona `AGENTS.md` en absoluto. Los changes previos (`add-sdd-template-installer`, `remove-sdd-cli-guide`) están implementados y pendientes de archivar; los specs principales aún no existen.

## Goals / Non-Goals

**Goals**
- Todo proyecto instalado termina con las reglas de agentes presentes en su `AGENTS.md`.
- Reglas propias del destino jamás alteradas (solo crear o APPEND marcado).
- Idempotencia total con re-instalaciones.
- Paridad con la instalación manual (Windows).

**Non-Goals**
- No se generan variantes por agente (`.cursor/rules`, `CLAUDE.md`, `.github/copilot-instructions.md`): solo `AGENTS.md` (estándar cruzado que varios agentes leen; Claude Code lo soporta en lectura junto a CLAUDE.md).
- No se edita el contenido de las reglas (solo el título).
- No se toca la skill de onboarding para esto (es comportamiento del instalador).

## Decisions

### D1: `AGENTS.md` de la plantilla como fuente canónica única — no bloque embebido en install.sh
El instalador lee el contenido desde `$TEMPLATE_ROOT/AGENTS.md` en tiempo de ejecución. Alternativa descartada: duplicar las reglas como array heredoc dentro del script (dos copias que divergen; el propio `SPANISH_CONTEXT` es excepción porque es una regla de la plantilla, no un archivo que la plantilla ya mantiene). El paso previo neutraliza el título de la plantilla para que el mismo archivo sirva en ambos contextos.

### D2: Doble camino — copia completa si falta; APPEND sin H1 con marcador si existe
- Sin `AGENTS.md`: `cp` directo del de la plantilla (título genérico "Coding Guidelines").
- Con `AGENTS.md`: se añade al final un bloque delimitado:
  ```markdown
  <!-- BEGIN: SDD template rules (agregado por install.sh) -->
  (secciones del AGENTS.md de la plantilla, sin su línea H1)
  <!-- END: SDD template rules -->
  ```
  Marcadores BEGIN/END habilitan detección y actualización futura idempotente. Deduplicación: si el destino ya contiene el marcador BEGIN (re-instalación) o la sentencia distintiva de reglas graphify ("ALWAYS use graphify first") sin marcador (el usuario ya integró las reglas a mano), se salta y se reporta "ya presente". Alternativa descartada: respaldar y reemplazar el archivo (violaría la política anti-corrupción para el archivo de reglas más sensible del proyecto).

### D3: El bloque de append excluye la línea H1 de la plantilla
Al añadir sobre un `AGENTS.md` existente se preserva el H1 del destino; se copian las líneas 2..fin del archivo de plantilla (secciones íntegras). Implementación: `tail -n +2 "$TEMPLATE_ROOT/AGENTS.md"`.

### D4: Orden de ejecución dentro del instalador
El paso corre DESPUÉS de `inject_spanish_context` y ANTES de `copy_payload` (agrupa todas las inyecciones juntas; la copia del payload puede continuar aunque el usuario rechace el append de reglas — decisión independiente). En `--dry-run` el plan muestra qué haría: "crear AGENTS.md" / "añadir bloque de reglas" / "reglas ya presentes".

## Risks / Trade-offs

- [El usuario destino edita sus reglas y las de la plantilla quedan como bloque separado con doble mención de graphify] → los marcadores BEGIN/END permiten que el usuario las reorganice o borre a gusto; el instalador no re-toca nada si el marcador existe.
- [`tail -n +2` rompe si la estructura del AGENTS.md de plantilla cambia] → tarea de verificación incluye comprobar que el bloque añadido no contiene H1 duplicado.
- [Destino con `AGENTS.md` en mayúsculas distintas (agents.md)] → el instalador solo detecta `AGENTS.md` exacto; caso raro, documentado en el manual (el usuario puede renombrar).

## Migration Plan

1. Neutralizar título del `AGENTS.md` de plantilla.
2. Implementar paso en `install.sh` (detección + dry-run + copia/append idempotente).
3. Actualizar README y `docs/manuals/manual-installation.md` (paso manual + paridad).
4. Verificación: 3 escenarios de spec sobre dummies + grep + `openspec validate --strict`.
5. Rollback: git (pendiente del primer commit; ver nota del change anterior).

## Open Questions

(ninguna)
