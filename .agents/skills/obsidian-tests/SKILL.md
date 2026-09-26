---
name: obsidian-tests
description: Generate test files and documentation in Obsidian after completing an OpenSpec specification. Creates regression test documentation for continuous validation. Use when tests are created during specification or when the user asks for test documentation.
---

# Obsidian Tests

> **Orquestada**: cuando `obsidianSync=1` (o `--obsidian`), esta skill se invoca automáticamente desde `obsidian-orchestration` al archivar un change (`/opsx-archive`). Con el switch en `0`, se usa solo por invocación explícita.

Genera archivos de test y documentación en Obsidian después de completar una especificación OpenSpec. Crea documentación de pruebas de regresión para validación continua.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "el vault está en <ruta>" o "los tests van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `vault_root` | Raíz del vault de Obsidian | `/home/martinmartinez/Documentos/obsidian_sync_git` |
| `templates_dir` | Carpeta de plantillas | `{vault_root}/09_Plantilla` |
| `projects_dir` | Carpeta de proyectos | `{vault_root}/01_Proyectos` |
| `project_registry` | Registro de requerimientos | `docs/requirements/REGISTRY.md` (dentro del repo) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si existe `docs/requirements/REGISTRY.md` en el proyecto → leer las rutas registradas.
3. Si existe el vault en la ruta por defecto → usarlo.
4. Si ninguna aplica → preguntar al usuario.

## When to Use

- After creating tests during specification
- When the user asks for test documentation
- When documenting regression tests for continuous validation
- Before archiving an OpenSpec change with tests

## Workflow

### Step 1: Gather Test Context

Read the OpenSpec change artifacts to understand what was tested:

```bash
openspec status --change "<change-name>" --json
```

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

Create test documentation at:
`{projects_dir}/<Proyecto>/<subtema>/<change-name>-tests.md`

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
- File created
- Tests documented
- Commands added

## Test Documentation Template

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
- **OpenSpec**: <openspec-link>
```

## Integration with Other Skills

### After spec-from-note

When `spec-from-note` creates tests, this skill documents them in Obsidian.

### With obsidian-summary

Generate test documentation alongside the summary for complete documentation.

### Before openspec-archive

Before archiving a change, document the tests for future reference.

## Enforcement Rules

1. **Always use template** - Use the template from `09_Plantilla/Tests de Regresion.md`
2. **Document actual tests** - Reference real test files, not placeholders
3. **Include execution commands** - Document how to run each test type
4. **Portable format** - Ensure the document is readable without repository context
5. **Spanish content** - Write the documentation in Spanish for the user

## Common Scenarios

### Scenario: Tests created during specification

1. User creates tests as part of implementation
2. Skill documents tests in Obsidian
3. Tests are available for future reference

### Scenario: User asks for test documentation

1. User says "documenta los tests que hicimos"
2. Skill finds test files in repository
3. Generates test documentation in Obsidian
4. Shows confirmation

### Scenario: Before archiving

1. User says "vamos a archivar este cambio"
2. Skill documents tests first
3. Then proceeds with archive workflow

## Notes

- This skill documents tests in Obsidian, not in the repository
- Test files stay in the repository; the documentation is a reference
- Use this skill to maintain test knowledge across machines
- Tests documented here can be used for regression testing in future iterations
