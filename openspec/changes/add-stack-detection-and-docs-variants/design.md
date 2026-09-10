# Design: add-stack-detection-and-docs-variants

## Context

`install.sh` hoy copia `docs/` completo (estándares Chapur Pay incluidos). La detección de stack solo existe como flujo semántico de la skill de onboarding. El usuario pide: (1) detectar la tecnología durante la instalación y llenar correctamente frontend/backend, y (2) ofrecer `npx autoskills` para instalar skills del stack.

## Decisions

### D1. Detección híbrida, solo lectura, en `install.sh`
- Nueva fase `detect_stack()` tras `recognize_target()`, ANTES de cualquier escritura (compatible con `--dry-run`).
- Alcance: raíz del destino + un nivel (monorepos comunes). Primera coincidencia por orden:
  - Backend: `pom.xml` con `spring-boot-starter` → `spring-boot`; `pom.xml` → `generic` (Java/Maven); `package.json` con `@nestjs/core` → `nestjs` (chequeado ANTES que express: Nest puede listar express como adaptador); `package.json` con `express`/`fastify` → `express-node`; otros indicadores (`requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`) → `generic`; nada → `generic`.
  - Frontend: `package.json` con `react` → `react`; `package.json` con `@angular/core` → `angular` (los paquetes de Angular moderno usan scope; la clave simple `angular` solo cuenta como AngularJS legacy → `generic`); otro framework frontend (`vue`, `svelte`, `next`, `nuxt`) → `generic`; solo backend detectado sin indicadores frontend → NO se copia `frontend-standards.md` (se reporta); proyecto nuevo/vacío → `generic`.
- Detección de dependencias por clave exacta de package.json (soporta paquetes con scope `@org/pkg`): `pkg_has_dep`/`pkg_dep_value` buscan en TODOS los package.json del destino (raíz + un nivel), no solo el primero.
- Datos extraídos: `PROJECT_NAME` (`pom.xml` artifactId | `package.json` name | basename), `LANGUAGE` + `LANGUAGE_VERSION` (`<java.version>`, `engines.node`), `FRAMEWORK` + `FRAMEWORK_VERSION` (versión del parent Spring Boot / de `@angular/core`/`@nestjs/core`/`react`/`express`), `BUILD_TOOL`, `TEST_FRAMEWORK` (devDeps: `jest`|`vitest`|`mocha`).
- El reporte (reconocimiento y dry-run) muestra stack inferido y variante elegida; nunca falla por falta de match: siempre hay genérico.

### D2. `docs-variants/` como fuente de estándares; Chapur Pay fuera
- Eliminar `docs/frontend-standards.md` y `docs/backend-standards.md` del repo plantilla.
- Crear `docs-variants/backend/{generic,spring-boot,express-node,nestjs}.md` y `docs-variants/frontend/{generic,react,angular}.md`: contenido genérico-profesional en inglés con frontmatter (como los estándares actuales) y placeholders `{{PROJECT_NAME}}`, `{{LANGUAGE}}`, `{{LANGUAGE_VERSION}}`, `{{FRAMEWORK}}`, `{{FRAMEWORK_VERSION}}`, `{{BUILD_TOOL}}`, `{{TEST_FRAMEWORK}}`, `{{ORM}}`. Los no detectables se dejan como placeholder visible para que el onboarding los refine.
- `docs-variants/` NO viaja como payload: `install.sh` la lee para componer los dos archivos de estándares en `docs/` del destino. La copia usa la misma política anti-corrupción (backup + pregunta).
- `docs/base-standards.md` mantiene los enlaces a `backend-standards.md`/`frontend-standards.md` (resuelven en el destino) con nota de que se generan por stack.

### D3. Sugerencia opt-in de `npx autoskills`
- Tras la copia del payload, prompt `[s/N]`: "¿Ejecutar `npx autoskills` en el destino para instalar skills de tu stack?".
- Solo se ejecuta con confirmación explícita: `npx -y autoskills` con cwd = destino, salida a consola del usuario.
- Pre-chequeo: `node` presente y >= 22 (requisito de autoskills); si falta, se avisa y no se ejecuta (no fatal).
- Fallo del comando NO aborta la instalación (reporta y continúa).
- Con `--yes` (no interactivo) se omite el prompt y queda como paso pendiente en `post_checks`.
- `--dry-run` muestra la pregunta en el plan sin ejecutar nada.
- Nota: `npx skills` (Claude Code) y `npx autoskills` son cosas distintas; ambas quedan documentadas.

### D4. Onboarding como refinamiento
- Fase 3 de `sdd-onboard-project` identifica qué variante quedó instalada (cabecera del archivo) y refina: ORM/testing reales observados en el grafo, secciones no aplicables, `api-spec.yml` y `data-model.md`. No reescribe desde cero; conserva reglas de confirmación por artefacto.

## Risks / Trade-offs

- Variantes no cubren todos los frameworks: mitigado con fallback genérico + refinamiento en onboarding.
- Detección bash simple (grep/sed) puede fallar en layouts exóticos: siempre degrada a genérico, nunca bloquea.
- `autoskills` es herramienta externa: opt-in, no prerrequisito, fallo no fatal.
