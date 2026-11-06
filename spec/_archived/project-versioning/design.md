# Design: project-versioning

## Context

Gestión de la versión del proyecto destino en `.sdd-manifest.json` con reglas deterministas: PATCH auto-incrementa con cada spec archivada, MINOR sube al crear una versión release, MAJOR solo por ruptura de compatibilidad explícita, cada componente topa en 99 con carry.

## Decisions

- **Versión del proyecto en el manifest**: El sistema SHALL registrar la versión del proyecto en `.sdd-manifest.json` bajo el campo `projectVersion` (schema v3), y SHALL leer manifest v2 existentes de forma tolerante derivando `projectVersion` desde…
- **Prompt de versión en init**: El sistema SHALL preguntar la versión actual del proyecto durante `spectralis init`, con Enter sin valor produciendo el default `1.0.0`, y SHALL sugerir la versión detectada del `pom.xml`/`package.json` si existe.
- **Regla de bump por spec archivada**: El sistema SHALL incrementar el componente PATCH de `projectVersion` en 1 por cada especificación archivada (con su commit), con carry: al llegar a 99, PATCH pasa a 0 y MINOR sube en 1 (`1.2.99` + spec → `1.3.0`).
- **Regla de bump por release**: El sistema SHALL incrementar MINOR en 1 y resetear PATCH a 0 cuando el usuario solicita crear una versión release ("crea versión release y commit de cambios"), con carry si MINOR está en 99.
- **Regla de bump por MAJOR**: El sistema SHALL incrementar MAJOR solo por decisión explícita de ruptura de compatibilidad, no por conteo de specs.
- **Límite máximo por componente**: El sistema SHALL tratar `99` como valor máximo por componente; ningún componente puede superar 99 (el bump aplica carry al siguiente).
- **Fuente canónica para commit/release**: El sistema SHALL usar `.sdd-manifest.json` → `projectVersion` como fuente canónica de versión del proyecto en el flujo commit/release, con fallback al `pom.xml`/`package.json` si no existe manifest.

## Verification

7 requisitos condensados desde
`openspec/specs/project-versioning/spec.md` (126 líneas en el original).
