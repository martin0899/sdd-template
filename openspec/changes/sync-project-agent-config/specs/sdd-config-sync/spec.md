# sdd-config-sync — Delta Spec

## Purpose

Permite mantener actualizada la configuración SDD de proyectos existentes a partir de una plantilla más reciente, con comparación previa, protección de personalizaciones y confirmación explícita de cada operación con riesgo.

## ADDED Requirements

### Requirement: Detección de actualización disponible

El sistema DEBE (MUST) identificar que un proyecto destino ya contiene configuración SDD y comparar sus archivos gestionados con la versión disponible en la plantilla, sin escribir durante esta fase.

#### Scenario: Proyecto instalado anteriormente

- **WHEN** el destino contiene el manifiesto o marcadores de configuración SDD
- **THEN** el sistema clasifica la operación como actualización y muestra la versión o estado instalado y la fuente de actualización

#### Scenario: Proyecto sin configuración previa

- **WHEN** el destino no contiene indicadores de una instalación SDD anterior
- **THEN** el sistema ofrece la instalación inicial y no presenta la operación como actualización

### Requirement: Plan de sincronización revisable

El sistema DEBE (MUST) presentar antes de escribir un plan con cada archivo gestionado clasificado como nuevo, actualizado, sin cambios, personalizado, eliminado o sensible/generado.

#### Scenario: Archivos modificados en la plantilla

- **WHEN** un archivo de la plantilla difiere del archivo correspondiente del destino
- **THEN** el plan muestra ambas rutas, la clasificación del conflicto y la acción propuesta

#### Scenario: Modo dry-run

- **WHEN** el usuario ejecuta la actualización en modo `--dry-run`
- **THEN** el sistema muestra el plan completo sin modificar archivos, crear backups ni cambiar la configuración del destino

### Requirement: Sincronización selectiva y segura

El sistema DEBE (MUST) permitir al usuario aceptar, conservar o excluir cada conflicto de archivo, crear un backup fechado antes de reemplazar un archivo existente y nunca modificar archivos sensibles o generados por una confirmación genérica.

#### Scenario: Actualización aceptada

- **WHEN** el usuario acepta reemplazar un archivo gestionado
- **THEN** el sistema respalda el archivo existente, copia la versión de la plantilla y registra la operación

#### Scenario: Personalización conservada

- **WHEN** el usuario decide conservar un archivo personalizado del destino
- **THEN** el sistema deja el archivo sin cambios y lo reporta como conservado

#### Scenario: Archivo sensible o generado

- **WHEN** un elemento detectado pertenece a secretos, configuración local o artefactos generados
- **THEN** el sistema lo excluye del plan ejecutable y solicita una instrucción explícita separada para cualquier operación excepcional

### Requirement: Sincronización idempotente

El sistema DEBE (MUST) producir ningún cambio de contenido ni backup adicional cuando se ejecuta nuevamente con el mismo origen y el destino ya está sincronizado.

#### Scenario: Destino sincronizado

- **WHEN** el contenido y los marcadores del destino coinciden con la plantilla
- **THEN** el plan indica que no hay cambios y la ejecución termina sin duplicar reglas, backups o archivos

### Requirement: Verificación posterior

El sistema DEBE (MUST) reportar el resultado por archivo y verificar que las skills, definiciones, comandos, documentación y reglas de agente esperadas están presentes después de una actualización aceptada.

#### Scenario: Actualización completada

- **WHEN** finaliza una sincronización sin errores
- **THEN** el reporte identifica archivos actualizados, conservados, omitidos y respaldados, además de los elementos que requieren revisión manual
