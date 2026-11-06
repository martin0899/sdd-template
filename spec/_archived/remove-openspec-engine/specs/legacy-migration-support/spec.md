## Purpose

Provides migration-only support for legacy openspec installations. The system retains the ability to detect legacy projects (via `openspec/` directory marker), ignore the legacy directory in gitignore, and read legacy changes for migration purposes only. All other functionality treats the legacy layout as absent.

## ADDED Requirements

### Requirement: Legacy detection marker preserved
`src/core/config.ts` SHALL retain the detection logic that checks for the existence of `openspec/` directory to identify legacy projects. This marker is migration-only and SHALL NOT influence engine selection or operational mode.

#### Scenario: Legacy project detection
- **WHEN** `spectralis` checks if a project is legacy
- **THEN** it checks for the existence of `openspec/` directory and reports accordingly

#### Scenario: Detection marker does not affect mode
- **WHEN** a project has `openspec/` directory
- **THEN** the system still operates in native mode; the marker is informational only

### Requirement: Gitignore preserves openspec/ pattern
`src/core/gitignore.ts` SHALL retain `openspec/` in the gitignore patterns. This is for legacy installations that still have the directory; new installations never create it.

#### Scenario: Gitignore includes openspec/
- **WHEN** `spectralis` generates or updates `.gitignore`
- **THEN** the pattern `openspec/` is included

#### Scenario: New installations do not create openspec/
- **WHEN** a user runs `spectralis init` on a fresh directory
- **THEN** no `openspec/` directory is created, even though `.gitignore` contains the pattern

### Requirement: Spec-migrate reads legacy changes directly
`src/commands/spec-migrate.ts` SHALL contain a direct reader for `openspec/changes/` (either inline or via a dedicated legacy reader module). This reader is migration-specific and SHALL NOT be used by any other command.

#### Scenario: Migrate reads legacy layout
- **WHEN** a user runs `spectralis spec migrate`
- **THEN** it reads changes from `openspec/changes/` and moves them to the native `spec/` layout

#### Scenario: Legacy reader is migration-only
- **WHEN** any command other than `spec-migrate` runs
- **THEN** it does not read from `openspec/changes/` via the legacy reader

### Requirement: No dual-read window in operational commands
Commands that report on or operate against changes (doctor, tdd-check, projects, seed, view, status, validate, archive) SHALL NOT read from `openspec/changes/`. They SHALL use `resolveChangesDir()` to resolve the native changes directory only.

#### Scenario: Check --tdd uses native dir only
- **WHEN** `spectralis check --tdd` runs on a project with both `spec/` and `openspec/changes/`
- **THEN** it reports on changes in `spec/` only, ignoring `openspec/changes/`

#### Scenario: Doctor uses native dir only
- **WHEN** `spectralis doctor` runs on a project with both `spec/` and `openspec/changes/`
- **THEN** it reports on the native changes directory, not the legacy one
