---
name: design-spec
description: Create design specification from PBI, requirements, or Figma URL
allowed-tools: Read, Write, Edit, Grep, Glob, WebSearch, ai-multimodal, mcp__figma__*
arguments:
  - name: source
    description: Path to PBI file, requirement doc, or direct Figma URL
    required: true
---

# Create Design Specification

Generate comprehensive design documentation with optional Figma extraction.

## Pre-Workflow

### Activate Skills

- Activate `ux-designer` skill for design principles and component specifications

## Workflow

1. **Determine Source Type**
   - If URL starting with `figma.com`: treat as direct Figma source
   - If file path: read file and check for `figma_link` in frontmatter

2. **Load Source**
   - Read PBI/requirements file
   - Parse YAML frontmatter
   - Extract `figma_link` field if present

3. **Detect Figma Link**
   ```
   Sources (in priority order):
   1. Direct Figma URL argument
   2. frontmatter.figma_link
   3. Figma URLs in "Design Reference" section
   ```

4. **Extract Figma Specs (if link found)**
   - Call `/figma-extract {url}` internally
   - Capture structured output
   - Handle failures gracefully (continue without Figma data)

5. **Research (Optional)**
   - If complex UI, search for patterns
   - Check design system for existing components

6. **Define Components**
   For each UI element:
   - States: default, hover, active, disabled, error, loading
   - Design tokens (use Figma-extracted if available)
   - Accessibility requirements

7. **Specify Responsive Behavior**
   - Mobile (320-767px)
   - Tablet (768-1023px)
   - Desktop (1024px+)

8. **Generate Spec**
   - Use template from `team-artifacts/templates/design-spec-template.md`
   - Populate Section 7 with Figma-extracted specs
   - Include ASCII diagrams for components

9. **Save Artifact**
    - Path: `team-artifacts/design-specs/{YYMMDD}-designspec-{feature}.md`

10. **Report**
    - Confirm creation
    - Note if Figma extraction succeeded/failed
    - Suggest next steps

## Figma Detection Patterns

```regex
# Match Figma URLs
https?://(?:www\.)?figma\.com/(design|file)/([a-zA-Z0-9]+)(?:/[^?]*)?(?:\?node-id=([0-9]+:[0-9]+))?
```

## Example with Figma

```bash
# Direct Figma URL
/design-spec https://www.figma.com/design/ABC123/UserProfile

# PBI with figma_link in frontmatter
/design-spec team-artifacts/pbis/260119-pbi-user-profile.md
```

## Fallback Behavior

When Figma extraction unavailable:
1. Log warning: "Figma specs not extracted: {reason}"
2. Continue with manual spec creation
3. Leave Section 7 with placeholder text
4. Include Figma link for manual reference

## Example Output

Creates: `team-artifacts/design-specs/260119-designspec-user-profile.md`

With Section 7 auto-populated:

```markdown
## 7. Figma Extracted Specs

### 7.1 Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #3B82F6 | CTA buttons |
| Text | #1F2937 | Body text |

### 7.2 Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Title | Inter | 24px | 600 |
| Body | Inter | 16px | 400 |

### 7.5 Extraction Metadata
- **Source URL**: https://figma.com/design/ABC123/UserProfile
- **Extracted**: 2026-01-19T16:30:00Z
- **Status**: success
```

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
