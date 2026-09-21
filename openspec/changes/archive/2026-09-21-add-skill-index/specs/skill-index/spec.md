# Delta spec: skill-index

## Purpose

Proporcionar un índice de enrutado de skills del proyecto que permita al orquestador decidir qué skill invocar consultando una tabla ligera, sin cargar el contenido completo de los SKILL.md.

## ADDED Requirements

### Requirement: Índice de skills del proyecto
El proyecto SHALL mantener un archivo `.agents/skills/INDEX.md` que liste exclusivamente las skills del proyecto (las ubicadas en `.agents/skills/`). Cada entrada de la tabla del índice SHALL contener: el nombre de la skill, el trigger/description que la detona (resumen condensado de una línea) y la ruta completa al archivo `SKILL.md` correspondiente.

#### Scenario: El agente necesita elegir una skill
- **WHEN** el orquestador recibe una tarea que podría requerir una skill del proyecto
- **THEN** puede consultar `.agents/skills/INDEX.md` y determinar qué skill aplica, su condición de disparo y su ubicación exacta, sin leer ningún `SKILL.md`

#### Scenario: Se añade una skill nueva al proyecto
- **WHEN** se agrega una nueva skill bajo `.agents/skills/`
- **THEN** la fila correspondiente se añade manualmente a la tabla del índice con nombre, trigger y ruta completa

### Requirement: Regla de consulta obligatoria del índice
`AGENTS.md` SHALL incluir una regla que ordene consultar `.agents/skills/INDEX.md` antes de invocar cualquier skill del proyecto y cargar únicamente el `SKILL.md` de la skill elegida.

#### Scenario: El agente invoca una skill siguiendo la regla
- **WHEN** el agente decide usar una skill del proyecto
- **THEN** consulta primero el índice y carga solo el `SKILL.md` de la skill elegida, evitando cargar otros archivos de skills

### Requirement: Actualización manual del índice
La actualización del índice SHALL ser manual: se ejecuta únicamente cuando el usuario lo solicita tras añadir, editar o eliminar una skill del proyecto. No SHALL haber hooks ni automatización.

#### Scenario: El usuario pide actualizar el índice
- **WHEN** el usuario solicita actualizar el índice de skills
- **THEN** se regenera o corrige la tabla comparando las skills existentes en `.agents/skills/` con las filas del índice
