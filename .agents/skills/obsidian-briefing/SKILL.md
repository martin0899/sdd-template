---
name: obsidian-briefing
description: Generate technical briefing in Obsidian for OpenSpec changes. Creates a portable technical summary for cross-machine reference. Use when a technical briefing is needed or when the user asks for a technical summary of work done.
---

# Obsidian Briefing

Genera un briefing técnico en Obsidian para cambios OpenSpec. Crea un resumen técnico portátil para referencia entre máquinas.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "el vault está en <ruta>" o "los briefings van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `vault_root` | Raíz del vault de Obsidian | `/home/martinmartinez/Documentos/obsidian_sync_git` |
| `templates_dir` | Carpeta de plantillas | `{vault_root}/09_Plantilla` |
| `projects_dir` | Carpeta de proyectos | `{vault_root}/01_Proyectos` |
| `project_registry` | Registro de requerimientos | `docs/requirements/REGISTRY.md` (dentro del repo) |
| `project_briefings` | Briefings técnicos | `docs/requirements/briefings/` (dentro del repo) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si existe `docs/requirements/REGISTRY.md` en el proyecto → leer las rutas registradas.
3. Si existe el vault en la ruta por defecto → usarlo.
4. Si ninguna aplica → preguntar al usuario.

## When to Use

- After generating a technical briefing in `docs/requirements/briefings/`
- When the user asks for a technical summary
- Before starting implementation of a specification
- When documenting technical decisions for cross-machine reference

## Workflow

### Step 1: Check for Existing Briefing

Look for an existing briefing in the repository:

```bash
ls -la docs/requirements/briefings/
```

If a briefing exists for the current requirement, use it as the source.

### Step 2: Read Briefing Content

Read the briefing file to understand:

1. **Code State** - Modules, patterns, and conventions detected
2. **Existing Specs** - Capabilities being evolved or reused
3. **API Contracts** - New vs evolution
4. **Database Reality** - Schema, conflicts, destructive risk
5. **Risks and Open Questions** - What the note assumes and code contradicts
6. **Proposed Map** - ID-xx -> change -> layer -> affected files

### Step 3: Generate Obsidian Briefing

Create a briefing document at:
`{projects_dir}/<Proyecto>/<subtema>/<req-id>-briefing.md`

### Step 4: Fill Briefing Content

**Technical Summary:**
- What was investigated
- What was found
- Key technical decisions

**Code Analysis:**
- Modules affected
- Patterns detected
- Existing specs found

**API Contracts:**
- New endpoints
- Modified endpoints
- Shared contracts

**Database Impact:**
- Schema changes
- Migration needs
- Destructive operations

**Risks:**
- Technical risks identified
- Mitigation strategies
- Open questions

### Step 5: Link to OpenSpec

Add links to:
- The OpenSpec change
- Related specs
- Original requirement

### Step 6: Confirm Creation

Show the user:
- File created
- Key findings documented
- Links added

## Briefing Document Structure

```markdown
---
id: "<req-id>-briefing"
Tipo: Briefing
Proyecto: "<project-name>"
Fecha: YYYY-MM-DD
tags:
  - briefing
  - tecnico
  - <project-name>
---

# Briefing Técnico: <req-id>

> Resumen técnico de la investigación realizada para la especificación.

## 1. Estado del Código

### Módulos Analizados
- **<module-1>**: <description>
- **<module-2>**: <description>

### Patrones Detectados
- <pattern-1>
- <pattern-2>

### Convenciones
- <convention-1>
- <convention-2>

## 2. Specs Existentes

| Capability | Estado | Acción |
| :--- | :--- | :--- |
| <spec-1> | Existente | Reutilizar |
| <spec-2> | Existente | Modificar |
| <spec-3> | Nueva | Crear |

## 3. Contratos API

### Nuevos
- **<api-1>**: <description>

### Evolución
- **<api-2>**: v1 -> v2 (cambios: <changes>)

### Reuso
- **<api-3>**: Sin cambios

## 4. Realidad de BD

### Esquema Actual
- <table-1>: <description>
- <table-2>: <description>

### Conflictos Detectados
- <conflict-1>

### Riesgo Destructivo
- <risk-1>

## 5. Riesgos y Preguntas Abiertas

### Riesgos
- <risk-1>: <mitigation>

### Preguntas Abiertas
- <question-1>
- <question-2>

## 6. Mapa Propuesto

| ID | Change | Capa | Módulos Afectados |
| :--- | :--- | :--- | :--- |
| ID-01 | <change-name> | Backend | <module-1>, <module-2> |
| ID-02 | <change-name> | Frontend | <module-3> |

## Enlaces

- **OpenSpec**: `openspec/changes/<change-name>`
- **Requerimiento**: <requirement-link>
- **Specs**: <specs-link>
```

## Integration with Other Skills

### From spec-from-note

When `spec-from-note` generates a briefing in `docs/requirements/briefings/`, this skill copies it to Obsidian for portability.

### With obsidian-summary

Generate briefing alongside the summary for complete technical documentation.

### Before obsidian-tests

Document the technical context before generating test documentation.

## Enforcement Rules

1. **Use existing briefing** - If a briefing exists in `docs/requirements/briefings/`, use it as the source
2. **Technical accuracy** - Ensure all technical details are accurate
3. **Link to source** - Always link back to the OpenSpec change and requirement
4. **Portable format** - Ensure the document is readable without repository context
5. **Spanish content** - Write the briefing in Spanish for the user

## Common Scenarios

### Scenario: Briefing exists in repository

1. Check `docs/requirements/briefings/` for existing briefing
2. Copy content to Obsidian
3. Add links and metadata
4. Show confirmation

### Scenario: User asks for technical summary

1. User says "genera un briefing técnico"
2. Skill investigates the codebase
3. Generates briefing in Obsidian
4. Shows confirmation

### Scenario: Before implementation

1. User says "necesito entender qué vamos a hacer"
2. Skill generates technical briefing
3. Briefing is available for reference

## Notes

- This skill creates technical documentation in Obsidian, not in the repository
- Briefings in `docs/requirements/briefings/` are for the repository
- Briefings in Obsidian are for cross-machine reference
- Use this skill to maintain technical knowledge across machines
