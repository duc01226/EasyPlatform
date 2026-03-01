# Configuration Reference

> Complete guide to Claude Code configuration files

## Overview

Claude Code uses multiple configuration files to customize behavior, permissions, hooks, workflows, and integrations. This guide covers all configuration options and their effects.

```
.claude/
├── settings.json        # Main settings (hooks, permissions, plugins)
├── .ck.json             # Claude Kit configuration (levels, assertions)
├── workflows.json       # Workflow automation definitions
├── .mcp.json            # MCP server integrations
└── CLAUDE.md            # Project instructions (read by Claude)
```

---

## Configuration Files

### settings.json

**Purpose:** Core Claude Code settings including hooks, permissions, and plugins.

| Section          | Purpose                        |
| ---------------- | ------------------------------ |
| `permissions`    | Tool allow/deny/ask rules      |
| `hooks`          | Event-based hook registrations |
| `env`            | Environment variables          |
| `attribution`    | Commit/PR footer text          |
| `enabledPlugins` | Plugin toggles                 |
| `statusLine`     | Custom status line command     |

**See:** [settings-reference.md](./settings-reference.md) for complete reference.

---

### settings.local.json

**Purpose:** Local overrides not committed to git (gitignored).

**Location:** `.claude/settings.local.json`

**Common uses:** API keys and secrets, personal preferences, development-only hooks, local MCP servers.

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

---

### .ck.json

**Purpose:** Claude Kit-specific configuration for output styles, planning, and project rules.

```json
{
    "codingLevel": 4,
    "privacyBlock": true,
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "validation": {
            "mode": "prompt",
            "minQuestions": 3,
            "maxQuestions": 8
        }
    },
    "assertions": ["Backend: Use service-specific repositories", "Frontend: Use PlatformVmStore for state"]
}
```

| Field               | Type     | Description                                  |
| ------------------- | -------- | -------------------------------------------- |
| `codingLevel`       | 0-5      | Output verbosity and style                   |
| `privacyBlock`      | boolean  | Enable privacy blocking hook                 |
| `plan.namingFormat` | string   | Plan directory naming pattern                |
| `plan.validation`   | object   | Plan validation settings                     |
| `assertions`        | string[] | Project-specific rules injected into context |
| `locale`            | object   | Language settings for thinking/responses     |
| `trust`             | object   | Trust passphrase configuration               |

**See:** [output-styles.md](./output-styles.md) for coding levels 0-5.

#### Code Review Configuration

The `codeReview` section configures automatic injection of project-specific review rules:

| Field            | Type     | Description                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `enabled`        | boolean  | Enable/disable rule injection (default: `true`)                                      |
| `rulesPath`      | string   | Path to rules markdown file (default: `docs/project-reference/code-review-rules.md`) |
| `injectOnSkills` | string[] | Skills that trigger injection                                                        |

**To update code review rules:** Edit `docs/project-reference/code-review-rules.md` directly. Rules auto-inject next time a review skill is used.

**To add new trigger skills:** Edit `.claude/.ck.json`, add skill name to `injectOnSkills` array. Matching is case-insensitive and partial.

---

### workflows.json

**Purpose:** Automatic workflow detection and execution configuration.

```json
{
    "settings": {
        "enabled": true,
        "showDetection": true,
        "confirmHighImpact": true,
        "overridePrefix": "quick:",
        "supportedLanguages": ["en", "vi", "zh", "ja", "ko"]
    },
    "workflows": {
        "feature": {
            "priority": 10,
            "confirmFirst": true,
            "sequence": ["plan", "cook", "test", "code-review", "docs-update"],
            "triggerPatterns": ["\\b(implement|add|create)\\b.*\\b(feature)\\b"],
            "excludePatterns": ["\\b(fix|bug|error)\\b"]
        }
    }
}
```

| Workflow          | Priority | Sequence                                        | Triggers                             |
| ----------------- | -------- | ----------------------------------------------- | ------------------------------------ |
| `feature`         | 10       | plan → cook → test → review → docs              | "implement", "add feature", "create" |
| `batch-operation` | 15       | plan → code → test                              | "all files", "batch update"          |
| `bugfix`          | 20       | scout → investigate → debug → plan → fix → test | "bug", "fix", "not working"          |
| `refactor`        | 25       | plan → code → simplify → review → test          | "refactor", "clean up", "improve"    |
| `documentation`   | 30       | scout → investigate → docs-update               | "document", "readme", "update docs"  |
| `review`          | 35       | code-review → watzup                            | "review code", "check PR"            |
| `testing`         | 40       | test                                            | "add test", "run tests"              |
| `investigation`   | 50       | scout → investigate                             | "how does", "where is", "explain"    |

