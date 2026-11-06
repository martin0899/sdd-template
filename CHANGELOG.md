# Changelog

Historial de versiones de **spectralis** (el arnés SDD). Este changelog aplica **solo al arnés** (`sdd-template`), no a los proyectos donde se instala la plantilla.

## Esquema de versionado

- Formato: `MAJOR.MINOR.<N>` donde el **tercer valor es el número de especificaciones (OpenSpec changes) completadas/archivadas**.
- `MAJOR`/`MINOR` siguen la semántica previa del arnés; el tercer valor se incrementa con cada change archivado.
- Los tags git (`v1.2.N`) marcan el estado del arnés con esa cantidad de especificaciones implementadas.
- El **proyecto destino** tiene su propia versión (`projectVersion` en el manifest): PATCH +1 por spec archivada, MINOR +1 al crear release, MAJOR solo por ruptura, máx 99 con carry.

---

## v1.5.0 — 2026-11-06

Conteo de especificaciones: **65**.

## Unreleased

- **remove-openspec-engine** — **RUPTURA: OpenSpec engine support removed — native engine is the only mode**. El arnés deja de depender del CLI externo en todas sus rutas: desaparece la **clave de configuración `engine`** (`config --set engine` y `config --get engine` la reportan como clave desconocida y `config list` ya no la expone; un manifiesto que la declare se ignora), se borra el módulo `src/core/resolve-engine.ts` (`resolveEngine`, `SPEC_ENGINES`, `isSpecEngine`, `DEFAULT_ENGINE`, `EngineResolution`) y se extrae `missingSddEssentials` a `src/core/sdd-essentials.ts` antes de eliminar `src/core/spec-facade.ts` (con él, la máquina de estado `.spectralis/facade-state.json`, que queda inerte en disco). **El prerrequisito externo desaparece**: `src/core/prereqs.ts` ya no exporta `openspecCheck` ni `OPENSPEC_TOOL`, `REQUIRED_TOOLS` queda en `git`/`node`/`graphify` y `spectralis doctor` no reporta ningún motor externo. **`spectralis init` es nativo**: ya no invoca `openspec init`; crea `spec/` con `spec/progress.json` sembrado vacío e inyecta el contexto español en `spec/config.yaml`; los perfiles de `src/agents/profiles.ts` pierden `openspecTools`. **La lectura dual se retira**: `doctor`, `check --tdd`, `projects`, `seed`, `view`, `status` y `validate` leen **un solo** directorio de changes (`resolveChangesDir()`); `src/core/legacy-changes-reader.ts` se elimina y su lector vive dentro de `src/commands/spec-migrate.ts`, el único comando que lee el layout histórico. **`openspec/config.yaml` nunca se escribe ni se lee**: el contexto español va solo a `spec/config.yaml` y los post-checks lo comprueban solo ahí; en instalaciones existentes el fichero se marca **retired**, así que `spectralis update --prune` lo borra (con backup) y el manifiesto deja de gestionarlo. **El payload de vendor desaparece**: `copy-payload.ts` excluye los comandos `opsx-*` y las skills `openspec-*` del motor externo (las instalaciones antiguas conservan sus extras hasta que `update` los retire). Skills y documentación quedan **solo-nativas** (`spec-from-note`, `agent-rules-contract`, `adversarial-review`, `graphify-usage`, `obsidian-*`, `exploration-briefing`, `openspec-gate` —que conserva su nombre e id— y `docs/base-standards.md` §8 pasa a "Change Artifact Updates for Post-Apply Changes"); se conservan los dos marcadores **solo de migración**: el patrón `openspec/` del `.gitignore` gestionado y el marcador de detección de `openspec/` en `src/core/config.ts`. **Dogfood (fuera del alcance de este change)**: tras el commit, el coordinador ejecuta `spectralis spec migrate` en este repositorio para mover sus propios changes de `openspec/changes/` al layout nativo `spec/` (paso de un solo sentido, sin efecto sobre el código del arnés).

