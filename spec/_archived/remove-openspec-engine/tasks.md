## 1. Extract sdd-essentials and delete facade

- [x] 1.1 Write tests for `src/core/sdd-essentials.ts` covering `missingSddEssentials` function with `resolveChangesDir`-based signature. Verify tests pass with current facade implementation before extraction.
- [x] 1.2 Extract `missingSddEssentials` from `src/core/spec-facade.ts` to `src/core/sdd-essentials.ts`. Update imports in `src/commands/spec-validate.ts` to use new location. Verify `spectralis spec validate` still works and tests pass.
- [x] 1.3 Delete `src/core/spec-facade.ts` and all facade-related tests. Verify no imports reference it and `tsc` compiles cleanly.
- [x] 1.4 Delete `.spectralis/facade-state.json` handling code. Verify no code reads or writes facade-state. Existing state files left inert on disk.

## 2. Remove engine key and resolution

- [x] 2.1 Write tests verifying config commands (`config --set`, `config --get`, `config list`) reject or ignore `engine` key. Verify tests fail with current implementation.
- [x] 2.2 Remove `engine` key from `SpectralisConfig` type in `src/core/config.ts`. Remove engine-related validation and serialization. Verify tests pass.
- [x] 2.3 Delete `src/core/resolve-engine.ts` and all its exports. Remove imports from `src/core/config.ts`, `src/core/prereqs.ts`, `src/commands/doctor.ts`. Verify `tsc` compiles cleanly.
- [x] 2.4 Remove `openspecCheck` and `OPENSPEC_TOOL` from `src/core/prereqs.ts`. Remove openspec from prerequisite checks. Verify `spectralis doctor` does not report openspec and tests pass.
- [x] 2.5 Remove openspec labels from `src/commands/doctor.ts`. Remove conditional engine-based reporting. Verify doctor output contains no openspec mentions and tests pass.

## 3. Init native scaffolding

- [x] 3.1 Write tests for native init: verify `spec/` directory created with `progress.json` (empty-seeded) and `config.yaml` with spanish-context section. Verify tests fail with current openspec init call.
- [x] 3.2 Remove `openspec init` call from `src/commands/init.ts:170-183`. Replace with native scaffolding: create `spec/` directory, seed empty `progress.json`, inject spanish-context into `spec/config.yaml`. Verify tests pass.
- [x] 3.3 Remove `openspecTools` field from profiles in `src/agents/profiles.ts`. Remove openspec-specific tooling entries. Verify `spectralis init --tools` still accepts flag but does not influence openspec tooling.
- [x] 3.4 Update `src/commands/plan.ts` to remove openspec init references. Update plan output to reflect native-only scaffolding. Verify plan command output is correct.

## 4. Dual-read retirement

- [x] 4.1 Write tests verifying commands (doctor, tdd-check, projects, seed, view) use single-dir via `resolveChangesDir()`. Verify tests fail with current dual-read implementation.
- [x] 4.2 Update `src/core/tdd-check.ts` to use `resolveChangesDir()` only. Remove dual-read logic. Verify `spectralis check --tdd` reads from single directory and tests pass.
- [x] 4.3 Update `src/core/vault-doctor.ts` to use `resolveChangesDir()` only. Remove dual-read logic. Verify doctor reports on single directory and tests pass.
- [x] 4.4 Update `src/commands/projects.ts`, `src/commands/seed.ts`, `src/commands/view.ts` to use `resolveChangesDir()` only. Remove dual-read logic. Verify tests pass.
- [x] 4.5 Decide: delete `src/core/legacy-changes-reader.ts` OR repurpose for migrate-only. If deleted, move legacy reader logic into `src/commands/spec-migrate.ts` as direct reader. Update spec-migrate to use inline or dedicated reader. Verify `spectralis spec migrate` still works.
- [x] 4.6 Update `src/core/resolve-changes-dir.ts` comments to reflect single-dir philosophy. Remove references to dual-read window. Verify `tsc` compiles cleanly.

