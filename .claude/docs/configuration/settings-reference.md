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

| Mode      | Behavior                        |
| --------- | ------------------------------- |
| `allow`   | Auto-approved without prompting |
| `deny`    | Blocked completely              |
| `ask`     | Prompts user for approval       |
| `default` | Uses Claude Code defaults       |

### Pattern Syntax

```
Tool(command:*)      # Wildcard matching
Tool(exact-command)  # Exact matching
Tool(**/path/**)     # Glob patterns for files
```

### Common Patterns

Shipped Git permissions allow requested commits and pushes without an additional ask rule, including force-push syntax. The agent still needs explicit operation authority; this grants none. The commit review hook remains active unless the framework runtime is off. Personal or managed host settings can impose their own prompts.

**Bash Commands:**

```json
{
    "allow": [
        "Bash(git:*)", // All git commands
        "Bash(npm:*)", // All npm commands
        "Bash(dotnet:*)", // All dotnet commands
        "Bash(nx:*)", // All nx commands
        "Bash(node:*)", // All node commands
        "Bash(ls:*)", // Directory listing
        "Bash(find:*)", // File finding
        "Bash(grep:*)", // Text searching
        "Bash(mkdir:*)", // Create directories
        "Bash(cp:*)", // Copy files
        "Bash(mv:*)" // Move files
    ],
    "deny": [
        "Bash(rm -rf /*)", // Dangerous recursive delete
        "Bash(rm -rf ~/*)", // Home directory wipe
        "Bash(git push --force:*)", // Force push
        "Bash(git reset --hard:*)" // Hard reset
    ],
    "ask": [
        "Bash(npm publish:*)", // Package publishing
        "Bash(docker push:*)" // Image publishing
    ]
}
```

**File Operations:**

```json
{
    "allow": ["Edit", "Read", "Write", "Glob", "Grep"],
    "deny": [
        "Edit(**/.env*)", // Environment files
        "Edit(**/secrets/**)", // Secret directories
        "Edit(**/node_modules/**)", // Dependencies
        "Edit(**/dist/**)", // Build outputs
        "Read(**/.env*)",
        "Read(**/credentials*)",
        "Read(~/.ssh/**)", // SSH keys
        "Read(~/.aws/**)" // AWS credentials
    ]
}
```

**MCP Tools:**

