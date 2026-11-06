# Design: spec-facade

## Context

Fachada única y consciente del modo para iniciar, consultar, validar, completar y cerrar un cambio, delegando en OpenSpec cuando el modo es SDD y operando sobre `odd/changes/<id>/feature.md` cuando es ODD.

## Decisions

- **Fachada única consciente del modo**: La fachada de Spectralis SHALL exponer una interfaz común para iniciar, consultar, validar, completar y cerrar un cambio, y MUST resolver el modo activo antes de ejecutar cualquier operación.
- **Delegación en OpenSpec para SDD**: En modo SDD, la fachada SHALL delegar en el motor de OpenSpec para iniciar, consultar, validar, completar y cerrar el cambio, y MUST NOT reimplementar su formato, sus validaciones ni su estado.
- **Un solo ejecutor activo**: La fachada MUST garantizar un solo ejecutor activo por cambio: o el comando OpenSpec ejecuta el apply, o el coordinador deriva las tareas existentes una vez al implementador; MUST NOT ejecutar ambas rutas en paralelo ni…
- **Apply ejecuta tareas existentes**: `opsx-apply` SHALL significar ejecutar las tareas pendientes existentes y MUST NOT regenerar ni reemplazar el plan (`proposal`, specs, `design`, `tasks`).
- **Convergencia de entradas**: Las entradas equivalentes —el usuario invoca OpenSpec directamente o trabaja a través del coordinador— SHALL converger en el mismo ID de cambio, los mismos artefactos y el mismo propietario de fase.

## Verification

5 requisitos condensados desde
`openspec/specs/spec-facade/spec.md` (70 líneas en el original).
