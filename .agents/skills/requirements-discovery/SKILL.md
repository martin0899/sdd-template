---
name: requirements-discovery
description: Use when defining a project requirement from a conversation, document, ticket, image, or existing Obsidian note, especially when the request needs database impact, API contracts, frontend navigation/UI detail, template review, or clarification before specifications.
---

# Requirements Discovery

Build a solid Spanish requirement before producing implementation specifications. The requirement is the source of truth for scope; OpenSpec or work specifications are downstream artifacts and must not be created prematurely.

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "guarda los requerimientos en <ruta>" o "las plantillas están en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `templates_dir` | Carpeta donde viven las plantillas de requerimiento | `/mnt/c/Users/martin.martinez/Documents/obsidian/Local/obsidian_sync_git/Recursos/Plantilla` (raíz del vault de Obsidian) |
| `requirements_dir` | Carpeta donde se escriben los requerimientos generados | `/mnt/c/Users/martin.martinez/Documents/obsidian/Local/obsidian_sync_git/Requerimientos` (raíz del vault de Obsidian) |
| `project_registry` | Registro de requerimientos procesados por proyecto | `docs/requirements/REGISTRY.md` (dentro del repo del proyecto) |
| `project_briefings` | Briefings técnicos generados durante la investigación | `docs/requirements/briefings/` (dentro del repo del proyecto) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si existe `docs/requirements/REGISTRY.md` en el proyecto → leer las rutas registradas.
3. Si existe `Recursos/Plantilla/` en el vault de Obsidian detectado → usar como `templates_dir`.
4. Si ninguna aplica → preguntar al usuario y registrar en `REGISTRY.md`.

**Portabilidad a proyectos destino:** esta skill vive en `.agents/skills/` y se distribuye vía `install.sh`. Los valores por defecto asumen un vault de Obsidian con estructura estándar; en proyectos sin vault, el agente pregunta y registra.

## Use This Skill When

- The user asks to create or define a requirement.
- The user asks to read a document and turn it into a requirement.
- The request mentions reviewing or using templates in `{templates_dir}`.
- The request needs database objects, APIs, menus, screens, visual distribution, or UI behavior.
- The source is incomplete and needs targeted questions.

## Hard Gates

1. Do not write a requirement, derived note, OpenSpec change, or work specification before reviewing the available templates and the source material.
2. Do not invent technical names, routes, tables, packages, procedures, colors, roles, or deadlines. Mark them `Confirmado`, `Propuesto`, `Por analizar`, or `Por confirmar`.
3. Separate facts extracted from the source, findings from repository/code investigation, proposals, assumptions, and open questions.
4. Present the template audit, segmented findings, proposed scope, and blocking questions before writing artifacts. Wait for explicit confirmation.
5. After the requirement is confirmed, writing the requirement is allowed. Creating OpenSpec changes or implementation specifications still requires a separate explicit request or confirmation.

## Workflow

### 1. Establish the source

- Read the exact file, note, ticket, conversation, or link supplied by the user.
- Preserve source traceability: path, heading, table row, page, or quoted fragment.
- If the user only describes an idea, treat the conversation as the source and record missing evidence.
- Do not copy the source into the project unless the user explicitly asks for a derived note.

### 2. Audit templates before selecting one

Inspect `{templates_dir}` and report which templates are reusable, complementary, incomplete, or unrelated. Prefer composition over recreating templates:

| Need | Preferred template |
|---|---|
| General requirement | `Requerimiento.md` |
| Requirement ready for technical specifications | `Requerimiento para Specs.md` |
| API inventory or endpoint documentation | `Documentación Apis.md` |
| Individual API response/test reference | `API Response.md` |
| QA execution and database validation | `Solicitud de Test QA.md` |
| Small application change | `Tickets Cambio en Aplicativo.md` |
| Small database change | `Tickets Cambio en Base de Datos.md` |
| Working notes and decisions | `Nota.md`, `Nota de Pensamiento.md`, or `Plan de Sesión.md` |

Do not create a new template just because a field is missing. First add the field to the selected requirement workflow or compose the existing complementary template. Propose a new template only when the use case is a stable artifact with a distinct lifecycle.

### 3. Segment the source into evidence

Build an internal matrix with these categories:

- Business objective and user problem.
- Scope, exclusions, actors, roles, and permissions.
- Business rules, validations, statuses, and error behavior.
- Database impact inventory.
- Backend services, APIs, integrations, jobs, and configuration.
- Frontend menu location, route, screen structure, components, states, and visual rules.
- Infrastructure, environments, external dependencies, and security.
- Acceptance criteria, test data, risks, blockers, and open questions.

For every item record its source and confidence. A possible database object or UI choice is an impact candidate, not an approved change.