- **spec-native-f4** — cuarta entrega del modo **spec-native**: la capa de documentación del arnés (skills y documentación base) se alinea con el código post-F3, de modo que el flujo **nativo** es ya la ruta primaria y `openspec` queda documentado como **motor opcional**. Es una entrega **exclusivamente editorial**: **cero cambios de código** (`src/`, `test/` y `bin/` intactos). **Nueve skills reescritas** con *dual-engine wording* (cada mención al CLI externo queda marcada como condicional `engine: openspec`, sin eliminar las rutas legacy): `openspec-gate` deja de prescribir el listado de changes por el CLI externo y pasa a `spectralis spec status` (o `spectralis view`), conservando sus secciones `Gate Check Process`, `Gate Outcomes` y `Enforcement Rules`; `spec-from-note` crea los changes con `spectralis spec create <id> --nombre` en lugar del comando de creación del CLI externo, adopta `spec/` como `changes_dir` por defecto (con override por `spec_dir`) y mantiene `openspec/specs/` como alternativa de lectura; `agent-rules-contract` declara la comunidad de specs **nativa** como ruta primaria y `openspec` como motor opcional activable con la clave `engine` (los identificadores `CYCLE-01`..`CYCLE-04` no se tocan); `documenter-delegation` conserva `mode: sdd` y el esquema de la solicitud y añade la ruta de briefing nativo (`spec/<id>/change.json` → `resumen.abstracto`); `obsidian-orchestration` invoca el **archive nativo** (`spectralis spec archive`), que escribe el resumen del cerebro directamente, y deja de exigir `spectralis spec complete` en proyectos nativos; `obsidian-summary` y `obsidian-tests` pasan a **revisar y completar los detalles del folder note vivo** (ya no generan ficheros separados); `adversarial-review` y `graphify-usage` localizan las specs en `spec/` (nativo) manteniendo `openspec/specs/` (motor opcional) y el heading `## Navegación del vault Obsidian`. Todas las skills conservan sus headings `##` (regla de *header freeze*) y las frases pinnadas por los tests de integración (`## Navegación del vault Obsidian`, `01_Proyectos/`, `graphify-out/wiki/index.md`, `openspec/specs/`, `reporta y NO modifica`, `un solo ejecutor activo`): **la suite sigue verde sin tocar ningún test** (`npm test`: 624/624). `docs/base-standards.md` §8 pasa a ser **storage-neutral**: los artefactos del change se actualizan bajo el **directorio de changes resuelto** (`spec/` por defecto, con override `spec_dir`) y la verificación se hace con `spectralis spec validate` / `spectralis spec status`, sin prescribir `openspec/changes/` como ruta única; `docs/openspec-tasks-mandatory-steps.md` **no se toca** (sigue documentando el flujo del motor `openspec`). El **vendor payload se conserva sin cambios de empaquetado**: `.opencode/commands/opsx-*.md` y `.opencode/skills/openspec-*` siguen distribuyéndose como *extras* del motor `openspec` (`copy-payload.ts:4` y `agents/profiles.ts` sin modificar), lo que cierra **WI-9** con una decisión documentada y sin tocar el vendor.

