## Purpose

Defines the retired-marking behavior for `openspec/config.yaml` in existing installations. The file is never written or read by the system; existing copies are marked as 'retired' so that `update --prune` cleans them. This follows the precedent from lean-harness-payload.

## ADDED Requirements

### Requirement: openspec/config.yaml never written
The system SHALL NOT write `openspec/config.yaml` during init, seed, or any other operation. The spanish-context section SHALL be written to `spec/config.yaml` only.

#### Scenario: Init writes native config only
- **WHEN** a user runs `spectralis init`
- **THEN** `spec/config.yaml` is created with the spanish-context section; no `openspec/config.yaml` is written

#### Scenario: Seed does not write legacy config
- **WHEN** `spectralis seed` copies payload to a destination
- **THEN** no `openspec/config.yaml` is created

### Requirement: openspec/config.yaml never read
The system SHALL NOT read `openspec/config.yaml` for any operational purpose. Spanish-context detection SHALL check `spec/config.yaml` only.

#### Scenario: Post-checks read native config only
- **WHEN** `spectralis` runs post-checks after init or apply
- **THEN** it checks for spanish-context in `spec/config.yaml` only, not `openspec/config.yaml`

#### Scenario: Spanish-context injection targets native config
- **WHEN** spanish-context is injected during init
- **THEN** it is appended to `spec/config.yaml`, not `openspec/config.yaml`

### Requirement: Retired-marking for existing installs
`src/commands/update.ts` and `src/core/classify-update.ts` SHALL treat `openspec/config.yaml` as a retired file. When present in an existing installation, it SHALL be marked as 'retired' so that `update --prune` removes it.

#### Scenario: Update classifies legacy config as retired
- **WHEN** `spectralis update` runs on a project with `openspec/config.yaml`
- **THEN** the file is classified as retired (not as a manifest special path)

#### Scenario: Update --prune removes retired legacy config
- **WHEN** a user runs `spectralis update --prune` on a project with `openspec/config.yaml`
- **THEN** the file is removed

### Requirement: copy-payload does not list legacy config
`src/core/copy-payload.ts` SHALL NOT include `openspec/config.yaml` in the list of files to copy or manage.

#### Scenario: Copy-payload excludes legacy config
- **WHEN** `spectralis seed` or `spectralis init` copies payload
- **THEN** `openspec/config.yaml` is not in the list of files copied

### Requirement: openspec/specs/ kept as historical archive
The `openspec/specs/` directory (gitignored) SHALL be preserved as a historical archive. The system SHALL NOT read from or write to it. Pending F1-F4 archives are voided and SHALL NOT be processed.

#### Scenario: Historical specs directory preserved
- **WHEN** a project has `openspec/specs/` from a previous installation
- **THEN** the directory remains on disk (gitignored) but is not read or written by the system

#### Scenario: Pending archives voided
- **WHEN** F1-F4 changes have pending archives in `openspec/changes/`
- **THEN** they are not processed; the F5 change stands alone as the final-state description
