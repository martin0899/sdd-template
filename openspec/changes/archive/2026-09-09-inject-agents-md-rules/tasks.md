# Tasks: inject-agents-md-rules

## 1. Fuente canónica

- [x] 1.1 Neutralizar el título de `AGENTS.md` (quitar "for Chapur Pay"; título genérico "AGENTS.md — Coding Guidelines"); verificar que el contenido de las dos secciones de reglas queda intacto (`diff` del resto del archivo)

## 2. Instalador

- [x] 2.1 Añadir a `install.sh` la función de gestión de `AGENTS.md`: detección (`AGENTS.md` exacto en destino), camino crear (cp de la plantilla) y camino append (bloque con marcadores BEGIN/END, sin H1 de plantilla, vía `tail -n +2`), con deduplicación por marcador y por sentencia "ALWAYS use graphify first"; verificar con `bash -n install.sh`
- [x] 2.2 Integrar el paso en `--dry-run` (muestra: creará / añadirá bloque / ya presentes) y en el flujo real después de `inject_spanish_context` y antes de `copy_payload`; verificar con dry-run sobre dummy sin y con `AGENTS.md`

## 3. Verificación de comportamiento (specs)

- [x] 3.1 Escenario "Destino sin AGENTS.md": instalar sobre dummy sin `AGENTS.md` y confirmar que se creó con contenido íntegro de la plantilla (incluido título genérico); verificar con `diff` contra el `AGENTS.md` de la plantilla
- [x] 3.2 Escenario "Destino con AGENTS.md propio": dummy con `AGENTS.md` con reglas propias; tras instalar, el contenido propio está intacto (incluido su H1), las secciones de la plantilla están al final bajo los marcadores, y no hay H1 duplicado; verificar con `diff` del bloque propio y `grep -c "^# "` (un solo H1)
- [x] 3.3 Escenario "Re-instalación idempotente": re-ejecutar el instalador sobre el dummy del 3.2 y confirmar que no se duplica el bloque; verificar con `grep -c "BEGIN: SDD template rules"` (= 1)
- [x] 3.4 Escenario "Dry-run": `--dry-run` sobre dummy con y sin `AGENTS.md` muestra el plan correcto y el hash del árbol no cambia; verificar con `find | sha256sum` antes/después

## 4. Documentación y cierre

- [x] 4.1 Actualizar `README.md`: describir el comportamiento de `AGENTS.md` (crear o añadir por APPEND, idempotente) en la sección del instalador; verificar con lectura y coherencia con la política anti-corrupción descrita
- [x] 4.2 Actualizar `docs/manuals/manual-installation.md`: paso manual equivalente (crear el archivo o añadir el bloque marcado a mano) + ítem en la lista de paridad; verificar que el paso es ejecutable a mano y el checklist lo cubre
- [x] 4.3 Validar el change: `openspec validate inject-agents-md-rules --type change --strict` sin errores
