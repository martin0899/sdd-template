---
name: spec-from-note
description: Convert an Obsidian requirement note into OpenSpec changes and layered specs (frontend/backend/db) with a code-grounded briefing, mandatory confirmation rules and note traceability. Use when the user says "lee la nota/lee el archivo" pointing to a requirement note, asks to generate specs from a requirement, wants activities split into multiple OpenSpec changes, or after requirements-discovery produces a confirmed requirement.
author: SDD-template
version: 1.1.0
---

# spec-from-note

Convierte una nota de requerimiento (Obsidian) en changes y especificaciones OpenSpec por capa, ancladas a la realidad del código mediante un briefing investigado. **Nunca escribe specs sin confirmación explícita del usuario para las decisiones no definidas en la nota.**

## Rutas y Configuración

> **Override en conversación:** el usuario puede indicar en cualquier momento "las plantillas están en <ruta>", "el registro vive en <ruta>" o "los briefings van en <ruta>" y se actualizan para el resto de la sesión.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `templates_dir` | Carpeta donde viven las plantillas de requerimiento | `Recursos/Plantilla/` (raíz del vault de Obsidian) |
| `requirements_dir` | Carpeta donde viven los requerimientos generados | `Requerimientos/` (raíz del vault de Obsidian) |
| `project_registry` | Registro de requerimientos procesados por proyecto | `docs/requirements/REGISTRY.md` (dentro del repo del proyecto) |
| `project_briefings` | Briefings técnicos generados durante la investigación | `docs/requirements/briefings/` (dentro del repo del proyecto) |
| `changes_dir` | Carpeta de cambios OpenSpec | `openspec/changes/` (dentro del repo del proyecto) |

**Resolución de rutas al inicio de cada invocación:**

1. Si el usuario indicó rutas explícitas en la conversación actual → usar esas.
2. Si existe `docs/requirements/REGISTRY.md` en el proyecto → leer las rutas registradas (incluye `templates_dir` y `requirements_dir`).
3. Si existe `Recursos/Plantilla/` en el vault de Obsidian detectado → usar como `templates_dir`.
4. Si ninguna aplica → preguntar al usuario y registrar en `REGISTRY.md`.

**Portabilidad a proyectos destino:** esta skill vive en `.agents/skills/` y se distribuye vía `install.sh`. Los valores por defecto asumen un vault de Obsidian con estructura estándar; en proyectos sin vault, el agente pregunta y registra.

## Handoff desde requirements-discovery

Cuando el agente invoca esta skill desde `requirements-discovery`, la nota ya garantiza:

- Plantilla `Requerimiento para Specs.md` aplicada.
- Mapa de Impacto Técnico con nivel de confianza (`Confirmado` / `Propuesto` / `Por analizar` / `Por confirmar`).
- Navegación frontend (menú, ruta, distribución, componentes, colores).
- Inventario de objetos DB completo.
- Contratos de API en sección 7.
- Detalle por actividad en sección 8.
- Fuera de alcance en sección 9.

La nota puede estar en `{requirements_dir}` (vault de Obsidian) o en cualquier otra ruta que el usuario indique. El flujo a partir de aquí es idéntico.

## Los 7 pasos del flujo

### 1. Leer la nota (sin copiarla)
- Lee la nota desde la ruta que indique el usuario ("lee el archivo <ruta>", "lee la nota <ruta>").
- **NO copies la nota al repositorio.** Solo se lee y se referencia.
- Parsea: frontmatter (id, Tipo, Proyecto, Fecha), matriz de actividades (sección 5: ID, Componente, Actividad, Prioridad, Estado), contratos de API (sección 7: bloques API-xx), reglas de negocio (sección 6), detalle por actividad (sección 8), fuera de alcance (sección 9) y "lo que espera el usuario" (sección 10).
- Si la nota incluye **Mapa de Impacto Técnico** (de `requirements-discovery`): extrae inventario de DB, navegación frontend y dependencias backend como evidencia inicial del briefing.
- La nota puede tener cualquier nivel de detalle; el flujo funciona igual (ver "Niveles de detalle").

### 2. Investigar el repo
- Si existe graphify en el proyecto (`graphify-out/graph.json`): usa `graphify query` para módulos y patrones relacionados con cada actividad, `graphify path` para relaciones y `graphify explain` para conceptos.
- Lee `openspec/specs/` para detectar capabilities vigentes que la nota evoluciona o reutiliza (ej. una API-01 que ya tiene spec).
- Revisa el esquema de BD real (migraciones, modelos) para detectar conflictos de nombres o cambios destructivos.
- Si no hay graphify montado: investigación directa de código y specs. El briefing pierde profundidad pero el flujo funciona.

### 3. Generar el briefing
Escribe `{project_briefings}/<req-id>.md` con estas secciones:
1. **Estado del código** — módulos, patrones y convenciones detectados por actividad
2. **Specs vigentes** — capabilities que se modifican, reusan o son nuevas
3. **Contratos API en juego** — nuevos vs evolución (compara bloques API-xx de la nota contra endpoints y specs existentes)
4. **Realidad de BD** — esquema actual, conflictos, riesgo destructivo
5. **Riesgos y preguntas abiertas** — lo que la nota asume y el código contradice
6. **Mapa propuesto** — borrador ID-xx -> change -> capa -> módulos afectados (con archivos concretos)

