# Proposal: add-stack-detection-and-docs-variants

## Why

Al instalar la plantilla en un proyecto, `install.sh` copia `docs/` tal cual: `frontend-standards.md` y `backend-standards.md` son específicos de un proyecto origen (Chapur Pay: JSP + DWR + Oracle + Spring Boot) y no reflejan la tecnología del destino. El usuario recibe estándares que no corresponden a su stack y la corrección queda en manos de un paso manual posterior (skill `sdd-onboard-project`, Fase 3), fácil de olvidar.

## What Changes

- **Detección de stack en `install.sh`** (híbrida, solo lectura): escanea raíz + un nivel del destino (indicadores: `pom.xml`, `package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`) e infiere backend (p. ej. Java/Spring Boot, Node/Express) y frontend (p. ej. React); extrae nombre del proyecto y versiones. El resultado se reporta en el reconocimiento y en `--dry-run`.
- **Docs por variante**: se retiran del repo los estándares específicos de Chapur Pay y se crea `docs-variants/` (no viaja al destino tal cual) con variantes backend (`generic`, `spring-boot`, `express-node`) y frontend (`generic`, `react`). `install.sh` copia la variante detectada como `docs/backend-standards.md` / `docs/frontend-standards.md`, rellenando placeholders (`{{PROJECT_NAME}}`, `{{LANGUAGE}}`, `{{LANGUAGE_VERSION}}`, `{{FRAMEWORK}}`, `{{FRAMEWORK_VERSION}}`, `{{BUILD_TOOL}}`, `{{TEST_FRAMEWORK}}`) con lo detectado. Si no hay frontend (proyecto backend puro), `frontend-standards.md` no se copia y se reporta.
- **Sugerencia opt-in de `npx autoskills`**: al terminar la copia, el instalador pregunta al usuario si desea ejecutar `npx autoskills` en el destino para instalar skills curadas de su stack (requiere Node >= 22; fallo no es fatal; con `--yes` se omite y queda como paso pendiente).
- **Skill `sdd-onboard-project` (Fase 3)**: pasa de crear/adaptar estándares desde cero a **refinar la variante ya instalada** (ajustar ORM, testing y convenciones observadas en el grafo; marcar secciones no aplicables).
- **README y guía manual** actualizados a la nueva mecánica de docs.

## Capabilities

### Modified
- `sdd-template-install`: el manifiesto deja de declarar los estándares Chapur Pay como payload; nuevas capacidades de detección, selección de variante y sugerencia autoskills.

### Modified
- `sdd-project-onboarding`: la adaptación de estándares se redefine como refinamiento de la variante instalada.

## Impact

- `install.sh` (nuevas fases: `detect_stack`, selección/llenado de variantes, prompt autoskills)
- `docs/frontend-standards.md` y `docs/backend-standards.md` (eliminados) → `docs-variants/{backend,frontend}/`
- `docs/base-standards.md` (nota sobre variantes), `docs/manuals/manual-installation.md`, `README.md`
- `.agents/skills/sdd-onboard-project/SKILL.md` (Fase 3)
