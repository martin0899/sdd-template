# Design: sdd-config-sync

## Context

Permite mantener actualizada la configuración SDD de proyectos existentes a partir de una plantilla más reciente, con comparación previa, protección de personalizaciones y confirmación explícita de cada operación con riesgo.

## Decisions

- **Detección de actualización disponible**: El sistema DEBE (MUST) identificar que un proyecto destino ya contiene configuración SDD y comparar sus archivos gestionados con la versión disponible en la plantilla, sin escribir durante esta fase.
- **Plan de sincronización revisable**: El sistema DEBE (MUST) presentar antes de escribir un plan con cada archivo gestionado clasificado como nuevo, actualizado, sin cambios, personalizado, eliminado o sensible/generado.
- **Sincronización selectiva y segura**: El sistema DEBE (MUST) permitir al usuario aceptar, conservar o excluir cada conflicto de archivo, crear un backup fechado antes de reemplazar un archivo existente y nunca modificar archivos sensibles o generados por…
- **Sincronización idempotente**: El sistema DEBE (MUST) producir ningún cambio de contenido ni backup adicional cuando se ejecuta nuevamente con el mismo origen y el destino ya está sincronizado.
- **Verificación posterior**: El sistema DEBE (MUST) reportar el resultado por archivo y verificar que las skills, definiciones, comandos, documentación y reglas de agente esperadas están presentes después de una actualización aceptada.
- **Resolución de configuración de orquestación**: El sistema DEBE (MUST) resolver el valor de `obsidianSync` con una cascada determinista: manifiesto del proyecto (`.sdd-manifest.json`) → configuración global → default `0`.
- **Consumo de stack.json por la orquestación del wiki**: El sistema DEBE (MUST) poblar el campo `stack` de `05_wiki/_INDEX.json` desde el artefacto `stack.json` del proyecto detectado (vía la detección reproducible) en lugar de valores vacíos, y exponer el stack efectivo en…
- **Resolución de rutas del segundo cerebro**: El sistema DEBE (MUST) resolver las rutas del segundo cerebro (vault, plantillas, requerimientos, proyectos y recursos) con una cascada determinista: configuración global o del proyecto, luego manifiesto del proyecto,…

## Verification

8 requisitos condensados desde
`openspec/specs/sdd-config-sync/spec.md` (160 líneas en el original).
