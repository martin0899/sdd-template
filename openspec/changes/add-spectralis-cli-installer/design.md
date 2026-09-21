# Design: add-spectralis-cli-installer

## Context

`install.sh` (1207 líneas) es el instalador canónico: detección de stack, composición de variantes, política anti-corrupción (backups + confirmación), manifiesto con hashes y modo `--update`. Su lógica vive en bash (awk/grep para YAML y JSON), lo que excluye Windows nativo y complica el parsing. El spec vigente (17/19 comportamientos bajo contrato tras los deltas de este change) define el contrato que tanto bash como el nuevo motor deben satisfacer. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Paquete npm in-repo instalable con `npm i -g .` desde el clone; binario `spectralis` global
- Port TypeScript de la instalación fresca (`init`) y del diagnóstico (`doctor`), TDD
- Plantilla embebida en el paquete; `.agents/` sigue canónico (sin copias divergentes)
- `install.sh` intacto como fallback canónico hasta paridad de `update`

**Non-Goals:**
- No publicar en npm registry (`npm publish` prohibido por spec)
- No portar `--update` en este change (clasificación por hashes y recuperación parcial se especifican y diseñan en la fase 2 — deferral explícito ya reflejado en `specs/spectralis-cli/spec.md`, requisito "Comando update en fase de port incremental")
- No cambiar la política anti-corrupción ni el payload (mismo contrato, otro motor)
- No distribuir plugins opencode (política project-local vigente)

## Estructura del paquete

```
<repo raiz>/
├── package.json            <- paquete spectralis (bin, files, engines, prepare)
├── tsconfig.json
├── src/
│   ├── bin/spectralis.ts   <- entrypoint: init | update | doctor | --agent | --dry-run | --yes
│   ├── commands/           <- init.ts, update.ts (stub pre-paridad), doctor.ts
│   ├── core/               <- prereqs, detect-stack, copy-payload,
│   │                          compose-standards, spanish-context,
│   │                          agents-md, gitignore, manifest, post-checks
│   ├── agents/profiles.ts  <- matriz --agent (payload por agente)
│   └── util/               <- prompt (confirm), hash (sha256), fs, json
├── dist/                   <- salida tsc (viaja en files)
├── .agents/ .opencode/ docs/ docs-variants/ AGENTS.md   <- plantilla embebida (viaja en files)
└── install.sh              <- SIN CAMBIOS (fallback canonico)
```

## Decisions

### D1: Paquete en la raíz del repo, no subdirectorio `cli/`
`package.json` en la raíz mantiene el flujo exacto acordado (`git clone` → `npm i -g .` → `spectralis init`). El campo `files` lista explícitamente lo que viaja: `dist/`, `.agents/`, `.opencode/`, `docs/`, `docs-variants/`, `AGENTS.md`, `README.md`. `node_modules/` y artefactos quedan fuera por defecto de npm. Alternativa descartada: subdirectorio `cli/` con su propio `package.json` (más higiene, pero rompe la UX de una línea y separa la plantilla de su motor).

### D2: TypeScript compilado con `tsc`, construido por script `prepare`
`npm i -g .` ejecuta `prepare` automáticamente en instalaciones locales/git: el build ocurre en la máquina del instalador sin publish. `engines: node >= 22` (requisito ya existente por autoskills). Alternativas descartadas: tsx en runtime (dependencia en cada host destino) y JS plano (viola base-standards: Type Safety).

### D3: `commander` para el CLI; resto con dependencias mínimas
Tres comandos con flags (`--agent`, `--dry-run`, `--yes`): `commander` es estándar, pequeño y estable. El resto se resuelve con módulos nativos: `node:readline/promises` para confirmaciones `[s/N]` (envuelta en `util/prompt`), `node:crypto` para sha256 del manifiesto, `JSON.parse` para el manifiesto. Alternativa descartada: yargs (más pesado) o argv manual (reimplementación gratuita).

### D4: Parser YAML `yaml` (eemeli) con `parseDocument` para el contexto español
La inyección del contexto español DEBE preservar comentarios y formato del `config.yaml` del destino (requisito vigente: APPEND, nunca reemplazo). La librería `yaml` conserva comentarios y estructura vía Document API. Alternativa descartada: `js-yaml` (parse/stringify pierde comentarios — regresión respecto del awk actual) o replicar el awk en JS (frágil y sin tipos).

