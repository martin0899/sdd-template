# AGENTS.md - Coding Guidelines

## Core Development Rules
> [`docs/base-standards.md`](./docs/base-standards.md) is the single source of truth. Read it first.

- TypeScript CLI on `node:test`; build to `dist`.
- New skills live in `.agents/skills/<name>/SKILL.md` only.
- Requirement work goes through the native spec flow (skill `openspec-gate`).

## graphify
For any code investigation ALWAYS use graphify first: `graphify query "<question>"`.
Never commit `graphify-out/`; after code changes run `graphify update .`.

## Contrato de roles y ciclo spec (fachada)
- The facade routes the cycle; one active executor per change → skill `subagent-contract`
- Code and language rules → `docs/base-standards.md`; skills → `.agents/skills/INDEX.md`
- Shared cycle rules → skill `agent-rules-contract`

## Obsidian Orchestration
`spectralis config --get obsidianSync` active → skill `obsidian-orchestration`; off → write nothing.

## Lessons
Read `_Notas/_lessons.md` first; log corrections as `- Cuando X, haz Y`. Skill: `lessons`.

## Briefing técnico en la propuesta
Al proponer un cambio (sdd), rellena el briefing del folder note antes de invocar al planificador. Skill: `obsidian-briefing`.
## Secrets → docs/base-standards.md §10
## Context hygiene (DCP) → docs/base-standards.md §11
