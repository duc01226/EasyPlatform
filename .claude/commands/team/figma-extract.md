---
name: figma-extract
description: Extract design specs from a Figma URL using MCP
allowed-tools: Read, Write, mcp__figma__*
arguments:
  - name: url
    description: Figma URL (figma.com/design/{key} or figma.com/file/{key})
    required: true
  - name: output
    description: Output format (markdown|json)
    default: markdown
  - name: depth
    description: Max component hierarchy depth (1-10)
    default: 5
  - name: timeout
    description: Extraction timeout in seconds
    default: 30
---

# Extract Figma Design Specs

Extract colors, typography, spacing, and component structure from Figma.

## Pre-Workflow

### Activate Skills

- Activate `ux-designer` skill for design extraction best practices

## Workflow

1. **Parse URL**
   - Extract file key from URL
   - Extract node ID if present (`?node-id=X:Y`)
   - Pattern: `figma.com/(design|file)/([a-zA-Z0-9]+)`

2. **Validate MCP**
   - Check if Figma MCP tools available
   - If not: return error with setup instructions

3. **Extract via MCP**
   - Call Figma MCP with file key
   - If node ID: filter to specific node
   - Apply timeout (default 30s) - abort if exceeded
   - Limit component depth (default 5 levels)
   - Handle rate limit errors gracefully

4. **Transform Response**
   Extract and structure:
   - **Colors**: fills, strokes → hex/rgba table
   - **Typography**: text nodes → font/size/weight table
   - **Spacing**: auto-layout → padding/gap table
   - **Components**: node tree → hierarchy text

5. **Format Output**
   - markdown: Tables matching design-spec template Section 7
   - json: Structured object for programmatic use

6. **Return Result**
   - Success: formatted specs
   - Partial: specs with warnings about missing data
   - Failed: error message with fallback suggestion

## Example

```bash
/figma-extract https://www.figma.com/design/ABC123/MyDesign?node-id=1:2
```

## Output Format (markdown)

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #3B82F6 | Buttons, links |

### Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Heading | Inter | 24px | 600 |

### Spacing
| Element | Padding | Gap |
|---------|---------|-----|
| Card | 16px | 12px |

### Component Hierarchy
```
Frame "Card"
├── Image "avatar"
├── Text "name"
└── Frame "actions"
    ├── Button "edit"
    └── Button "delete"
```

## Error Handling

- **No MCP**: "Figma MCP not configured. See .claude/docs/figma-setup.md"
- **Invalid URL**: "Could not parse Figma URL. Expected: figma.com/design/{key}"
- **Timeout**: "Figma extraction timed out after {timeout}s. Try with specific node-id or reduce depth."
- **Rate limited**: "Figma API rate limit reached. Try again later."
- **Not found**: "Figma file not found or not accessible with current token"
- **Too deep**: "Component hierarchy exceeds max depth ({depth}). Results truncated."

## Configuration Defaults

| Setting | Value | Rationale |
|---------|-------|-----------|
| Max Component Depth | 5 levels | Prevents token bloat |
| Extraction Timeout | 30 seconds | Prevents blocking |
| Max Colors | 20 | Focus on primary palette |
| Max Typography | 10 | Focus on main text styles |
