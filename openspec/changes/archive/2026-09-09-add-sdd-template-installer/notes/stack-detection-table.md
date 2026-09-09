# Nota: tabla de detección de stack (extraída de sdd-bootstrap-docs)

Material de referencia para `.agents/skills/sdd-onboard-project/SKILL.md`.
Origen: `.agents/skills/sdd-bootstrap-docs/SKILL.md` (author: chapur-pay), retirada en este change.

## Detección de stack (por orden, primer match)

| Archivo indicador | Stack | Detección de framework |
|-------------------|-------|------------------------|
| `pom.xml` | Java/Maven | `spring-boot-starter-parent` → Spring Boot; `<java.version>` para versión |
| `build.gradle` / `build.gradle.kts` | Java/Gradle | plugin `org.springframework.boot` → Spring Boot |
| `package.json` | Node.js | deps: `react`, `vue`, `angular`, `express`, `fastify`, `next`, `nuxt` |
| `requirements.txt` / `pyproject.toml` | Python | `django`, `flask`, `fastapi`, `sqlalchemy` |
| `Cargo.toml` | Rust | `actix-web`, `axum`, `rocket` |
| `go.mod` | Go | `gin-gonic`, `gorilla`, `echo`, `fiber` |
| `Gemfile` | Ruby | `rails`, `sinatra` |

Si no hay indicador: preguntar al usuario (lenguaje primario, framework, build tool, base de datos).

## Adaptación de estándares por framework (resumen para docs/)

- **backend-standards.md**: Spring Boot (REST controllers, JPA/Hibernate, `@ControllerAdvice`, JUnit/Mockito, Maven/Gradle) · Express/Fastify (router middleware, ORM Sequelize/Prisma/TypeORM, error middleware, Winston/Pino, Jest/Supertest) · Django/Flask (views/serializers, Django ORM/SQLAlchemy, pytest) · fallback genérico (documentar patrones propios).
- **frontend-standards.md**: React (hooks, Context/Redux/Zustand, React Router, Tailwind/CSS modules, RTL) · Vue (SFC, Pinia/Vuex, Vue Router, Vitest) · Angular (servicios/módulos, NgRx, Karma) · fallback genérico.
- **api-spec.yml**: scaffold OpenAPI 3.0 (info, servers, paths detectados, schemas de respuesta, auth).
- **data-model.md**: entidades, relaciones, notas de migración, plantilla por ORM del stack.
- **design-doc**: plantilla ADR (contexto, decisión, consecuencias, alternativas).

## Reglas de escritura heredadas (valen para el onboarding)

- Solo crear/actualizar archivos en `docs/`; nunca tocar configuración del proyecto ni archivos de agentes.
- Si el archivo existe: preservar contenido y añadir solo secciones faltantes, previa confirmación.
- Confirmar con el usuario el resumen de cambios antes de escribir.
- Contenido de documentación en inglés (convención de los estándares del repo).