- **spec-native-f3** — tercera entrega del modo **spec-native**: el arnés deja de tratar el CLI externo `openspec` como un prerrequisito incondicional y gana comandos nativos de estado y validación. **Ruptura menor**: `openspec` deja de ser obligatorio en el host por defecto (el default del arnés pasa a ser `engine: native`). Nueva clave de configuración **`engine`** (`native` | `openspec`, default `native`) resuelta con cascada determinista **manifiesto (`.sdd-manifest.json`) > configuración global > default** por el nuevo módulo `src/core/resolve-engine.ts` (espejo de `resolve-changes-dir.ts`); se escribe con `spectralis config --set engine=<native|openspec>` (proyecto o `--global`) y se lee con `spectralis config --get engine` (imprime valor y origen); un valor inválido se rechaza con error descriptivo y **no se escribe nada**. **`openspec` pasa de prerrequisito incondicional a condicional**: `REQUIRED_TOOLS` lo conserva (con el comentario histórico de "prerrequisito incondicional") pero `checkPrereqs` **solo lo probea cuando `engine === 'openspec'`**; con `engine: native` el binario no aparece en el informe (ni como ok ni como fail) y su ausencia no bloquea ni `spectralis init` ni `spectralis doctor`, que resuelven el engine del proyecto; el install hint adopta wording opcional ("si usas engine: openspec, instala openspec"). **El doctor etiqueta `openspec` según el engine**: `required` (error y exit `1`) con `engine: openspec`, `optional` (warning, sin exit `1`) con `engine: native`; cuando el engine declarado es `openspec` y el binario falta, el doctor avisa explícitamente ("engine: openspec pero el binario openspec no está en PATH") — **nunca falla en silencio**. Nuevos comandos nativos **`spectralis spec status [changeId]`** (lista los changes del directorio resuelto, deriva el estado de `spec/progress.json` reutilizando la derivación de `progress-registry`, etiqueta `sin registro` los changes legacy sin entrada y deriva su estado de `tasks.md`, y hace cross-check con `REGISTRY.md` **solo si existe** —etiquetando `archivado` los referenciados—; es **solo lectura**: nunca seedea `progress.json` ni `REGISTRY.md` ni reescribe `tasks.md`) y **`spectralis spec validate <changeId>`** (reutiliza `missingSddEssentials` con el directorio resuelto: valida la **existencia** de `proposal.md`, `design.md` y `tasks.md`, **sin validar schema ni contenido**; pass "change <id> is valid" con exit `0`, fail "change <id> is missing: …" con exit `1`). El grupo `spec` extiende sus actions a `status` y `validate` (`changeId` opcional en `status`, requerido en `validate`: sin él, exit `1` con el mensaje de uso). `runFacadeOperation` y el `spawnSync` de la fachada **no se tocan** (su retirada es F4), igual que las skills nativas, el vendor payload y los comandos `new change`/`instructions`/`apply`. La suite `npm test` compila también `dist/` para que los tests de CLI no dependan de un build obsoleto.

