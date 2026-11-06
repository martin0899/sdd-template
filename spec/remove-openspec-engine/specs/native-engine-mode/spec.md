## Purpose

Establishes the single native engine mode by removing all openspec engine dependencies: the engine configuration key, the engine resolution machinery, the spec-facade delegation layer, the facade-state file, the vendor payload (opsx-* commands, openspec-* skills), and the openspec init call. After this change, Spectralis operates in one mode only — native — with no engine selection, no external CLI spawning, and no dual-engine ambiguity.

## ADDED Requirements

### Requirement: No engine configuration key
The system SHALL NOT expose, read, or write an `engine` key in the global configuration, project manifest, or any CLI command (`config --set`, `config --get`, `config list`). The engine concept is removed entirely; there is only one native mode.

#### Scenario: Config commands do not reference engine
- **WHEN** a user runs `spectralis config --get engine` or `spectralis config --set engine native`
- **THEN** the system reports the key is unknown or unrecognized

#### Scenario: Manifest engine field ignored
- **WHEN** a project manifest (`.sdd-manifest.json`) contains an `engine` field
- **THEN** the system ignores it and operates in native mode without error

### Requirement: No spec-facade or facade-state
The system SHALL NOT contain `src/core/spec-facade.ts`, SHALL NOT spawn the openspec CLI for any operation, and SHALL NOT read or write `.spectralis/facade-state.json`. The `missingSddEssentials` function (used by `spectralis spec validate`) SHALL be extracted to `src/core/sdd-essentials.ts` with the same `resolveChangesDir`-based signature.

#### Scenario: Facade module absent
- **WHEN** the codebase is built
- **THEN** `src/core/spec-facade.ts` does not exist and no import references it

#### Scenario: No facade-state file operations
- **WHEN** any spec workflow operation runs (create, status, validate, archive, apply)
- **THEN** no `.spectralis/facade-state.json` is read or written

#### Scenario: missingSddEssentials still available
- **WHEN** `spectralis spec validate` runs on a change directory
- **THEN** it uses `missingSddEssentials` from `src/core/sdd-essentials.ts` to check artifact completeness

### Requirement: No engine resolution module
The system SHALL NOT contain `src/core/resolve-engine.ts`. No module SHALL export `resolveEngine`, `SPEC_ENGINES`, `isSpecEngine`, `DEFAULT_ENGINE`, or `EngineResolution`.

#### Scenario: Engine resolution absent
- **WHEN** the codebase is built
- **THEN** `src/core/resolve-engine.ts` does not exist and no import references it

### Requirement: No openspec CLI prerequisite probe
The system SHALL NOT probe for the openspec CLI binary as a prerequisite. `src/core/prereqs.ts` SHALL NOT export `openspecCheck` or reference the openspec tool. `spectralis doctor` SHALL NOT report openspec as required or optional.

#### Scenario: Doctor does not check openspec
- **WHEN** a user runs `spectralis doctor`
- **THEN** the output contains no mention of openspec as a required or optional tool

#### Scenario: Prereqs module has no openspec check
- **WHEN** the codebase is built
- **THEN** `src/core/prereqs.ts` does not export `openspecCheck` or `OPENSPEC_TOOL`

### Requirement: Native-only init scaffolding
`src/commands/init.ts` SHALL NOT call `openspec init`. When initializing a project, the system SHALL create the native `spec/` directory structure, seed an empty `progress.json`, and inject the native spanish-context section into `spec/config.yaml`. The `--tools` profile flag SHALL be accepted but SHALL NOT influence openspec tooling (profiles.ts drops openspec tooling entries).

#### Scenario: Init creates native structure without openspec CLI
- **WHEN** a user runs `spectralis init` on a fresh directory
- **THEN** the system creates `spec/` with `progress.json` and `config.yaml` without invoking any external CLI

#### Scenario: Init does not create openspec/ directory
- **WHEN** a user runs `spectralis init` on a fresh directory
- **THEN** no `openspec/` directory is created

#### Scenario: Profiles drop openspec tooling
- **WHEN** profiles are loaded from `src/agents/profiles.ts`
- **THEN** no profile contains an `openspecTools` field or openspec-specific tooling entries

### Requirement: No vendor payload in copy-payload
`src/core/copy-payload.ts` SHALL NOT copy opsx-* commands or openspec-* skills to destination projects. The payload directories and files SHALL exclude any openspec-specific vendor content.

#### Scenario: Copy-payload excludes openspec vendor content
- **WHEN** `spectralis seed` or `spectralis init` copies the payload to a destination
- **THEN** no `opsx-*.md` commands or `openspec-*.md` skills are copied

### Requirement: Single-dir changes resolution
All commands that read changes (doctor, tdd-check, projects, seed, view) SHALL use `resolveChangesDir()` to resolve a single changes directory. The dual-read window (reading both `spec/` and `openspec/changes/`) SHALL be retired.

#### Scenario: Commands use single-dir resolution
- **WHEN** `spectralis check --tdd` runs
- **THEN** it reads changes from the directory returned by `resolveChangesDir()` only

#### Scenario: No dual-read in doctor
- **WHEN** `spectralis doctor` runs
- **THEN** it reports on a single changes directory, not both native and legacy
