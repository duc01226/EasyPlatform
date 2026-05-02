# Figma MCP Setup Guide

> Referenced by: figma-design skill

## Option 1: Official Figma MCP (Recommended for paid Figma plans)

### Remote Server (no local app needed)

Install as Claude Code plugin:

```bash
claude plugin install figma@claude-plugins-official
```

- Authenticates via OAuth browser flow (no API key needed)
- Works on all Figma plans: free = 6 calls/month, paid = 200-600 calls/day
- 13 tools: read, write, screenshot, Code Connect, FigJam, variables
- Bidirectional: can generate designs back into Figma

### Desktop Server (requires Figma Desktop app)

- Requires Dev or Full seat on paid plan (Pro/Org/Enterprise)
- Better performance for high-volume usage
- Dev Mode required

## Option 2: GLips Figma-Context-MCP (Free tier friendly)

Add to `.claude/settings.json` or project MCP config:

```json
{
    "mcpServers": {
        "figma-context": {
            "command": "npx",
            "args": ["-y", "figma-context-mcp"],
            "env": {
                "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
            }
        }
    }
}
```

Generate token: Figma Settings -> Personal Access Tokens

- Read-only (no write/screenshot)
- No MCP-specific rate limits -- only standard Figma API limits
- 13.2K GitHub stars, actively maintained
- Works with free Figma accounts

## Option 3: No MCP (Screenshot Fallback)

If neither MCP is configured, the `figma-design` skill falls back to:

1. Ask user to screenshot the Figma frame
2. Analyze via `ai-multimodal` skill
3. Extract approximate design context (colors, fonts, spacing, layout)

This always works but produces lower-fidelity results.

## Verification

After setup, verify MCP is working:

```bash
claude mcp list
```

Should show `figma` or `figma-context` server in the list.

## Security Note

- `FIGMA_ACCESS_TOKEN` should be set as an environment variable, NOT committed to git
- Add `.env` to `.gitignore` if using dotenv files
