# Proposal: add-exploration-briefing-gate

## Why

OpenSpec explorations currently end when the agent decides to jump straight into `openspec new change` + proposal writing. The user wants a mandatory checkpoint: after an exploration crystallizes, the agent must first produce a **grounded briefing** (decisions made, code findings, open questions) and ask clarifying questions, waiting for explicit user confirmation before creating any change artifacts. This prevents proposals built on incomplete or unconfirmed understanding.

The vendor-managed `openspec-explore` skill cannot be edited (OpenSpec CLI owns it in `.opencode/skills/`), so the gate must be a project-local mechanism.

## What Changes

- Add a project-local skill `.agents/skills/exploration-briefing/SKILL.md` that defines the briefing-gate workflow:
  1. When an exploration crystallizes (or the user asks to proceed), the agent generates a **briefing** before any write: decisions closed (with values), findings from actual code (files/functions cited), open questions, and proposed change scope (name + artifacts).
  2. The agent asks clarifying questions if ambiguity remains; if the exploration is clear, it presents the briefing and asks a direct yes/no: "Generate the proposal?"
  3. No `openspec new change` or artifact write happens until the user explicitly confirms.
- Register the skill in `.agents/skills/INDEX.md` (trigger: closing an OpenSpec exploration, "briefing", "resumen de exploración", or before any `openspec new change` after an explore session).
- Reference the gate from the project's agent rules in `AGENTS.md` (managed block): explorations must pass the briefing gate before proposal creation.
- Respects base-standards: briefings are user interactions (Spanish); any captured artifacts remain English.

## Capabilities

### New Capabilities

- `exploration-briefing-gate`: Mandatory briefing-before-proposal checkpoint for OpenSpec explorations: the agent produces a code-grounded briefing with clarifying questions and waits for explicit user confirmation before scaffolding a change (`openspec new change`) or writing any artifact.

### Modified Capabilities

- (none — no existing spec describes exploration workflow behavior)

## Impact

- **New files**: `.agents/skills/exploration-briefing/SKILL.md` (frontmatter: `name`, `description`, `author`, `version`).
- **Edited files**: `.agents/skills/INDEX.md` (one row), `AGENTS.md` (managed-block rule addition; refresh via the installer's managed-block mechanism on next `--update`).
- **No code changes**: this is a process/workflow capability (skill + docs). Per OpenSpec semantics this change DOES declare a capability because agent behavior (a spec-level workflow requirement) changes.
- **Distribution**: travels to destination projects via the existing installer payload (`.agents/skills/` ships whole).