**Multilingual Support:** Patterns include English, Vietnamese, Chinese, Japanese, Korean.

---

### .mcp.json

**Purpose:** Model Context Protocol server integrations.

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "" }
        },
        "context7": {
            "command": "npx",
            "args": ["-y", "@context7/mcp-server"]
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

| Server                | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `github`              | GitHub API integration (issues, PRs, repos) |
| `context7`            | Documentation fetching from Context7        |
| `sequential-thinking` | Step-by-step reasoning tool                 |
| `memory`              | Knowledge graph persistence                 |
| `figma`               | Figma design extraction (HTTP transport)    |

**See:** [figma-setup.md](./figma-setup.md) for Figma MCP server setup.

---

## Quick Configuration Guide

### Enable/Disable Features

```json
// .ck.json
{
  "privacyBlock": false,     // Disable privacy blocking
  "codingLevel": 3           // Change output verbosity
}

// settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": false  // Disable plugin
  }
}
```

### Add Custom Assertions

```json
// .ck.json
{
    "assertions": ["Always use Prettier for formatting", "Never commit directly to main branch", "Use conventional commit messages"]
}
```

### Customize Plan Naming

```json
// .ck.json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "issuePrefix": "GH-"
    }
}
```

### Add Tool Permissions

```json
// settings.json
{
    "permissions": {
        "allow": ["Bash(docker:*)"],
        "deny": ["Bash(rm -rf /*)"],
        "ask": ["Bash(git push:*)"]
    }
}
```

---

## Configuration Inheritance

Configuration is loaded in order with later files overriding earlier:

1. **Claude Code defaults** - Built-in settings
2. **User settings** - `~/.claude/settings.json`
3. **Project settings** - `.claude/settings.json`
4. **Session settings** - Runtime modifications

---

## Environment Variables

| Variable                                   | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `CLAUDE_PROJECT_DIR`                       | Project root directory (used in hook commands) |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Keep working directory in Bash                 |
| `CK_DEBUG`                                 | Enable hook debug logging                      |
| `GITHUB_PERSONAL_ACCESS_TOKEN`             | GitHub MCP server auth                         |
| `FIGMA_PERSONAL_ACCESS_TOKEN`              | Figma MCP server auth                          |

---

## Permission Configuration

### Allowlist Patterns

```json
{
    "permissions": {
        "allow": ["Tool/**", "Tool(pattern:*)", "Bash(npm:*)", "Bash(git commit:*)", "Read(src/**)", "Write(src/**, !*.secret)"]
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
        "allow": ["Read/**", "Write/**", "Edit/**", "Glob/**", "Grep/**", "Bash(npm:*)", "Bash(git:*)", "Bash(node:*)"]
    }
}
```

---

## Hook Configuration

### Event Types

| Event              | When Triggered            |
| ------------------ | ------------------------- |
| `SessionStart`     | Session begins            |
| `UserPromptSubmit` | User sends message        |
| `PreToolUse`       | Before tool execution     |
| `PostToolUse`      | After tool execution      |
| `Stop`             | Session/task ends         |
| `PreCompact`       | Before context compaction |

### Hook Structure

```json
{
    "hooks": {
        "EventName": [
            {
                "matcher": "ToolPattern",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/hook.cjs",
                        "timeout": 60
                    }
                ]
            }
        ]
    }
}
```

### Matcher Patterns

| Pattern               | Matches                |
| --------------------- | ---------------------- |
| `"Write"`             | Exact tool name        |
| `"Write\|Edit"`       | Multiple tools (regex) |
| `"*"` or `""`         | All tools              |
| `"mcp__server__tool"` | MCP tool               |

---

## Common Customizations

### Adding a New MCP Server

```json
{
    "mcpServers": {
        "my-server": {
            "command": "npx",
            "args": ["-y", "@my/mcp-server"],
            "env": { "API_KEY": "${MY_API_KEY}" }
        }
    }
}
```

### Adding a Custom Hook

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/my-custom-hook.cjs",
                        "timeout": 30
                    }
                ]
            }
        ]
    }
}
```

---

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

---

## Related Documentation

- [settings-reference.md](./settings-reference.md) - Complete settings.json reference
- [output-styles.md](./output-styles.md) - Coding levels 0-5 explained
- [figma-setup.md](./figma-setup.md) - Figma MCP server setup
- [../hooks/README.md](../hooks/README.md) - Hook system overview
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

_Source: `.claude/` configuration files_
