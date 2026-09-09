# Design: remove-sdd-cli-guide

## Context

El change `add-sdd-template-installer` (implementado, pendiente de archivar) introdujo `sdd-cli-guide.md` en el payload y dejó tres referencias activas: `install.sh` (manifiesto), `README.md` (árbol + lista de viaje) y `docs/manuals/manual-installation.md` (tabla de copia manual + checklist de paridad). Durante el apply de aquel change se detectó que la guía ya divergía del CLI real: documenta `openspec validate --change "<name>"`, opción inexistente (la forma vigente es `openspec validate <name> --type change` o `--changes`). Las skills de `.agents/` y `.opencode/` no referencian la guía (verificado con grep). Los specs principales (`openspec/specs/`) aún están vacíos: ningún change se ha archivado.

## Goals / Non-Goals

**Goals**
- Payload sin documentación estática duplicada: un solo punto de entrada documental (`README.md` + manuales de `docs/`).
- Referencias activas eliminadas; histórico del change anterior intacto (registro de decisiones).

**Non-Goals**
- No se crea un documento sustituto (ver D2).
- No se editan los artefactos de planificación de `add-sdd-template-installer` (son histórico).
- No se tocan las skills ni `docs/documentation-standards.md`.

## Decisions

### D1: Eliminación total (archivo + manifiesto + referencias), no exclusión temporal
El archivo se borra del repo y se quita del manifiesto de `install.sh`. Dejarlo solo "sin copiar" mantendría un archivo muerto en la plantilla y confusión sobre su estado. Referencias a limpiar: `install.sh` (PAYLOAD_FILES), `README.md` (2 lugares), `docs/manuals/manual-installation.md` (2 lugares: tabla y checklist).

### D2: Sin sustituto — la cobertura existente absorbe el contenido
Análisis por sección de la guía:
| Sección de la guía | Cubierta hoy por |
|---|---|
| Referencia de comandos CLI | `openspec --help` / `openspec <cmd> --help` (siempre exacta) |
| Ciclo de vida y artefactos | skills/commands `opsx-*` + salidas de `openspec instructions` |
| Skills integration | README (sección de agentes) + el propio `.agents/skills/` |
| Graphify integration | `docs/documentation-standards.md` (sección Graphify) + skill `sdd-onboard-project` |
| Instalación en proyectos existentes | README + `docs/manuals/manual-installation.md` (duplicado triple hoy) |
| Estructura del proyecto | README ("Qué contiene") |
| Conceptos (change/schema/store) | ayuda del CLI + instrucciones de cada fase |
Único contenido sin sustituto directo: el "primer" conceptual. Se acepta la pérdida: los artefactos de cada fase ya explican su propósito en el momento de uso. Si el usuario echa en falta un resumen, se puede añadir una sección "Quickstart" al README en un change futuro — no ahora (YAGNI).

### D3: Orden de archivado explícito
Este change modifica un requirement introducido por `add-sdd-template-installer`, aún no archivado. Archivado correcto: primero `add-sdd-template-installer` (crea los specs principales), después `remove-sdd-cli-guide` (aplica el MODIFIED). Alternativa descartada: fusionar ambos (ya implementado el primero; separar mantiene el histórico auditable).

## Risks / Trade-offs

- [Un usuario de un proyecto destino busca "documentación del CLI" y no la encuentra] → README y `--help` del CLI; riesgo bajo porque nunca se publicó la plantilla con la guía.
- [Referencia huérfana no detectada] → la tarea de verificación exige grep limpio en todo el repo (excepto histórico del change anterior).

## Migration Plan

1. Editar las 3 referencias activas (install.sh, README, manual-installation.md).
2. Eliminar `sdd-cli-guide.md`.
3. Verificación: grep sin resultados activos + dry-run del instalador sin la guía + `openspec validate --strict`.
4. Rollback: `git checkout` del commit previo (el repo ya está en git).

## Open Questions

(ninguna)
