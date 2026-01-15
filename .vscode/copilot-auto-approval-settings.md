# GitHub Copilot Auto-Approval Settings Reference

> Last Updated: January 15, 2026
> Based on VS Code 1.108+ documentation

## ⚠️ Security Warning

These settings **disable ALL permission checks** for Copilot agents and tools. This is suitable for trusted development environments only. Use with caution!

## Complete Auto-Approval Configuration

### 1. Global Tool Auto-Approval (DANGEROUS - Disables ALL Security Checks)

```json
"chat.tools.global.autoApprove": true
```

**Impact**: Bypasses ALL tool permission checks - most powerful but least secure setting.

### 2. File Edit Auto-Approval

```json
"chat.tools.edits.autoApprove": {
  "**/*": true
}
```

**Impact**: Auto-approves all file edits in the workspace.

### 3. Tool Eligibility (Makes All Tools Auto-Approvable)

```json
"chat.tools.eligibleForAutoApproval": {
  "add_observations": true,
  "applyPatch": true,
  "browser_*": true,
  "create_*": true,
  "delete_*": true,
  "edit*": true,
  "git_*": true,
  "read*": true,
  "run*": true,
  "terminal*": true,
  // ... all tools listed in settings.json
}
```

**Impact**: Marks all available tools as eligible for auto-approval.

### 4. Terminal Command Auto-Approval

```json
"chat.tools.terminal.autoApprove": {
  "*": true,
  "/^dotnet/": true,
  "/^node/": true,
  "/^npm/": true,
  "Test-Path": true
},
"chat.tools.terminal.enableAutoApprove": true,
"chat.tools.terminal.ignoreDefaultAutoApproveRules": true,
"chat.tools.terminal.blockDetectedFileWrites": "never",
"chat.tools.terminal.autoReplyToPrompts": true
```

**Impact**:

- Auto-approves all terminal commands
- Disables default safety rules
- Never blocks file writes
- Automatically replies to terminal prompts

### 5. URL/Web Request Auto-Approval

```json
"chat.tools.urls.autoApprove": {
  "*": true
}
```

**Impact**: Auto-approves all HTTP requests made by Copilot.

### 6. Edit Confirmation Bypass

```json
"chat.editing.confirmEditRequestRemoval": false,
"chat.editing.confirmEditRequestRetry": false
```

**Impact**: Removes confirmation dialogs when undoing/redoing edits.

### 7. Notification Suppression

```json
"chat.notifyWindowOnConfirmation": false
```

**Impact**: Prevents OS notification windows for user input requests.

### 8. Agent & Skill Enablement

```json
"chat.useAgentSkills": true,
"chat.useNestedAgentsMdFiles": true,
"github.copilot.chat.agent.autoFix": true,
"github.copilot.chat.agent.thinkingTool": true
```

**Impact**: Enables all agent features and skills from AGENTS.md files.

### 9. Advanced Features

```json
"github.copilot.chat.codesearch.enabled": true,
"github.copilot.chat.runCommand.enabled": true,
"github.copilot.editor.enableCodeActions": true,
"github.copilot.nextEditSuggestions.enabled": true,
"github.copilot.editor.iterativeFixing": true
```

**Impact**: Enables all experimental and advanced Copilot features.

### 10. Claude Code Compatibility

```json
"claudeCode.allowDangerouslySkipPermissions": true
```

**Impact**: Allows Claude Code agent to skip permissions (for Claude Code integration).

## Agent Limits

```json
"chat.agent.maxRequests": 300
```

**Impact**: Increases maximum agent requests from default 25 to 300.

## Terminal Profile (for Auto-Execution)

```json
"terminal.integrated.defaultProfile.windows": "PowerShell"
```

**Impact**: Uses PowerShell for consistent command execution.

## Workspace Boundary Enforcement (Enabled 2026-01-15)

### Overview

Workspace boundary restrictions prevent Copilot from modifying files outside the project root.

### Settings Changed

| Setting | Previous | Current | Impact |
|---------|----------|---------|--------|
| `chat.tools.terminal.blockDetectedFileWrites` | `"never"` | `"outsideWorkspace"` | Terminal file writes outside workspace require approval |
| `chat.tools.edits.autoApprove` | `{"**/*": true}` | Directory whitelist | Only whitelisted directories auto-approve |

