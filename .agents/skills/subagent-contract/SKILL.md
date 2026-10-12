---
name: subagent-contract
description: Contrato central de subagentes: define entradas, salidas y reglas para coordinador, planificador, implementador y revisor.
---

# Contrato de subagentes

Lee y respeta este contrato cuando actúes como (o delegues en) un rol del ciclo. Los subagentes no publican por su cuenta: entregan su resultado al coordinador.

## Contrato de roles y compuerta de revisión

### Entradas y salidas por rol

- **coordinador**: consume el pedido y el estado del cambio (vía la fachada) → produce clasificación, enrutado y fase.
- **planificador**: consume un pedido autorizado a planificar → produce `proposal`, specs, `design` y `tasks`.
- **implementador**: consume las tareas existentes → produce cambios de código con sus pruebas ejecutadas.
- **revisor (gertrudis)**: consume modo, ID del cambio, documento fuente, diff, pruebas y riesgo → produce veredicto con hallazgos.

### Reutilización de agentes

Reutiliza y mejora los agentes existentes; **no crees agentes nuevos**. El único rol nuevo del programa es `documentador`.

### Compuerta de gertrudis (solo lectura)

gertrudis **reporta y NO modifica** código ni artefactos. Emite un veredicto cerrado: `APROBADO` | `CAMBIOS NECESARIOS` | `BLOQUEO DE ENTORNO`. Los hallazgos usan el formato `archivo:línea`, nombran el criterio incumplido y adjuntan evidencia reproducible. Nunca emitas `APROBADO` sin evidencia reproducible: si no hay evidencia, reporta la carencia.

### Revisión por riesgo

- **ODD de bajo riesgo**: basta el diff con checks mínimos, sin revisión pesada bloqueante.
- **Riesgo medio/alto**: invoca a **gertrudis** con su contrato de entrada y salida.
- **SDD**: aplica las compuertas formales del modo, con independencia del tamaño percibido.

### Flujos por modo

El coordinador **anuncia el modo efectivo en la primera línea** antes de enrutar.

- **SDD**: `pending → spec_ready → ⏸ aprobación humana → in_progress → [implementador → gertrudis] → done`. **NUNCA** lances al implementador en `pending`: los artefactos deben completarse y validarse (`spec_ready`) y ser aprobados antes de implementar.
- **ODD**: ciclo orgánico **sin OpenSpec**. Cambio pequeño: ruta directa al implementador (diff + checks mínimos, sin documentación formal). Cambio sustancial: `odd/changes/<id>/feature.md` como fuente de verdad (se crea antes del primer write y se registra cada commit como evidencia). Cierre ODD: propón al humano la migración propuesta y, si se confirma, despáchala al `documentador`.
- Reglas duras: **NUNCA** invocar OpenSpec en ODD; **NUNCA**: no publicar al brain ni a `05_wiki/` sin despacho del coordinador; **un solo ejecutor activo** por cambio (no relances apply).

### Identificación de estado

Antes de actuar, el coordinador identifica modo, ID del cambio, estado de artefactos/tareas y fase consultando la fachada de Spectralis; no crea plan ni checklist paralelos y reanuda desde la primera tarea pendiente.