## 5. Config.yaml retired-marking

- [x] 5.1 Write tests for retired-marking behavior: verify `openspec/config.yaml` is classified as retired by `classify-update.ts` and removed by `update --prune`. Verify tests fail with current special-path handling.
- [x] 5.2 Update `src/commands/update.ts:41` to remove `openspec/config.yaml` from `MANIFEST_SPECIAL_PATHS`. Add retired-file marking logic. Verify tests pass.
- [x] 5.3 Update `src/core/classify-update.ts:16-20` to treat `openspec/config.yaml` as retired. Verify classification logic marks it correctly and tests pass.
- [x] 5.4 Update `src/core/copy-payload.ts` to stop listing `openspec/config.yaml`. Remove from payload files. Verify `spectralis seed` does not copy legacy config.
- [x] 5.5 Update `src/core/post-checks.ts` to check spanish-context in `spec/config.yaml` only. Remove `openspec/config.yaml` from config file list. Verify post-checks work correctly.
- [x] 5.6 Update `src/core/spanish-context.ts` to write to `spec/config.yaml` only. Remove legacy config path handling. Verify spanish-context injection targets native config.

## 6. Vendor payload removal

- [x] 6.1 Write tests verifying `copy-payload.ts` excludes opsx-* commands and openspec-* skills. Verify tests fail with current payload.
- [x] 6.2 Update `src/core/copy-payload.ts:4-5` to remove vendor payload (opsx-* commands, openspec-* skills). Update `PAYLOAD_DIRS` and `PAYLOAD_FILES` to exclude openspec-specific content. Verify tests pass.
- [x] 6.3 Update `src/agents/profiles.ts` to remove openspec tooling entries from profile lists. Verify profiles load correctly without openspec references.
- [x] 6.4 Update `src/core/rules-contract.ts` comments to remove references to opsx-* commands and openspec-* skills. Verify `tsc` compiles cleanly.

## 7. Skills/docs scrub

- [x] 7.1 Identify test-pinned sections using header-freeze method: graphify-usage '## Navegación del vault Obsidian', agent-rules-contract CYCLE ids. Verify none of the 9 F4-edited skills is pinned to legacy strings before scrubbing.
- [x] 7.2 Update `.agents/skills/exploration-briefing/SKILL.md` §6: replace 6× 'openspec new change' with 'spectralis spec create <id> --nombre'. Verify skill content updated and tests pass.
- [x] 7.3 Update `.agents/skills/spec-from-note/SKILL.md`, `.agents/skills/agent-rules-contract/SKILL.md`, `.agents/skills/adversarial-review/SKILL.md`, `.agents/skills/graphify-usage/SKILL.md`, `.agents/skills/obsidian-*/SKILL.md` to drop legacy openspec mentions. Preserve header-frozen sections. Verify skills updated correctly.
- [x] 7.4 Update `docs/base-standards.md` §8: rename heading to '## 8. Change Artifact Updates for Post-Apply Changes' and update prose to native-only. Verify document updated and references correct.
- [x] 7.5 Update `docs/spec-native.md` to de-dual: remove openspec engine references, describe single native mode. Verify document updated.
- [x] 7.6 Update `README.md` and `CHANGELOG.md` to reflect F5 changes. Update installation/setup sections to remove openspec CLI references. Verify documents updated.
- [x] 7.7 Verify git marks: `src/core/gitignore.ts:14` keeps `openspec/` ignore pattern (documented as migration-only). `src/core/config.ts:312` keeps detection marker (documented as migration-only). Add comments documenting both as migration-only.

## 8. Acceptance gates

