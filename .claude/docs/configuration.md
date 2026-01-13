# Configuration Reference

> Complete guide to all Claude Code configuration files.

## Configuration Files Overview

| File | Purpose | User Editable |
|------|---------|---------------|
| `settings.json` | Hook registration, permissions, plugins | Yes |
| `.ck.json` | Project preferences, assertions, plan settings | Yes |
| `.mcp.json` | MCP server configurations | Yes |
| `workflows.json` | Workflow definitions and triggers | Yes |
| `.todo-state.json` | Current todo list (runtime) | No |
| `.workflow-state.json` | Workflow execution state (runtime) | No |
| `.edit-state.json` | Edit count tracking (runtime) | No |
| `metadata.json` | Kit installation tracking (auto-generated) | No |
| `memory/deltas.json` | ACE approved playbook deltas | No |
| `memory/delta-candidates.json` | ACE pending candidates | No |

## settings.json

Main Claude Code configuration for hooks, permissions, and plugins.

### Schema

```json
{
  "cleanupPeriodDays": 30,
  "env": {
    "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": "1"
  },
  "attribution": {
    "commit": "Generated with [Claude Code](https://claude.com/claude-code)",
    "pr": "Generated with [Claude Code](https://claude.com/claude-code)"
  },
  "includeCoAuthoredBy": false,
  "permissions": { ... },
  "hooks": { ... },
  "statusLine": { ... },
  "enabledPlugins": { ... },
  "alwaysThinkingEnabled": true
}
```

### Permissions Section

Controls tool access with allow/deny/ask lists.

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",        // Allow git commands
      "Bash(npm:*)",        // Allow npm commands
      "Edit",               // Allow file editing
      "Read",               // Allow file reading
      "mcp__*"              // Allow MCP tools
    ],
    "deny": [
      "Bash(rm -rf /*)",    // Block dangerous commands
      "Edit(**/.env*)",     // Block editing secrets
      "Read(**/secrets/**)" // Block reading secrets
    ],
    "ask": [
      "Bash(git push:*)",   // Prompt before push
      "Bash(npm publish:*)" // Prompt before publish
    ],
    "defaultMode": "bypassPermissions"
  }
}
```

**Permission Patterns:**
- `Tool(pattern)` - Match specific tool with glob pattern
- `Tool` - Match all uses of tool
- `*` - Wildcard in patterns

### Hooks Section

Register hooks for lifecycle events. See [Hooks Documentation](hooks/README.md).

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/hook-name.cjs"
          }
        ]
      }
    ]
  }
}
```

**Events:** SessionStart, SubagentStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SessionEnd, Notification

### Plugins Section

Enable/disable official Claude Code plugins.

```json
{
  "enabledPlugins": {
    "code-review@claude-plugins-official": true,
    "commit-commands@claude-plugins-official": true,
    "csharp-lsp@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "github@claude-plugins-official": true,
    "playwright@claude-plugins-official": false,
    "typescript-lsp@claude-plugins-official": true,
    "code-simplifier@claude-plugins-official": true
  }
}
```

### Status Line

Custom status line command.

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/statusline.cjs",
    "padding": 0
  }
}
```

---

## .ck.json (Claude Kit Config)

Project-specific preferences and assertions.

### Schema

```json
{
  "codingLevel": 4,
  "privacyBlock": true,
  "plan": {
    "namingFormat": "{date}-{issue}-{slug}",
    "dateFormat": "YYMMDD-HHmm",
    "issuePrefix": "GH-",
    "reportsDir": "reports",
    "resolution": {
      "order": ["session", "branch"],
      "branchPattern": "(?:feat|fix|chore|refactor|docs)/(?:[^/]+/)?(.+)"
    },
    "validation": {
      "mode": "prompt",
      "minQuestions": 3,
      "maxQuestions": 8,
      "focusAreas": ["assumptions", "risks", "tradeoffs", "architecture"]
    }
  },
  "paths": {
    "docs": "docs",
    "plans": "plans"
  },
  "locale": {
    "thinkingLanguage": null,
    "responseLanguage": null
  },
  "trust": {
    "passphrase": null,
    "enabled": false
  },
  "project": {
    "type": "auto",
    "packageManager": "auto",
    "framework": "auto"
  },
  "assertions": [
    "This is a .NET 9 + Angular 19 enterprise monorepo",
    "Backend: Use PlatformValidationResult fluent API",
    ...
  ]
}
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `codingLevel` | 1-5 | Communication complexity (1=beginner, 5=expert) |
| `privacyBlock` | bool | Enable privacy-block.cjs hook |
| `plan.namingFormat` | string | Plan directory naming template |
| `plan.dateFormat` | string | Date format for plan names |
| `plan.validation.mode` | string | "prompt", "auto", or "off" |
| `paths.docs` | string | Documentation directory |
| `paths.plans` | string | Plans directory |
| `locale.thinkingLanguage` | string | Language for internal thinking |
| `locale.responseLanguage` | string | Language for responses |
| `assertions` | string[] | Project rules injected into context |

### Assertions

Assertions are project-specific rules injected into every session. Use for:
- Framework conventions
- Coding standards
- Architecture decisions
- Anti-patterns to avoid

---

## .mcp.json (MCP Servers)

Configure Model Context Protocol servers.

### Schema

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/server"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

### Example Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

---

## workflows.json

Define workflow automation with intent detection.