Si la nota trae **Mapa de Impacto Técnico**, úsalo como input para las secciones 3, 4 y 6: contrasta los objetos declarados contra el esquema real, y los menús/rutas contra el código frontend.

### 4. Revisar el briefing con el usuario
- Presenta el briefing y espera correcciones. Este paso es obligatorio.
- Las contradicciones nota-vs-código se resuelven aquí, antes de especificar.

### 5. Desglose ID-xx a changes
- Propone el mapeo: cada actividad ID-xx -> un change OpenSpec (`add-id01-<slug>`), con la capa que indica la columna Componente.
- **Aplican las reglas de confirmación** (ver abajo) para el desglose y cualquier decisión técnica.
- Actividades dependientes se ordenan; actividades independientes quedan como changes separados.

### 6. Crear los changes OpenSpec
- Por cada actividad confirmada: `openspec new change "add-idXX-<slug>"` (nunca crear carpetas a mano).
- Cada change incluye:
  - `proposal.md` con línea de trazabilidad: `Fuente: <ruta de la nota> · Actividad: ID-xx` y sección **Impact** con áreas y archivos afectados (del briefing)
  - `design.md` con **Risks / Trade-offs** y **Migration Plan** con rollback concreto (queries inversas o reverts; el SELECT de verificación de la nota alimenta la tarea de verificación previa)
  - `specs/<capa>/spec.md` con requisitos y escenarios WHEN/THEN, incluyendo **escenarios de error** para fallos identificables
  - `tasks.md` con tareas verificables
- Backend: los escenarios derivan de los bloques request/response del contrato API-xx referenciado. El front NO duplica el JSON: su spec describe comportamientos de UI (estados loading/error/vacío, validaciones) y referencia el contrato.
- Si una API-01 ya tiene spec vigente y la nota la evoluciona: delta MODIFIED, no duplicado.

### 7. Actualizar el registro
Crea o actualiza `{project_registry}`:

```markdown
# Requirements Registry

Templates dir: <ruta configurada de templates_dir>
Requirements dir: <ruta configurada de requirements_dir>

| nota (ruta) | requerimiento | briefing | changes generados | estado |
|-------------|---------------|----------|-------------------|--------|
| <ruta>      | <req-id>      | docs/requirements/briefings/<req-id>.md | add-id01-..., add-id02-... | 0/2 applied |
```

- Al re-procesar una nota ya registrada: re-lee la nota por la ruta registrada, detecta deltas respecto a lo ya generado (actividades nuevas, reglas cambiadas) y actualiza la fila.

## Reglas de confirmación obligatoria

**El agente DEBE preguntar y esperar confirmación explícita del usuario antes de escribir cualquier spec cuando deba elegir:**

1. **Tecnologías** — librería, framework, herramienta (ej. "validaré con Zod, ¿ok?")
2. **Patrones de implementación** — arquitectura interna, estructura del módulo
3. **Ubicación** — dónde vive el código nuevo (módulo, carpeta, archivo)
4. **Esquema de BD** — nombres de tablas/campos, índices, tipo de migración
5. **Contratos API** — rutas, payloads, códigos de respuesta si la nota no los trae
6. **Desglose** — el mapeo ID-xx -> changes y la capa de cada uno

**Contrapeso:** si la nota ya trae el detalle explícito (SQL exacto, payload JSON, ruta de pantalla), se respeta tal cual **sin preguntar**. Solo se señala si contradice el código real detectado en el briefing. El rollback o cualquier cambio destructivo de datos se confirma siempre, incluso si la nota lo trae.

## Niveles de detalle de la nota

| Nivel | Nota trae | Comportamiento |
|-------|-----------|----------------|
| Detallada | Matriz + APIs + SQL + Mapa de Impacto + expectativas | Confirmación breve del desglose; specs casi directas |
| Parcial | Matriz sin APIs ni SQL + Mapa de Impacto parcial | El briefing deduce lo técnico; el agente PROPONE con evidencia y pregunta |
| Mínima | Objetivo + expectativas del usuario | El briefing PROPONE la matriz; conversación de desglose más larga |

Lo que el agente **nunca** inventa: intención de negocio ambigua (pregunta) y fuera de alcance (lo propone explícitamente para aprobación).

## Contratos de API compartidos

- Los contratos viven en la nota que los introduce (sección 7) y **evolucionan por copia**: una nota posterior que modifica API-01 lleva el bloque actualizado (v2).
- El briefing detecta si un bloque es reuso (idéntico a la spec vigente) o evolución (difiere) comparando contra `openspec/specs/`.
- El historial de evolución lo guarda el archive de OpenSpec, no Obsidian.

## Notas

- Esta skill termina en artefactos OpenSpec; la implementación es territorio de `/opsx-apply`.
- Para updates posteriores de una misma nota, re-invoca la skill con la misma ruta; el registro detecta que ya fue procesada.
