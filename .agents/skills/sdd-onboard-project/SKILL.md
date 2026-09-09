---
name: sdd-onboard-project
description: Onboarding SDD post-instalación para proyectos nuevos o existentes. Indaga el código con graphify, comenta la estructura, ofrece persistirla como regla, adapta docs/ al stack detectado y guía la configuración de IA local Ollama. Use when the user wants to onboard a project into the SDD workflow, analyze project structure with graphify, or adapt template documentation to the project stack.
author: SDD-template
version: 1.0.0
---

# sdd-onboard-project

Flujo de onboarding que ejecuta un agente sobre un proyecto recién instalado con la plantilla SDD (o uno que ya la tiene y quiere re-analizar). Es un flujo **semántico**: analiza, comenta y propone. **Nunca escribe sin confirmación explícita del usuario para ese artefacto concreto.**

## When to Use

- Proyecto donde `install.sh` de la plantilla SDD acaba de ejecutarse (post-instalación)
- Proyecto existente migrado a SDD que necesita indagación de código
- Proyecto cuyo `docs/` necesita adaptarse a un stack tecnológico nuevo
- Re-análisis tras cambios grandes de arquitectura

## Regla de Oro: Escritura Solo con Confirmación

- Responder preguntas de diseño o clarificación **nunca** constituye consentimiento de escritura.
- Antes de escribir cada artefacto (regla de estructura, doc adaptado, configuración de contexto), muestra qué vas a escribir y pide confirmación directa (sí/no).
- Si el usuario no responde afirmativamente, no escribas nada y deja la propuesta solo en la conversación.
- Nunca modifiques código del proyecto ni archivos de configuración del proyecto (package.json, pom.xml, etc.): este flujo solo toca `openspec/config.yaml` y `docs/`.

## Fase 0 — Prerrequisitos

Verifica que `graphify` y `openspec` están en PATH. Si falta alguno, indica cómo instalarlo y detente (no intentes instalarlo tú).

## Fase 1 — Indagación del código con graphify

1. Ejecuta `graphify update .` (avisa antes: en proyectos grandes puede tardar).
   - Si ya existe `graphify-out/` pero el código cambió, ejecútalo igual para refrescar.
2. Consulta el grafo según necesites:
   - `graphify query "<pregunta>"` — cómo funciona algo
   - `graphify path "<A>" "<B>"` — cómo se conectan dos componentes
   - `graphify explain "<concepto>"` — explicación de un nodo y sus vecinos
3. **Comenta la estructura al usuario** con un resumen estructurado:

```
Estructura del proyecto:
- Stack inferido: <lenguaje> <versión>, <framework>, <build tool>
- Módulos principales: <lista con una línea de propósito cada uno>
- Patrón arquitectónico observado: < MVC / capas / hexagonal / ... >
- Integraciones: <bases de datos, APIs externas, colas, ...>
- Puntos de entrada: <main, controllers, routes, ...>
```

## Fase 2 — Persistir la estructura como regla (opt-in)

Ofrece: *"¿Quieres que persista esta estructura como regla en `openspec/config.yaml` (campo `context`)?"*

- **Si acepta**: añade por APPEND al campo `context` un bloque conciso (máx. ~15 líneas) con el stack, módulos y patrón observado. **Preserva íntegro** cualquier contenido previo del campo (incluida la regla de idioma español). Jamás reescribas el archivo completo.
- **Si declina**: no escribas nada y continúa con la Fase 3.

## Fase 3 — Detección de stack y adaptación de docs/

### 3a. Detección (por orden, primer match)

| Archivo indicador | Stack | Detección de framework |
|-------------------|-------|------------------------|
| `pom.xml` | Java/Maven | `spring-boot-starter-parent` → Spring Boot; `<java.version>` |
| `build.gradle` / `build.gradle.kts` | Java/Gradle | plugin `org.springframework.boot` → Spring Boot |
| `package.json` | Node.js | deps: `react`, `vue`, `angular`, `express`, `fastify`, `next`, `nuxt` |
| `requirements.txt` / `pyproject.toml` | Python | `django`, `flask`, `fastapi`, `sqlalchemy` |
| `Cargo.toml` | Rust | `actix-web`, `axum`, `rocket` |
| `go.mod` | Go | `gin-gonic`, `gorilla`, `echo`, `fiber` |
| `Gemfile` | Ruby | `rails`, `sinatra` |

**Stack no detectable**: si no hay archivos indicadores reconocibles, informa al usuario y pregúntale por las tecnologías (lenguaje, framework, build tool, base de datos) antes de adaptar nada. No inventes un stack.

### 3b. Adaptación de estándares (con confirmación por artefacto)

Para cada archivo de `docs/` propón la adaptación y pide confirmación **individual** antes de escribir:

- `backend-standards.md` → patrones del framework detectado:
  - Spring Boot: REST controllers, JPA/Hibernate, `@ControllerAdvice`, JUnit/Mockito, Maven/Gradle
  - Express/Fastify: router middleware, ORM (Sequelize/Prisma/TypeORM), error middleware, Winston/Pino, Jest/Supertest
  - Django/Flask: views/serializers, Django ORM/SQLAlchemy, pytest
  - Fallback: documentar los patrones propios que se observen en el grafo
- `frontend-standards.md` → React (hooks, estado, React Router, Tailwind/RTL) · Vue (SFC, Pinia, Vue Router, Vitest) · Angular (servicios, NgRx, Karma) · fallback genérico
- `api-spec.yml` → ajustar a las convenciones REST reales del proyecto
- `data-model.md` → entidades y ORM del stack detectado
- **Estándares no aplicables** (p. ej. frontend en un backend puro): pregunta al usuario si los marca como "no aplicable" con una nota o los deja intactos.

Reglas de escritura para docs/:
- Si el archivo existe: **preserva** su contenido y añade/ajusta solo las secciones necesarias, mostrando antes un resumen de cambios.
- Contenido de documentación en inglés (convención de los estándares del repo).
- Nunca toques configuración del proyecto ni archivos de agentes.

## Fase 4 — Guía de IA local (Ollama)

1. Lee `docs/manuals/local-ai.md` y preséntala al usuario.
2. Explica la recomendación: **modelos locales solo para tareas de baja demanda** (RAM limitada); las tareas pesadas siguen en la nube o el modelo principal.
3. Pregunta: *"¿Qué modelo local de Ollama quieres usar para tareas sencillas? (p. ej. qwen2.5:3b, llama3.2:3b — o ninguno)"*
4. **Si el usuario elige un modelo**: propón añadir al `context` de `openspec/config.yaml` una línea del tipo `Local AI (Ollama): <modelo> for low-demand tasks; use cloud for complex tasks.` y escríbela solo con confirmación (APPEND, preservando lo previo).
5. **Si no quiere IA local**: no escribas nada; la guía queda en `docs/` para el futuro.

## Cierre

Resume qué se escribió (y qué no) y sugiere el siguiente paso: `/opsx:propose "<idea>"` para el primer change del proyecto.
