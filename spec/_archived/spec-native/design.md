# Design: spec-native

## Context

Capability **spec-native**: comandos nativos del arnés para operar sobre changes OpenSpec sin invocar el CLI externo.

## Decisions

- **resolveChangesDir — resolución centralizada del directorio de changes**: El arnés DEBE resolver la ruta del directorio de changes mediante una única función `resolveChangesDir` con cascada determinista, reemplazando toda hardcodación de `openspec/changes`.
- **progress.json — esquema de registro de progreso**: El arnés DEBE persistir el estado de progreso de los changes en un **único archivo por proyecto**, `<projectRoot>/spec/progress.json`, con un esquema estable que agrupa todos los changes en un array `change`.
- **spectralis task — gestión de tareas desde el CLI**: El comando `spectralis task <change> <task-id>` DEBE permitir marcar/desmarcar tareas como completadas, actualizando el registro de progreso (`spec/progress.json`) y reflejando el cambio en `tasks.md`, que conserva el…
- **spectralis view — visor read-only de changes**: El comando `spectralis view [change]` DEBE mostrar el estado de los changes activos sin modificar ningún archivo.
- **spec_dir config key — clave de configuración para el directorio de changes**: La configuración del arnés (manifest y global) DEBE soportar la key `spec_dir` para personalizar la ruta del directorio de changes.
- **Fixtures refactor — helpers compartidos de test**: Los helpers de creación de fixtures (scratch, writeRepo, writeVault, etc.) DEBE extraerse a un módulo compartido en `test/helpers/` sin alterar las aserciones de los tests existentes.
- **spectralis spec — firma reconciliada con dispatch por action**: El comando `spectralis spec <action> [project] [specId]` DEBE hacer dispatch por `action`, con `project` y `specId` opcionales a nivel de firma; cada action valida sus propios argumentos requeridos.
- **spectralis spec create — creación nativa de changes**: El comando `spectralis spec create <change-id> [--nombre <text>]` DEBE crear la carpeta del change en el directorio resuelto por `resolveChangesDir`, con los archivos seeds y una entrada inicial en `spec/progress.json`.
- **spectralis spec migrate — migración nativa de changes legacy**: El comando `spectralis spec migrate [--dry-run]` DEBE mover los archivos presentes de cada change legacy de `openspec/changes/` al layout nativo `spec/`, crear su `change.json` cuando falte y mergear su entrada en…
- **spectralis spec archive — archive nativo con brain-write**: El comando `spectralis spec archive <change-id> [--force]` DEBE mover el change a `spec/_archived/`, registrar en REGISTRY, y escribir el resumen portable DIRECTAMENTE en `05_wiki/`, sin invocar el binario `openspec…
- **change.json — schema por change**: Cada change DEBE llevar un archivo `change.json` en su carpeta con metadata esencial del change, con schema exacto validado.
- **resolveChangesDir — flip del default a spec/**: La función `resolveChangesDir` DEBE resolver por defecto a `<projectRoot>/spec/` en lugar de `<projectRoot>/openspec/changes/`, manteniendo la cascada de configuración.
- **dual-read legacy durante migración**: El comando `spec migrate` DEBE leer changes legacy de `openspec/changes/` incluso cuando `resolveChangesDir` resuelve a `spec/`, usando un path legacy explícito, y los lectores del histórico de un proyecto DEBEN contar…
- **spanish-context retarget**: Los mensajes de error, help y output DEBE mantenerse en inglés (coherencia con el resto del CLI), pero los tests de contexto español verifican que ids de change y spec toleran acentos/ñ en títulos.
- **config key `engine` — cascada manifest > config > default**: El arnés DEBE soportar una clave de configuración `engine` con valores `'openspec' | 'native'`, default `'native'`, resuelta mediante una cascada determinística.
- **prereqs — `openspec` condicional al engine**: El sistema de prerrequisitos DEBE mantener `openspec` en `REQUIRED_TOOLS` (prereqs.ts:31, comentario línea 45 preservado), pero `checkPrereqs` NO DEBE proberlo a menos que `engine === 'openspec'`.
- **doctor labels — `openspec` condicional al engine**: El doctor DEBE etiquetar el resultado de `openspec` como "required" cuando `engine === 'openspec'` y "optional" cuando `engine === 'native'`, y WARN cuando `engine === 'openspec'` y el binario falta.
- **spectralis spec status — estado nativo de changes**: El comando `spectralis spec status [changeId]` DEBE listar changes nativos de `spec/`, derivar estado de `progress.json`, y hacer cross-check con REGISTRY solo si es barato.
- **spectralis spec validate — validación nativa de artifacts**: El comando `spectralis spec validate <id>` DEBE reutilizar `missingSddEssentials` (spec-facade.ts:114-119) + verificación de existencia de `tasks.md`, reportando pass/fail con razones.
- **CLI dispatch — actions `status` y `validate`**: El grupo `spec` DEBE extenderse con actions `status` y `validate`, siguiendo el patrón de F2 (optional args, dispatch por action, parse tests).
- **Native flow documentation alignment — skill rewrites**: Las skills del arnés DEBEN prescribir el flujo nativo como ruta primaria y documentar `openspec` como motor opcional bajo `engine: openspec`.
- **Vendor payload retention — openspec engine extras**: El vendor payload (`.opencode/commands/opsx-*.md` y `.opencode/skills/openspec-*`) DEBE seguir distribuyéndose como "openspec engine extras" sin cambios de empaquetado.
- **base-standards §8 storage neutrality**: La sección `§8.
- **CHANGELOG Unreleased entry**: El `CHANGELOG.md` DEBE registrar la entrada `spec-native-f4` bajo `## Unreleased`.
- **Test-pinned headers and phrases preservation**: Todos los headers y phrases pinnados por tests de integración DEBEN preservarse intactos tras las reescrituras.

## Verification

25 requisitos condensados desde
`openspec/specs/spec-native/spec.md` (784 líneas en el original).
