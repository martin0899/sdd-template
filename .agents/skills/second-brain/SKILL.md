---
name: second-brain
description: Use when the user asks to save/capture/annotate a note ("guarda esta nota", "apunta esto", "brain dump", "captura"), OR to "depurar"/organize/clean notes ("depura", "organiza las notas", "limpia el inbox") by moving them from 00_Notas to their PARA destination (01_Proyectos, 02_Ideas, 03_Recursos, 04_archivado). Manages the Obsidian vault as a Tiago Forte Second Brain (CODE + PARA methodology).
---

# Second Brain (Obsidian)

Maneja el vault como un Second Brain (metodología CODE + PARA de Tiago Forte) adaptada a las carpetas existentes del usuario. Capturar siempre en `00_Notas`; depurar mueve cada nota a su destino por accionabilidad.

## Mapa del vault (adaptación PARA)

| Carpeta | Rol | Qué va aquí |
|---|---|---|
| `00_Notas/` | **Capturar** (inbox) | TODO lo que se guarda llega aquí primero, sin excepción |
| `01_Proyectos/<Proyecto>/` | **Proyectos** | Notas ligadas a un proyecto activo con resultado/entregable (ej. SVA_Restaurante, Chapur Pay, Mesa Regalos) |
| `02_Ideas/` | Ideas / someday | Posibles proyectos futuros, brainstorms, cosas incubando sin compromiso |
| `03_Recursos/` | **Recursos** | Referencia por tema: `01_Documentacion/` (Lenguajes, Programas, PC_fedora, PC_Trabajo, Portafolio), `02_Sistemas_info/` (APIs, arquitectura), `Files/` |
| `04_archivado/` | **Archivo** | Notas de proyectos terminados o sin relevancia actual |
| `09_Plantilla/` | — | Solo plantillas; nunca mover notas aquí |

## Flujo 1 — Capturar (comportamiento por defecto)

Cuando el usuario pida guardar/apuntar/anotar/capturar algo:

1. Crea la nota en `00_Notas/<Nombre descriptivo>.md` — nunca en otra carpeta, aunque el tema sea obvio.
2. Frontmatter mínimo (estilo de `09_Plantilla/Nota.md`):
   ```yaml
   ---
   id: YYYYMMDD-HHMM
   Tipo: Nota
   Proyecto: Inbox
   Fecha: YYYY-MM-DD
   tags: [tema1, tema2]
   ---
   ```
3. Estructura el contenido con headings y viñetas, pero NO lo organices ni archives en este paso. Capturar rápido es la regla: no entrevistar al usuario con preguntas largas para capturar.
4. Confirma en una línea: nota creada en `00_Notas`.

## Flujo 2 — Depurar (organizar el inbox)

Cuando el usuario diga "depurar", "depura", "organiza las notas", "limpia el inbox":

1. Lista las notas en `00_Notas/` (ignora `_INDEX.md` y archivos no-markdown). Si está vacío, dilo y termina.
2. Clasifica cada nota **por accionabilidad, en este orden de decisión**:
   1. ¿Apoya un proyecto activo? → `01_Proyectos/<Proyecto>/` (usa la subcarpeta si encaja: convenios, firma_digital, tickets, puntos vivo, etc.; si no, raíz del proyecto)
   2. ¿Es idea de algo que quizá haga algún día? → `02_Ideas/`
   3. ¿Es referencia útil sin importar el proyecto? → `03_Recursos/<subtema>/`
   4. ¿Nada de lo anterior / ya no importa? → `04_archivado/`
3. Reglas al mover:
   - Una nota = un tema. Si una brain-dump mezcla temas, divídela en varias notas antes de mover.
   - Actualiza el frontmatter: `Proyecto:` con el proyecto real (o nombre de carpeta destino) y enriquece `tags`.
   - Si el destino no existe (proyecto o subtema nuevo), créalo con su `_INDEX.md` (patrón: `# <Nombre>` + lista de links a carpetas/notas) y actualiza el `_INDEX.md` del padre.
   - Usa `git mv` si el archivo ya está trackeado; si no, `mv` normal.
4. Casos ambiguos: agrúpalos y pregúntale al usuario en un solo bloque (máx. 3-4 notas), mostrando las opciones de destino sugeridas.
5. Cierra con un resumen en tabla: Nota → Destino → Motivo (una línea cada uno).

## Criterios rápidos de clasificación

- **Proyecto**: hay un entregable, ticket, feature, test o fecha detrás (trabajo actual del usuario).
- **Idea**: "podríamos...", "qué tal si...", propuestas sin compromiso, ideas de proyectos futuros.
- **Recurso**: comandos, cómo hacer X, documentación de APIs/sistemas, aprendizajes de consulta recurrente sin fecha límite.
- **Archivo**: notas de proyectos ya cerrados, duplicados, recordatorios vencidos sin valor futuro.

## Reglas

- Nunca borres notas al depurar; solo muévelas (lo "muerto" va a `04_archivado/`).
- El camino siempre pasa por `00_Notas`: nunca guardes directamente en 01-04 salvo pedido explícito del usuario.
- No reorganices 01-04 por tu cuenta; el flujo es únicamente `00_Notas → destino`.
- Si la nota menciona un proyecto que no existe como carpeta, confírmalo antes de crear estructura nueva.
- Contenido y nombres de notas en español.
- Si el usuario pregunta "dónde va esta nota" sin pedir mover, aplica el criterio de clasificación y sugiere el destino.
