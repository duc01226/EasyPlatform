# GitHub Copilot Features Catalog

Complete catalog of GitHub Copilot customization features (as of 2026).

## Configuration Files

### Repository-Level (`.github/`)

| File/Folder                      | Purpose                                     | Format          |
| -------------------------------- | ------------------------------------------- | --------------- |
| `copilot-instructions.md`        | Generic AI rules (all Copilot interactions) | Markdown        |
| `instructions/*.instructions.md` | Path-specific instructions                  | Markdown        |
| `prompts/*.prompt.md`            | Reusable prompts (slash commands)           | Markdown + YAML |
| `agents/*.agent.md`              | Agent definitions (repo-level)              | Markdown + YAML |
| `skills/*/SKILL.md`              | Agent skills with bundled resources         | Markdown + YAML |
| `chatmodes/*.chatmode.md`        | Custom chat personalities                   | Markdown + YAML |
| `AGENTS.md`                      | Master agent routing file                   | Markdown        |

### Also Supported (Backward Compatibility)

- `.claude/skills/` - Copilot auto-reads Claude skills
- `CLAUDE.md` - Copilot reads if present
- `GEMINI.md` - Gemini CLI format

## Feature Details

### Custom Instructions (split into two levels)

**`copilot-instructions.md`** — Generic AI rules (confirm-before-execute, task planning, evidence-based reasoning). Auto-included in every request.

**`instructions/*.instructions.md`** — Path-specific rules (architecture, patterns, file locations, naming conventions). Auto-applied based on `applyTo` glob patterns.

```markdown
# Project Guidelines

- Use TypeScript for all new files
- Follow BEM naming for CSS classes
```

> **Note:** The monolithic `copilot-instructions.md` approach has been replaced with `copilot-instructions.md` (generic) + `instructions/*.instructions.md` (path-specific). Path-scoped instructions use `applyTo` glob patterns in YAML frontmatter.

### Prompts (`.github/prompts/`)

Reusable via `/prompt-name` in chat:

```yaml
---
mode: agent # Optional: agent, chat, edit
---
# Debug this issue
1. Analyze the error
2. Find root cause
3. Propose fix
```

### Agent Skills (`.github/skills/`)

Folder structure with SKILL.md + bundled resources:

```
skills/my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

### Chat Modes (`.github/chatmodes/`)

Custom chat personalities with tool restrictions:

```yaml
---
name: security-reviewer
tools: ['read', 'grep', 'glob'] # Restrict tools
---
# Security Review Mode
Focus only on security vulnerabilities...
```

### Agents (`.github/agents/`)

Specialized agent definitions — `*.agent.md` files with YAML frontmatter (name, description, tools, MCP config). Available in VS Code, Copilot cloud agent, and Copilot CLI (custom agents added to CLI June 2026, with agent picker: Agent mode / Custom agents / Plan mode). User-level agents live in `~/.copilot/agents/`.

```yaml
---
name: frontend-developer
description: UI/UX implementation specialist
---
# Frontend Developer Agent
Specializes in React, TypeScript, CSS...
```

> **This repo's status:** agents are maintained Claude-first in `.claude/agents/` with a generated `.codex/agents/` mirror. No `.github/agents/*.agent.md` surface exists yet — adding one requires a generator (framework-maintainer task), NOT hand-copied files.

## Sources

- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [Custom Instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Awesome Copilot](https://github.com/github/awesome-copilot)