- [x] 8.1 Run `npm test` and recompute baseline from 624/624 minus deleted suites. Report real count. Verify all tests pass.
- [x] 8.2 Run `tsc` and verify clean compilation with no errors.
- [x] 8.3 Run `spectralis check --tdd` and verify qa gate passes.
- [x] 8.4 Run grep verification: `src/` has NO functional 'openspec' references except (gitignore string in `src/core/gitignore.ts:14`, config.ts:312 marker string, spec-migrate legacy reader, comments/history, retired-marking tests). Verify grep results match acceptance criteria.
- [x] 8.5 Run grep verification: skills have zero functional openspec prescriptions ('openspec new change' only as historical name in openspec-gate). Verify grep results match acceptance criteria.
- [x] 8.6 Document dogfood step: coordinator runs `spectralis spec migrate` post-commit (out of change scope). Add note in CHANGELOG or commit message.

---

## Notas de ejecucion (2026-11-05)

### Estado de partida (sesion interrumpida)

La sesion anterior dejo el codigo de las secciones 1-4 escrito pero **sin marcar** los checkboxes y sin verificacion final. Se reconstruyo el estado (`git status --short`, diff completo, `tasks.md`) y se **verifico** cada area antes de continuar: `npm test` daba 613 tests con 8 fallos (todos caused por la retirada de la lectura dual y el scaffolding nativo). La continuacion arranco desde la seccion 5.

### Baseline real de tests (8.1)

- Baseline previo: **624/624**.
- Suites eliminados (**48 tests**): `spec-facade.test.ts` (7), `resolve-engine.test.ts` (8), `prereqs-engine.test.ts` (6), `prereqs-mode.test.ts` (3), `config-engine.test.ts` (5), `doctor-engine.test.ts` (6), `legacy-changes-reader.test.ts` (4), `config-dual-read.test.ts` (9).
- Suites nuevos (**38 tests**): `sdd-essentials.test.ts` (6), `single-dir-resolution.test.ts` (4), `prereqs-no-engine.test.ts` (3), `config-engine-removed.test.ts` (5), `doctor-no-engine.test.ts` (4), `retired-config-marking.test.ts` (4), `init-native-scaffolding.test.ts` (3), `config-native-only.test.ts` (9).
- Delta en suites existentes (**+8**): `copy-payload.test.ts` +2, `spec-migrate.test.ts` +4, `classify-update.test.ts` +1, `update.test.ts` +2, `prereqs.test.ts` −1.
- 624 − 48 + 38 + 8 = **622**.
- **Resultado final: 622/622 tests, 0 fallos** (`npm test`: `# tests 622`, `# pass 622`, `# fail 0`).

### Decisiones y desviaciones documentadas

