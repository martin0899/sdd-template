# Delta spec: sdd-installer-doctor

## Purpose

Diagnóstico previo de prerrequisitos del CLI spectralis: verifica las herramientas requeridas en la máquina host y reporta lo que falta con instrucciones de instalación por sistema operativo, antes de que cualquier comando de instalación toque el destino.

## ADDED Requirements

### Requirement: Verificación de prerrequisitos del host

El comando `spectralis doctor` DEBE (MUST) verificar la disponibilidad y versión de las herramientas requeridas: `git`, `node` (versión >= 22), el CLI `openspec` y el CLI `graphify`. DEBE (MUST) reportar el estado de cada herramienta (presente con versión, o ausente) y, para cada herramienta ausente o con versión insuficiente, DEBE (MUST) mostrar instrucciones de instalación para el sistema operativo detectado (Windows, macOS, Linux).

#### Scenario: Todas las herramientas presentes

- **WHEN** `spectralis doctor` se ejecuta en un host con git, node >= 22, openspec y graphify disponibles
- **THEN** el reporte lista cada herramienta con su versión y concluye que el host está listo

#### Scenario: Herramientas faltantes

- **WHEN** una o más herramientas no están en PATH o su versión es insuficiente
- **THEN** el reporte identifica cada problema individualmente
- **AND** para cada problema muestra la instrucción de instalación correspondiente al sistema operativo detectado
- **AND** el comando concluye con estado de error sin escribir nada en disco

#### Scenario: Node con versión insuficiente

- **WHEN** el host tiene node pero su versión es menor que 22
- **THEN** `spectralis doctor` reporta la versión detectada, el requisito (>= 22) y cómo actualizarla

### Requirement: Diagnóstico sin destino y sin escritura

`spectralis doctor` DEBE (MUST) poder ejecutarse sin indicar un proyecto destino y NUNCA DEBE (MUST) escribir archivos en el disco (ni en el directorio actual ni en destino alguno). Su único efecto observable es el reporte en la salida estándar.

#### Scenario: Doctor standalone

- **WHEN** `spectralis doctor` se ejecuta sin argumentos en cualquier directorio
- **THEN** produce el reporte completo de prerrequisitos sin crear ni modificar archivos

#### Scenario: Doctor antes de init

- **WHEN** el usuario ejecuta `spectralis doctor` antes de un `init` en un host incompleto
- **THEN** el reporte le permite resolver los prerrequisitos antes de intentar la instalación
