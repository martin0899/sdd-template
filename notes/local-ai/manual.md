# Local AI Guide (Ollama) — Low-Demand Tasks

This guide is part of the SDD template. Its recommendation assumes machines with **limited RAM**: large AI models do not fit comfortably in memory, so full power is reserved for the cloud model and local models cover only simple tasks.

## General Recommendation

| Task type | Where to run it |
|-----------|-----------------|
| Complex tasks (deep reasoning, large refactors, specs) | Cloud model (primary agent) |
| Low-demand tasks (classify, summarize, rename, format, simple queries) | Local model via Ollama |

## Suggested Models for Limited RAM

| Model | Approx. size | Typical use |
|-------|--------------|-------------|
| `qwen3.5:4b` | ~2.5 GB | General, good balance (recommended, newer) |
| `qwen2.5:3b` | ~2 GB | General, good balance (legacy) |
| `llama3.2:3b` | ~2 GB | General, conversation |
| `phi3:mini` | ~2 GB | Summaries and classification |
| `smollm2:1.7b` | ~1 GB | Very limited machines |

Rule of thumb: **do not exceed ~4 GB of RAM for the local model** on 8-16 GB machines, to leave room for the rest of the environment.

## Concrete Example: tareas-baja Agent

The SDD template includes a concrete example of a local model agent: `tareas-baja` (low-demand tasks). This agent handles routine operations like:
- Reading and parsing notes
- Simple grep searches
- Basic formatting tasks
- Low-complexity classifications

**Configuration** (in `~/.config/opencode/agents/tareas-baja.md`):
```yaml
model: ollama/qwen3.5:4b
mode: subagent
```

The model override is registered in `opencode.jsonc`:
```json
{
  "agents": {
    "tareas-baja": {
      "model": "ollama/qwen3.5:4b"
    }
  }
}
```

This pattern demonstrates how to create specialized agents for low-demand tasks using local models, reserving cloud models for complex reasoning and deep analysis.

## Setup

1. Install Ollama following the official project documentation.
2. Pull the chosen model:
   ```bash
   ollama pull qwen3.5:4b
   ```
3. Verify it responds:
   ```bash
   ollama run qwen3.5:4b "Summarize this text in one line: ..."
   ```

## Registering the Model in the Project

During onboarding (`sdd-onboard-project`), the local model is asked. With user confirmation, a line like the following is appended to the `context` field of `openspec/config.yaml`:

```yaml
  Local AI (Ollama): qwen3.5:4b for low-demand tasks; use cloud for complex tasks.
```

Each project registers the model that suits it; this file is the reference guide, not the active configuration.

## Notes

- Skill mirrors for other agents (`npx skills` for Claude Code) may cause lightweight local agents to consume these skills; use them consciously with small local models.
- If you change models, update the line in the corresponding project's `openspec/config.yaml`.
