# Figma MCP Server Setup

## Prerequisites

- Figma account with access to team files
- Claude Code installed

## Generate Personal Access Token

1. Go to [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. Click "Create a new personal access token"
3. Name: `claude-code-mcp`
4. Select scopes:
   - `file_content:read` - Read file content
   - `library_content:read` - Read library content
5. Click "Create token"
6. Copy token immediately (shown only once)

## Configure Token

### Option A: Environment File (Recommended)

1. Create/edit `.claude/.env` file (this file is gitignored)
2. Add your token:
   ```
   FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxxxx
   ```

### Option B: System Environment

```bash
# Linux/Mac
export FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxxxx

# Windows (PowerShell)
$env:FIGMA_PERSONAL_ACCESS_TOKEN = "figd_xxxxx"
```

## Verify Configuration

```bash
claude mcp list
# Should show: figma (http)

# Test connection
claude "use figma mcp to list available tools"
```

## Troubleshooting

### "Unauthorized" Error
- Token expired or invalid
- Missing required scopes
- Solution: Regenerate token with correct scopes

### "Server not found" Error
- MCP configuration incorrect
- Solution: Verify `.claude/.mcp.json` syntax

### Token Security
- NEVER commit tokens to git
- `.claude/.env` is gitignored by default
- Rotate tokens periodically (every 90 days recommended)

## Related

- [MCP Configuration Reference](./README.md)
- [Team Collaboration Guide](../team-collaboration-guide.md)
