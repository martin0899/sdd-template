# Delta spec: sdd-template-install

## ADDED Requirements

### Requirement: Detección de stack del destino

El instalador DEBE (MUST) detectar el stack del proyecto destino mediante lectura exclusiva (sin escritura) de archivos indicadores en la raíz y un nivel de profundidad (excluyendo `node_modules`): `pom.xml`, `build.gradle(.kts)`, `package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`. DEBE (MUST) clasificar un backend (`spring-boot`, `express-node`, `nestjs`, `generic` o `none` para frontend puro) y un frontend (`react`, `angular`, `generic` o `none` para backend puro), y extraer valores para placeholders (nombre del proyecto, lenguaje, versión, framework, build tool, test framework). La detección DEBE (MUST) priorizar coincidencias específicas sobre genéricas (NestJS antes que Express; `@angular/core` antes que la clave genérica).

#### Scenario: Proyecto Spring Boot

- **WHEN** el destino contiene un `pom.xml` con `spring-boot-starter`
- **THEN** el backend se clasifica como `spring-boot` y se extraen framework, versión y Java del pom

#### Scenario: Proyecto Node con Express

- **WHEN** el `package.json` del destino declara `express` como dependencia
- **THEN** el backend se clasifica como `express-node` y se extraen versión de Express, Node y test framework

#### Scenario: Frontend puro

- **WHEN** el destino solo tiene un `package.json` con framework frontend (por ejemplo `react`) y sin backend detectable
- **THEN** el backend se clasifica como `none` y el frontend como `react`

#### Scenario: Proyecto sin indicadores

- **WHEN** el destino no contiene ningún archivo indicador conocido
- **THEN** backend y frontend quedan clasificados como `generic` y la detección no modifica nada

### Requirement: Composición de estándares desde docs-variants

El instalador DEBE (MUST) componer `docs/backend-standards.md` y `docs/frontend-standards.md` en el destino a partir de la variante detectada en `docs-variants/` (`backend/<variante>.md`, `frontend/<variante>.md`), rellenando los placeholders detectables (`PROJECT_NAME`, `LANGUAGE`, `LANGUAGE_VERSION`, `FRAMEWORK`, `FRAMEWORK_VERSION`, `BUILD_TOOL`, `TEST_FRAMEWORK`). Los placeholders no detectables DEBEN (MUST) quedar visibles en el documento para ser refinados en el onboarding. En un proyecto backend puro NO DEBE (MUST) copiarse `frontend-standards.md` (y viceversa para frontend puro). Ante archivo existente distinto aplica la política anti-corrupción (backup + confirmación).

#### Scenario: Composición con variantes detectadas

- **WHEN** el instalador detecta backend `spring-boot` y frontend `react`
- **THEN** compone ambos estándares desde sus variantes con los placeholders conocidos rellenados

#### Scenario: Placeholder no resoluble

- **WHEN** un valor requerido por la variante no es detectable (por ejemplo el ORM)
- **THEN** el placeholder permanece visible en el estándar compuesto
- **AND** la nota sobre placeholders pendientes se conserva en el documento

#### Scenario: Backend puro

- **WHEN** el backend está detectado y el frontend es `none`
- **THEN** se compone `docs/backend-standards.md` y NO se copia `docs/frontend-standards.md`

### Requirement: Sugerencia opt-in de autoskills

Tras completar la copia del payload, el instalador DEBE (MUST) preguntar al usuario si ejecutar `npx autoskills` en el destino (detección de tecnologías e instalación de skills curadas del stack). La ejecución DEBE (MUST) ser opt-in: solo procede con confirmación explícita, requiere Node >= 22, y un fallo de autoskills NUNCA DEBE (MUST NOT) abortar la instalación. Si el usuario rechaza, se usa `--yes`, o el requisito de Node no se cumple, el paso DEBE (MUST) quedar registrado como pendiente en el resumen final.

#### Scenario: Usuario acepta

- **WHEN** el usuario confirma la ejecución de autoskills en un destino con Node >= 22
- **THEN** el instalador ejecuta `npx -y autoskills` en el destino y reporta el resultado

#### Scenario: Usuario rechaza o modo --yes

- **WHEN** el usuario rechaza, o se ejecuta con `--yes`
- **THEN** autoskills no se ejecuta y el resumen final lista el paso como pendiente con el comando a ejecutar

#### Scenario: Node insuficiente

- **WHEN** node no está disponible o su versión es menor que 22
- **THEN** el instalador omite autoskills con advertencia y la instalación continúa con el paso pendiente
