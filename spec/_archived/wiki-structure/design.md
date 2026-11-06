# Design: wiki-structure

## Context

Define la convención de estructura de `05_wiki/<Proyecto>/`: los cuatro documentos agregados planos (`arquitectura.md`, `decisiones.md`, `operacion.md`, `historial.md`) como único esquema de contenido generado por `seed` y `distill`, y el formato del índice `_INDEX.json` que lo refleja.

## Decisions

- **Estructura de 4 agregados al sembrar**: `spectralis seed` SHALL crear en `05_wiki/<proyecto>/` una estructura para los 4 agregados planos — `arquitectura.md`, `decisiones.md`, `operacion.md`, `historial.md` — y NO crear las carpetas obsoletas `decisiones/`,…
- **_INDEX.json con contenido de 4 agregados**: `spectralis seed` SHALL registrar en `_INDEX.json` el campo `content` de cada proyecto como `['arquitectura', 'decisiones', 'operacion', 'historial']`.
- **createWikiDir alineado**: `createWikiDir` (usado por `distill`) SHALL crear únicamente el directorio `05_wiki/<proyecto>/` sin subcarpetas obsoletas.
- **Escritura atómica de _INDEX.json**: `seed` SHALL escribir `_INDEX.json` de forma atómica (temp + rename), igual que `distill`.

## Verification

4 requisitos condensados desde
`openspec/specs/wiki-structure/spec.md` (57 líneas en el original).
