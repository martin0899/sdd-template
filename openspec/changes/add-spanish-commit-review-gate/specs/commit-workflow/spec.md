# Delta Spec: commit-workflow

## Purpose

Define el comportamiento del flujo de commit y Pull Request ejecutado por agentes de IA en proyectos con esta plantilla: idioma de los mensajes, revisión obligatoria de archivos antes de commitear y confirmación explícita del usuario antes de cualquier operación git que modifique el historial.

## ADDED Requirements

### Requirement: Mensajes de commit en español

Todo mensaje de commit generado por un agente SHALL estar escrito en español. El asunto SHALL ser una línea corta en tono imperativo, con prefijo opcional de scope o ticket (p. ej. `SCRUM-123: Añadir filtros de candidatura`). El cuerpo, cuando sea necesario, SHALL describir qué cambió y por qué, con referencias a tickets donde apliquen.

#### Scenario: Commit de cambios de código

- **WHEN** el agente prepara un commit con cambios funcionalmente relevantes
- **THEN** el asunto y el cuerpo del mensaje propuesto están en español, conservando en inglés los términos técnicos y los identificadores de ticket

#### Scenario: Mensaje con identificador de ticket

- **WHEN** el usuario invoca el flujo de commit pasando un identificador de ticket como argumento
- **THEN** el mensaje propuesto incluye el identificador como prefijo del asunto y el resto del mensaje permanece en español

### Requirement: Revisión obligatoria antes de commit

Antes de ejecutar cualquier `git add` o `git commit`, el agente SHALL presentar al usuario: (1) la lista completa de archivos y hunks que planea stagear, clasificados en esperados para el alcance actual, ajenos al alcance, y sensibles o generados; y (2) el mensaje de commit propuesto. El agente SHALL esperar una confirmación explícita del usuario antes de ejecutar los comandos git.

#### Scenario: Archivos ajenos al alcance detectados

- **WHEN** el árbol de trabajo contiene archivos modificados que no pertenecen al ticket o feature solicitado
- **THEN** el agente los lista como "ajenos al alcance", NO los incluye en la propuesta de stage, y espera confirmación antes de commitear el resto

#### Scenario: Archivos sensibles o generados detectados

- **WHEN** entre los cambios aparecen archivos sensibles o artefactos generados (p. ej. `.env`, secretos, builds)
- **THEN** el agente los excluye de la propuesta, lo reporta visiblemente al usuario y no los stagea bajo ninguna confirmación posterior sin una orden explícita de incluirlos

#### Scenario: Sin confirmación del usuario

- **WHEN** el agente presenta la revisión y el usuario no confirma explícitamente
- **THEN** el agente NO ejecuta `git add`, `git commit` ni `git push`, y el repositorio permanece sin modificaciones

### Requirement: Entrega de la propuesta para commit manual

Cuando el usuario rechace que el agente ejecute el commit, o pida solo el texto, el agente SHALL entregar la lista exacta de archivos a stagear y el mensaje de commit completo en un bloque copiable, sin ejecutar ningún comando git ni de `gh`.

#### Scenario: El usuario prefiere commitear por su cuenta

- **WHEN** presentada la revisión previa, el usuario indica que él hará el commit
- **THEN** el agente responde con la lista de archivos y el mensaje copiable y termina el flujo sin operaciones git

### Requirement: Pull Requests en español

El título y la descripción de todo Pull Request creado o actualizado mediante `gh` SHALL estar en español, conservando términos técnicos e identificadores de ticket en su forma original.

#### Scenario: Creación de PR tras commit aprobado

- **WHEN** el commit acordado se ha ejecutado y se abre el PR correspondiente
- **THEN** el título y la descripción del PR presentados por `gh` están en español

### Requirement: Conservación del commit scopeado por argumentos

El flujo SHALL seguir admitiendo identificadores de ticket o feature como argumentos: cuando se proporcionen, la revisión previa y el commit SHALL cubrir únicamente los cambios vinculados a ellos, dejando el resto sin tocar.

#### Scenario: Argumento de ticket con cambios mixtos en un archivo

- **WHEN** un archivo contiene a la vez cambios del ticket indicado y cambios ajenos
- **THEN** la propuesta de revisión incluye solo los hunks del ticket y los hunks ajenos se listan como excluidos

### Requirement: Creación de rama condicionada a la rama base

El agente SHALL crear una rama feature únicamente cuando la rama actual sea la rama base (`main`, `master` o `develop`). Si ya se encuentra sobre otra rama, el agente NO SHALL crear ni cambiar de rama: continuará sobre la rama actual y lo comunicará al usuario en la propuesta de revisión, permitiéndole decidir si prefiere una rama nueva. Esto habilita que una misma rama acumule múltiples cambios/specs cuyos commits puedan compartirse en un commit/PR, y que el usuario lo sepa antes de confirmar.

#### Scenario: Trabajo iniciado desde main

- **WHEN** el flujo de commit comienza con la rama actual en `main`
- **THEN** el agente crea y usa una rama `feature/<ticket-o-change>` antes de stagear

#### Scenario: Trabajo sobre rama existente

- **WHEN** el flujo de commit comienza con la rama actual en una rama que no es base
- **THEN** el agente NO crea ninguna rama, incluye en la propuesta de revisión la nota de que el commit irá a la rama actual (donde pueden converger múltiples specs) y solo crearía una rama nueva si el usuario lo pide explícitamente
