## 1. Manifest and Payload Inventory

- [x] 1.1 Define the `.sdd-manifest.json` schema with template version, source, timestamp, managed paths, hashes, and exclusions; verify it can represent a fresh install and an update.
- [x] 1.2 Generate the managed payload inventory from the canonical template sources; verify excluded paths such as `openspec/changes/`, `graphify-out/`, secrets, and generated artifacts are absent.
- [x] 1.3 Add backward-compatible detection for destinations without a manifest using existing SDD markers; verify an old installed project is classified as an update with limited confidence.

## 2. Update Recognition and Comparison

- [x] 2.1 Add the explicit update command or flag to the installer argument parser and usage output; verify invalid combinations fail before writing.
- [x] 2.2 Implement hash-based classification for new, unchanged, updateable, customized/conflicting, and retired paths; verify each classification with fixture directories.
- [x] 2.3 Extend the pre-write recognition report to show installed state, template source/version, and per-file actions; verify recognition leaves a destination byte-for-byte unchanged.
- [x] 2.4 Extend `--dry-run` to display the complete update plan without creating backups, manifests, or destination changes; verify with a clean destination and a customized destination.

## 3. Safe Selective Application

- [x] 3.1 Reuse the dated backup mechanism for accepted replacements and preserve relative paths; verify every replaced existing file has a recoverable backup before its content changes.
- [x] 3.2 Implement per-file decisions for update, keep, exclude, and retired entries; verify customized files remain unchanged when the user keeps them.
- [x] 3.3 Protect sensitive, local, and generated paths from generic confirmation; verify `.env`, local configuration, build output, and graph output never enter the executable update set.
- [x] 3.4 Apply accepted changes incrementally and report partial failure without deleting existing backups; verify a simulated copy failure leaves a recoverable state.

## 4. Managed File Merges and Metadata

- [x] 4.1 Make `AGENTS.md` and `openspec/config.yaml` updates marker-aware and idempotent while preserving destination content; verify repeated updates do not duplicate managed blocks.
- [x] 4.2 Add manifest creation/update only after a confirmed successful or explicitly partial synchronization; verify the manifest records hashes for the resulting managed files.
- [x] 4.3 Treat retired template paths as report-only by default and require a separate explicit decision before removal; verify retired files are never deleted by a generic update confirmation.

## 5. Verification and Documentation

- [x] 5.1 Add automated tests for fresh install, legacy destination, clean update, customized conflict, dry-run, sensitive exclusions, interruption, and idempotent rerun; verify the test suite passes.
- [x] 5.2 Add post-update checks for expected skills, commands, definitions, documentation, agent rules, and manifest integrity; verify the report distinguishes updated, preserved, skipped, and backed-up files.
- [x] 5.3 Update `README.md`, the manual installation guide, and the Git/configuration workflow documentation with update and rollback instructions; verify all commands and flags match the installer usage output.
- [x] 5.4 Run `openspec validate "sync-project-agent-config" --type change --strict` and the full relevant test suite; verify the change is ready for `/opsx-apply`.