- **spec-native-f2** — segunda entrega del modo **spec-native**: el ciclo de vida de los changes pasa a ser nativo (sin el CLI externo). La firma de `spectralis spec` se **reconcilia**: `spectralis spec <action> [project] [specId]` hace dispatch por action y cada action valida sus propios argumentos (`init` y `complete` exigen `<project>` y `<specId>`; `create` y `archive` exigen `<change-id>`; `migrate` no exige posicionales; un action desconocido sale con `1` listando los válidos). Nuevos comandos: `spectralis spec create <change-id> [--nombre <texto>]` (crea `spec/<change-id>/` con los seeds mínimos `proposal.md`, `tasks.md`, `design.md`, el `change.json` de schema exacto `{ id, nombre, fecha, estado, resumen: { abstracto }, enlaces: [] }` y la entrada inicial en `spec/progress.json`; exit `2` si el change ya existe —nunca sobrescribe—, `1` si el id no es kebab-case); `spectralis spec migrate [--dry-run]` (lee `openspec/changes/` explícitamente, mueve los ficheros presentes de cada change a `spec/<id>/`, crea el `change.json` que falte, mergea la entrada en `spec/progress.json` seedeando las tareas, y es **idempotente** —precondición por id en el registro + manifiesto `spec/migrated.json`—; reporta los changes de `openspec/changes/archive/` como *ya cerrados*, avisa de las colisiones entre layouts sin duplicar entradas y es **atómico por change**: los ya migrados siguen migrados y el error nombra el change que falló; `--dry-run` no escribe nada); y `spectralis spec archive <change-id> [--force]` (valida que las tareas estén `done` en el registro o marcadas en `tasks.md` —exit `2` listando las pendientes salvo con `--force`—, mueve `spec/<id>/` a `spec/_archived/<id>/`, completa la fila del REGISTRY reusando `registerSpec`, **escribe el resumen portátil del change directamente en el vault** (`05_wiki/Spectralis/<id>.md`, formato `id: wiki-<id>`, tags `wiki`/`spectralis`, `estado: completado`, `fecha_cierre`, `commits: []` y las secciones *Qué cambió / Por qué / Decisiones / Verificación / Estado y riesgos vivos / Commits / Enlaces*) y **nunca invoca el binario `openspec`**; valida el change-id (exit `2` si no es kebab-case o si intenta escapar de su carpeta), escribe el REGISTRY **antes** de mover (un fallo del REGISTRY aborta el archive sin mover nada), **nunca sobrescribe** un resumen del vault que ya exista (avisa, muestra su ruta y salta el brain-write; `--force` lo sobrescribe) y elimina la entrada del change de `spec/progress.json` al completar; si el vault no se puede resolver avisa y archiva localmente sin fallar). El default de `resolveChangesDir` **pasa a `spec/`** (solo cambia el cuarto paso de la cascada: valor explícito > `spec_dir` del manifiesto > `spec_dir` de la config global > `spec/`), `spec/` se añade como **marker de proyecto spec-native** y los lectores que validan el histórico (doctor del REGISTRY, `check --tdd`, fachada de OpenSpec, conteo de `projects`/`seed`) leen **ambos layouts durante la ventana de migración** (los proyectos legacy fijan `spec_dir: openspec/changes` o migran con `spec migrate`). **Dual-read** del `config.yaml` del proyecto: el contexto español se inyecta en el config nativo (`spec/config.yaml`) cuando el proyecto es spec-native, se mantiene en `openspec/config.yaml` cuando el proyecto es legacy, y `post-checks` acepta el bloque en **ambas** ubicaciones; `.gitignore` sin cambios y el payload especial de `update` se conserva.
- **spec-native-f1** — primera entrega del modo **spec-native**: el arnés ya opera sobre sus changes sin depender del CLI externo. Nuevos comandos `spectralis task <change> <task-id> [--done | --undone | --estado <todo|in-progress|done> [--porcentaje N]]` (actualiza el registro de progreso `spec/progress.json` —fuente de verdad— con **escritura atómica** (temporal en el mismo directorio + `rename`) y refresca el checkbox de `tasks.md` como **espejo activo**: `done` → `[x]`, el resto → `[ ]`, con emparejamiento por id de tarea completo; exit `2` si el change o el task no existen, `3` si el prefijo es ambiguo) y `spectralis view [change]` (**solo lectura**: lista los changes activos con porcentaje, estado y última actualización, muestra `sin registro` en los que no tienen entrada en el registro y `no hay changes activos` cuando no hay ninguno; nunca escribe el registro, ni `tasks.md`, ni la carpeta `spec/`). El esquema de `spec/progress.json` es `change[]`/`task[]` con `porcentaje` y `estado` (`todo` | `in-progress` | `done`): el porcentaje y el estado del change se **derivan siempre** de sus tareas (base por estatus: `todo` → 0, `in-progress` → 50, `done` → 100; un change sin tareas es `0%`/`todo`, sin división por cero). Nuevo helper `resolveChangesDir` (`src/core/resolve-changes-dir.ts`) con cascada determinista **valor explícito > `spec_dir` del manifiesto (`.sdd-manifest.json`) > `spec_dir` de la config global > default `openspec/changes`**: sustituye las **7 lecturas hardcodeadas** de la ruta (`vault-doctor.ts` ×3, `tdd-check.ts`, `spec-facade.ts`, `projects.ts`, `seed.ts`) sin cambiar su comportamiento observable (el default sigue siendo `openspec/changes`: el flip de layout es de F2). La clave `spec_dir` se puede escribir con `spectralis config --set spec_dir=<ruta>` (proyecto o `--global`) y se lee en tolerante (también acepta `spec-dir`). Los fixtures de test se extraen a `test/helpers/fixtures.ts` (`scratch`, `writeRepo`, `writeVault`, `writeRegistry`, `changeTasks`, `archivedChangeTasks`, `scratchVault`, `writeDecisiones`) **sin cambiar ninguna aserción** de los tests existentes.

