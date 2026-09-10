# Tasks: add-stack-detection-and-docs-variants

## 1. Variantes de docs (repo plantilla)

- [x] 1.1 Eliminar `docs/backend-standards.md` y `docs/frontend-standards.md` (Chapur Pay)
- [x] 1.2 Crear `docs-variants/backend/{generic,spring-boot,express-node}.md` con frontmatter y placeholders
- [x] 1.2b Crear `docs-variants/backend/nestjs.md` (módulos, providers/DI, guards, {{ORM}}, {{TEST_FRAMEWORK}})
- [x] 1.3 Crear `docs-variants/frontend/{generic,react}.md` con frontmatter y placeholders
- [x] 1.3b Crear `docs-variants/frontend/angular.md` (standalone, signals/RxJS, Router, {{TEST_FRAMEWORK}})
- [x] 1.4 Nota en `docs/base-standards.md` sobre estándares compuestos por variante

## 2. install.sh

- [x] 2.1 `detect_stack()`: indicadores raíz + 1 nivel; backend (spring-boot/express-node/nestjs/generic), frontend (react/angular/generic/ninguno); extraer PROJECT_NAME, LANGUAGE(+VERSION), FRAMEWORK(+VERSION), BUILD_TOOL, TEST_FRAMEWORK
- [x] 2.1b Detección de paquetes con scope: `@angular/core` → frontend angular; `@nestjs/core` → backend nestjs (chequeado antes que express)
- [x] 2.2 Reporte de stack en `report_recognition` y `dry_run_plan` (solo lectura, compatible con --dry-run)
- [x] 2.3 `compose_docs_standards()`: copiar variante → destino con política backup + pregunta; rellenar placeholders conocidos con sed; omitir frontend en backend puro
- [x] 2.4 `prompt_autoskills()`: prompt [s/N], chequeo Node >= 22, `npx -y autoskills` en destino, fallo no fatal; omitido con --yes (paso pendiente)
- [x] 2.5 `post_checks`: verificar estándares compuestos y recordar autoskills/onboarding cuando aplique
- [x] 2.6 Manifiesto actualizado: docs-variants como fuente, no como payload

## 3. Skill de onboarding

- [x] 3.1 Fase 3 de `sdd-onboard-project`: refinamiento de variante instalada (identificar cabecera/variante, resolver placeholders con grafo, secciones no aplicables, api-spec/data-model)

## 4. Documentación

- [x] 4.1 README: mecánica de docs por stack + autoskills opt-in
- [x] 4.2 `docs/manuals/manual-installation.md`: pasos equivalentes de composición de variantes

## 5. Verificación

- [x] 5.1 `bash -n install.sh`
- [x] 5.2 Dry-runs: proyecto Spring Boot, proyecto React+Express, proyecto vacío (detección y plan correctos)
- [x] 5.2b Dry-runs e instalación real: proyecto Angular puro (variante angular + backend omitido) y proyecto NestJS (variante nestjs)
- [x] 5.3 Instalación real en proyectos temporales: variantes compuestas, placeholders rellenados, prompt autoskills y política de backup
- [x] 5.4 Idempotencia: re-ejecutar sobre destino instalado no duplica ni rompe
