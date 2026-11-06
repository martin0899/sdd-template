## Context

Spectralis has evolved through F1-F4 to a fully native spec workflow. The openspec engine dependency (CLI, vendor payload, dual-read windows, facade state machinery) is now dead weight. This change removes it entirely, establishing a single native mode. See proposal.md for motivation.

Current state: the codebase has dual-engine support (openspec/native), a spec-facade that delegates to the openspec CLI, dual-read windows in several commands, vendor payload (opsx-* commands, openspec-* skills), and openspec/config.yaml handling. After F5, none of this remains except migration-only markers.

## Goals / Non-Goals

**Goals:**
- Remove all functional openspec engine dependencies from src/
- Establish single native mode with no engine selection
- Preserve migration-only support for legacy installations (detection marker, gitignore pattern, spec-migrate reader)
- Implement retired-marking behavior for openspec/config.yaml in existing installs
- Scrub skills/docs of legacy openspec mentions while preserving test-pinned sections (header-freeze)
- Recompute test baseline from 624/624 minus deleted suites (report real count)

**Non-Goals:**
- Archive F1-F4 changes (voided per brief)
- Remove openspec/specs/ directory (kept as historical archive, gitignored)
- Modify openspec-gate skill ID/name (kept for stability)
- Write vault notes (documentador's responsibility)

## Decisions

### Decision 1: Extract missingSddEssentials before deleting facade
**Choice**: Extract `missingSddEssentials` from `src/core/spec-facade.ts` to `src/core/sdd-essentials.ts` before deleting the facade. The function keeps its `resolveChangesDir`-based signature.

**Rationale**: `spectralis spec validate` depends on this function. Extracting it preserves the validation capability without the facade machinery. The facade-state file (.spectralis/facade-state.json) is deleted with the facade; existing state files are left inert.

**Alternatives considered**: 
- Keep facade with stub implementation → rejected: adds complexity for no value
- Delete missingSddEssentials entirely → rejected: breaks spec validate

### Decision 2: Delete resolve-engine.ts entirely
**Choice**: Remove `src/core/resolve-engine.ts` and all its exports (`resolveEngine`, `SPEC_ENGINES`, `isSpecEngine`, `DEFAULT_ENGINE`, `EngineResolution`). No replacement.

**Rationale**: With single native mode, engine resolution is unnecessary. The config key `engine` is removed; no module needs to resolve it.

**Alternatives considered**:
- Keep resolve-engine with hardcoded 'native' → rejected: dead code
- Deprecate but keep → rejected: adds cognitive overhead

### Decision 3: Retire dual-read window, single-dir via resolveChangesDir()
**Choice**: All commands (doctor, tdd-check, projects, seed, view) use `resolveChangesDir()` to resolve a single changes directory. The dual-read window (reading both `spec/` and `openspec/changes/`) is retired. `legacy-changes-reader.ts` is either deleted (with migrate-specific reader moved into `src/commands/spec-migrate.ts`) or repurposed for migrate-only.

**Rationale**: Dual-read adds complexity and ambiguity. Single-dir is cleaner and matches the single-native-mode philosophy. spec-migrate is the only command that needs legacy access.

**Alternatives considered**:
- Keep dual-read with deprecation warning → rejected: adds complexity
- Keep legacy-changes-reader.ts as separate module → rejected: migrate-only use case doesn't justify a separate module; implementer can choose to inline it in spec-migrate.ts

### Decision 4: Retired-marking for openspec/config.yaml
**Choice**: `update.ts:41` and `classify-update.ts:16-20` replace the special path handling with retired-file marking. Existing `openspec/config.yaml` in installs is marked 'retired' so `update --prune` cleans it. `copy-payload.ts` stops listing it.

**Rationale**: Follows the precedent from lean-harness-payload. Existing installs can clean up legacy files automatically. New installs never create the file.

**Alternatives considered**:
- Leave legacy config as special path → rejected: inconsistent with removal philosophy
- Delete legacy config immediately → rejected: breaks existing installs without migration path

### Decision 5: Header-freeze for test-pinned sections
**Choice**: When scrubbing skills/docs of legacy openspec mentions, preserve test-pinned sections using header-freeze method. Specifically: graphify-usage '## Navegación del vault Obsidian' and agent-rules-contract CYCLE ids are pinned. Verify none of the 9 F4-edited skills is pinned to legacy strings before scrubbing.

**Rationale**: Tests may depend on specific header text. Changing it breaks tests. Header-freeze preserves the pinned sections while allowing other content to be updated.

**Alternatives considered**:
- Update all headers and fix tests → rejected: unnecessary risk
- Skip header updates entirely → rejected: some headers need updating for consistency

### Decision 6: ADDED-only final-state delta
**Choice**: Express F5 delta as ADDED-only self-contained requirements describing the FINAL STATE (single native engine, no engine key, no facade, no vendor payload, retired marking behavior, migration-only legacy support). This stands alone even if F1-F4 never archive.

**Rationale**: F1-F4 deltas were never archived to main specs (pending archives voided). Expressing F5 as MODIFIED/REMOVED against non-existent main specs would fail validation. ADDED-only describes the final state clearly and validates cleanly.

**Alternatives considered**:
- MODIFIED/REMOVED against F1-F4 deltas → rejected: targets don't exist in main specs
- skip_specs: true → rejected: behavior changes significantly; specs should document the final state

## Risks / Trade-offs

**Risk**: Breaking change for projects using openspec engine → **Mitigation**: Migration-only support (detection marker, gitignore, spec-migrate) ensures legacy projects can migrate. Retired-marking cleans up legacy files automatically.

**Risk**: Tests may break when facade/engine modules deleted → **Mitigation**: TDD order: write tests for extracted sdd-essentials first, then delete facade/tests. Recompute baseline from 624/624 minus deleted suites (real count reported).

**Risk**: Skills/docs scrub may break test-pinned sections → **Mitigation**: Header-freeze method preserves pinned sections. Verify none of the 9 F4-edited skills is pinned to legacy strings before scrubbing.

**Risk**: Vendor payload removal may break existing installations → **Mitigation**: Installed projects keep harmless extras until update/retire. No immediate breakage.

**Trade-off**: Migration-only legacy support adds some complexity → **Acceptable**: Necessary for backward compatibility with existing installations. Minimal overhead (detection marker, gitignore pattern, spec-migrate reader).

**Trade-off**: ADDED-only delta doesn't explicitly document what was removed → **Acceptable**: Final-state description is clear enough. Archive order (F1→F2→F3→F4→F5) documented in proposal for merge preflight.
