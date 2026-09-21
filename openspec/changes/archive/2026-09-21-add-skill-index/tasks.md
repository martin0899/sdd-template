# Tasks: add-skill-index

## 1. Índice de skills

- [x] 1.1 Crear `.agents/skills/INDEX.md` con cabecera explicativa y tabla con columnas: skill, trigger/description que la detona, ruta completa al SKILL.md. Verificar que el archivo existe y la tabla renderiza en markdown.
- [x] 1.2 Añadir una fila por cada una de las 12 skills en `.agents/skills/` (adversarial-review, code-auditing, commit, enrich-us, explain, meta-prompt, sdd-onboard-project, show-spec-working, thermo-nuclear-code-quality-review, update-docs, using-git-worktrees, writing-skills), con trigger condensado en una línea y ruta completa tipo `.agents/skills/<nombre>/SKILL.md`. Verificar que la cantidad de filas coincide con `ls .agents/skills/ | wc -l` y que cada ruta existe (`test -f`).

## 2. Regla en AGENTS.md

- [x] 2.1 Añadir en `AGENTS.md` una regla de una línea que ordene consultar `.agents/skills/INDEX.md` antes de invocar cualquier skill del proyecto y cargar solo el `SKILL.md` elegido. Verificar leyendo el archivo que la regla está presente y es clara.

## 3. Validación

- [x] 3.1 Ejecutar `openspec validate --change add-skill-index` y verificar que pasa sin errores.
