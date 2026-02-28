# Configuration Guide

Reference for BravoSUITE Claude Code configuration files.

## Configuration Hierarchy

Priority from highest to lowest:

1. **CLI flags** - Command line arguments
2. **`.claude/settings.local.json`** - Local overrides (gitignored)
3. **`.claude/settings.json`** - Project configuration (committed)
4. **`~/.claude/settings.json`** - User global settings

**Override behavior:** Higher priority settings completely replace lower priority for the same key.

## Configuration Files

### settings.json

Main project configuration. Committed to git.

**Location:** `.claude/settings.json`

**Schema:**

```json
{
  // Permission allowlists
  "permissions": {
    "allow": [
      "Read/**",
      "Write/**",
      "Bash(npm:*)",
      "Bash(git:*)"
    ],
    "deny": [
      "Bash(rm -rf /)"
    ]
  },

  // Hook configuration
  "hooks": {
    "SessionStart": [...],
    "UserPromptSubmit": [...],
    "PreToolUse": [...],
    "PostToolUse": [...],
    "Stop": [...],
    "PreCompact": [...]
  },

  // MCP server configuration
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/server"],
      "env": { "API_KEY": "${API_KEY}" }
    }
  }
}
```

### settings.local.json

Local overrides not committed to git.

**Location:** `.claude/settings.local.json`

**Common uses:**
- API keys and secrets
- Personal preferences
- Development-only hooks
- Local MCP servers

**Example:**
```json
{
  "mcpServers": {
    "local-db": {
      "command": "node",
      "args": ["./local-mcp-server.js"],
      "env": { "DB_HOST": "localhost" }
    }
  }
}
```

### workflows.json

Workflow detection and routing configuration.

**Location:** `.claude/workflows.json`

**Schema:**
```json
{
  "workflows": {
    "workflow-name": {
      "triggers": ["keyword1", "keyword2"],
      "steps": ["skill1", "skill2"],
      "description": "When to use this workflow"
    }
  }
}
```

### .ck.json

Claude Kit configuration.

**Location:** `.claude/.ck.json`

**Schema:**
```json
{
  "codingLevel": 5,
  "privacyBlock": true,
  "plan": {
    "namingFormat": "{date}-{issue}-{slug}",
    "dateFormat": "YYMMDD-HHmm"
  },
  "paths": {
    "docs": "docs",
    "plans": "plans"
  },
  "codeReview": {
    "enabled": true,
    "rulesPath": "docs/code-review-rules.md",
    "injectOnSkills": ["code-review", "review-pr", "review-changes", "code-reviewer"]
  },
  "assertions": [
    "This is a .NET 9 + Angular 19 enterprise monorepo"
  ]
}
```

#### Code Review Configuration

The `codeReview` section configures automatic injection of project-specific review rules:

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable rule injection (default: `true`) |
| `rulesPath` | string | Path to rules markdown file (default: `docs/code-review-rules.md`) |
| `injectOnSkills` | string[] | Skills that trigger injection |

**To update code review rules:**
1. Edit `docs/code-review-rules.md` directly
2. Add patterns with ❌ (wrong) and ✅ (correct) examples
3. Include source references for traceability
4. Rules auto-inject next time a review skill is used

**To add new trigger skills:**
1. Edit `.claude/.ck.json`
2. Add skill name to `injectOnSkills` array
3. Skill name matching is case-insensitive and partial (e.g., "review" matches "review-pr")

## Permission Configuration

### Allowlist Patterns

```json
{
  "permissions": {
    "allow": [
      "Tool/**",
      "Tool(pattern:*)",
      "Bash(npm:*)",
      "Bash(git commit:*)",
      "Read(src/**)",
      "Write(src/**, !*.secret)"
    ]
  }
}
```

### Common Permission Sets

**Read-only development:**
```json
{
  "permissions": {
    "allow": ["Read/**", "Glob/**", "Grep/**"],
    "deny": ["Write/**", "Edit/**", "Bash(rm:*)"]
  }
}
```

**Full development access:**
```json
{
  "permissions": {
    "allow": [
      "Read/**", "Write/**", "Edit/**",
      "Glob/**", "Grep/**",
      "Bash(npm:*)", "Bash(git:*)", "Bash(node:*)"
    ]
  }
}
```

## Hook Configuration

### Event Types

| Event | When Triggered |
|-------|----------------|
| `SessionStart` | Session begins |
| `UserPromptSubmit` | User sends message |
| `PreToolUse` | Before tool execution |
| `PostToolUse` | After tool execution |
| `Stop` | Session/task ends |
| `PreCompact` | Before context compaction |

### Hook Structure

```json
{
  "hooks": {
    "EventName": [{
      "matcher": "ToolPattern",
      "hooks": [{
        "type": "command",
        "command": "node .claude/hooks/hook.cjs",
        "timeout": 60
      }]
    }]
  }
}
```

### Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `"Write"` | Exact tool name |
| `"Write\|Edit"` | Multiple tools (regex) |
| `"*"` or `""` | All tools |
| `"mcp__server__tool"` | MCP tool |

## Common Customizations

### Adding a New MCP Server

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my/mcp-server"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

### Adding a Custom Hook

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node .claude/hooks/my-custom-hook.cjs",
        "timeout": 30
      }]
    }]
  }
}
```

## Environment Variables

Configuration supports environment variable substitution:

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}",
    "DEBUG": "${DEBUG:-false}"
  }
}
```

**Sources (priority order):**
1. Shell environment
2. `.env.local` (gitignored)
3. `.env`

## Troubleshooting

### Configuration Not Applied

1. Check file syntax: `node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json')))"`
2. Verify file location
3. Check for local override in settings.local.json
4. Restart Claude Code session

### Hook Not Running

1. Check matcher pattern matches tool
2. Verify hook script exists
3. Check timeout setting
4. Run hook manually: `echo '{}' | node .claude/hooks/hook.cjs`

### Permission Denied

1. Check allow patterns match file path
2. Check for deny patterns overriding
3. Verify glob syntax

## Related Documentation

- [Hooks Reference](hooks-reference.md)
- [Model Selection](model-selection-guide.md)
- [Settings Reference](configuration/settings-reference.md)
