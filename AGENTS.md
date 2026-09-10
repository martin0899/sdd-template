# AGENTS.md - Coding Guidelines

## Core Development Rules

> **IMPORTANT**: [`docs/base-standards.md`](./docs/base-standards.md) contains the general rules and is the **core of development rules** for this project. Always read and consider it **first** before any task. It takes precedence over all other guidelines.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- **For any code investigation, understanding, or information search, ALWAYS use graphify first** — run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Only skip graphify if the user explicitly says "no uses graphify" or similar in their prompt.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- graphify-out/ is machine-local: NEVER commit it to the repository (the managed .gitignore block excludes it). Rebuild it with `graphify update .` after cloning the project or changing machines — it is regenerable at no API cost. The search instructions above are unaffected by this policy.
