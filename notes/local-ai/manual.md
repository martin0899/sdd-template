# Local AI Guide

The SDD harness does not ship, require or configure a local model runtime: the
primary agent works with the model configured for your machine, and every
low-demand task in the harness is covered by deterministic tooling (`spectralis
distill`, `spectralis wiki-search`, the `skills` index).

This stub stays published because the `notes` command syncs one manual per topic
to the second brain. Read these two manuals instead:

- **Code knowledge graph** — `graphify-out/`: build it with `graphify update .` and
  query it with `graphify query "<question>"`, `graphify path "<A>" "<B>"` or
  `graphify explain "<concept>"` (see the `graphify-usage` skill).
- **Brain manuals** — `03_Recursos/02_Sistemas_info/`: the canonical manuals of the
  second brain, synced with `spectralis notes sync`.