```json
{
    "allow": ["mcp__filesystem__list_directory", "mcp__filesystem__read_text_file", "mcp__github__*"]
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

| Event              | Matcher Values                          | When Triggered            |
| ------------------ | --------------------------------------- | ------------------------- |
| `SessionStart`     | `startup`, `resume`, `clear`, `compact` | Session begins            |
| `SessionEnd`       | `clear`, `exit`, `compact`              | Session ends              |
| `UserPromptSubmit` | (none)                                  | User submits prompt       |
| `UserPromptExpansion` | (none)                               | A typed `/command` expands |
| `PreToolUse`       | Tool names                              | Before tool execution     |
| `PostToolUse`      | Tool names                              | After tool execution      |
| `PreCompact`       | `manual`, `auto`                        | Before context compaction |
| `SubagentStart`    | Agent type names                        | Subagent spawning         |
| `Notification`     | (none)                                  | Waiting for user input    |
| `Stop`             | (none)                                  | Main agent finishes responding |

> Claude Code supports these events for hook registration. This framework registers `UserPromptExpansion` only for the protocol delivery steps (`protocol-inject-<group>.cjs`) and `SubagentStart` for those steps plus the prompt-time context hooks a delegated agent needs (skill activation, core principles, UI reuse, verdict and AI-feature directives); the `SubagentStart` registrations have no agent-type matcher, so every agent type reaches the handlers; standing sub-agent context stays static in `agents/*.md`. `Stop` registers only the notification router (`hooks/notifications/notify.cjs`) for the turn-complete alert. Read [../hooks/README.md § Protocol Delivery](../hooks/README.md#protocol-delivery) when changing those registrations.

### Tool Matchers

```json
{
    "matcher": "Read|Edit|Write", // Multiple tools
    "matcher": "Bash", // Single tool
    "matcher": "*" // All events
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
                        "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/doc-sync-gate.cjs"
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

### Hook Behavior Settings (not in settings.json)

The `hooks` object above only REGISTERS hooks — it carries no behavior knobs. A hook's own settings live in project config:

| Behavior                      | File                       | Section                |
| ----------------------------- | -------------------------- | ---------------------- |
| Startup dependency install    | `docs/project-config.json` | `hooks.startupInstall` |
| Per-file convention reminders | `docs/project-config.json` | `conventionInjection`  |
| Session prompt ledger         | `.claude/.ck.json`         | `promptLedger`         |
| Advisory token checkpoint     | `docs/project-config.json` | `hooks.tokenBudget`    |

`hooks.startupInstall` accepts `enabled` (boolean, default `true`), `packageManager` (`auto` | `npm` | `pnpm` | `yarn` | `bun`, default `"auto"`) and `allowLifecycleScripts` (boolean, default `false`). Those defaults apply identically when the property, the `hooks` section, or the whole project-config file is absent; a non-`auto` `packageManager` is one manager signal and never an override (a value contradicting the lockfile skips with `skip-manager-conflict`); `enabled: false` disables installation only and never the `.claude` install-integrity verification; and neither the manager executable nor its arguments are configurable — the hook runs a fixed, version-matched argv from its own support matrix. `allowLifecycleScripts: true` is only a repository REQUEST: it takes effect solely on a host that also sets `CK_STARTUP_INSTALL_TRUST=1` (an `env` entry in the git-ignored `.claude/settings.local.json` is the intended place), and that same grant stops the runner sanitizing registry credentials out of the manager's environment. Setting the config key alone fails silently — the install runs with suppression intact. Full contract, including the supported manager/lockfile/platform breadth: [README.md § Startup dependency installation](./README.md#startup-dependency-installation).

**See:** [../hooks/README.md](../hooks/README.md) for hook catalog.

---

## Plugins

Enable/disable official Claude Code plugins.

```json
{
    "enabledPlugins": {
        "code-review@claude-plugins-official": false,
        "commit-commands@claude-plugins-official": false,
        "csharp-lsp@claude-plugins-official": false,
        "frontend-design@claude-plugins-official": false,
        "github@claude-plugins-official": false,
        "playwright@claude-plugins-official": false,
        "typescript-lsp@claude-plugins-official": false,
        "code-simplifier@claude-plugins-official": false
    }
}
```

| Plugin            | Purpose                                |
| ----------------- | -------------------------------------- |
| `code-review`     | Enhanced code review capabilities      |
| `commit-commands` | Git commit helpers                     |
| `csharp-lsp`      | C# language server integration         |
| `typescript-lsp`  | TypeScript language server integration |
| `frontend-design` | UI/UX design assistance                |
| `github`          | GitHub integration                     |
| `playwright`      | Browser automation testing             |
| `code-simplifier` | Code simplification tools              |

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

| Variable                                   | Value      | Purpose                                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | `"1"`      | Keep Bash in project directory                                                                                                                                                                                                                                                      |
| `CK_NO_AUTO_OPEN`                          | `"1"`      | `.claude/scripts/open-report.cjs` (used by the `watzup` and `understand` HTML reports) prints the report path and opens nothing. It also opens nothing when `CI` is set (non-empty, not `0`/`false`) or on Linux with neither `DISPLAY` nor `WAYLAND_DISPLAY`. The same rules stop `task-track` `serve --open` from starting a browser |
| `CK_AUTO_INSTALL_DEPENDENCIES`             | `"0"`      | Turns off automatic dependency installs (`0`, `off` or `false`): the PyYAML recovery in `.claude/scripts/lib/python_dependencies.py` and the `task-track` pinned-package setup, which then refuses with the command to run by hand |

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

| Field                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `attribution.commit`  | Text appended to commit messages     |
| `attribution.pr`      | Text appended to PR descriptions     |
| `includeCoAuthoredBy` | Add co-authored-by header for Claude |

---

## Status Line

Custom status line command for terminal display.

```json
{
    "statusLine": {
        "type": "command",
        "command": "cd \"$CLAUDE_PROJECT_DIR\" && npx -y ccstatusline@2.2.30 --config .claude/ccstatusline.json",
        "padding": 0
    }
}
```

**Run from the project root — never the session cwd.** Claude Code runs the status
line in the session's current directory, which follows every `cd`, and exports
`CLAUDE_PROJECT_DIR` (the session root) to it as it does for hooks. ccstatusline
resolves `--config` against its own cwd and writes a default config when the file
is missing, and its `custom-command` widgets (`node .claude/scripts/...`) inherit
that cwd. The leading `cd "$CLAUDE_PROJECT_DIR" &&` anchors all of them; `&&` keeps
a failed `cd` from falling back to the session cwd. Widget commands cannot anchor
themselves: ccstatusline runs them through `cmd.exe` on Windows and `sh` elsewhere,
so no single variable spelling works inside the widget string.

**Pin the version — never `@latest`.** The status line command re-runs on every
assistant message, after `/compact`, and on timers, so `@latest` means any newly
published release starts executing on every teammate's machine within minutes,
unreviewed and with no lockfile. That process runs as the developer's own user and
receives session data on stdin, so a hijacked-maintainer release would be
credential theft across the team. An exact version runs a cached copy that cannot
change underneath you. Bumping it is a deliberate, reviewed edit — the same
contract as the repo's other pinned tools.

---

## Miscellaneous

```json
{
    "cleanupPeriodDays": 30, // Days to retain session data
    "alwaysThinkingEnabled": true // Enable extended thinking
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
        "allow": ["Bash(git:*)", "Bash(npm:*)", "Edit", "Read", "Write"],
        "deny": ["Bash(rm -rf /*)", "Edit(**/.env*)"],
        "ask": ["Bash(npm publish:*)"],
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
- [output-styles.md](./output-styles.md) - Custom output styles
- [../hooks/README.md](../hooks/README.md) - Hook system
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Custom hooks

---

_Source: `.claude/settings.json` schema_
