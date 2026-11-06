# Propuesta: lean-harness-payload

## Resumen

Reducir el payload documental del arnés SDD eliminando los manuales LTI copiados a proyectos destino, recortar `AGENTS.md` de ~44 a ~25 líneas y añadir el flag `update --prune` para borrar archivos retirados del disco con semántica de seguridad estricta (hash-match only, backup previo, fs-only).

## Contexto

Tres desajustes verificados en código:

1. **Manuales LTI distribuidos a proyectos destino.** `listDocsFiles()` (`src/core/copy-payload.ts:57-64`) incluye `docs/data-model.md` (~353 líneas, 100 % LTI), `docs/development_guide.md` (LTI ATS + instrucciones de clonado ajenas) y `docs/api-spec.yml` (~1090 líneas, 100 % LTI). `classify-update.ts:29-32` los vuelve a distribuir en `update`. Todo proyecto instalado arranca con documentación de otro producto.

2. **`AGENTS.md` sobredimensionado.** 44 líneas de reglas globales; el objetivo es ~25 líneas (one-liner + 3 reglas + graphify + mapa "cuándo leer qué" + puntero al ciclo).

3. **Archivos retirados nunca se borran.** `classify-update.ts:81-89` los marca `retired` y los excluye del manifiesto reescrito, pero `update.ts:175-177`, `update.ts:202-204` y `update.ts:249` no borran nada del disco.

Provenance: nota del vault `Spectralis - No clonar manuales a proyectos y AGENTS.md mínimo` (2026-10-22), §2 fija el contenido de `AGENTS.md`.

## Objetivos

1. Sustituir `docs/api-spec.yml`, `docs/data-model.md` y `docs/development_guide.md` por stubs neutros de stack (placeholders + instrucciones de graphify/onboard).
2. Recortar `AGENTS.md` de ~44 a ~25 líneas manteniendo las secciones críticas como enrutador.
3. Añadir `--prune` a `spectralis update` para borrar archivos retirados cuyo hash coincida con el manifiesto, con backup en `.sdd-backup-*`, respetando `--dry-run`/`--check`, confirmando salvo flag explícito, usando solo fs (nunca git).

## Alcance

### In scope
- Contenido de `docs/api-spec.yml`, `docs/data-model.md`, `docs/development_guide.md` (stub neutral).
- `AGENTS.md` template (~25 líneas) y reescritura de `test/integration/agents-md-reduced.test.ts` al nuevo contrato.
- Flag `--prune` en `src/commands/update.ts`, `src/bin/spectralis.ts`.
- `CHANGELOG.md`, `README.md` (líneas ~110 y ~372), `notes/spectralis-cli/manual.md`.

### Out of scope
- Ruta de migración para instalaciones legacy existentes.
- Verificación de proyectos hermanos Chapur.
- Divergencia `notes/local-ai/manual.md` (Ollama ya retirado) — aparcada.
- Refactor del mecanismo de copia (`listDocsFiles`, `copyPayload`, `classify-update`) — solo cambia contenido, no plomería.

## Impacto

### Superficies afectadas

| Área | Archivos |
| :--- | :--- |
| Payload docs | `docs/api-spec.yml`, `docs/data-model.md`, `docs/development_guide.md`, `src/core/copy-payload.ts`, `src/core/classify-update.ts` |
| AGENTS.md | `AGENTS.md`, `src/core/agents-md.ts`, `test/integration/agents-md-reduced.test.ts` |
| update --prune | `src/commands/update.ts`, `src/bin/spectralis.ts`, `test/commands/update.test.ts` |
| Documentación | `CHANGELOG.md`, `README.md`, `notes/spectralis-cli/manual.md` |

### Interacción con `consolidate-rules-eliminate-ollama-optimize-tokens`

El change activo-pero-completo ya redujo `AGENTS.md` de 143 a ~44 líneas y añadió `manageAgentsMd` a `update.ts`. Este change **no toca el mecanismo** (el managed block, los marcadores, la detección de deriva). Solo cambia el contenido template de ~44 a ~25 líneas y reescribe la integration test que fija el rango. Sin conflicto funcional; la única fricción es el contrato de línea de la integration test, que se actualiza deliberadamente.

## Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| Hash de stubs cambia en instalaciones existentes → aparecen como conflictos actualizables | Esperado y aceptado; la resolución queda en manos del usuario |
| `--prune` podría borrar archivos editados por el usuario | Hash-match only: si el usuario editó el archivo, el hash difiere y no se toca |
| Sin ruta de migración legacy | Fuera de alcance explícito; los manuales LTI existentes se resuelven como conflicto de update, no por borrado automático |

## Criterios de aceptación

1. `spectralis init` en un proyecto nuevo crea los tres stubs neutros (sin contenido LTI).
2. `AGENTS.md` template tiene entre 22 y 28 líneas; `test/integration/agents-md-reduced.test.ts` pasa con el nuevo rango y las secciones reducidas.
3. `spectralis update --prune` borra solo archivos retirados con hash coincidente, crea `.sdd-backup-*`, respeta `--dry-run`/`--check`, pide confirmación.
4. `spectralis update` sin `--prune` sigue sin borrar (comportamiento actual preservado).
5. `CHANGELOG.md`, `README.md`, `notes/spectralis-cli/manual.md` documentan los tres cambios.