- **retire-odd-mode** — **ruptura**: se retira por completo la filosofía ODD (teardown ratificado el 2026-11-04; el "modo low-cost" propuesto como sustituto no tenía implementación, así que **no se introduce ningún modo de reemplazo**: SDD es la única filosofía). `Philosophy` se reduce a `'sdd'`; el manifiesto y la configuración global se leen en **modo tolerante** (cualquier valor distinto de `sdd`, incluido el legado, se resuelve como `sdd` con advertencia legible y **el fichero no se reescribe**); los flags `--odd` y `--sdd` desaparecen de `spectralis init` y `spectralis spec init` (ahora fallan como **opción desconocida**); se borran los módulos `src/core/odd-layout.ts` y `src/core/odd-close.ts` (junto con sus tests) y con ellos la ruta ODD de `src/core/spec-facade.ts` (`route` es siempre `'sdd'`, la operación ODD y `runOddOperation` ya no existen); `DocumenterRequest.mode` se reduce a `'sdd'`; `checkPrereqs` pierde el parámetro `philosophy` y `openspec` pasa a ser **prerequisito incondicional** (tampoco `spectralis doctor` lo reporta como opcional); `spectralis config --set philosophy` solo admite `sdd`; se actualizan las skills (`subagent-contract`, `agent-rules-contract`, `documenter-delegation`, `obsidian-briefing`, `obsidian-orchestration`, `INDEX.md`), `AGENTS.md` y el manual (`notes/architecture/manual.md` sin §9-§10) para describir un **único ciclo SDD**. Las carpetas `odd/changes/` de proyectos existentes quedan inertes: no se leen, no se migran y no se borran. Higiene de QA: `qa/qa-coverage-gate.sh` ya no fija la lista de ficheros del diff (la deriva de `git diff --name-only HEAD -- src/`, con respaldo a la lista completa de `src/` si el diff está vacío), de modo que la compuerta mide el cambio en curso y no el de un change anterior.
- **close-out-consolidate-residual** — cierra los cinco residuos de `consolidate-rules-eliminate-ollama-optimize-tokens`: la spec viva de `optimize-token-consumption` pasa de "~40 líneas" a **22–28 líneas** (el rango que ya exige `test/integration/agents-md-reduced.test.ts`); `notes/local-ai/manual.md` se sustituye por un **stub neutral** que redirige a los manuales de graphify (`graphify-out/`) y del cerebro (`03_Recursos/02_Sistemas_info/`) — `local-ai` sigue en `SUBDIRS` de `src/commands/notes.ts`, así que el payload de `notes()` no cambia — y desaparecen las referencias a Ollama de `README.md`, `notes/spectralis-cli/manual.md`, `notes/README.md`, `.agents/skills/sdd-onboard-project/SKILL.md` (fase 4 reescrita como "IA local y navegación del conocimiento") y `.agents/skills/INDEX.md`; `subagent-contract` **remite** a `agent-rules-contract` (CYCLE-01 y CYCLE-03 se atribuyen al contrato central en lugar de redefinirse, con sección "Referencias"); `graphify-usage` suma la sección **"Navegación del vault Obsidian"** (`01_Proyectos/`, `graphify-out/wiki/index.md`, `openspec/specs/`); y `skills-lock.json` **fija `grilling` en el estado local** (`sourceType: local`, `source: ./.agents/skills/grilling`, hash de carpeta del estado local) para que un resync del CLI no sobrescriba el trigger `grill-me`. Sin cambios de comportamiento del CLI.
- **add-secrets-policy** — nueva sección `## 10. Gestión de secretos` en `docs/base-standards.md` con la política de secretos del arnés (nunca repetir credenciales, API keys, tokens, passwords o usernames privados; enmascarar con los **últimos 4 caracteres + `****`**; `deny-read` sobre `.env`, `*.pem`, `*.key`, `~/.ssh/*`, `~/.aws/*` y `*secrets*`; línea de despacho obligatoria al final de cada brief hacia subagentes; y protocolo de respuesta cuando un secreto llega por error); `AGENTS.md` suma un puntero corto a esa sección sin duplicar su contenido; `CHANGELOG.md` registra la entrada.
- **lean-harness-payload** — los tres manuales LTI del payload (`docs/api-spec.yml`, `docs/data-model.md`, `docs/development_guide.md`) se sustituyen por **stubs neutros de stack**: esqueleto OpenAPI 3.0 con `/health` y `components.schemas` vacío, placeholder `{{entities}}` con instrucciones `graphify query`/`graphify explain`, y secciones `Setup`/`Commands`/`Structure`/`Environment` con placeholders (`{{stack}}`, `{{commands}}`) sin credenciales ni repositorios ajenos — los rellena la skill `sdd-onboard-project`; `AGENTS.md` se reduce de ~44 a **~25 líneas** como enrutador mínimo (base-standards, índice de skills, graphify, OpenSpec, Obsidian, Lessons y ciclo spec) sin duplicar `docs/base-standards.md` y sin tocar el mecanismo de bloque gestionado; `spectralis update` gana el flag **`--prune`**, que borra los archivos retirados **solo cuando su hash coincide con el del manifiesto**, con backup previo en `.sdd-backup-<timestamp>-<pid>/`, borrado solo-fs (nunca `git rm`), respeto de `--dry-run`/`--check` (informe sin escribir) y confirmación explícita salvo `--yes`/`--auto`; los archivos preservados siguen en el manifiesto con su hash de referencia para volver a detectarlos.
- **consolidate-rules-eliminate-ollama-optimize-tokens** — se elimina el flujo redundante de Ollama (`src/core/ollama.ts` y sus llamadas en `init`/`update`) y la clasificación LLM de `distill` (sustituida por heurística determinista; las entradas ambiguas se descartan); se añade la sección "No Yapping" a `docs/base-standards.md`; `AGENTS.md` se reduce a un enrutador mínimo (~40 líneas) que delega en `docs/base-standards.md` y en skills; `update` refresca el bloque gestionado de `AGENTS.md` igual que `init`; la skill `grill-me` se fusiona en `grilling` y se crean las skills `subagent-contract`, `graphify-usage` y `lessons`.

