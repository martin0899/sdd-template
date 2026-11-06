# Design: tdd-enforcement

## Context

Capacidad que adopta TDD de forma enforceable: obliga a escribir pruebas antes del código en los `tasks.md` de los changes OpenSpec y lo valida mecánicamente con `spectralis check --tdd`.

## Decisions

- **Step K obligatorio en tasks.md**: El sistema SHALL exigir que, en `tasks.md`, toda tarea de implementación de funcionalidad nueva vaya precedida (en la misma sección, antes de la primera tarea de código) de una tarea que escriba la prueba fallida…
- **Marcador mecánico TDD**: El sistema SHALL reconocer como tarea de tests previa toda tarea de `tasks.md` cuyo texto incluya un marcador explícito `(TDD)`, `tests first`, `test first` o `pruebas antes`.
- **Sub-comando spectralis check --tdd**: El sistema SHALL exponer un comando `spectralis check --tdd` que valide de forma determinista (sin LLM, solo lectura) el orden TDD de los `tasks.md` de los changes activos de OpenSpec.
- **Alcance sobre changes activos**: El sistema SHALL validar únicamente los `tasks.md` de los changes activos en `openspec/changes/`, excluyendo el directorio `archive/`.
- **Secciones exentas**: El sistema SHALL ignorar en la validación las secciones de `tasks.md` cuyo título indique tareas no implementables de funcionalidad: Setup, Verification, Documentación, pruebas manuales con curl, E2E o…
- **Salida y exit code del sub-check TDD**: El sistema SHALL presentar la salida del sub-check en la misma tabla que el resto de sub-checks (severidad, proyecto, artefacto, sugerencia), reportar las violaciones del orden TDD como severidad error y devolver exit…

## Verification

6 requisitos condensados desde
`openspec/specs/tdd-enforcement/spec.md` (89 líneas en el original).
