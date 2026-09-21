# Manuals Directory

This directory contains technical manuals and documentation generated for project components, features, screens, and functionalities.

## Rules

- **Format**: Only `.md` (Markdown) files are allowed in this directory
- **Naming**: Use `kebab-case` for file names (e.g., `login-flow.md`, `payment-module.md`)
- **Language**: All documentation must be written in English
- **Source**: Manuals are generated using Graphify knowledge graph queries

## File Naming Convention

```
<component-or-feature-name>.md
```

Examples:
- `user-authentication.md`
- `payment-processing.md`
- `admin-dashboard.md`
- `catalog-management.md`

## Generating Manuals

When a user requests documentation about how a component or feature works:

1. Use `graphify query` to gather information from the knowledge graph
2. Use `graphify path` to trace relationships between components
3. Use `graphify explain` for detailed concept explanations
4. Create the manual in this directory following the naming convention
5. Ensure the content is in Markdown format only

## Index

| Manual | Description |
|--------|-------------|
| [Git Workflow Requests](git-workflow.md) | How to request branches, commits, pull requests, and releases |
| [Spec-from-Note Workflow](spec-from-note-workflow.md) | How Obsidian requirement notes become OpenSpec changes and specs |
