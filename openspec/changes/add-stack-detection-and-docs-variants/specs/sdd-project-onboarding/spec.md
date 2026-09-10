# sdd-project-onboarding — Delta Spec

## MODIFIED Requirements

### Requirement: Adaptación de estándares al stack detectado

La skill DEBE (MUST) detectar qué variante de estándares quedó instalada por `install.sh` en `docs/backend-standards.md` y `docs/frontend-standards.md` (identificada en su cabecera y por placeholders pendientes) y DEBE (MUST) REFINARLA en lugar de crearla desde cero: ajustar ORM, framework de testing y convenciones reales observadas en el grafo de conocimiento; rellenar o resolver los placeholders pendientes (`{{ORM}}`, `{{TEST_FRAMEWORK}}`, etc.); marcar como no aplicables las secciones que no correspondan al proyecto; y actualizar `docs/api-spec.yml` y `docs/data-model.md` a las convenciones reales del stack. Toda escritura DEBE (MUST) ir precedida de confirmación explícita por artefacto. Cuando el instalador no copió `docs/frontend-standards.md` (proyecto backend puro), la skill DEBE (MUST) proponer generarlo desde la variante genérica o declararlo no aplicable, según decida el usuario.

#### Scenario: Proyecto backend Java/Spring
- **WHEN** se detecta `pom.xml` con `spring-boot-starter-parent` y `docs/backend-standards.md` proviene de la variante Spring Boot
- **THEN** la skill refina los estándares backend a Spring Boot con la versión real del proyecto y resuelve los placeholders pendientes con lo observado en el grafo
- **AND** los estándares frontend se marcan como no aplicables o se retiran según decida el usuario
- **AND** `docs/api-spec.yml` y `docs/data-model.md` se actualizan para reflejar las convenciones del stack

#### Scenario: Proyecto frontend React
- **WHEN** se detecta `package.json` con `react` y `docs/frontend-standards.md` proviene de la variante React
- **THEN** la skill refina los estándares frontend a React con la versión real y resuelve los placeholders pendientes
- **AND** los estándares backend se marcan como no aplicables según decida el usuario

#### Scenario: Stack no detectable
- **WHEN** ni el instalador ni el grafo revelan el stack y quedan placeholders sin resolver
- **THEN** la skill pregunta al usuario por las tecnologías antes de refinar o rellenar nada
- **AND** ningún valor es inventado

#### Scenario: Refinamiento de variante Spring Boot instalada
- **WHEN** se detecta que `docs/backend-standards.md` proviene de la variante Spring Boot con placeholders de ORM y testing pendientes
- **THEN** la skill rellena ORM y testing con lo observado en el grafo (p. ej. JPA/Hibernate, JUnit/Mockito) y ajusta secciones con confirmación previa

#### Scenario: Variante genérica instalada y framework identificable
- **WHEN** la variante instalada es genérica pero el grafo revela un framework concreto (p. ej. Django, Rails, Go)
- **THEN** la skill adapta las secciones correspondientes al framework observado, con confirmación por artefacto

#### Scenario: Placeholder no resuelto
- **WHEN** algún placeholder (p. ej. `{{TEST_FRAMEWORK}}`) sigue sin valor tras la detección del instalador
- **THEN** la skill lo resuelve con la evidencia del grafo o pregunta al usuario; jamás inventa el valor

#### Scenario: Proyecto backend puro sin frontend-standards
- **WHEN** `docs/frontend-standards.md` no existe porque el instalador no lo copió
- **THEN** la skill pregunta si generarlo desde la variante genérica o marcarlo como no aplicable
