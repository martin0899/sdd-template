# Design: add-spanish-commit-review-gate

## Context

Ver `proposal.md - Why`. Estado actual:

- `.agents/skills/commit/SKILL.md` es la fuente canónica; `docs/base-standards.md` (regla "English Only", sección 2) la manda como referencia y el repo la describe como núcleo de reglas de desarrollo con precedencia sobre toda otra guía.
- `docs/backend-standards.md` (~línea 1247) y `docs/frontend-standards.md` (~línea 550) repiten "descriptive commit messages in English".
- `install.sh` copia `.agents/skills/` y `docs/` completos al destino; no hay lista blanca que haya que tocar.
- La skill ya tiene un modo "solo descripción" disparado por petición explícita del usuario (SKILL.md, sección 0).

## Goals / Non-Goals

**Goals:**
- Un único punto de verdad para el gate de revisión: la skill `commit`.
- Coherencia documental: ninguna regla restante en el repo debe contradecir commits/PRs en español.

**Non-Goals:**
- No cambiar el comportamiento de `install.sh` ni de las skills `openspec-*`.
- No definir estilo tipográfico del mensaje (convencional commits, emojis, longitud exacta del asunto) — se mantiene la libertad actual del subject/body.
- No añadir verificación automática (hooks, CI) del idioma o del gate.

## Decisions

1. **El gate vive en la skill, como paso obligatorio entre inspección (paso 1) y commit (paso 4), no como nueva sección aparte.**
   La skill reescribe sus pasos 1–3 actuales para que el resultado de la fase de inspección sea una *propuesta de revisión* (archivos clasificados + mensaje) que se muestra al usuario y se bloquea hasta confirmación.
   *Alternativa considerada:* mantener el auto-commit y añadir una advertencia — descartada porque el requisito del usuario es "siempre proponer y esperar".

2. **Clasificación de archivos en tres cubetas obligatorias**: (a) del alcance, (b) ajenos al alcance, (c) sensibles/generados. La (c) se excluye siempre: ni siquiera una confirmación genérica del gate la incluye; hace falta una orden explícita adicional. Reutiliza la lista de exclusiones existente de la skill (`.env`, artefactos de build, config local).
   *Alternativa:* una sola lista plana — descartada porque oculta qué es "inesperado", que es el riesgo central que el usuario quiere ver.

3. **Formato del gate**: bloque único con `ARCHIVOS A STAGEAR` (rutas + hunks), `ARCHIVOS EXCLUIDOS` (con motivo) y `MENSAJE PROPUESTO` (en español, en bloque de código). Preguntar con `[s/N]` y respetar la respuesta sin re-preguntar en bucle. Con argumentos de ticket, la cubeta (a) se limita a los hunks del feature.

4. **base-standards.md: "Git commit messages" pasa de la lista English-only a la lista Spanish** con redacción explícita que cubre también títulos/descripciones de PR; las menciones en backend/frontend-standards se editan *mínimamente* (solo quitar "in English"), sin reestructurar esas secciones.
   *Razón:* base-standards tiene precedencia; dejar las otras dos en contradicción haría ambigua la regla. Edición mínima para no arrastrar cambios no relacionados.

5. **Modo "solo descripción" existente se conserva** como override explícito del usuario y pasa a producir directamente el entregable del gate (lista + mensaje copiable) sin esperar confirmación, ya que nunca ejecuta git.

6. **Idioma del gate mostrado al usuario: español** — coherente con el contexto del proyecto (config.yaml inyecta español en la UI de agentes).

## Risks / Trade-offs

- [Agentes que ignoran la skill y commitean por su cuenta] → El gate queda redactado en MUST/SHALL dentro del paso 4 de la skill y en `docs/openspec-tasks-mandatory-steps.md` no hay nada que lo contradiga; la skill es la vía oficial invocada por el usuario.
- [Conflicto residual con estándares externos (equipo prefiere inglés)] → El cambio es deliberado y quedó BREAKING en el proposal; revertir es editar 4 archivos (migración trivial).
- [Proyectos ya instalados no reciben el cambio automáticamente] → `install.sh` compara archivo a archivo y pregunta por conflictos con backup; al re-ejecutarlo la versión nueva se ofrece como reemplazo. No se añade mecanismo extra.

## Migration Plan

1. Aplicar las 4 ediciones de archivo (skill + 3 docs) según `tasks.md`.
2. Rollback: `git revert` del commit del change (los archivos viajan en el repo plantilla; no hay estado generado).
