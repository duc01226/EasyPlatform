# Settings Reference

> Complete reference for settings.json configuration

## Overview

The `settings.json` file is the primary configuration for Claude Code. It controls permissions, hooks, plugins, and environment settings.

**Location:** `.claude/settings.json`

---

## Schema

```json
{
  "cleanupPeriodDays": 30,
  "env": {},
  "attribution": {},
  "includeCoAuthoredBy": false,
  "permissions": {},
  "hooks": {},
  "statusLine": {},
  "enabledPlugins": {},
  "alwaysThinkingEnabled": true
}
```

---

## Permissions

Control which tools and commands Claude can execute.

### Structure

```json
{
  "permissions": {
    "allow": ["pattern1", "pattern2"],
    "deny": ["pattern3"],
    "ask": ["pattern4"],
    "defaultMode": "default"
  }
}
```

### Permission Modes

| Mode | Behavior |
|------|----------|
| `allow` | Auto-approved without prompting |
| `deny` | Blocked completely |
| `ask` | Prompts user for approval |
| `default` | Uses Claude Code defaults |

### Pattern Syntax

```
Tool(command:*)      # Wildcard matching
Tool(exact-command)  # Exact matching
Tool(**/path/**)     # Glob patterns for files
```

### Common Patterns

**Bash Commands:**
```json
{
  "allow": [
    "Bash(git:*)",           // All git commands
    "Bash(npm:*)",           // All npm commands
    "Bash(dotnet:*)",        // All dotnet commands
    "Bash(nx:*)",            // All nx commands
    "Bash(node:*)",          // All node commands
    "Bash(ls:*)",            // Directory listing
    "Bash(find:*)",          // File finding
    "Bash(grep:*)",          // Text searching
    "Bash(mkdir:*)",         // Create directories
    "Bash(cp:*)",            // Copy files
    "Bash(mv:*)"             // Move files
  ],
  "deny": [
    "Bash(rm -rf /*)",       // Dangerous recursive delete
    "Bash(rm -rf ~/*)",      // Home directory wipe
    "Bash(git push --force:*)", // Force push
    "Bash(git reset --hard:*)"  // Hard reset
  ],
  "ask": [
    "Bash(git push:*)",      // Regular push needs confirmation
    "Bash(npm publish:*)",   // Package publishing
    "Bash(docker push:*)"    // Image publishing
  ]
}
```

**File Operations:**
```json
{
  "allow": [
    "Edit",
    "Read",
    "Write",
    "Glob",
    "Grep"
  ],
  "deny": [
    "Edit(**/.env*)",         // Environment files
    "Edit(**/secrets/**)",    // Secret directories
    "Edit(**/node_modules/**)", // Dependencies
    "Edit(**/dist/**)",       // Build outputs
    "Read(**/.env*)",
    "Read(**/credentials*)",
    "Read(~/.ssh/**)",        // SSH keys
    "Read(~/.aws/**)"         // AWS credentials
  ]
}
```

**MCP Tools:**
```json
{
  "allow": [
    "mcp__filesystem__list_directory",
    "mcp__filesystem__read_text_file",
    "mcp__github__*"
  ]
}
```

---

## Hooks

Register hooks for Claude Code lifecycle events.

### Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "pattern",
        "hooks": [
          {
            "type": "command",
            "command": "node path/to/hook.cjs"
          }
        ]
      }
    ]
  }
}
```

### Events

| Event | Matcher Values | When Triggered |
|-------|----------------|----------------|
| `SessionStart` | `startup`, `resume`, `clear`, `compact` | Session begins |
| `SessionEnd` | `clear`, `exit`, `compact` | Session ends |
| `UserPromptSubmit` | (none) | User submits prompt |
| `PreToolUse` | Tool names | Before tool execution |
| `PostToolUse` | Tool names | After tool execution |
| `PreCompact` | `manual`, `auto` | Before context compaction |
| `SubagentStart` | `*` | Subagent spawning |
| `Notification` | (none) | Waiting for user input |

### Tool Matchers

```json
{
  "matcher": "Read|Edit|Write",   // Multiple tools
  "matcher": "Bash",              // Single tool
  "matcher": "*"                  // All events
}
```

### Example Configuration

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/session-init.cjs"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/privacy-block.cjs"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/post-edit-prettier.cjs"
          }
        ]
      }
    ]
  }
}
```

**See:** [../hooks/README.md](../hooks/README.md) for hook catalog.

---

## Plugins

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

| Plugin | Purpose |
|--------|---------|
| `code-review` | Enhanced code review capabilities |
| `commit-commands` | Git commit helpers |
| `csharp-lsp` | C# language server integration |
| `typescript-lsp` | TypeScript language server integration |
| `frontend-design` | UI/UX design assistance |
| `github` | GitHub integration |
| `playwright` | Browser automation testing |
| `code-simplifier` | Code simplification tools |

---

## Environment Variables

Set environment variables for all tool executions.

```json
{
  "env": {
    "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": "1",
    "NODE_ENV": "development"
  }
}
```

| Variable | Value | Purpose |
|----------|-------|---------|
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | `"1"` | Keep Bash in project directory |

---

## Attribution

Configure commit and PR message footers.

```json
{
  "attribution": {
    "commit": "Generated with [Claude Code](https://claude.com/claude-code)",
    "pr": "Generated with [Claude Code](https://claude.com/claude-code)"
  },
  "includeCoAuthoredBy": false
}
```

| Field | Purpose |
|-------|---------|
| `attribution.commit` | Text appended to commit messages |
| `attribution.pr` | Text appended to PR descriptions |
| `includeCoAuthoredBy` | Add co-authored-by header for Claude |

---

## Status Line

Custom status line command for terminal display.

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

## Miscellaneous

```json
{
  "cleanupPeriodDays": 30,         // Days to retain session data
  "alwaysThinkingEnabled": true    // Enable extended thinking
}
```

---

## Complete Example

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
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Edit",
      "Read",
      "Write"
    ],
    "deny": [
      "Bash(rm -rf /*)",
      "Edit(**/.env*)"
    ],
    "ask": [
      "Bash(git push:*)"
    ],
    "defaultMode": "default"
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/session-init.cjs"
          }
        ]
      }
    ]
  },
  "enabledPlugins": {
    "code-review@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true
  },
  "alwaysThinkingEnabled": true
}
```

---

## Related Documentation

- [README.md](./README.md) - Configuration overview
- [output-styles.md](./output-styles.md) - Coding levels
- [../hooks/README.md](../hooks/README.md) - Hook system
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Custom hooks

---

*Source: `.claude/settings.json` schema*
