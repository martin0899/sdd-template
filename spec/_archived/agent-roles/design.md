# Design: agent-roles

## Context

Definir el contrato de entradas y salidas de los roles del flujo, reutilizando los agentes existentes, y la compuerta de revisión de `gertrudis` condicionada por riesgo, con veredicto y hallazgos reproducibles.

## Decisions

- **Contrato de roles con entradas y salidas**: El sistema SHALL definir, para los roles `coordinador`, `planificador`, `implementador` y `revisor` (gertrudis), las entradas que cada rol consume y las salidas que produce, como contrato compartido del flujo.
- **Reutilización de agentes existentes**: El sistema SHALL implementar estos roles reutilizando y mejorando los agentes existentes y MUST NOT crear agentes nuevos; el único rol nuevo del programa es `documentador`, definido fuera de esta capability.
- **Gertrudis reporta y no modifica**: El rol `revisor` (gertrudis) SHALL reportar sin modificar código ni artefactos, y MUST emitir un veredicto `APROBADO`, `CAMBIOS NECESARIOS` o `BLOQUEO DE ENTORNO`, con hallazgos que indiquen `archivo:línea`, el criterio…
- **Revisión condicional por riesgo**: El sistema SHALL escalar la revisión según el riesgo: en ODD de bajo riesgo basta el diff con checks mínimos y sin revisión pesada; en riesgo medio o alto se invoca a `gertrudis`; en SDD se aplican las compuertas…
- **Flujo de trabajo por modo**: El sistema SHALL definir el flujo de trabajo completo para cada modo y el `coordinador` SHALL anunciar el modo efectivo en la primera línea antes de enrutar.
- **Coordinador identifica el estado antes de actuar**: Antes de actuar, el `coordinador` SHALL identificar el modo, el ID del cambio, el estado de los artefactos y tareas y la fase actual, y MUST evitar el trabajo duplicado sobre el mismo cambio.

## Verification

6 requisitos condensados desde
`openspec/specs/agent-roles/spec.md` (113 líneas en el original).
