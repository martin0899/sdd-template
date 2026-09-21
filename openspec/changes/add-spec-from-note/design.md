# Design: add-spec-from-note

## Context

Ver proposal.md para la motivación. Piezas existentes que el diseño reutiliza: plantillas de Obsidian del usuario (`Requerimiento.md`, `API Response.md`, `Tickets Cambio en Base de Datos.md` en su vault), graphify como herramienta de investigación (regla principal de AGENTS.md), el índice de skills (`.agents/skills/INDEX.md`) y el flujo estándar OpenSpec (`openspec new change` + apply + archive).

## Goals / Non-Goals

**Goals:**
- Un solo punto de entrada: "lee la nota <ruta>" produce changes OpenSpec listos para apply
- Specs ancladas al código real mediante briefing investigado
- El usuario conserva el control: nada tecnológico se decide sin confirmación
- Las notas nunca se copian; se referencian

**Non-Goals:**
- No modificar skills existentes (enrich-us sigue su ciclo de vida propio)
- No crear schemas ni comandos nuevos de OpenSpec CLI
- No automatizar con hooks la lectura de notas ni la actualización del registro
- No generar código de aplicación: la skill termina en artefactos OpenSpec, la implementación es territorio de apply

## Decisions

### D1: Skill nueva, no extensión de enrich-us
enrich-us devuelve markdown al chat y escribe a Jira; su destino es la conversación. spec-from-note produce changes OpenSpec y archivos de trazabilidad. Destinos y ciclos de vida distintos justifican skills separadas. Alternativa descartada: extender enrich-us con un modo "openspec" (acoplaba dos flujos con salidas incompatibles).

### D2: Un change por actividad ID-xx de la matriz
Mantiene los applies pequeños, archivables y revisables por separado, y mapea 1:1 con la columna de la matriz del usuario. La trazabilidad del requerimiento completo vive en REGISTRY.md, no en un change contenedor. Alternativa descartada: un change con N capabilities (pierde la granularidad de apply/archive por actividad).

### D3: Contratos de API viven en la nota que los introduce y evolucionan por copia
Cada nota especifica el contrato *como quedará después de ese requerimiento*. El historial de evolución lo guarda el archive de OpenSpec, no Obsidian. El reuso entre notas es copia del bloque; el briefing detecta si es reuso o evolución comparando contra specs vigentes. Alternativa descartada: notas individuales por API con wikilinks (el usuario prefirió notas autocontenidas).

### D4: Briefing como archivo persistido en el repo destino
`docs/requirements/briefings/<req-id>.md` sobrevive a la conversación, enlaza con el registro y cada change lo cita. La investigación usa graphify (query/path/explain) cuando el proyecto lo tiene montado, y lectura directa de `openspec/specs/` + código como fallback. Alternativa descartada: briefing solo en conversación (se pierde) o dentro de cada change (fragmenta la vista del requerimiento).

### D5: Registro en `docs/requirements/REGISTRY.md` con la ruta de la plantilla incluida
Un único archivo "vivo" por proyecto: primera entrada documenta dónde está la plantilla en el vault (evita atar la ruta dentro del SKILL.md, que rompería si el usuario mueve su vault), y una fila por requerimiento (nota, id, briefing, changes, estado). Alternativas descartadas: ruta de plantilla como constante en la skill (frágil) o preguntarla siempre (fricción).

### D6: Reglas de confirmación como lista cerrada de seis categorías
Tecnologías, patrones, ubicación, esquema BD, contratos API y desglose. Lista cerrada en lugar de criterio abierto ("algo importante") para que la conducta del agente sea predecible. Contrapeso explícito: lo que la nota ya define se respeta sin preguntar; solo se advierten contradicciones con el código real.

### D7: Impact/Risks/Migration Plan siempre rellenos en changes generados
La plantilla de artefactos de la skill obliga a rellenar las secciones aunque el change sea pequeño. El rollback concreto (queries inversas, reverts) se alimenta de las queries de verificación del briefing (patrón tomado de la plantilla de tickets BD del usuario: SELECT de verificación antes del UPDATE).

## Risks / Trade-offs

- [Nota mínima genera specs mediocres si el usuario no participa en la conversación] → Mitigación: el flujo incluye revisión del briefing como paso obligatorio; las reglas de confirmación bloquean specs sin decisiones validadas.
- [Registro desactualizado si se editan notas fuera del flujo] → Riesgo aceptado: el registro es trazabilidad, no fuente de verdad; la fuente es la nota y los specs vigentes.
- [La ruta del vault cambia entre máquinas] → Mitigación: la ruta de plantilla vive en REGISTRY.md (editable con un editor), no en la skill.
- [Graphify no montado en proyectos destino] → Fallback documentado: investigación directa de código y specs vigentes; el briefing pierde profundidad pero el flujo funciona.

## Migration Plan

Sin migración: archivos nuevos y dos ediciones (INDEX.md, README de manuals). Revert trivial: borrar archivos nuevos y revertir las dos filas.

## Open Questions

Ninguna.
