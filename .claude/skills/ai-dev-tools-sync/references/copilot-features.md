# GitHub Copilot Features Catalog

Complete catalog of GitHub Copilot customization features (as of 2026).

## Configuration Files

### Repository-Level (`.github/`)

| File/Folder | Purpose | Format |
|-------------|---------|--------|
| `common.copilot-instructions.md` | Generic AI rules (all Copilot interactions) | Markdown |
| `workspace.copilot-instructions.md` | Project-specific instructions | Markdown |
| `prompts/*.prompt.md` | Reusable prompts (slash commands) | Markdown + YAML |
| `agents/*.md` | Agent definitions | Markdown + YAML |
| `skills/*/SKILL.md` | Agent skills with bundled resources | Markdown + YAML |
| `chatmodes/*.chatmode.md` | Custom chat personalities | Markdown + YAML |
| `AGENTS.md` | Master agent routing file | Markdown |

### Also Supported (Backward Compatibility)

- `.claude/skills/` - Copilot auto-reads Claude skills
- `CLAUDE.md` - Copilot reads if present
- `GEMINI.md` - Gemini CLI format

## Feature Details

### Custom Instructions (split into two files)

**`common.copilot-instructions.md`** — Generic AI rules (confirm-before-execute, task planning, evidence-based reasoning). Auto-included in every request.

**`workspace.copilot-instructions.md`** — Project-specific rules (architecture, patterns, file locations, naming conventions). Auto-included in every request.

```markdown
# Project Guidelines
- Use TypeScript for all new files
- Follow BEM naming for CSS classes
```

> **Note:** The monolithic `copilot-instructions.md` and `instructions/*.instructions.md` approach has been replaced with the common + workspace split. Path-scoped instructions are now handled via `docs/` reference docs + auto-injecting hooks.

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
tools: ["read", "grep", "glob"] # Restrict tools
---
# Security Review Mode
Focus only on security vulnerabilities...
```

### Agents (`.github/agents/`)

Specialized agent definitions:
```yaml
---
name: frontend-developer
description: UI/UX implementation specialist
---
# Frontend Developer Agent
Specializes in React, TypeScript, CSS...
```

## Sources

- [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- [Custom Instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Awesome Copilot](https://github.com/github/awesome-copilot)
