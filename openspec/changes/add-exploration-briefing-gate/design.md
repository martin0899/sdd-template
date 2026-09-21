# Design: add-exploration-briefing-gate

## Context

Explorations end when the agent jumps from insight to `openspec new change` without a checkpoint. The vendor-managed `openspec-explore` skill (`.opencode/skills/openspec-explore/SKILL.md`) already instructs agents to ask before writing, but it is updated/replaced by the OpenSpec CLI, so project-specific gate behavior cannot live there. The project's strongest always-on enforcement channel is the managed rules block in `AGENTS.md` (same channel as the existing "ALWAYS use graphify first" rule).

## Goals / Non-Goals

- **Goals**: a briefing checkpoint that fires automatically (no invocation) at exploration close; one canonical place defining the briefing protocol; distribution to installed destinations via the existing payload.
- **Non-Goals**: modifying vendor skills; enforcing the gate with code (hooks/plugins are out of scope — the template's project-local policy forbids shipping opencode plugins); gating non-explore work (routine Q&A, apply, archive).

## Decisions

- **Rule in AGENTS.md as the activation channel (always-on), skill as the protocol body.**
  - Why: AGENTS.md is loaded automatically by opencode and other agents; a skill alone only fires on trigger match. Mirrors the proven graphify-first pattern.
  - Alternative considered: only a skill — rejected because activation would depend on trigger matching, exactly the failure mode the user wants to avoid.
- **Skill name: `exploration-briefing`** in `.agents/skills/exploration-briefing/SKILL.md`.
  - Contains: briefing structure (decisions/findings/questions/scope), the confirmation question format, and the no-write-until-yes rule.
  - Alternative: `sdd-briefing` — rejected, ambiguous about when it applies.
- **Rule wording lives in the template's `AGENTS.md`** (canonical source), so the installer's managed-block refresh distributes it to destinations. The rule is short (2-3 lines) and points to the skill for detail.
- **No mechanical enforcement.** Hooks/plugins are excluded by the project's no-plugins policy; the gate relies on rule adherence like every other AGENTS.md rule. Honest limitation documented in Risks.

## Risks / Trade-offs

- [LLM may ignore the rule on some sessions] → Mitigation: keep the rule short and imperative, co-located with the graphify rule that already shows high adherence; skill adds a second retrieval path.
- [Rule bloat in AGENTS.md] → Mitigation: 2-3 lines max in the managed block; protocol detail lives in the skill.
- [Gate friction for small changes] → Mitigation: the spec scopes the gate to exploration close / move-to-change moments, not routine interaction.

## Migration Plan

1. Add skill + INDEX row + AGENTS.md rule (single change, no data migration).
2. Rollback: remove the rule line and skill folder; no other artifacts depend on it.

## Open Questions

- None. Wording of the rule/skill is settled during tasks/apply.
