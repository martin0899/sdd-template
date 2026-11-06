# Design: skill-config-consumption

## Context

Capacidad que obliga a las skills del arnés SDD a resolver las rutas del vault de Obsidian y sus subcarpetas a través de la configuración centralizada (`spectralis config --get <key>`) en lugar de declarar rutas absolutas como valores por defecto.

## Decisions

- **Resolución de rutas por config en skills**: Toda skill que maneje rutas del vault de Obsidian (`vault_root`, `templates_dir`, `requirements_dir`, `projects_dir`, `resources_dir`) SHALL resolverlas mediante `spectralis config --get <key>` con cascada determinista,…
- **Alineación de las 4 skills afectadas**: Las skills `obsidian-briefing`, `obsidian-summary`, `obsidian-tests` y `requirements-discovery` SHALL actualizar su sección de rutas para resolver por config, eliminando los valores absolutos quemados actuales.
- **Verificación de portabilidad**: El cambio SHALL permitir verificar que las skills resuelven las mismas rutas que el CLI en un entorno dado.

## Verification

3 requisitos condensados desde
`openspec/specs/skill-config-consumption/spec.md` (57 líneas en el original).
