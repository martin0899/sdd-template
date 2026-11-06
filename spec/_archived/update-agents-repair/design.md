# Design: update-agents-repair

## Context

Permite al comando `spectralis update` reparar y mantener el bloque gestionado de `AGENTS.md` incluso cuando el árbol de archivos está actualizado o cuando el bloque presenta inconsistencias (duplicados, incompleto, legacy sin marcadores).

## Decisions

- **Flag --repair-agents para reconstrucción forzada**: El comando `spectralis update` DEBE aceptar el flag `--repair-agents` que fuerza la reconstrucción del bloque gestionado de `AGENTS.md` con backup previo y reemplazo completo, incluso cuando el bloque está en estado…
- **manageAgentsMd no suprimido por partial**: El comando `spectralis update` DEBE ejecutar `manageAgentsMd` independientemente del valor del flag `partial`, garantizando que la reparación de `AGENTS.md` no sea suprimida por fallos de copia en otros archivos.
- **Excepciones de manageAgentsMd no tragadas**: El comando `spectralis update` NO DEBE capturar y suprimir excepciones lanzadas por `manageAgentsMd`.
- **Detección de deriva en --check**: El comando `spectralis update --check` DEBE detectar y reportar si el bloque gestionado de `AGENTS.md` difiere del contenido de la plantilla, incluso cuando todos los demás archivos están actualizados.
- **Manifest preserva entradas especiales**: El comando `spectralis update` DEBE preservar en el manifiesto las entradas de `AGENTS.md`, `openspec/config.yaml`, y standards compuestos, incluso cuando estos archivos no están presentes en el resultado de…

## Verification

5 requisitos condensados desde
`openspec/specs/update-agents-repair/spec.md` (83 líneas en el original).
