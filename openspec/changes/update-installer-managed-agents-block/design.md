# Design: update-installer-managed-agents-block

## Context

`manage_agents_md()` (install.sh:733) hoy: crea `AGENTS.md` si falta; si tiene marcadores BEGIN/END o la sentinel, sale con "[OK] no se duplica" sin comparar contenido; si existe sin marcadores, hace APPEND del bloque marcado. El bloque se compone como `\n<BEGIN>\n` + `tail -n +2 AGENTS.md` de la plantilla + `\n<END>\n`. La plantilla ahora incluye la sección `## Skills Index`, que los destinos ya instalados no reciben. Ver proposal.md para el resto del alcance.

## Goals / Non-Goals

**Goals:**
- Que `--update` sincronice el contenido del bloque gestionado sin tocar el contenido propio del destino
- Mantener la política anti-corrupción: backup + confirmación antes de sobrescribir
- Cubrir en `post_checks` los artefactos nuevos del enrutado de skills

**Non-Goals:**
- No tocar el payload, el manifiesto ni el modo instalación nueva
- No reescribir reglas legacy sin marcadores (solo advertir)
- No distribuir la plantilla de Obsidian desde el instalador

## Decisions

### D1: Refresco por reemplazo del segmento entre marcadores, no por regeneración del archivo
Se extrae todo lo anterior al BEGIN y todo lo posterior al END del destino, y se recompone: [antes] + bloque de plantilla + [después]. Preserva secciones propias del destino con exactitud byte a byte. Alternativa descartada: regenerar `AGENTS.md` completo desde la plantilla (destruiría contenido propio) o APPEND de un segundo bloque (duplicaría reglas).

### D2: Comparación por el bloque completo, no por sección
Si el bloque destino difiere en cualquier punto del bloque plantilla, se reemplaza completo. Simplifica el código y evita diffs parciales frágiles en bash. El costo es reemplazar el bloque entero ante un cambio mínimo: aceptable porque el bloque es corto y viene de la fuente canónica.

### D3: Sentinel sin marcadores -> reescritura solo si el destino es idéntico a la plantilla; si no, skip + advertencia
La sentinel (`ALWAYS use graphify first`) indica reglas presentes en forma desconocida. Dos casos: (a) instalación previa sin customización — el archivo es byte a byte la plantilla, así que reescribirlo envuelto en marcadores es seguro y desbloquea el refresco futuro (con backup, sin preguntar); (b) archivo con contenido propio o legacy modificada — localizar el bloque sería heurística frágil, se advierte para revisión manual. Complemento necesario: la rama de creación (instalación fresca) ahora escribe el bloque YA envuelto en marcadores, para que el destino nazca gestionado y el problema no se reproduzca en la siguiente generación. Alternativa descartada: envolver en el destino legacy con heurística (riesgo de duplicar o dañar).

### D4: Verificación y recordatorio en `post_checks`, no en el flujo principal
`post_checks` es la ronda de verificación ligera existente; añadir dos `[[ -f ]]` y una línea de log mantiene el patrón. El registro de la ruta de plantilla es runtime de la skill (REGISTRY.md), así que solo va como recordatorio en pasos manuales.

## Risks / Trade-offs

- [Reemplazo del bloque corrompe el archivo si los marcadores están mal formados] → Mitigación: solo procede si BEGIN y END existen exactamente una vez cada uno; si no, advierte y salta. Backup previo en todos los casos.
- [Usuario rechaza el refresh y queda desincronizado] → Aceptado: comportamiento consistente con el resto del instalador (conflicto -> mantener). La advertencia de post_checks lo hará visible.
- [awk/sed multilínea frágil entre versiones de bash] → Mitigación: implementación con operaciones de archivo simples y `grep -c` para validar marcadores; verificación manual incluida en tasks.

## Migration Plan

Sin migración de datos. Rollback: `git revert` del cambio en la plantilla; los destinos actualizados conservan su backup `.sdd-backup-*`.

## Open Questions

Ninguna.
