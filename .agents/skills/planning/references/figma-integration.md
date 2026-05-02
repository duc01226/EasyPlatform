# Figma Design Context Integration

> Referenced by: planning skill (Design Context Extraction step)

---

## When to Apply

- Source artifact (PBI, design-spec) contains Figma URLs
- Task involves UI/frontend implementation
- Design specifications are referenced

## When to Skip

- Backend-only changes
- No Figma URLs in source artifacts
- No UI/frontend components in scope

## Extraction Protocol

### 1. Check for Figma MCP Availability

If Figma MCP server is configured (check MCP tool list for `get_design_context`):

- Call `get_design_context` with Figma file key and node ID
- Call `get_screenshot` for visual reference
- Call `get_code_connect_map` to map Figma components to code components (if Code Connect configured)

### 2. Fallback: Screenshot + ai-multimodal

If no MCP available:

- Ask user to screenshot the relevant Figma frame
- Analyze via `ai-multimodal` skill with design extraction prompts
- Extract: colors (hex), typography (fonts, sizes, weights), spacing, layout, component inventory

### 3. Fallback: Text Description

If no screenshot available:

- Ask user to describe the design in text
- Proceed with `ui-wireframe-protocol.md` for ASCII wireframe generation

## Output Format

Include extracted design context in plan under `## Design Context`:

```markdown
## Design Context

**Source:** {Figma URL | screenshot | user description}
**Extraction Method:** {MCP | ai-multimodal | manual}

### Design Tokens

| Token         | Value   | Source |
| ------------- | ------- | ------ |
| Primary color | #XXXXXX | Figma  |
| Font family   | {name}  | Figma  |
| Spacing base  | {Xpx}   | Figma  |
| Border radius | {Xpx}   | Figma  |

### Component Inventory

- {ComponentName} — {description} (Figma variant: {variant info})

### Layout

{ASCII wireframe or layout description}
```

## Token Budget

Keep design context extraction under 5K tokens per design.

## Figma URL Parsing

Figma URLs follow this pattern:

```
https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
```

The `figma-context-extractor.cjs` hook auto-detects these URLs in PBI/design-spec files and provides file key + node ID metadata.
