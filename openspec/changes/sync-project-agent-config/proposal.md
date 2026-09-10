# Proposal: sync-project-agent-config

## Why

Los proyectos que ya recibieron la plantilla SDD pueden quedar con skills, comandos y definiciones antiguas cuando el repositorio central incorpora mejoras. Actualmente el usuario debe identificar manualmente qué cambió, copiar archivos y resolver conflictos, lo que puede dejar configuraciones inconsistentes o sobrescribir personalizaciones.

## What Changes

- Añadir un flujo explícito para actualizar la configuración SDD de proyectos instalados desde una versión más reciente del repositorio plantilla.
- Detectar la versión o estado de la configuración instalada y compararla con la versión disponible en la plantilla.
- Presentar un plan de actualización con archivos nuevos, modificados, eliminados, personalizados y sensibles antes de escribir.
- Actualizar de forma selectiva skills, comandos, definiciones OpenSpec, reglas de agente y documentación soportada por la plantilla.
- Preservar personalizaciones del proyecto destino mediante backups y decisiones explícitas por conflicto.
- Mantener el proceso idempotente y ofrecer un modo de simulación sin escrituras.
- Documentar cómo ejecutar la actualización en proyectos existentes y cómo resolver conflictos.

## Capabilities

### New Capabilities

- `sdd-config-sync`: sincronización segura y selectiva de la configuración SDD desde una plantilla actualizada hacia proyectos existentes.

### Modified Capabilities

- `sdd-template-install`: ampliar la instalación existente para soportar actualizaciones posteriores de proyectos ya instalados, conservando su política anti-corrupción.

## Impact

- `install.sh` y cualquier lógica compartida de manifiesto, comparación, backup y confirmación.
- `.agents/skills/`, `.opencode/`, `docs/`, `AGENTS.md` y `openspec/config.yaml` en proyectos destino.
- README y manuales de instalación y actualización.
- No requiere cambios en APIs de negocio ni en el código de aplicación de los proyectos destino.