### Schema

```json
{
  "$schema": "./workflows.schema.json",
  "version": "1.2.0",
  "description": "Workflow configuration",
  "settings": {
    "enabled": true,
    "showDetection": true,
    "allowOverride": true,
    "overridePrefix": "quick:",
    "confirmHighImpact": true,
    "supportedLanguages": ["en", "vi", "zh", "ja", "ko"],
    "checkpoints": {
      "enabled": true,
      "intervalMinutes": 30,
      "path": "plans/reports",
      "autoSaveOnCompact": true
    }
  },
  "commandMapping": {
    "cook": {
      "claude": "/cook",
      "copilot": "@workspace /cook"
    }
  },
  "workflows": { ... }
}
```

### Workflow Definition

```json
{
  "workflows": {
    "feature": {
      "name": "Feature Implementation",
      "description": "Full feature development workflow",
      "priority": 10,
      "confirmFirst": true,
      "enableCheckpoints": true,
      "sequence": ["plan", "cook", "code-simplifier", "code-review", "test", "docs-update", "watzup"],
      "triggerPatterns": [
        "\\b(implement|add|create)\\b.*\\b(feature|functionality)\\b",
        "(thêm|tạo).*(tính năng|chức năng)"
      ],
      "excludePatterns": [
        "\\b(fix|bug|error)\\b"
      ]
    }
  }
}
```

### Workflow Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Display name |
| `description` | string | What the workflow does |
| `priority` | number | Lower = higher priority (checked first) |
| `confirmFirst` | bool | Ask before starting |
| `enableCheckpoints` | bool | Save progress checkpoints |
| `sequence` | string[] | Steps to execute in order |
| `triggerPatterns` | regex[] | Patterns that trigger this workflow |
| `excludePatterns` | regex[] | Patterns that prevent this workflow |

### Built-in Workflows

| Workflow | Priority | Sequence |
|----------|----------|----------|
| `feature` | 10 | plan → cook → simplify → review → test → docs → watzup |
| `bugfix` | 20 | scout → investigate → debug → plan → fix → simplify → review → test |
| `refactor` | 25 | plan → code → simplify → review → test |
| `documentation` | 30 | scout → investigate → docs-update → watzup |
| `review` | 35 | code-review → watzup |
| `testing` | 40 | test |
| `investigation` | 50 | scout → investigate |

---

## Runtime State Files

These files are managed by hooks - do not edit manually.

### .todo-state.json

Current todo list state.

```json
{
  "todos": [
    {
      "content": "Task description",
      "status": "in_progress",
      "activeForm": "Working on task"
    }
  ],
  "updatedAt": "2026-01-13T10:00:00.000Z"
}
```

### .workflow-state.json

Current workflow execution state.

```json
{
  "activeWorkflow": "feature",
  "currentStep": 2,
  "sequence": ["plan", "cook", "test"],
  "startedAt": "2026-01-13T10:00:00.000Z",
  "controls": {
    "paused": false,
    "skip": false
  }
}
```

### .edit-state.json

Track file edits for context-aware hooks.

```json
{
  "editCount": 5,
  "lastEditTime": "2026-01-13T10:00:00.000Z",
  "files": ["src/app.ts", "src/index.ts"]
}
```

---

## Memory Files

ACE system data storage. See [ACE Documentation](hooks/ace/README.md).

### memory/deltas.json

Approved playbook modifications.

```json
{
  "deltas": [
    {
      "id": "delta-001",
      "playbook_id": "pb-123",
      "delta_type": "refinement",
      "content": "Updated pattern for...",
      "confidence": 0.85,
      "approved_at": "2026-01-13T10:00:00.000Z"
    }
  ]
}
```

### memory/delta-candidates.json

Pending candidates awaiting approval.

```json
{
  "candidates": [
    {
      "id": "cand-001",
      "source_event": "Skill:cook",
      "suggested_delta": "...",
      "votes": { "helpful": 2, "unhelpful": 0 },
      "created_at": "2026-01-13T10:00:00.000Z"
    }
  ]
}
```

---

## Environment Variables

Variables available to hooks via `%VAR%` (Windows) or `$VAR` (Unix):

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Project root directory |
| `CLAUDE_SESSION_ID` | Current session identifier |
| `CLAUDE_COMPACT_REASON` | Why compact triggered ("manual"/"auto") |
| `CLAUDE_TOOL_NAME` | Current tool being executed |
| `CLAUDE_SUBAGENT_TYPE` | Type of subagent if applicable |

---

## Best Practices

### 1. Permission Configuration

```json
{
  "permissions": {
    "deny": [
      "Edit(**/.env*)",
      "Read(**/secrets/**)"
    ]
  }
}
```

Always deny access to sensitive files.

### 2. Assertion Usage

```json
{
  "assertions": [
    "Use TypeScript strict mode",
    "Follow BEM naming for CSS",
    "Never use any type"
  ]
}
```

Keep assertions concise and actionable.

### 3. Workflow Customization

Add project-specific workflows by extending `workflows.json`:

```json
{
  "workflows": {
    "deploy": {
      "name": "Deployment",
      "priority": 5,
      "sequence": ["test", "build", "deploy"],
      "triggerPatterns": ["\\bdeploy\\b"]
    }
  }
}
```

---

*See also: [Hooks System](hooks/README.md) | [ACE System](hooks/ace/README.md)*