---

## v1.2.43 — 2026-10-07

Conteo de especificaciones: **43**.

### 2026-10-07 (1)

- **add-briefing-at-propose** — el coordinador rellena el briefing técnico del folder note (`## Contexto`, `## Decisiones técnicas`, `## Impacto`) **al proponer** un change (SDD y ODD), antes de crear `proposal`/specs/`design`/`tasks`; `obsidian-briefing`/`obsidian-orchestration` suman el disparo de propuesta y la regla queda en `AGENTS.md` y `coordinador.md`.

---

## v1.2.42 — 2026-10-06

Conteo de especificaciones: **42**.

### 2026-10-06 (1)

- **add-role-contract-and-gertrudis-gate** — contrato de roles con entradas/salidas (`coordinador`, `planificador`, `implementador`, `revisor`/gertrudis) en el `AGENTS.md` de la plantilla, con reutilización de agentes existentes (`documentador` es el único rol nuevo, definido fuera de esta capability); compuerta de revisión de gertrudis de solo lectura con veredicto cerrado (`APROBADO`/`CAMBIOS NECESARIOS`/`BLOQUEO DE ENTORNO`) y hallazgos `archivo:línea` con evidencia reproducible; revisión escalada por riesgo (ODD bajo riesgo → diff + checks mínimos; medio/alto → gertrudis; SDD → compuertas formales); flujos completos `sdd` y `odd` con compuertas humanas y reglas NUNCA; el coordinador identifica modo/ID/estado/fase vía la fachada antes de actuar.