### D5: Versión de plantilla = `version` del package.json (semver), no SHA de git
El manifiesto hoy registra el SHA de git (`template_version()`). En el paquete instalado globalmente el clone puede no existir; el semver del paquete es la fuente de versión. Impacto aceptado: `.sdd-manifest.json` registra `templateVersion` semver en instalaciones spectralis; la clasificación de updates usa hashes, no la versión, por lo que no hay cambio de comportamiento. Alternativa descartada: hornear el SHA en el build (inestable fuera del clone).

Gobernanza del semver (ver spec "Versionado SemVer de la plantilla"): el paquete nace en `1.0.0`; los bumps de `MINOR`/`PATCH` derivan del delta de specs aprobados (requisitos/capabilities nuevos según cantidad de cambios y riesgo → `MINOR`; correcciones sin cambio de contrato → `PATCH`); el bump de `MAJOR` es user-driven o sugerido por el agente por acumulación de cambios, siempre con confirmación explícita.

Dualidad de versiones (decisión posterior de hoja de ruta): el arnés CLI y la plantilla son versiones conceptualmente distintas que hoy coinciden (`1.0.0` al nacer ambos). El manifiesto del destino las registra como campos separados (`spectralisVersion` + `templateVersion`) para que init deje trazabilidad de "con qué se instaló", y `--version` reporta la versión del arnés. La evolución de ambas puede desacoplarse en el futuro sin cambiar el schema del manifiesto.

### D6: Tests con `node:test` (runner nativo) + suite de integración espejo
TDD por base-standards: unit tests por función porteada (`core/*`) y una suite de integración que ejecuta el CLI compilado contra directorios temporales con bins falsos (patrón de `tests/test-install-update.sh`: fake `openspec`, fake `graphify`, `SDD_FAIL_COPY` para interrupciones). Runner nativo = cero dependencias extra en el repo plantilla. Alternativa descartada: vitest (DX superior, pero introduce toolchain pesada en un repo cuyo producto no es código de aplicación).

### D7: Matriz de agentes como tabla de perfiles (`agents/profiles.ts`)
`AGENT_PROFILES` declara por agente: accesorios de payload (`.opencode/*` solo para `opencode` y `all`) y parámetro de inicialización de OpenSpec. `all` = opencode + base común (hoy coincide con opencode; existe para expresar la intención sin duplicar lógica). El flag desconocido es error de validación antes de escribir.

### D8: `doctor` como módulo puro reutilizado por `init`
`core/prereqs` verifica git/node>=22/openspec/graphify y produce un reporte estructurado; `doctor.ts` lo imprime con instrucciones por OS; `init.ts` lo consume como gate (aborta sin escribir si falta algo). Una sola fuente de verdad para prereqs, dos superficies de presentación.

## Risks / Trade-offs

- [Deriva de paridad bash↔TS en detección de stack y composición] → Mitigación: los 3 deltas de spec son el contrato; suite de integración espejo con los mismos escenarios que `tests/test-install-update.sh`; `install.sh` sigue disponible como árbitro.
- [Campo `files` omite un directorio de plantilla] → Mitigación: test de integración que instala el paquete (npm pack + instalación en tmp) y verifica que el CLI resuelve plantilla y variantes desde la instalación global.
- [`yaml` Document API no cubre algún caso del config.yaml del destino] → Mitigación: suite de casos YAML (contexto previo, comentarios, campo context existente/vacío) heredada de los escenarios del spec; si algo no se puede preservar, se aborta sin escribir.
- [UX de prompts nativos (readline) más pobre que librerías dedicadas] → Trade-off aceptado: dos interacciones (confirmación, autoskills); el valor está en la política, no en el embellishment.
- [Divergencia de versión bash(SHA) vs TS(semver) en manifiestos históricos] → Impacto documentado en D5; sin efecto funcional (clasificación por hashes).

## Migration Plan

1. Aterrizar paquete + `doctor` (sin tocar `install.sh`; cero impacto en destinos).
2. Port de `init` fase por fase (prereqs → detección → payload → composición → inyecciones → manifiesto → post-checks), cada una con tests espejo en verde antes de pasar a la siguiente.
3. `update` queda como stub pre-paridad (spec: dirige a `install.sh --update`).
4. Rollback: eliminar `package.json`, `tsconfig.json`, `src/`, `dist/` — `install.sh` nunca dejó de funcionar.

## Open Questions

- Valores exactos de `--tools` de `openspec init` para agentes no-opencode (verificar en implementación; fallback: inicializar genérico y dejar la elección al onboarding).
- API de `npx autoskills` (se invoca igual que hoy: proceso hijo opt-in; solo confirmar flags vigentes al implementar).
