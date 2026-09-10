# sdd-template-install — Delta Spec

## ADDED Requirements

### Requirement: Detección del stack tecnológico del destino

El instalador DEBE (MUST) detectar la tecnología del proyecto destino (backend y frontend) mediante archivos indicadores (`pom.xml`, `build.gradle*`, `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`), escaneando la raíz y un nivel de profundidad, SIN escribir nada. El resultado DEBE (MUST) mostrarse en el reconocimiento del destino y en `--dry-run`.

#### Scenario: Backend Spring Boot detectado
- **WHEN** el destino contiene un `pom.xml` con `spring-boot-starter`
- **THEN** el instalador reporta backend Java/Spring Boot con su versión de Spring Boot y de Java detectadas

#### Scenario: Frontend React detectado
- **WHEN** el destino contiene un `package.json` con `react` en dependencias
- **THEN** el instalador reporta frontend React con la versión detectada

#### Scenario: Frontend Angular detectado
- **WHEN** el destino contiene un `package.json` con `@angular/core` en dependencias
- **THEN** el instalador reporta frontend Angular con la versión de `@angular/core` detectada
- **AND** selecciona la variante `angular` de estándares frontend

#### Scenario: Angular puro sin backend
- **WHEN** el destino contiene `@angular/core` y ningún indicador de backend (`pom.xml`, `express`, `fastify`, `@nestjs/core`, lenguajes no-JS)
- **THEN** el instalador reporta proyecto frontend puro
- **AND** no compone `docs/backend-standards.md`

#### Scenario: Backend NestJS detectado
- **WHEN** el destino contiene un `package.json` con `@nestjs/core` en dependencias (con o sin `express` como adaptador)
- **THEN** el instalador reporta backend NestJS con la versión de `@nestjs/core` detectada
- **AND** selecciona la variante `nestjs` de estándares backend en lugar de `express-node`

#### Scenario: Stack no detectable
- **WHEN** el destino no contiene indicadores reconocibles (proyecto nuevo o stack no listado)
- **THEN** el instalador reporta stack no detectado y selecciona las variantes genéricas sin abortar

### Requirement: Selección de variante de estándares para docs

El instalador DEBE (MUST) componer `docs/backend-standards.md` y `docs/frontend-standards.md` del destino a partir de `docs-variants/` del repo plantilla, seleccionando la variante según el stack detectado y rellenando los placeholders conocidos (`{{PROJECT_NAME}}`, `{{LANGUAGE}}`, `{{LANGUAGE_VERSION}}`, `{{FRAMEWORK}}`, `{{FRAMEWORK_VERSION}}`, `{{BUILD_TOOL}}`, `{{TEST_FRAMEWORK}}`). Los placeholders no detectables DEBEN (MUST) quedar visibles para refinarse en el onboarding. La composición DEBE (MUST) aplicar la misma política anti-corrupción (backup + pregunta) y DEBE (MUST) respetar `--dry-run`.

#### Scenario: Variante específica disponible
- **WHEN** se detecta Spring Boot en el destino
- **THEN** `docs-variants/backend/spring-boot.md` se copia como `docs/backend-standards.md` con nombre, versiones y build tool rellenados

#### Scenario: Proyecto backend puro sin frontend
- **WHEN** el destino tiene backend detectado y ningún indicador frontend
- **THEN** `docs/frontend-standards.md` no se copia
- **AND** el reporte indica que puede generarse o marcarse como no aplicable en el onboarding

#### Scenario: Proyecto nuevo sin indicadores
- **WHEN** el destino está vacío o sin stack reconocible
- **THEN** se copian las variantes genéricas de backend y frontend con placeholders rellenados según lo poco detectable (nombre del proyecto)

### Requirement: Sugerencia opt-in de npx autoskills

Tras la copia del payload, el instalador DEBE (MUST) preguntar al usuario si desea ejecutar `npx autoskills` en el destino para instalar skills curadas del stack detectado. SOLO DEBE (MUST) ejecutarse con confirmación explícita del usuario; el fallo del comando NO DEBE (MUST) abortar la instalación. La ejecución DEBE (MUST) requerir Node >= 22 y, si no está disponible, avisar sin fallar. En modo `--yes` el prompt DEBE (MUST) omitirse y el paso DEBE (MUST) quedar como pendiente en los recordatorios finales. En `--dry-run` DEBE (MUST) mostrarse en el plan sin ejecutarse.

#### Scenario: Usuario acepta instalar autoskills
- **WHEN** el usuario confirma el prompt y Node >= 22 está disponible
- **THEN** el instalador ejecuta `npx -y autoskills` con cwd en el destino y muestra su salida

#### Scenario: Usuario declina autoskills
- **WHEN** el usuario no confirma el prompt
- **THEN** no se ejecuta nada y el instalador continúa con la verificación final

#### Scenario: Node insuficiente o ausente
- **WHEN** `node` no está en PATH o su versión es < 22
- **THEN** el instalador avisa que `npx autoskills` requiere Node >= 22 y continúa sin ejecutarlo

#### Scenario: Instalación no interactiva
- **WHEN** se ejecuta con `--yes`
- **THEN** no se pregunta por autoskills
- **AND** `npx autoskills` aparece entre los pasos manuales pendientes del cierre

## MODIFIED Requirements

### Requirement: Manifiesto de payload

El instalador DEBE (MUST) basarse en un manifiesto explícito que define qué viaja al destino y qué se queda en el repo plantilla. El instalador (`install.sh`), el README de la plantilla, los artefactos de trabajo de `openspec/changes/` del repo plantilla y el directorio `docs-variants/` NO viajan al destino como payload directo. Los estándares de `docs/backend-standards.md` y `docs/frontend-standards.md` del destino DEBEN (MUST) componerse desde `docs-variants/` según el stack detectado; el resto de `docs/` viaja completo salvo directorios generados. La documentación de referencia del proyecto destino es `README.md` y los manuales de `docs/`; NO existe un archivo-guía de CLI suelto (`sdd-cli-guide.md` ya no forma parte de la plantilla).

#### Scenario: Payload exacto
- **WHEN** se completa la instalación
- **THEN** el destino contiene exactamente: `openspec/` (con contexto español), `.agents/skills/` (sin las skills retiradas), `.opencode/` (comandos, skills y configuración de paquete), `docs/` (con estándares compuestos por variante)
- **AND** el destino NO contiene `install.sh`, ni los cambios activos del repo plantilla, ni `sdd-cli-guide.md`, ni `docs-variants/`

#### Scenario: Manifiesto sin guía de CLI
- **WHEN** se inspecciona el manifiesto de `install.sh` o el resultado de un `--dry-run`
- **THEN** `sdd-cli-guide.md` no aparece como elemento del payload
- **AND** `docs-variants/` aparece como fuente de composición, no como payload copiado
