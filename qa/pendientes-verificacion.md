# qa/pendientes-verificacion.md

Registro de comprobaciones de QA pendientes por falta de entorno.
Cada bloque describe una comprobacion que no se pudo ejecutar en su momento y
queda bloqueada hasta que el entorno este disponible.

---

## Bloque QA-001 - Compuerta minima de cobertura (change `lean-harness-payload`)

- **Change**: `lean-harness-payload`
- **Test**:
  - **Nivel 0**: typecheck via el `tsc -p tsconfig.test.json` embebido en `npm test`, mas escaneo de secretos (lint no disponible: el repo no declara linter).
  - **Nivel 1**: suite de tests con `--coverage` + diff coverage >= 80% de las lineas cambiadas en `src/commands/update.ts`, `src/core/manifest.ts`, `src/bin/spectralis.ts` (y sus tests: `test/commands/update.test.ts`, `test/integration/lean-payload-stubs.test.ts`, `test/integration/agents-md-reduced.test.ts`).
- **Reason**: el gate script no existia (`qa/qa-coverage-gate.sh` ausente, no habia directorio `qa/`), no habia runner de cobertura (devDependencies solo `@types/node` + `typescript`) y `gitleaks` no estaba disponible. El revisor no podia instalar tooling.
- **Required env**: `qa/qa-coverage-gate.sh`
  - **Delivered how**: script bash autocontenido que usa solo la cobertura nativa de node (`node --test --experimental-test-coverage`, report `lcov`) mas `NODE_V8_COVERAGE` para la cobertura de subprocesos, y un escaneo de secretos con `grep` de alta confianza cuando `gitleaks` no esta instalado. **No instala nada**: sin `npm install`, sin `npm ci`, sin addons; solo comandos git de lectura.
- **Safe command**: `timeout 300 ./qa/qa-coverage-gate.sh`
- **Expected**: nivel0 pass, nivel1 pass with diff_coverage >= 80%
- **Status**: **RESUELTO** (2026-11-04)

### Evidencia de ejecucion (2026-11-04)

Comando ejecutado: `timeout 300 ./qa/qa-coverage-gate.sh` (exit code `0`).

| Comprobacion | Resultado | Medida |
|---|---|---|
| Nivel 0a - typecheck (`tsc -p tsconfig.test.json --noEmit`) | PASS | 0 errores de tipos |
| Nivel 0b - escaneo de secretos (fallback `grep`; `gitleaks` no instalado) | PASS | 14 ficheros analizados (13 del cambio + este registro), 0 coincidencias |
| Nivel 1 - suite (`node --test --experimental-test-coverage 'dist-test/**/*.test.js'`) | PASS | 443/443 tests, 0 fallos |
| Nivel 1 - cobertura global del repo | INFO | lineas 74.24%, ramas 76.99%, funciones 81.95% |
| Nivel 1 - cobertura global de los ficheros tocados | PASS | `src/commands/update.ts` 370/370 = 100.00%; `src/core/manifest.ts` 97/97 = 100.00%; `src/bin/spectralis.ts` 267/267 = 100.00% (umbral 85%) |
| Nivel 1 - diff coverage (lineas cambiadas ejecutables cubiertas) | PASS | **137/137 = 100.00%** (umbral 80%) |

Desglose del diff coverage por fichero:

| Fichero | Lineas cambiadas ejecutables | Cubiertas | diff coverage |
|---|---|---|---|
| `src/commands/update.ts` | 129 | 129 | 100.00% |
| `src/core/manifest.ts` | 5 | 5 | 100.00% |
| `src/bin/spectralis.ts` | 3 | 3 | 100.00% |
| **Total** | **137** | **137** | **100.00%** |

Notas de medicion (para que el revisor pueda reproducir el numero):

- El diff coverage se mide sobre las lineas cambiadas **ejecutables** (las que el
  source map de TypeScript asocia a codigo emitido). Las lineas cambiadas que son
  comentarios, declaraciones de tipo o lineas en blanco se contabilizan aparte y
  no penalizan el ratio.
- La cobertura se atribuye a las lineas `.ts` originales combinando dos fuentes:
  cobertura en proceso del runner de node y cobertura de subprocesos
  (`NODE_V8_COVERAGE`), que es la via por la que la suite ejercita el CLI
  (`update --prune` se prueba como proceso hijo).
- `qa/qa-coverage-gate.sh` no modifica ningun fichero versionado: solo escribe en
  `.test-tmp/qa-coverage-gate/` (ignorado por git).

Hallazgos no bloqueantes (documentados, no corregidos: no forman parte de este
cambio):

1. **Test inestable preexistente por resolucion de mtime**:
   `test/core/detect-stack.test.ts` ("loadStackCache invalidates when package.json
   mtime is newer") falla de forma intermitente (~7% de las ejecuciones; medido:
   20/300 y 26/300 con `NODE_V8_COVERAGE`). La causa es
   `src/core/detect-stack.ts:205`, que invalida la cache solo si
   `mtimeMs > detected_at` y `detected_at` es un timestamp truncado a
   milisegundos: el reloj del sistema de ficheros puede quedar ~0.05-0.2 ms por
   detras del reloj de JS, y el `>` estricto no se cumple. Ni `src/core/detect-stack.ts`
   ni su test son tocados por `lean-harness-payload`. Para que la compuerta no
   dependa de esa loteria, el gate reejecuta la suite hasta `SUITE_ATTEMPTS`
   intentos (3 por defecto) y **falla igual** si el fallo es reproducible; cada
   reejecucion queda registrada en la salida (`[WARN] la suite fallo en el intento
   N/3`).
2. **Lint no disponible**: el repo no declara linter (no hay dependencia de
   eslint), por lo que el Nivel 0 se compone de typecheck + escaneo de secretos.
   Si en el futuro se anade un linter, debe incorporarse al script
   `qa/qa-coverage-gate.sh`.
3. **`gitleaks` no instalado** en este entorno: el gate lo usa si esta disponible
   (`gitleaks git --staged` / `gitleaks protect --staged` /
   `gitleaks detect --no-git`) y, en su ausencia, aplica el escaneo `grep` de alta
   confianza sobre el contenido nuevo del cambio (lineas anadidas por el diff +
   ficheros sin seguimiento), excluyendo `node_modules/`, `dist/`, `dist-test/`,
   lockfiles y fixtures de test.