---

## v1.2.41 — 2026-10-06

Conteo de especificaciones: **41**.

### 2026-10-06 (1)

- **add-spec-facade-commands** — fachada común y consciente del modo (`src/core/spec-facade.ts`) para iniciar, consultar, validar, completar y cerrar un cambio: en SDD delega en OpenSpec (sin reimplementarlo; si falta, informa y se detiene) y en ODD opera sobre `odd/changes/<id>/feature.md` sin OpenSpec. Garantiza un solo ejecutor activo por cambio (apply no se relanza tras delegar) y `apply` ejecuta solo las tareas existentes, deteniéndose ante artefactos esenciales incompletos sin llamar al planificador.

---

## v1.2.40 — 2026-10-06

Conteo de especificaciones: **40**.

### 2026-10-06 (1)

- **add-openspec-optional-prereq** — `openspec` deja de ser prerequisito incondicional: solo se exige en modo `sdd`. Añade el parámetro de modo a `checkPrereqs`, reporte condicional en `spectralis doctor` (requerido SDD / opcional ODD), y `init` que omite `openspec init` y la inyección de `openspec/config.yaml` en proyectos odd-only, sin gestionar `openspec/` en el manifest.

---

## v1.2.39 — 2026-10-06

Conteo de especificaciones: **39**.

### 2026-10-06 (1)

- **add-mode-philosophy-cascade** — campo `philosophy` (`sdd`|`odd`) en `.sdd-manifest.json` y en la config global, con cascada determinista `--odd/--sdd` > manifiesto > global > `sdd` (default retrocompatible). Añade `spectralis config --set/--get/--list philosophy`, flags mutuamente excluyentes `--odd`/`--sdd` en `spectralis spec init`, y preservación de `philosophy`/`obsidianSync` en `spectralis update`.

---

## v1.2.38 — 2026-10-06

Conteo de especificaciones: **38**.

### 2026-10-06 (1)

- **add-lessons-log** — regla de Lessons en el `AGENTS.md` de la plantilla: el agente registra cada corrección como `- Cuando X, haz Y` en `01_Proyectos/<Proyecto>/_Notas/_lessons.md`, reescribe la lección ante repetición y carga las lecciones del proyecto antes de actuar. Incluye test de integración que ancla la regla en la plantilla.

---

## v1.2.37 — 2026-09-29

Conteo de especificaciones: **37**.

### 2026-09-29 (1)

- **add-bump-command** — nuevo comando `spectralis bump [patch|minor|major]` para versionar manualmente spectralis (`package.json`) o el proyecto destino (`.sdd-manifest.json`). Opciones: `--dry-run`, `--spectralis`, `--project`.

---

## v1.2.35 — 2026-09-27

Conteo de especificaciones: **35**.

### 2026-09-27 (1)

- **refactor-project-version-rules** — renombra `templateVersion` → `projectVersion` (manifest schema v3 con lectura tolerante de v2), `spectralis init` pregunta la versión del proyecto (default `1.0.0`, sugerencia del `pom.xml`/`package.json`), reglas deterministas de bump (`bumpPatch`/`bumpMinor`/`bumpMajor` con máx 99 y carry), y el flujo commit/release usa `projectVersion` como fuente canónica.

---

## v1.2.34 — 2026-09-27

Conteo de especificaciones: **34**.

### 2026-09-27 (3)

