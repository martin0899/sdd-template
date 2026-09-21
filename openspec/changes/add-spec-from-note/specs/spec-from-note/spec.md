# Delta spec: spec-from-note

## Purpose

Convertir notas de requerimiento escritas en Obsidian en changes y especificaciones OpenSpec por capa (frontend, backend, db), ancladas a la realidad del código mediante un briefing investigado, con confirmación obligatoria de decisiones no definidas en la nota y trazabilidad sin copiar las notas.

## ADDED Requirements

### Requirement: Lectura de nota de requerimiento sin copiarla
La skill SHALL leer la nota de requerimiento desde la ruta que el usuario indique (en su vault de Obsidian u otra ubicación) sin copiarla al repositorio. La skill SHALL registrar la referencia de la ruta del archivo, no su contenido duplicado.

#### Scenario: El usuario pide procesar una nota por su ruta
- **WHEN** el usuario indica "lee el archivo <ruta>" y la ruta apunta a una nota con la plantilla de requerimiento
- **THEN** la skill lee la nota en su ubicación original, parsea el frontmatter, la matriz de actividades y los contratos de API, y no crea ninguna copia del archivo en el repositorio

#### Scenario: La nota tiene nivel de detalle mínimo
- **WHEN** la nota solo contiene objetivo y expectativas del usuario, sin matriz de actividades ni contratos de API
- **THEN** la skill procede igualmente y propone la matriz de actividades durante la conversación, sin exigir detalle que la nota no trae

### Requirement: Briefing investigado antes de especificar
Antes de proponer el desglose, la skill SHALL investigar el repositorio destino y generar un briefing en `docs/requirements/briefings/<req-id>.md` que incluya: módulos y patrones existentes relacionados (vía graphify cuando exista el grafo), specs vigentes que la nota evoluciona o reutiliza, contratos API en juego (nuevos o evolución), realidad del esquema de BD, riesgos detectados y un borrador de mapeo de actividades ID-xx a changes.

#### Scenario: Investigación detecta capabilities existentes
- **WHEN** el briefing encuentra en `openspec/specs/` una capability que la nota modifica (ej. una API-01 que ya tiene spec)
- **THEN** el briefing lo señala y el change generado produce deltas MODIFIED sobre esa capability en lugar de duplicarla

#### Scenario: Briefing queda persistido
- **WHEN** la skill completa la investigación de un requerimiento
- **THEN** existe el archivo `docs/requirements/briefings/<req-id>.md` con las seis secciones del briefing y el registro lo enlaza

### Requirement: Confirmación obligatoria de decisiones no definidas
La skill SHALL preguntar y esperar confirmación explícita del usuario antes de escribir cualquier spec cuando deba elegir: tecnologías o librerías, patrones de implementación, ubicación de código nuevo, esquema de BD (tablas, campos, índices), contratos API (rutas, payloads, respuestas) o el desglose ID-xx a changes. Si la nota ya trae el detalle explícito, la skill SHALL respetarlo sin preguntar y solo señalar contradicciones con el código real.

#### Scenario: La nota no define la librería de validación
- **WHEN** la nota omite la tecnología y la skill necesita especificarla en el diseño
- **THEN** la skill propone una opción con evidencia del briefing y espera confirmación antes de escribir specs que la asuman

#### Scenario: La nota trae el SQL exacto
- **WHEN** la nota incluye las sentencias SQL de una actividad de base de datos
- **THEN** la skill las respeta tal cual en la spec y solo advierte si el briefing detecta conflicto con el esquema existente

### Requirement: Changes OpenSpec por actividad con artefactos completos
Cada actividad ID-xx de la matriz SHALL convertirse en un change OpenSpec creado con `openspec new change` (nunca carpetas manuales), con una capability por capa afectada. Cada change generado SHALL incluir sistemáticamente: `## Impact` con áreas y archivos afectados, `## Risks / Trade-offs` con mitigaciones, `## Migration Plan` con estrategia de rollback, y escenarios de error en las specs para los fallos identificables.

#### Scenario: Actividad de backend con contrato API
- **WHEN** una actividad de backend consume o crea un contrato API-xx definido en la nota
- **THEN** el change genera la spec de la capa backend con escenarios WHEN/THEN derivados de los bloques request/response del contrato, sin duplicar el JSON en specs de otras capas

#### Scenario: Rollback definido
- **WHEN** un change modifica esquema de BD o contratos API
- **THEN** su `## Migration Plan` describe la reversión concreta (comandos o queries) y la tarea de verificación previa existe en `tasks.md`

### Requirement: Registro de trazabilidad de notas
La skill SHALL mantener un registro `docs/requirements/REGISTRY.md` por proyecto destino que documente: la ruta de la plantilla de notas en el vault, y por cada requerimiento procesado: ruta de la nota, id del requerimiento, ruta del briefing, changes generados y su estado. La skill SHALL actualizar el registro al generar changes y al re-procesar una nota ya registrada.

#### Scenario: Primera nota procesada en un proyecto
- **WHEN** la skill procesa un requerimiento en un proyecto sin registro previo
- **THEN** crea `docs/requirements/REGISTRY.md` con la ruta de la plantilla en el vault y la fila del requerimiento procesado

#### Scenario: Nota editada después de procesada
- **WHEN** el usuario edita la nota original (agrega una actividad ID-04, cambia una regla) y vuelve a pedir procesarla
- **THEN** la skill re-lee la nota por la ruta registrada, detecta los deltas respecto a lo ya generado y actualiza la fila del registro con los nuevos changes