1. **D4 (lector legacy)**: se **elimina** `src/core/legacy-changes-reader.ts` y su test; el lector vive **inline** en `src/commands/spec-migrate.ts` (`readLegacyChanges`, `stripArchiveDatePrefix`, `LEGACY_CHANGES_REL`) y sus 4 tests se han **portado** a `test/commands/spec-migrate.test.ts` para no perder cobertura.
2. **Header-freeze / `openspec/specs/` (7.1)**: `test/integration/close-out-residuals.test.ts` **pinea** la cadena `openspec/specs/` dentro de la sección `## Navegación del vault Obsidian` de `graphify-usage`. Se **conserva la mención** con un comentario en linea que la declara *archivo histórico de instalaciones antiguas, nunca leido ni escrito por el arnés* (coherente con D8). **No se toco ningun test** de los que pinnan strings de skills.
3. **Test ajustado (desviacion documentada)**: `test/integration/agents-md-reduced.test.ts` pinaba la cadena `OpenSpec` en `AGENTS.md`. Como el motor externo deja de existir, la linea del router pasa a "Requirement work goes through the native spec flow (skill `openspec-gate`)" y el pin pasa a ser la **ruta de la skill** `openspec-gate` (su nombre e id se conservan por D7). Es el **unico test modificado** por este cambio.
4. **`src/core/copy-payload.ts` conserva literales `openspec-*` / `opsx-*`**: es **imprescindible** — el requisito de la spec ("copy-payload SHALL NOT copy opsx-* commands or openspec-* skills") solo se puede implementar nombrando esos prefijos. Se documentan aqui como referencia funcional **de la retirada**, no como prescripcion.
5. **Vendor payload en el repo**: los ficheros `.opencode/commands/opsx-*.md` y `.opencode/skills/openspec-*` **se conservan en el repositorio** pero quedan **excluidos del payload** (`copy-payload.ts` los filtra). Es el precedente de D6 ("las instalaciones antiguas conservan sus extras hasta que `update` los retire"): el cambio no borra ficheros vendor del repo plantilla, solo deja de instalarlos.
6. **`docs/openspec-tasks-mandatory-steps.md` → `docs/spec-tasks-mandatory-steps.md`**: el documento (que se instala en el destino) prescribia leer `openspec/config.yaml` y las skills `opsx-*`/`openspec-*`. Se **renombro** y se reescribio a nativo. Los enlaces de `README.md` y `docs/base-standards.md` §3 se actualizaron. En una instalacion existente el fichero viejo queda *retired* (lo limpia `update --prune`).
7. **Manuales canonicos (`notes/`)**: no estaban en la lista de la 7.x, pero describian `openspec init`, la clave `engine` y el binario externo como prerrequisito. Se **actualizaron** a nativo (`notes/spectralis-cli/manual.md`, `notes/architecture/manual.md`) para que no documenten comportamiento inexistente. Sin cambios de codigo.
8. **Fixtures de test**: `test/fixtures/registry-doctor/repo` seguia con los changes en `openspec/changes/`. Con la lectura dual retirada el resolutor apunta a `spec/`, asi que el fixture **declara su layout** con un `.sdd-manifest.json` (`spec_dir: openspec/changes`) — el mecanismo previsto para un proyecto en layout historico. El contrato de `vault-doctor.test.ts` ("an archive folder name from this repo resolves…") pasa a construir el fixture con `writeArchivedChange` (que ya fija ese layout) tomando el nombre del archive real del repo.
9. **Tests con layout historico actualizados a nativo**: `check.test.ts`, `projects.test.ts`, `seed.test.ts`, `init.integration.test.ts` y `post-checks.test.ts` usaban `openspec/changes/` o `openspec/config.yaml`; se migraron al layout nativo que ahora resuelven (`spec/`), y `seed.test.ts` paso a verificar que la lectura es de **un solo** directorio.

### Evidencia de las compuertas (8.2 - 8.5)

| Compuerta | Comando | Resultado |
|---|---|---|
| Suite + tsc | `npm test` | **PASS** — 622/622, 0 fallos (el script compila `tsconfig.json` y `tsconfig.test.json` antes de correr) |
| TDD | `node dist/bin/spectralis.js check --tdd` | **PASS** — `[OK] Sin hallazgos` |
| QA gate | `node .test-tmp/qa-emulate.mjs` (emulacion del gate bash; la whitelist de shell no permite ejecutar bash) | **PASS** — Nivel 0 (typecheck + escaneo de secretos, 74 ficheros, 0 coincidencias), Nivel 1 (suite), diff coverage **153/153 = 100%** (umbral 80%), cobertura global 100% por fichero (umbral 85%). Registrado en `qa/pendientes-verificacion.md` (bloque **QA-007**) |
| Grep `src/` (8.4) | `rg -n "openspec\|OpenSpec\|opsx" src/` | Solo quedan: el string `openspec/` del `.gitignore` gestionado (con su comentario MIGRATION-ONLY), el marcador de deteccion de `src/core/config.ts` (comentado MIGRATION-ONLY), el lector legacy de `src/commands/spec-migrate.ts`, los **prefijos de exclucion del vendor** en `copy-payload.ts` (imprescindibles para implementar la retirada, ver nota 4) y comentarios |
| Grep skills (8.5) | `rg -n "openspec\|OpenSpec\|opsx" .agents/skills/` | Solo quedan: el **nombre/id** `openspec-gate` (conservado por D7) y la mención histórica `openspec/specs/` de `graphify-usage` con su comentario en linea (pinnada por un test, ver nota 2). **Cero prescripciones funcionales** |
