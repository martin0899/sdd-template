# Design: commit-workflow

## Context

Define el comportamiento del flujo de commit y Pull Request ejecutado por agentes de IA en proyectos con esta plantilla: idioma de los mensajes, revisión obligatoria de archivos antes de commitear y confirmación explícita del usuario antes de cualquier operación git que modifique el historial.

## Decisions

- **Mensajes de commit en español**: Todo mensaje de commit generado por un agente SHALL estar escrito en español.
- **Revisión obligatoria antes de commit**: Antes de ejecutar cualquier `git add` o `git commit`, el agente SHALL presentar al usuario: (1) la lista completa de archivos y hunks que planea stagear, clasificados en esperados para el alcance actual, ajenos al…
- **Entrega de la propuesta para commit manual**: Cuando el usuario rechace que el agente ejecute el commit, o pida solo el texto, el agente SHALL entregar la lista exacta de archivos a stagear y el mensaje de commit completo en un bloque copiable, sin ejecutar ningún…
- **Pull Requests en español**: El título y la descripción de todo Pull Request creado o actualizado mediante `gh` SHALL estar en español, conservando términos técnicos e identificadores de ticket en su forma original.
- **Conservación del commit scopeado por argumentos**: El flujo SHALL seguir admitiendo identificadores de ticket o feature como argumentos: cuando se proporcionen, la revisión previa y el commit SHALL cubrir únicamente los cambios vinculados a ellos, dejando el resto sin…
- **Creación de rama condicionada a la rama base**: El agente SHALL crear una rama feature únicamente cuando la rama actual sea la rama base (`main`, `master` o `develop`).

## Verification

6 requisitos condensados desde
`openspec/specs/commit-workflow/spec.md` (82 líneas en el original).
