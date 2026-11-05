---
name: obsidian-tests
description: Review and complete the live folder-note details in Obsidian after a change is finished. In the native flow the regression documentation is written in the single folder note (no separate files). Use when tests are created during a change or when the user asks for test documentation.
---

# Obsidian Tests

> **Orquestada**: cuando `obsidianSync=1` (o `--obsidian`), esta skill se invoca automáticamente desde `obsidian-orchestration` al archivar un change. Con el switch en `0`, se usa solo por invocación explícita.

Revisa y completa los detalles del **folder note vivo** en Obsidian después de cerrar un change: deja la documentación de pruebas de regresión **dentro** del folder note único (`## Tests de regresión`), sin generar archivos de prueba aparte. En el flujo **nativo** el resumen portátil del wiki lo escribe directamente el archive (`spectralis spec archive`); con `engine: openspec` su comportamiento es el legacy: documentar los tests a partir de los artefactos del change.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "el vault está en <ruta>" o "los tests van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Resolución |
|---|---|---|
| `vault_root` | Raíz del vault de Obsidian | `spectralis config --get vault_root` |
| `templates_dir` | Carpeta de plantillas | `spectralis config --get templates_dir` (default `{vault_root}/09_Plantilla`) |
| `projects_dir` | Carpeta de proyectos | `spectralis config --get projects_dir` (default `{vault_root}/01_Proyectos`) |
| `project_registry` | Registro de requerimientos | `.sdd-registry/REGISTRY.md` (dentro del repo) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si `spectralis config --get <key>` devuelve la ruta (config global o manifest del proyecto) → usar esa.
3. Si existe `.sdd-registry/REGISTRY.md` en el proyecto → leer las rutas registradas.
4. Si se detecta un vault (`.obsidian` o `09_Plantilla`) → usar la ruta por defecto derivada.
5. Si ninguna aplica → preguntar al usuario.

## When to Use

- After creating tests during a change
- When the user asks for test documentation
- When documenting regression tests for continuous validation
- Before archiving a change with tests

## Workflow

### Step 1: Gather Test Context

Read the change artifacts to understand what was tested:

```bash
spectralis spec status <change-id>
```

In the native flow the archive has already written the portable summary in the brain (`05_wiki/<wiki-project>/<change-id>.md`): read it as the source of truth and complete the folder note with what is missing. With `engine: openspec`, the context comes from the external CLI's own status command.

Extract:
- What functionality was implemented
- What tests were created
- Test framework being used
- Test patterns and conventions

### Step 2: Read Test Files

Find and read test files in the repository:

```bash
find . -name "*.test.*" -o -name "*.spec.*" | head -20
```

Or use graphify if available:
```bash
graphify query "tests for <module>"
```

### Step 3: Generate Test Documentation

**Target (consolidado):** escribe la sección de tests **dentro** del folder note único `{projects_dir}/<Proyecto>/<spec-id>/<spec-id>.md` (creándolo si no existe) bajo el heading canónico `## Tests de regresión`. **No crees `tests.md`** ni un archivo aparte. Idempotente: si la sección existe, actualízala sin duplicar el heading.

Use the template from `{templates_dir}/Tests de Regresion.md`.

### Step 4: Fill Test Content

**Test Categories:**
- Unit tests
- Integration tests
- E2E tests (if applicable)

**For each test:**
- Describe what it tests
- Include the test code (or reference)
- Note execution command
- Document test data and preconditions

### Step 5: Add Execution Commands

Document how to run the tests:

| Test Type | Command | Description |
|-----------|---------|-------------|
| Unit | `npm test` | Run all unit tests |
| Integration | `npm run test:integration` | Run integration tests |
| E2E | `npm run test:e2e` | Run end-to-end tests |
| Coverage | `npm run test:coverage` | Generate coverage report |

### Step 6: Confirm Creation

Show the user:
- Folder note updated (no separate file created)
- Tests documented
- Commands added

## Test Documentation Template

> Plantilla de referencia (`{templates_dir}/Tests de Regresion.md`). En el flujo actual la información vive en la sección canónica `## Tests de regresión` del folder note único; este esquema documenta qué datos cubrir, no un fichero aparte.

```markdown
---
id: "<change-name>-tests"
Tipo: Tests
Proyecto: "<project-name>"
Fecha: YYYY-MM-DD
tags:
  - tests
  - regresion
  - <project-name>
---

# Tests de Regresión: <change-name>

> Archivos de prueba generados durante la especificación.

## 1. Información General

| Campo | Detalle |
| :--- | :--- |
| **Proyecto** | <project> |
| **Especificación** | <change-name> |
| **Framework** | <test-framework> |
| **Fecha Generación** | <date> |

## 2. Tests Unitarios

### 2.1 <module-name>

```typescript
// <test-file>
// Archivo: <file-path>

describe('<module-name>', () => {
  it('should <test-case>', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 3. Tests de Integración

### 3.1 <integration-name>

```typescript
// <integration-test-file>
// Archivo: <file-path>

describe('<integration-name>', () => {
  it('should <integration-case>', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 4. Comandos de Ejecución

| Tipo | Comando | Descripción |
| :--- | :--- | :--- |
| Unitarios | `npm test` | Ejecuta tests unitarios |
| Integración | `npm run test:integration` | Ejecuta tests de integración |
| E2E | `npm run test:e2e` | Ejecuta tests end-to-end |
| Cobertura | `npm run test:coverage` | Genera reporte de cobertura |

## 5. Datos de Prueba

| Test | Datos | Precondiciones |
| :--- | :--- | :--- |
| <test-1> | <data-1> | <precondition-1> |

## 6. Notas Importantes

- **Ejecutar antes de cada release**: Tests unitarios y de integración
- **Ejecutar en CI/CD**: Tests unitarios y de integración
- **Ejecutar manualmente**: Tests E2E antes de releases mayores

## Enlaces

- **Requerimiento**: <requirement-link>
- **Resumen**: <summary-link>
- **Change**: <change-link> (`spec/<change-name>` en nativo)
```

## Integration with Other Skills

### After spec-from-note

When `spec-from-note` creates tests, this skill documents them in Obsidian.

### With obsidian-summary

Complete the test documentation alongside the summary for complete documentation.

### Before the archive

Before archiving a change, document the tests for future reference.

## Enforcement Rules

1. **Always use template** - Use the template from `09_Plantilla/Tests de Regresion.md`
2. **Document actual tests** - Reference real test files, not placeholders
3. **Include execution commands** - Document how to run each test type
4. **Portable format** - Ensure the document is readable without repository context
5. **Spanish content** - Write the documentation in Spanish for the user

## Common Scenarios

### Scenario: Tests created during a change

1. User creates tests as part of implementation
2. Skill documents tests in Obsidian
3. Tests are available for future reference

### Scenario: User asks for test documentation

1. User says "documenta los tests que hicimos"
2. Skill finds test files in repository
3. Completes the `## Tests de regresión` section of the folder note
4. Shows confirmation

### Scenario: Before archiving

1. User says "vamos a archivar este cambio"
2. Skill documents the tests first
3. Then proceeds with the archive workflow

## Notes

- This skill updates documentation in Obsidian, not in the repository
- Test files stay in the repository; the folder note is a reference
- Use this skill to maintain test knowledge across machines
- Tests documented here can be used for regression testing in future iterations
