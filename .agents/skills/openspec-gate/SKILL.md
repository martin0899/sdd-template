---
name: openspec-gate
description: Gatekeeper skill that enforces OpenSpec workflow for all requirement-related work. Use BEFORE implementing any code change, feature, or fix. Verifies that an active OpenSpec change exists with updated tasks.md. If no change exists, routes to requirements-discovery or openspec-propose.
---

# openspec-gate

Gatekeeper that enforces OpenSpec workflow for all requirement-related work. **Blocks implementation until OpenSpec conditions are met.**

## When to Use

- Before implementing any new feature, bug fix, or modification
- When the user asks to "build", "fix", "add", "modify", "implement", or "change" something
- When about to write code that would produce a deliverable
- As a pre-flight check before any non-trivial code change

## Gate Check Process

### Step 1: Determine if this is a requirement

The request IS a requirement if it involves:
- New feature or functionality
- Bug fix that changes behavior
- Modification to existing functionality
- Change that affects system behavior, UI, API, or database
- Any work that would produce a deliverable

The request is NOT a requirement if it is:
- Pure refactoring with no behavior change
- Documentation-only updates
- Configuration changes that don't affect behavior
- Code exploration or understanding (read-only)

### Step 2: Check for active OpenSpec change

Run the following checks:

```bash
openspec list --json
```

Verify:
1. At least one change exists with status "in-progress" or "complete"
2. The change name relates to the current request

If no change exists → BLOCK and route to OpenSpec workflow.

### Step 3: Verify tasks.md exists and is current

For the active change, check:
1. `tasks.md` exists in the change directory
2. Tasks are marked with status (pending/in-progress/completed)
3. At least one task is "in-progress" or "pending" (not all completed)

If tasks.md is missing or incomplete → BLOCK and create/update tasks.

### Step 4: Verify specs are synchronized

Check that the specs in the change match what is being implemented:
1. `specs/` directory exists in the change
2. Spec files cover the functionality being implemented
3. No major gaps between specs and implementation plan

If specs are missing or incomplete → BLOCK and complete specs first.

## Gate Outcomes

### PASS - Allow implementation

All conditions met:
- Active OpenSpec change exists
- tasks.md is present and current
- Specs cover the implementation

Proceed with implementation.

### BLOCK - Route to OpenSpec

One or more conditions failed:
- No active change → Route to `openspec-propose` or `requirements-discovery`
- tasks.md missing → Create tasks.md from specs
- Specs incomplete → Complete specs before implementing

**BLOCK message format:**

```
+----------------------------------------------------------+
| GATE BLOCKED: <reason>                                    |
+----------------------------------------------------------+
| Active change: <change-name or "NONE">                    |
| Tasks status: <current state>                             |
| Specs status: <current state>                             |
|                                                          |
| Required action: <specific step needed>                   |
|                                                          |
| Suggested next step:                                      |
|   - If no change: Run openspec-propose or                 |
|     requirements-discovery                                |
|   - If tasks missing: Create tasks.md from specs          |
|   - If specs incomplete: Complete specs first             |
+----------------------------------------------------------+
```

## Integration with Other Skills

### From requirements-discovery

When `requirements-discovery` completes and hands off to `spec-from-note`, the gate verifies:
- The requirement note exists
- A change was created from the note
- Tasks were generated from the specs

### From spec-from-note

When `spec-from-note` completes, the gate verifies:
- Changes were created for each activity
- Each change has proposal.md, design.md, specs, and tasks.md
- Tasks are in "pending" or "in-progress" state

### From openspec-propose

When `openspec-propose` completes, the gate verifies:
- All artifacts exist (proposal.md, specs, design.md, tasks.md)
- Tasks cover the implementation scope
- No blocking questions remain open

## Enforcement Rules

1. **Never bypass the gate** — Even if the user says "just do it quickly", the gate must pass before implementation.
2. **Tasks are mandatory** — A change without tasks.md is incomplete. Always create/update tasks.md.
3. **Specs must match implementation** — If implementing a feature, the spec for that feature must exist.
4. **One change per requirement** — Each requirement should map to one or more OpenSpec changes, not ad-hoc code.

## Common Scenarios

### Scenario: User asks to add a new feature

1. Gate checks → No active change
2. Gate blocks → "No active OpenSpec change found"
3. Route → `requirements-discovery` to define the requirement
4. Then → `spec-from-note` to generate OpenSpec artifacts
5. Then → Implementation can proceed

### Scenario: User asks to fix a bug

1. Gate checks → No active change
2. Gate blocks → "No active OpenSpec change found"
3. Route → `openspec-propose` with bug fix description
4. Then → Implementation can proceed

### Scenario: User asks to modify existing behavior

1. Gate checks → Active change exists
2. Gate verifies → tasks.md exists and has pending tasks
3. Gate verifies → Specs cover the modification
4. Gate passes → Implementation can proceed

### Scenario: User asks to implement without mentioning OpenSpec

1. Gate checks → No active change
2. Gate blocks → "Requirement detected but no OpenSpec change exists"
3. Route → Appropriate OpenSpec workflow
4. Explain → "All requirement work must go through OpenSpec for traceability"

## Notes

- This gate is a **soft block** — it informs and routes, but does not permanently prevent work
- The gate should be invoked automatically when the agent detects requirement-like requests
- If the user explicitly says "skip OpenSpec" or "no need for specs", document the exception but still note the requirement in the change
- The gate works in conjunction with the "Mandatory OpenSpec for Requirements" rule in AGENTS.md
