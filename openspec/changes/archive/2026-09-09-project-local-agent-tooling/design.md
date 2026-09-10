# Design: project-local-agent-tooling

## Context

La revisión de chapur_pay_plataforma (destino real donde se instaló el arnés) mostró tres fallas con raíz en la plantilla (ver proposal — Why): el destino versionó `graphify-out/` completo (grafo duplicado + ~500 cachés AST, 649 archivos / +626k líneas), su `.gitignore` quedó inconsistente (`.agents/` ignorado a mano; `.opencode/` y `skills-lock.json` versionados sin criterio), y un plugin opencode creado a mano mutaba el comando bash con un `echo` que contaminaba la salida del primer comando.

Estado relevante de la plantilla:

- `install.sh` ya maneja la inyección de `AGENTS.md` con patrón marcador BEGIN/END + sentinel ("ALWAYS use graphify first") e idempotencia (`manage_agents_md`), y el manifiesto de payload ya excluye `install.sh`, cambios activos y `graphify-out/` del propio repo plantilla — pero no gestiona el `.gitignore` del **destino**.
- El flujo de actualización de `sync-project-agent-config` (en progreso) ya es marcador-consciente para bloques gestionados (tarea 4.1): es el vehículo para llevar la nueva regla a destinos existentes, porque un install normal con sentinel-skip no los tocaría.
- La skill `openspec-sync-specs` existe duplicada: `.agents/skills` (generada por openspec 1.3.1, obsoleta) y `.opencode/skills` (v1.11.0, vigente). opencode registra ambas y sirve la obsoleta.
- El CLI de OpenSpec es el dueño de `.opencode/skills/openspec-*`: los regenera en upgrades.

## Goals / Non-Goals

**Goals:**

- Ningún destino instalado puede versionar tooling de agente (`.agents/`, `.opencode/`, `skills-lock.json`) ni artefactos generados (`graphify-out/`, `.sdd-backup-*/`).
- Fuente única por skill: los agentes reciben la versión vigente de las instrucciones openspec.
- Cero plugins opencode en el payload, con la decisión documentada.
- Pruebas que blinden el `.gitignore` gestionado (install limpio, re-install idempotente).

**Non-Goals:**

- Corregir destinos ya instalados (la cirugía git de chapur_pay_plataforma — untrack y, si procede, reescritura de historia — se ejecutará aparte).
- Instalación de skills a nivel usuario/global (opción P1, rechazada por el usuario).
- Rehacer el plugin con `experimental.chat.system.transform` (alternativa futura documentada, no implementada).
- Cambiar las instrucciones de uso de graphify para búsqueda (`query`, `path`, `explain`): se mantienen intactas.

## Decisions

1. **Skills project-local con `.gitignore`** (decisión del usuario, opción P2) en lugar de instalación user-level (`~/.agents/skills`). Se acepta la duplicación por proyecto como precio de la autonomía: cada proyecto tiene su copia, y el flujo de promoción (copiar la skill a la plantilla + re-instalar/update) es el canal de distribución. Alternativa P1 descartada: requiere spike de `npx autoskills` en modo global y reescribe el modelo mental del usuario.

2. **`manage_gitignore()` como bloque marcado idempotente**, mismo patrón que el inyector de `AGENTS.md` (marcador BEGIN/END + detección por sentinel): crea el archivo si falta, añade por APPEND si existe, nunca toca el contenido propio del destino. Alternativas descartadas: copiar el `.gitignore` de la plantilla (pisaría reglas propias del proyecto) y ediciones ad-hoc con sed (no idempotentes).

3. **Cinco exclusiones gestionadas**: `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json`. El lock se ignora por decisión del usuario (decisión explícita en la captura): la reproducibilidad del install de skills en otra máquina se logra re-corriendo `install.sh`/`npx autoskills`, no versionando el lock.

4. **`AGENTS.md` y `openspec/` siguen versionándose en destinos**: las reglas y los specs son contenido del proyecto (por eso la revisión sí debía versionarlos); skills, comandos y plugins son tooling local. Esta frontera queda explícita en base-standards.

5. **Sin plugin; el recordatorio de graphify vive en las reglas de `AGENTS.md`**: el bloque inyectado se lee en cada turno (el plugin solo actuaba en el primer bash) y no muta comandos. La mutación del comando se rechaza porque contamina la salida del primer comando (P1) y su comentario contradecía el código (P2). Si algún día se quiere refuerzo programático, la vía correcta documentada es `experimental.chat.system.transform` (inyección en system prompt condicionada a `graphify-out/graph.json`), no `tool.execute.before`.

6. **Exención vendor para `openspec-*` en vez de symlinks**: se retira la copia obsoleta de `.agents/skills` y la fuente queda en `.opencode/skills` (gestionada por el CLI). Los symlinks (ley §6) pelean contra el dueño real: el CLI regenera `.opencode/skills/openspec-*` en upgrades y podría escribir a través del enlace o dejarlo roto. La divergencia ya ocurrió (1.3.1 vs 1.11.0, y la obsoleta era la servida), así que borrar la copia es además la corrección del bug vivo. §4/§6 de base-standards documentan la exención y el flujo de promoción de skills locales hacia la plantilla.

7. **Warning de rutas ya versionadas**: `manage_gitignore()` detecta (read-only) si el destino ya tiene trackeadas rutas del arnés o artefactos generados y advierte con el untrack sugerido. Sin esto, un destino re-instalado seguiría con el bloat committeado sin enterarse.

## Risks / Trade-offs

- [Un destino con reglas ya inyectadas no recibe la nueva regla machine-local en un install normal (sentinel-skip)] → el flujo de update de `sdd-config-sync` (tarea 4.1, bloques gestionados marcador-consciente) la entrega a destinos existentes; se documenta en manuales.
- [El CLI de openspec puede regenerar `.opencode/skills/openspec-*` en upgrades] → el sync los clasifica como vendor-managed; al no existir copias en `.agents/` ya no hay drift que detectar; el lock ignorado no bloquea re-instalaciones.
- [Un destino que quisiera versionar `.agents/` vería el bloque reaplicado en re-installs] → política por defecto del instalador; escape hatch documentado (quitar el bloque marcado; reintroducir flag `--no-manage-gitignore` solo si hay demanda).
- [El hook post-commit de graphify reconstruye el grafo tras cada commit] → el grafo queda local y los commits limpios por diseño del `.gitignore`; sin acción adicional.
- [Duplicación de skills entre proyectos (precio de P2)] → aceptada por el usuario; el update flow mantiene paridad con la plantilla; el drift de skills locales es responsabilidad del proyecto hasta su promoción.

## Migration Plan

- Instalaciones nuevas: reciben `manage_gitignore` + bloque AGENTS.md actualizado sin pasos extra.
- Destinos existentes: reciben la regla machine-local vía el flujo de update (`sdd-config-sync`); los que ya versionaron tooling ven el warning del instalador con el untrack sugerido.
- chapur_pay_plataforma: corrección git aparte (`git rm -r --cached graphify-out/` y, siendo rama individual no contenida en develop/master, opcionalmente reescritura de historia con force-push).
- Rollback: revertir `install.sh`/`AGENTS.md` de la plantilla; el bloque marcado del `.gitignore` de un destino se elimina a mano sin rastros.

## Open Questions

- (ninguna que afecte specs, enfoque o tasks) — el flag `--no-manage-gitignore` queda como posible mejora futura, no decidida.
