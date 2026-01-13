# AI Workspace

This folder consolidates AI coding assistant artifacts (Claude Code, GitHub Copilot).

## Structure

```
.ai/
├── prompts/             # Shared AI prompt files
│   ├── common.md        # Common prompt patterns and workflows
│   └── context.md       # Platform-specific context and conventions
├── workspace/           # Session working files (gitignored)
│   ├── analysis/        # Investigation & bug diagnosis notes
│   ├── planning/        # Implementation planning documents
│   └── scratch/         # Miscellaneous working notes
└── README.md
```

## Prompts

| File | Purpose |
|------|---------|
| `prompts/common.md` | AI agent prompt library with workflow patterns |
| `prompts/context.md` | Platform coding conventions and patterns |

## Workspace

AI assistants write structured analysis files in `workspace/` during complex tasks.
This directory is **gitignored** - files here are ephemeral session artifacts.

### File Naming

```
.ai/workspace/analysis/{task-type}-{descriptive-name}.md
```

Examples:
- `feature-auth-flow.md`
- `bug-login-timeout.md`
- `refactor-api-handlers.md`
