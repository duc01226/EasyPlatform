# GitHub Copilot Features Catalog

Complete catalog of GitHub Copilot customization features (as of 2026).

## Configuration Files

### Repository-Level (`.github/`)

| File/Folder | Purpose | Format |
|-------------|---------|--------|
| `copilot-instructions.md` | Global instructions for all Copilot interactions | Markdown |
| `instructions/*.instructions.md` | Path-scoped instructions with `applyTo` frontmatter | Markdown + YAML |
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

### Custom Instructions (`copilot-instructions.md`)

Root instructions auto-included in every request.
```markdown
# Project Guidelines
- Use TypeScript for all new files
- Follow BEM naming for CSS classes
```

### Path-Scoped Instructions (`.github/instructions/`)

Apply to specific file patterns via `applyTo`:
```yaml
---
applyTo: "src/Services/**/*.cs"
excludeAgent: ["code-review"] # Optional: exclude specific agents
---
# Backend C# Guidelines
Use PlatformValidationResult for validation...
```

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
