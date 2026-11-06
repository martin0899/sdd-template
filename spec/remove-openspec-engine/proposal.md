## Why

Spectralis has evolved to a fully native spec workflow. The openspec engine dependency (CLI, vendor payload, dual-read windows, facade state machinery) is now dead weight: it adds complexity, maintenance burden, and cognitive overhead without delivering value. Removing it entirely establishes a single native mode, simplifies the codebase, and eliminates the dual-engine ambiguity that has persisted through F1-F4.

## What Changes

- **BREAKING**: Remove openspec engine key from config (D1) — single native mode, no engine resolution
- **BREAKING**: Delete spec-facade.ts and facade-state machinery after extracting missingSddEssentials (D2)
- **BREAKING**: init.ts stops calling `openspec init`; native scaffolding only (D3)
- **BREAKING**: Retire dual-read window; single-dir via resolveChangesDir() (D4)
- **BREAKING**: openspec/config.yaml never written/read; retired-marking behavior for existing installs (D5)
- **BREAKING**: Remove vendor payload (opsx-* commands, openspec-* skills) from copy-payload and profiles (D6)
- Skills and docs scrubbed of legacy openspec mentions; header-freeze preserves test-pinned sections (D7)
- openspec/specs/ kept as historical archive (gitignored); pending F1-F4 archives voided (D8)
- Dogfood: coordinator runs `spectralis spec migrate` post-commit (D9, out of scope)

## Capabilities

### New Capabilities

- `native-engine-mode`: Final state with single native engine — no engine key, no facade, no vendor payload. Covers config simplification, init native scaffolding, and engine resolution removal.
- `legacy-migration-support`: Migration-only legacy support — config.ts:312 detection marker, gitignore.ts:14 ignore pattern, spec-migrate direct reader for openspec/changes/. Documents both as migration-only.
- `retired-marking-behavior`: Retired-marking behavior for openspec/config.yaml in existing installs — update --prune cleans it, copy-payload stops listing it. Precedent from lean-harness-payload.

### Modified Capabilities

(none — F1-F4 deltas never archived to main specs; F5 stands alone as final-state description)

## Impact

**Code**:
- src/core/spec-facade.ts deleted; missingSddEssentials extracted to src/core/sdd-essentials.ts
- src/core/config.ts: engine key resolution removed; detection marker kept (line 312)
- src/core/resolve-engine.ts deleted
- src/core/init.ts:170-183: openspec init call removed; native scaffolding added
- src/core/prereqs.ts: conditional engine probe removed
- src/core/doctor.ts: engine labels removed
- src/core/legacy-changes-reader.ts deleted OR repurposed for migrate-only
- src/commands/spec-migrate.ts: direct openspec/changes reader (if legacy-changes-reader deleted)
- src/commands/update.ts:41 + classify-update.ts:16-20: special path replaced by retired-file marking
- src/commands/copy-payload.ts:4-5: vendor payload removed; openspec/config.yaml listing removed
- src/core/profiles.ts: openspec tooling entries removed
- src/core/gitignore.ts:14: openspec/ ignore kept (documented as migration-only)

**Tests**:
- Facade tests deleted
- Engine resolution tests deleted
- Dual-read window tests deleted/rewritten for single-dir
- New tests: retired-marking behavior, native scaffolding, sdd-essentials extraction
- Baseline recomputed from 624/624 minus deleted suites (real count reported)

**Skills/Docs**:
- spec-from-note, agent-rules-contract, adversarial-review, graphify-usage, obsidian-*: legacy mentions dropped
- exploration-briefing: §6 'openspec new change' → 'spectralis spec create <id> --nombre' (6 occurrences)
- base-standards.md §8: heading renamed to '## 8. Change Artifact Updates for Post-Apply Changes' + native prose
- docs/spec-native.md: de-duals
- README/CHANGELOG: updated
- Header-freeze: test-pinned sections preserved (graphify-usage '## Navegación del vault Obsidian', agent-rules-contract CYCLE ids)
- openspec-gate ID/name kept for stability

**Acceptance Gates**:
- npm test: baseline recomputed (real count)
- tsc clean
- qa gate passes
- check --tdd passes
- Greps: src/ has NO functional 'openspec' references except (gitignore string, config.ts:312 marker string, spec-migrate legacy reader, comments/history, retired-marking tests)
- Skills: zero functional openspec prescriptions ('openspec new change' only as historical name in openspec-gate)