### Whitelisted Directories

- `src/**` - Application source code
- `docs/**` - Documentation
- `plans/**` - Planning files
- `.github/**` - GitHub configuration
- `.vscode/**` - VS Code configuration
- `.claude/**` - Claude configuration
- `.ai/**` - AI configuration
- `scripts/**` - Build scripts
- `vscode-easyplatform-hooks/**` - VS Code extension
- `*.md`, `*.json`, `*.yml`, `*.yaml`, `*.cjs`, `*.mjs` - Root config files

### Troubleshooting Blocked Operations

If a legitimate operation is blocked:

1. **Check the path** - Is it within workspace root?
2. **Check directory whitelist** - Is the directory listed above?
3. **Manual approval** - VS Code will prompt; click "Allow" if legitimate
4. **Add to whitelist** - If frequently needed, add pattern to settings.json

### Adding New Directories

To whitelist a new directory, add to `chat.tools.edits.autoApprove`:

```json
"chat.tools.edits.autoApprove": {
    "existing/**": true,
    "new-directory/**": true
}
```

---

## Quick Reference: What Each Setting Does

| Setting                                       | Bypasses                | Risk Level |
| --------------------------------------------- | ----------------------- | ---------- |
| `chat.tools.global.autoApprove`               | ALL tools               | 🔴 CRITICAL |
| `chat.tools.edits.autoApprove`                | File edits (whitelisted)| 🟡 MEDIUM   |
| `chat.tools.terminal.enableAutoApprove`       | Terminal commands       | 🟠 HIGH     |
| `chat.tools.terminal.blockDetectedFileWrites` | Outside workspace only  | 🟢 LOW      |
| `chat.tools.urls.autoApprove`                 | Web requests            | 🟡 MEDIUM   |
| `chat.editing.confirmEditRequestRemoval`      | Edit undo confirmations | 🟢 LOW      |
| `chat.notifyWindowOnConfirmation`             | OS notifications        | 🟢 LOW      |

## Troubleshooting

### If Copilot Still Asks for Permissions

1. **Restart VS Code** - Settings require full restart
2. **Check workspace settings** - Ensure no workspace-level overrides
3. **Verify user scope** - Some settings may be organization-managed
4. **Check for conflicts** - Look for `"chat.tools.terminal.autoApprove": { "rm": false }` entries

### If Commands Are Blocked

Check these settings are present:

- `chat.tools.terminal.ignoreDefaultAutoApproveRules: true`
- `chat.tools.terminal.blockDetectedFileWrites: "outsideWorkspace"` (blocks only outside workspace)

**Note**: If you need to allow ALL file writes (not recommended), change to `"never"`.

### Organization-Managed Settings

Some settings may show: "This setting might be managed by your organization."

Contact your VS Code admin to override:

- `chat.agent.enabled`
- `chat.mcp.access`
- `chat.tools.global.autoApprove`
- `chat.tools.terminal.enableAutoApprove`

## Best Practices for Trusted Environments

✅ **Use When**:

- Working in isolated development VM
- Private/internal repositories only
- You fully trust the AI code generation
- You review generated code before committing

❌ **DON'T Use When**:

- Working with sensitive data
- Production environments
- Shared machines
- Public repositories with external contributors

## Related Documentation

- [VS Code Copilot Settings Reference](https://code.visualstudio.com/docs/copilot/copilot-settings)
- [GitHub Copilot Security Best Practices](https://docs.github.com/copilot/security-best-practices)
- [VS Code Agent Settings](https://code.visualstudio.com/docs/copilot/agents/overview)

## Version History

- **2026-01-15**: Added workspace boundary enforcement
  - Changed `blockDetectedFileWrites` to `"outsideWorkspace"`
  - Changed `edits.autoApprove` from `**/*` to directory whitelist
  - Added workspace boundary documentation section
- **2026-01-15**: Initial documentation based on VS Code 1.108
- Settings verified against latest documentation
- Added organization-managed settings notes