### 4. Investigate only what is necessary

- If the request concerns a codebase and `graphify-out/graph.json` exists, query Graphify before direct browsing.
- If no graph exists, use direct repository and documentation inspection.
- Compare existing APIs, modules, routes, database models, and specs only to detect conflicts and dependencies.
- Do not turn investigation findings into decisions without user confirmation when they change scope or implementation.

### 5. Check technical completeness

For database work, check at least: tables, columns, constraints, indexes, sequences, views, materialized views, triggers, packages, procedures, functions, jobs, grants, migrations/data changes, audit fields, verification queries, and rollback.

For frontend work, check at least: parent menu, submenu, label, route, role visibility, ordering, screen type, layout regions, fields, tables/cards, actions, loading/error/empty states, validations, responsive behavior, design-system components, colors/tokens, typography, spacing, icons, and reference screens.

For backend work, check at least: service/module, endpoint, method, authentication, request, response, errors, idempotency, pagination/filtering, dependencies, configuration, and consumers.

### 6. Ask focused questions

Ask only questions that block a reliable requirement. Group them into no more than four groups:

- Business scope and acceptance.
- Database impact and data migration.
- API/backend behavior.
- Frontend navigation and visual behavior.

Offer a clearly labeled proposal when possible, but do not silently choose. If information is genuinely unknown, preserve a `Por confirmar` entry instead of fabricating an answer.

### 7. Present the review gate

Before writing, show:

1. Selected template and complementary templates.
2. What the current templates already cover.
3. Gaps that are being handled by the requirement detail.
4. Extracted facts grouped by layer.
5. Proposed activity matrix with IDs and components.
6. Open questions and assumptions.
7. Explicit boundary: requirement now; specifications later.

Wait for the user's confirmation or corrections.

### 8. Write the confirmed artifacts

- Use the selected template without deleting mandatory sections.
- Keep the matrix concise; put implementation detail in the per-activity section.
- Create complementary notes only when useful and only from the corresponding template in `{templates_dir}`.
- Write the requirement to `{requirements_dir}/<Proyecto>/<subtema>/<Nombre>.md`.
- Link related Obsidian notes with wikilinks.
- Register source documents and derived artifacts in the requirement's links/history.
- Record meaningful changes in the history table with a version bump.

### 9. Register in REGISTRY.md

After writing the requirement, create or update `{project_registry}`:

```markdown
# Requirements Registry

Templates dir: <ruta configurada de templates_dir>
Requirements dir: <ruta configurada de requirements_dir>

| requerimiento (ruta) | req-id | plantilla usada | fecha | estado |
|----------------------|--------|-----------------|-------|--------|
| <ruta nota> | <req-id> | Requerimiento para Specs.md | YYYY-MM-DD | Definido |
```

If the file already exists, append a new row. If the dirs are not yet registered, add them at the top.

### 10. Handoff a especificaciones

After the requirement is written and registered, present a summary of unresolved decisions and ask:

> El requerimiento está listo en `<ruta>`. ¿Quieres que invoque `spec-from-note` para generar las especificaciones OpenSpec a partir de esta nota?

If the user confirms, invoke `spec-from-note` with the requirement path. Do not create OpenSpec artifacts during requirements-discovery — that is the responsibility of `spec-from-note`.

## Required Requirement Detail

Use `Requerimiento para Specs.md` when the request has more than one technical layer. Its activity detail must support these blocks:

```markdown
**DB:**

| Type | Schema | Object | Action | Impact | Confidence |
|---|---|---|---|---|---|
| Table | [schema] | [name] | Create/modify/read | [why] | Confirmed/Proposed |

**Frontend:**

- Menu: [parent > child]
- Route: [route]
- Roles: [roles]
- Layout: [regions and distribution]
- Components: [fields, table, cards, actions]
- States: loading, error, empty, success
- Visual rules: [tokens/colors/typography/spacing/icons]

**Acceptance criteria:**

- [ ] [Verifiable behavior]
```

## Common Mistakes

| Mistake | Correction |
|---|---|
| Filling the matrix with guessed object names | Keep candidates in the impact inventory and mark confidence. |
| Treating a table as the entire database impact | Check all object types and migration/rollback needs. |
| Describing a screen only as "create UI" | Map menu, route, layout, components, states, validation, and visual rules. |
| Duplicating API JSON in frontend detail | Reference `API-xx` and describe UI behavior. |
| Creating specs immediately after reading a source document | Stop at the review gate and wait for confirmation. |
| Recreating all templates | Reuse the general, specs, API, QA, and ticket templates by lifecycle. |
| Hardcoding template paths | Use `{templates_dir}` config; ask the user if not found. |
