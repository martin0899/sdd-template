# Spec: exploration-briefing-gate

## ADDED Requirements

### Requirement: Proactive Briefing at Exploration Close

When an OpenSpec exploration session crystallizes (decisions emerge, or the user signals intent to proceed toward a change), the agent SHALL produce a briefing in the chat proactively, without waiting for the user to request it.

#### Scenario: Briefing shown without explicit request

- **WHEN** an exploration session reaches a state where the user asks to continue, proceed, or capture the work
- **THEN** the agent presents a briefing in the chat before any scaffold or artifact write occurs
- **AND** the agent does not wait for the user to ask for the briefing

#### Scenario: Briefing content

- **WHEN** the briefing is presented
- **THEN** it includes: closed decisions (with chosen values), code-grounded findings (files/functions referenced from the actual codebase), open questions (if any), and the proposed change scope (change name and artifacts to create)
- **AND** it is written in Spanish for the chat interaction per language standards

### Requirement: Clarifying Questions Before Capture

When ambiguity remains after exploration, the agent SHALL ask clarifying questions in the briefing before requesting confirmation to create artifacts.

#### Scenario: Ambiguous exploration

- **WHEN** one or more material decisions are still unresolved
- **THEN** the briefing lists those questions explicitly
- **AND** the agent waits for answers instead of scaffolding a change

#### Scenario: Clear exploration

- **WHEN** no material ambiguity remains
- **THEN** the briefing states that the exploration is clear and requests a direct yes/no confirmation to create the change

### Requirement: Confirmation Gate Before Change Creation

The agent SHALL NOT run `openspec new change` or write any OpenSpec change artifact until the user explicitly confirms the briefing.

#### Scenario: Confirmation required

- **WHEN** the briefing is presented and no confirmation has been received
- **THEN** the agent performs no write-capable action (no change scaffold, no artifact files)

#### Scenario: Explicit confirmation proceeds

- **WHEN** the user replies with explicit confirmation to the briefing question
- **THEN** the agent scaffolds the change (via `openspec new change`) and creates only the artifacts included in the confirmed scope

#### Scenario: Scope expansion needs re-confirmation

- **WHEN** after confirmation the agent identifies an additional artifact or capability not covered by the confirmed scope
- **THEN** the agent names the new scope and asks again before writing it

### Requirement: Rule-Based Activation Without Invocation

The briefing gate SHALL be enforced through a project agent rule (AGENTS.md) that applies automatically in every session, so that the gate does not depend on the user or agent explicitly invoking a skill.

#### Scenario: Automatic enforcement

- **WHEN** an agent session has AGENTS.md loaded (default for supported agents)
- **THEN** the briefing-gate rule is active without any manual invocation
- **AND** the detailed briefing protocol is available as a project skill for agents that load it
