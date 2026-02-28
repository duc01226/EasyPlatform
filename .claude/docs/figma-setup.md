# Figma Integration Setup

Enable automated design extraction from Figma for PBI-driven development.

## Prerequisites

- Figma Professional+ account (recommended for API rate limits)
- Node.js installed

## Setup Steps

### 1. Get Figma Personal Access Token

1. Go to **Figma** → **Settings** → **Account**
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Copy the token (starts with `figd_`)

### 2. Add Token to Environment

Add to `.env.local` file in project root:

```bash
# Figma API Token
FIGMA_API_KEY=figd_xxxxx
```

### 3. Restart Claude Code

Restart your Claude Code session to load the new MCP server.

### 4. Verify Setup

Test by asking Claude Code:

```
Extract design from https://www.figma.com/design/ABC123/Test-Design
```

## Usage

### In PBIs

Add `figma_link` to PBI frontmatter:

```yaml
figma_link: "https://www.figma.com/design/ABC123/FeatureName"
```

### Commands

| Command | Description |
|---------|-------------|
| `/figma-extract {url}` | Extract design specs from Figma URL |
| `/design-spec {pbi-path}` | Auto-detects and extracts if `figma_link` present |

## Rate Limits

| Plan | Limit |
|------|-------|
| Free | ~6 calls/month |
| Professional+ | ~1000 calls/day |

## Troubleshooting

### "FIGMA_API_KEY not configured"

- Ensure token is in `.env.local` (not `.env`)
- Restart Claude Code session

### "File not found"

- Verify you have access to the Figma file
- Check token permissions

### "Rate limit exceeded"

- Wait and retry later
- Consider upgrading Figma plan