- **add-check-registry-consistencia** — `spectralis check --registry`: doctor determinista sin LLM que valida la consistencia del triángulo repo ↔ `.sdd-registry/REGISTRY.md` ↔ brain ↔ `openspec` (change sin registro, huérfano, briefing faltante, `_INDEX.json` desalineado, sin destilar).
- **add-check-vault-ids** — `spectralis check --ids`: valida conformidad/unicidad de IDs del vault (whitelist ampliada `res-`/`brief-`/`test-`, caché por mtime en `.spectralis/`).
- **move-registry-machine-local** — mueve `docs/requirements/REGISTRY.md` y briefings a `.sdd-registry/` (machine-local, sin versionar ni distribuir); actualiza skills, `copy-payload`, `post-checks`, `spec-workflow`.

### 2026-09-25 (21)

- **orchestrate-obsidian-sync** — switch `obsidianSync` que orquesta el cerebro en `/opsx-apply` y `/opsx-archive`.
- **add-05-wiki-distill** — capa `05_wiki/` (LLM Wiki) consumible por proyectos externos, separada del Second Brain.
- **add-seed-and-distill-complete** — `spectralis seed` (carga inicial `05_wiki/`) y `spectralis distill` completo (determinista + LLM).
- **add-spec-workflow-commands** — comandos `spectralis spec init/complete` para el flujo de especificación.
- **add-manuals-second-brain-sync** — manuales del arnés sincronizados al cerebro (`spectralis notes`).
- **add-spectralis-config-vault-routes** — rutas del vault configurables (config → manifiesto → vault → fallback).
- **add-spectralis-projects-dashboard** — `spectralis projects` con estado OpenSpec por proyecto.
- **add-spectralis-skills-command** — `spectralis skills` detecta skills y refresca `_INDEX_SKILLS.json`.
- **add-spectralis-update-auto** — actualización automática y clasificación de archivos gestionados.
- **add-project-ids** — IDs de proyecto (`proy-YYYYMMDD-slug`) en el flujo del cerebro.
- **add-project-cwd-detection** — detección del proyecto desde el cwd actual.
- **add-openspec-local-policy** — política local: `openspec/` deja de versionarse.
- **add-stack-json-artifact** — artefacto `stack.json` con detección reproducible del stack.
- **improve-stack-detection-reproducibility** — caché por mtime y escaneo a profundidad 2 en monorepos.
- **enhance-distill-llm-and-stack** — clasificación LLM (Ollama) para entradas ambiguas del distill.
- **improve-spectralis-ux-update-tools-menu** — mejoras de UX en el menú de herramientas de `update`.
- **spectralis-cli-ux-aliases** — aliases de flags del CLI (`--demo`, `--dd`, `--v`).
- **add-compose-standards-placeholders** — reporte de placeholders pendientes en estándares compuestos.
- **add-readme-third-party-tools** — README con herramientas de terceros.
- **remove-autoskills** — eliminación del autoskills automático.
- **update-skill-index-spec** — actualización del índice de skills.

### 2026-09-21 (10)

- **add-spectralis-cli-installer** — instalador CLI multiplataforma (init, update, doctor) en Node puro.
- **add-spectralis-init-ui** — UI del instalador: banner, fases marcadas, prompts.
- **add-stack-detection-and-docs-variants** — detección de stack y variantes de `docs/`.
- **add-spec-from-note** — skill que convierte nota de requerimiento en changes OpenSpec.
- **add-skill-index** — índice de skills del proyecto.
- **add-exploration-briefing-gate** — gate de briefing antes de `openspec new change`.
- **add-spanish-commit-review-gate** — revisión de commits en español.
- **add-gitignore-managed-refresh** — refresco del bloque gestionado de `.gitignore`.
- **sync-project-agent-config** — sincronización de config de agentes.
- **update-installer-managed-agents-block** — bloque gestionado de agentes en el instalador.

---

## v1.2.0 — 2026-09-23

- Alias de flags, selector de tools y comandos `status`/`config`. Bump a `1.2.0` sin correlato de spec archivada.

## v1.0.0 — 2026-09-21

- Implementación inicial del CLI spectralis: instalador SDD multiplataforma con `doctor` y matriz de agentes.