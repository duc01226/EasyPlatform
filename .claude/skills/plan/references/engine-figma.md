# Planning Engine — Design Context Extraction (Figma)

### 2. Design Context Extraction

**Skip if:** No Figma URLs in source artifacts OR backend-only changes

When planning UI features:

1. Check source PBI/design-spec for Figma URLs
2. Extract design context via Figma MCP (if available)
3. Include design specifications in plan phases
4. Map design tokens to implementation

#### When to Apply

**Apply when:**

- Source artifact contains Figma URLs
- Task involves UI/frontend implementation
- Design specifications are referenced

**Skip when:**

- Backend-only changes
- No Figma URLs in artifacts
- Figma MCP not available (graceful degradation)

#### Detection Phase

##### 1. Scan Source Artifacts

Check these locations for Figma URLs:

- PBI `## Design Reference` section
- Design spec `figma_file:` and `figma_nodes:` frontmatter
- Feature doc (if design reference exists in any section)

##### 2. Parse URLs

Extract from each URL:

- `file_key`: Figma file identifier
- `node_id`: Specific frame/component (URL format: `1-3`)
- Convert to API format: `1-3` → `1:3`

**URL Pattern:**

```
https://figma.com/design/{file_key}/{name}?node-id={node_id}
```

#### Extraction Phase

##### 1. Check MCP Availability

```
If Figma MCP available:
  → Proceed with extraction
Else:
  → Log: "Figma MCP not configured, skipping design extraction"
  → Continue with URL references only
```

##### 2. Call MCP for Each Node

Prefer specific nodes over full files:

```
For each {file_key, node_id} pair:
  If node_id exists:
    Call: mcp__figma__get_file_nodes(file_key, [node_id])
  Else:
    Skip file-level extraction (too expensive)
```

##### 3. Extract Key Information

From response, extract:

| Property       | Source Field                            |
| -------------- | --------------------------------------- |
| **Structure**  | `children[].name`, `children[].type`    |
| **Layout**     | `layoutMode`, `itemSpacing`, `padding*` |
| **Dimensions** | `absoluteBoundingBox.width/height`      |
| **Colors**     | `fills[].color` (r,g,b,a → rgba)        |
| **Typography** | `style.fontFamily/fontSize/fontWeight`  |

##### 4. Token Budget Enforcement

| Response Size | Action                                |
| ------------- | ------------------------------------- |
| <2K tokens    | Use full response                     |
| 2K-5K tokens  | Summarize to key properties           |
| >5K tokens    | Extract only critical info, warn user |

#### Integration Phase

##### 1. Add to Plan Context

Include in plan.md overview:

```markdown
## Design Context

Design specifications extracted from Figma:

| Component | Figma Node         | Key Specs              |
| --------- | ------------------ | ---------------------- |
| {name}    | [{node_id}]({url}) | {dimensions}, {layout} |

### Extracted Specifications

{Formatted design context from extraction}
```

##### 2. Reference in Implementation Phases

For frontend phases, include:

```markdown
## Design Specifications

From Figma node `{node_id}`:

### Layout

- Direction: {Horizontal/Vertical}
- Gap: {spacing}px
- Padding: {T/R/B/L}px

### Visual

- Background: {color} → map to `--color-bg-*`
- Border: {width}px {color} → map to `--border-*`

### Typography (if text)

- Font: {family} → map to `--font-family-*`
- Size: {size}px → map to `--font-size-*`
- Weight: {weight} → map to `--font-weight-*`
```

##### 3. Design Token Mapping

Map extracted values to existing tokens:

| Figma Value    | Design Token         | Notes            |
| -------------- | -------------------- | ---------------- |
| #FFFFFF        | `--color-bg-primary` | Exact match      |
| 16px           | `--spacing-md`       | Standard spacing |
| Inter 400 14px | `--font-body`        | Body text        |

Reference: `docs/project-reference/design-system/design-tokens.scss` for available tokens.

#### Fallback Behavior

When extraction fails:

1. **MCP Not Available:**
    - Log warning
    - Note in plan: "Design context not extracted (MCP unavailable)"
    - Continue with URL references only

2. **Node Not Found:**
    - Try parent node
    - Note which nodes failed
    - Continue with available data

3. **Rate Limited:**
    - Extract first 3 nodes only
    - Note in plan which nodes were skipped

4. **Token Budget Exceeded:**
    - Summarize aggressively
    - Include only dimensions, colors, layout
    - Link to full Figma for details

#### Figma Output Template

```markdown
## Figma Design Context

> Extracted via Figma MCP on {date}

### Source Designs

| Design | Node          | Status    |
| ------ | ------------- | --------- |
| {name} | [{id}]({url}) | Extracted |

### {Component Name}

**Node:** `{node_id}`
**Type:** {Frame/Component/Group}
**Dimensions:** {width} x {height}px

#### Layout

- Direction: {layoutMode}
- Gap: {itemSpacing}px
- Padding: {paddingTop}/{paddingRight}/{paddingBottom}/{paddingLeft}px

#### Visual

| Property      | Value            | Token Mapping       |
| ------------- | ---------------- | ------------------- |
| Background    | {fill color}     | `--color-*`         |
| Border        | {stroke}         | `--border-*`        |
| Corner Radius | {cornerRadius}px | `--border-radius-*` |

#### Children

- {child1}: {type}
- {child2}: {type}
```

#### No Design Context Template

When no Figma URLs present:

```markdown
## Design Context

No Figma designs referenced. If UI changes are needed:

1. Add Figma links to source PBI `## Design Reference` section
2. Re-run planning to extract design context
```
