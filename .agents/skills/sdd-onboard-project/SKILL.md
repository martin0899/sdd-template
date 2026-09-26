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

## Fase 3 — Refinamiento de estándares según el stack real

### 3a. Consumir el artefacto de stack (stack.json)

El instalador ya detectó el stack de forma reproducible y lo guardó en `stack.json` (raíz del proyecto). **Léelo como fuente de verdad** antes de cualquier otra indagación:

```bash
cat stack.json
```

El artefacto contiene: `backend` y `frontend` (variante instalada: `spring-boot`, `express-node`, `nestjs`, `react`, `angular`, `generic`, `none`), `language`, `languageVersion`, `buildTool`, `testFramework`, `framework`, `frameworkVersion`, `frameworkFe`, `frameworkVersionFe`, `projectName`, `detected_at`.

La variante `generic` significa que el stack detectado **no tiene variante soportada** en `docs-variants/` (p. ej. Django, FastAPI, Flask, Gin, Axum, Rails): el lenguaje y framework reales quedan registrados en `stack.json` para este refinamiento. **No se crean variantes nuevas.**

### 3b. Resolver el refinamiento

- **Con `stack.json` presente**: usa el artefacto para saber qué variante se instaló, qué stack real se degradó a `generic` y qué placeholders quedaron. Usa `graphify query/explain` **solo para refinar** las secciones pendientes (ORM, testing, utilidades) — no para re-detectar el stack.
- **Sin `stack.json`** (proyecto instalado antes de la detección reproducible, o manual): usa `graphify query/explain` como evidencia del stack real. No uses una tabla manual de archivos indicadores: pregunta al usuario por las tecnologías (lenguaje, framework, build tool, base de datos) si el grafo no revela el stack.
- **Stack no detectable**: si ni el artefacto ni el grafo revelan el stack, pregunta al usuario por las tecnologías antes de refinar nada. No inventes un stack ni valores de placeholder.

### 3c. Refinamiento (con confirmación por artefacto)

Para cada archivo de `docs/` propón el refinamiento y pide confirmación **individual** antes de escribir:

- `backend-standards.md` → resolver placeholders pendientes con lo observado en el grafo (ORM, testing, utilidades), ajustar secciones a las convenciones reales del proyecto:
  - Spring Boot: REST controllers, JPA/Hibernate, `@ControllerAdvice`, JUnit/Mockito, Maven/Gradle
  - Express/Fastify: router middleware, ORM (Sequelize/Prisma/TypeORM), error middleware, Winston/Pino, Jest/Supertest
  - Django/Flask: views/serializers, Django ORM/SQLAlchemy, pytest
  - Fallback (`generic`): documentar los patrones propios que se observen en el grafo (el stack real está en `stack.json`)
- `frontend-standards.md` → React (hooks, estado, React Router, Tailwind/RTL) · Vue (SFC, Pinia, Vue Router, Vitest) · Angular (servicios, NgRx, Karma) · fallback genérico
- Si no existe `frontend-standards.md` (el instalador omitió backend puro): pregunta si generarlo desde `docs-variants/frontend/generic.md` o marcarlo como no aplicable. Simétrico para backend puro.
- `api-spec.yml` → ajustar a las convenciones REST reales del proyecto
- `data-model.md` → entidades y ORM del stack real
- **Secciones no aplicables** (p. ej. secciones de React en un proyecto Vue): márcalas como no aplicables con una nota o propón retirarlas, según decida el usuario.

Reglas de escritura para docs/:
- Si el archivo existe: **preserva** su contenido (es la variante ya compuesta) y ajusta solo las secciones necesarias, mostrando antes un resumen de cambios.
- Resuelve o elimina todos los placeholders `{{...}}` que queden: nunca dejes tokens sin tratar ni inventes su valor.
- Contenido de documentación en inglés (convención de los estándares del repo).
- Nunca toques configuración del proyecto ni archivos de agentes.

## Fase 4 — Guía de IA local (Ollama)

1. Resuelve la ruta de manuales (cerebro): `spectralis config --get resources_dir` o la cascada de detección (config → manifiesto → vault → `info/` en el proyecto). Lee la guía `notes/local-ai/manual.md` del repo plantilla y preséntala al usuario.
2. Explica la recomendación: **modelos locales solo para tareas de baja demanda** (RAM limitada); las tareas pesadas siguen en la nube o el modelo principal.
3. Pregunta: *"¿Qué modelo local de Ollama quieres usar para tareas sencillas? (p. ej. qwen2.5:3b, llama3.2:3b — o ninguno)"*
4. **Si el usuario elige un modelo**: propón añadir al `context` de `openspec/config.yaml` una línea del tipo `Local AI (Ollama): <modelo> for low-demand tasks; use cloud for complex tasks.` y escríbela solo con confirmación (APPEND, preservando lo previo).
5. **Si no quiere IA local**: no escribas nada; la guía queda en el cerebro para el futuro.

## Cierre

Resume qué se escribió (y qué no) y sugiere el siguiente paso: `/opsx:propose "<idea>"` para el primer change del proyecto.
