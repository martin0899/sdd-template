# Tasks: add-spanish-commit-review-gate

> Nota de aplicabilidad: este change modifica únicamente la skill `commit` y documentos
> de estándares (sin código de backend, sin endpoints, sin base de datos y sin UI). Los
> pasos obligatorios de pruebas unitarias / curl / E2E de
> `docs/openspec-tasks-mandatory-steps.md` no aplican (sección 5: rigen cambios de
> backend/frontend); la verificación de cada tarea es por inspección de los archivos
> editados y `openspec validate`.

## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Crear rama `feature/add-spanish-commit-review-gate` desde la rama base y verificar con `git branch --show-current` que la rama actual es la creada
- [x] 0.2 Verificar con `git status` que el árbol de trabajo queda limpio de cambios ajenos a este change (el diff pendiente de `install.sh` NO se mezcla: queda para su propio commit o se coordina con el usuario antes)

## 1. Skill commit: idioma español y puerta de revisión

- [x] 1.1 En `.agents/skills/commit/SKILL.md`, reemplazar la regla "Write the commit message **in English**" (paso 3) por la regla de mensaje en español (asunto imperativo corto, prefijo opcional de scope/ticket, cuerpo qué/por qué) y verificar que la sección ya no contiene "in English"
- [x] 1.2 Insertar en la skill el nuevo paso obligatorio de *revisión previa al commit* entre la inspección de estado (paso 1) y el commit (paso 4): lista de archivos/hunks a stagear clasificados en (a) del alcance, (b) ajenos al alcance, (c) sensibles/generados — con bloqueo hasta confirmación explícita `[s/N]`; verificar leyendo la skill que ningún paso anterior a la confirmación ejecuta `git add`/`git commit`
- [x] 1.3 Añadir a la skill la regla de exclusión incondicional de la cubeta (c): `.env`, secretos y artefactos generados solo se stagean con una orden explícita adicional del usuario; verificar que la redacción usa MUST y que aparece el ejemplo `.env`
- [x] 1.4 Añadir a la skill el entregable de *commit manual por el usuario*: si el usuario rechaza que el agente ejecute git, responder con lista de archivos + mensaje copiable y terminar sin comandos git; verificar que el modo "solo descripción" (paso 0 actual) queda descrito como override explícito que produce directamente este entregable
- [x] 1.5 Actualizar en la skill los pasos 5–6 (PR con `gh`): título y descripción del PR en español; verificar que la sección PR no exige inglés
- [x] 1.6 Actualizar la sección "References" de la skill para apuntar a la regla revisada de `docs/base-standards.md` (español para commits/PR); verificar coherencia con 2.1

## 2. Estándares: eliminar la exigencia de inglés para commits

- [x] 2.1 En `docs/base-standards.md`, mover "Git commit messages" de la lista *English Only for Technical Artifacts* a *Spanish for User Interactions*, ampliando la redacción a "Git commit messages, Pull Request titles and descriptions"; verificar que la sección 2 no vuelve a mencionar commits en inglés
- [x] 2.2 En `docs/backend-standards.md` (regla "Descriptive Commits"), quitar "in English" del mensaje de commit y verificar con `grep -n "commit messages in English" docs/backend-standards.md` que no queda coincidencia
- [x] 2.3 En `docs/frontend-standards.md` (regla "Descriptive Commits"), quitar "in English" y verificar con `grep -n "commit messages in English" docs/frontend-standards.md` que no queda coincidencia

## 3. Verificación integrada

- [x] 3.1 Ejecutar `openspec validate --change add-spanish-commit-review-gate --strict` y verificar que pasa sin errores
- [x] 3.2 Buscar contradicciones residuales: `grep -rniE "commit messages? (must be )?in english" docs .agents/skills openspec/specs` y verificar cero coincidencias (excluidos `openspec/changes/archive/`)
- [x] 3.3 Demostrar el gate sobre el árbol real: invocar la skill `commit` en modo sin git (dry-run) con el diff pendiente de `install.sh` y verificar que la salida lista archivos clasificados + mensaje propuesto en español sin ejecutar `git add`/`git commit`
- [x] 3.4 Actualizar el grafo de conocimiento tras las ediciones (`graphify update .`, o build completo si aún no existe `graphify-out/graph.json`) y verificar que el comando termina sin errores

## 4. Update Technical Documentation (MANDATORY)

- [x] 4.1 Revisar conforme a `docs/documentation-standards.md` si algún otro documento referencia los mensajes de commit en inglés (p. ej. `docs/development_guide.md`, `README.md`) y actualizarlo o dejar constancia verificada de que no aplica
  > Constancia: `development_guide.md`, `README.md` y `AGENTS.md` no mencionan commits; las
  > coincidencias restantes de "in English" en `docs/` (`backend-standards.md:712`,
  > `frontend-standards.md:170`, `documentation-standards.md:13/26/80`,
  > `manuals/README.md:9`) regulan comentarios de código y documentación técnica, no
  > mensajes de commit. No aplica.

## 5. Extensión durante apply: rama solo desde base (solicitada por el usuario)

- [x] 5.1 En `.agents/skills/commit/SKILL.md` (paso 1 y gate del paso 4): crear rama solo si la actual es base; si no, continuar en la rama actual con nota de rama en la propuesta (permite múltiples specs por commit/PR); verificar leyendo la skill v1.2.0 ambos comportamientos
- [x] 5.2 En `docs/openspec-tasks-mandatory-steps.md`: condicionar Step 0 a rama base, actualizar checklist §4 y ejemplo §6 en la misma línea; verificar que ningún pasaje exige ya crear rama incondicionalmente
- [x] 5.3 Añadir al delta spec el requisito "Creación de rama condicionada a la rama base" con sus dos escenarios y reflejarlo en proposal.md; verificar con `openspec validate "add-spanish-commit-review-gate" --strict` que pasa
