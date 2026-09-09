# sdd-project-onboarding Specification

## Purpose
Define el comportamiento del flujo de onboarding que un agente ejecuta sobre un proyecto recién instalado: indagación del código con graphify, comentario de la estructura, persistencia opcional de la estructura como regla, adaptación de los estándares de documentación al stack real, y guía de IA local para tareas de baja demanda. Este flujo es semántico: analiza, comenta y propone, pero nunca escribe sin confirmación explícita del usuario.

## Requirements

### Requirement: Indagación del código con graphify

La skill de onboarding DEBE (MUST) ejecutar `graphify update .` sobre el proyecto destino para construir el grafo de conocimiento, y DEBE (MUST) comentar la estructura del código al usuario (arquitectura, módulos, relaciones principales) antes de cualquier propuesta de reglas o adaptación de documentación.

#### Scenario: Proyecto instalado con código existente
- **WHEN** el onboarding corre sobre un proyecto existente con código
- **THEN** se ejecuta `graphify update .` y se presenta al usuario un comentario estructurado del proyecto (stack inferido, módulos, patrón arquitectónico, integraciones)

#### Scenario: Graph desactualizado tras cambios
- **WHEN** el proyecto ya tiene `graphify-out/` pero el código cambió desde el último grafo
- **THEN** el onboarding refresca el grafo con `graphify update .` antes de comentar

### Requirement: Persistencia de estructura como regla opt-in

Tras comentar la estructura, la skill DEBE (MUST) ofrecer al usuario persistir la estructura del proyecto como regla en `openspec/config.yaml` (campo `context`), y DEBE (MUST) escribir solo si el usuario acepta explícitamente.

#### Scenario: Usuario acepta persistir la estructura
- **WHEN** el usuario confirma que quiere la estructura como regla
- **THEN** la estructura comentada se añade por APPEND al campo `context` de `openspec/config.yaml`
- **AND** el contenido previo del campo se preserva intacto

#### Scenario: Usuario declina
- **WHEN** el usuario no quiere persistir la estructura
- **THEN** no se escribe nada en `openspec/config.yaml` y el onboarding continúa con el resto del flujo

### Requirement: Adaptación de estándares al stack detectado

La skill DEBE (MUST) detectar el stack del proyecto (siguiendo la tabla de detección por archivos indicadores: `pom.xml` → Java/Spring, `package.json` → Node/framework, `pyproject.toml`/`requirements.txt` → Python, `go.mod` → Go, etc.) y DEBE (MUST) adaptar los estándares de `docs/` (backend-standards, frontend-standards, api-spec, data-model) a las tecnologías reales del proyecto, con confirmación previa a la escritura.

#### Scenario: Proyecto backend Java/Spring
- **WHEN** se detecta `pom.xml` con `spring-boot-starter-parent`
- **THEN** los estándares backend se adaptan a Spring Boot (versión incluida) y los estándares frontend se marcan como no aplicables o se retiran según decida el usuario
- **AND** `docs/api-spec.yml` y `docs/data-model.md` se actualizan para reflejar las convenciones del stack

#### Scenario: Proyecto frontend React
- **WHEN** se detecta `package.json` con `react`
- **THEN** los estándares frontend se adaptan a React y los backend se marcan como no aplicables según decida el usuario

#### Scenario: Stack no detectable
- **WHEN** no hay archivos indicadores reconocibles
- **THEN** la skill reporta que no pudo detectar el stack y pregunta al usuario por las tecnologías antes de adaptar nada

### Requirement: Escritura solo con confirmación explícita

La skill DEBE (MUST) abstenerse de escribir cualquier archivo (reglas, docs adaptados, grafo) sin confirmación explícita del usuario para ese artefacto concreto; responder preguntas de diseño o clarificación nunca constituye consentimiento de escritura.

#### Scenario: Propuesta sin consentimiento
- **WHEN** la skill propone adaptar `docs/backend-standards.md` y el usuario no responde afirmativamente
- **THEN** ningún archivo es modificado y la propuesta queda solo en la conversación

### Requirement: Guía de IA local Ollama para baja demanda

La skill DEBE (MUST) guiar al usuario en la configuración de IA local (Ollama) según `docs/manuals/local-ai.md`, recomendando modelos locales únicamente para tareas de baja demanda por RAM limitada, y DEBE (MUST) dejar constancia del modelo elegido por el usuario como configuración del proyecto.

#### Scenario: Usuario configura modelo local
- **WHEN** el usuario indica el modelo Ollama que usará para tareas sencillas
- **THEN** la skill registra el modelo en la configuración de contexto del proyecto y referencia `docs/manuals/local-ai.md` como guía vigente

#### Scenario: Usuario no usa IA local
- **WHEN** el usuario no desea configurar Ollama
- **THEN** la skill continúa sin escribir configuración de IA local y conserva la guía en `docs/` para el futuro
