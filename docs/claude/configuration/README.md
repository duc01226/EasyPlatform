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

| Section | Purpose |
|---------|---------|
| `permissions` | Tool allow/deny/ask rules |
| `hooks` | Event-based hook registrations |
| `env` | Environment variables |
| `attribution` | Commit/PR footer text |
| `enabledPlugins` | Plugin toggles |
| `statusLine` | Custom status line command |

**See:** [settings-reference.md](./settings-reference.md) for complete reference.

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
  "assertions": [
    "Backend: Use service-specific repositories",
    "Frontend: Use PlatformVmStore for state"
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `codingLevel` | 0-5 | Output verbosity and style |
| `privacyBlock` | boolean | Enable privacy blocking hook |
| `plan.namingFormat` | string | Plan directory naming pattern |
| `plan.validation` | object | Plan validation settings |
| `assertions` | string[] | Project-specific rules injected into context |
| `locale` | object | Language settings for thinking/responses |
| `trust` | object | Trust passphrase configuration |

**See:** [output-styles.md](./output-styles.md) for coding levels 0-5.

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

| Workflow | Priority | Sequence | Triggers |
|----------|----------|----------|----------|
| `feature` | 10 | plan → cook → test → review → docs | "implement", "add feature", "create" |
| `batch-operation` | 15 | plan → code → test | "all files", "batch update" |
| `bugfix` | 20 | scout → investigate → debug → plan → fix → test | "bug", "fix", "not working" |
| `refactor` | 25 | plan → code → simplify → review → test | "refactor", "clean up", "improve" |
| `documentation` | 30 | scout → investigate → docs-update | "document", "readme", "update docs" |
| `review` | 35 | code-review → watzup | "review code", "check PR" |
| `testing` | 40 | test | "add test", "run tests" |
| `investigation` | 50 | scout → investigate | "how does", "where is", "explain" |

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

| Server | Purpose |
|--------|---------|
| `github` | GitHub API integration (issues, PRs, repos) |
| `context7` | Documentation fetching from Context7 |
| `sequential-thinking` | Step-by-step reasoning tool |
| `memory` | Knowledge graph persistence |
| `figma` | Figma design extraction (HTTP transport) |

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
  "assertions": [
    "Always use Prettier for formatting",
    "Never commit directly to main branch",
    "Use conventional commit messages"
  ]
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

| Variable | Purpose |
|----------|---------|
| `CLAUDE_PROJECT_DIR` | Project root directory (used in hook commands) |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | Keep working directory in Bash |
| `CK_DEBUG` | Enable hook debug logging |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP server auth |
| `FIGMA_PERSONAL_ACCESS_TOKEN` | Figma MCP server auth |

---

## Related Documentation

- [settings-reference.md](./settings-reference.md) - Complete settings.json reference
- [output-styles.md](./output-styles.md) - Coding levels 0-5 explained
- [figma-setup.md](./figma-setup.md) - Figma MCP server setup
- [../hooks/README.md](../hooks/README.md) - Hook system overview
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

*Source: `.claude/` configuration files*
