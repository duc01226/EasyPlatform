---
name: wireframe-to-spec
version: 1.0.0
description: '[Frontend] Convert hand-drawn wireframes, digital wireframes, or UI sketches into structured design specifications. Accepts image inputs and produces ui-wireframe-protocol-formatted specs. Triggers on wireframe, sketch, hand-drawn, mockup image, wireframe to spec, sketch to code.'
allowed-tools: Read, Write, Grep, Glob, AskUserQuestion, Bash
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Quick Summary

**Goal:** Bridge image inputs (wireframes, sketches) to structured UI specifications.

**Workflow:**

1. **Detect Input Type** — Hand-drawn, digital wireframe, or screenshot
2. **Analyze Image** — Use `ai-multimodal` with wireframe-specific prompts
3. **Generate Spec** — ASCII wireframe + components + states + responsive per `ui-wireframe-protocol.md`
4. **Output** — PBI-compatible `## UI Layout` section or standalone spec file

**Key Rules:**

### Frontend/UI Context (if applicable)

When this task involves frontend or UI changes, **MUST READ** `.claude/skills/shared/ui-system-context.md` and the following docs:

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

- **MUST READ** `.claude/skills/shared/ui-wireframe-protocol.md` before generating output
- Always require human review — wireframe analysis is 70-80% accurate
- Route to other skills when appropriate (Figma URL → `figma-design`, app screenshot → `design-screenshot`)

## Input Routing

| Input                   | Detection                               | Action                                |
| ----------------------- | --------------------------------------- | ------------------------------------- |
| Hand-drawn sketch photo | Image with rough/organic lines          | Analyze with wireframe prompts        |
| Digital wireframe       | Image with clean lines/shapes           | Analyze with wireframe prompts        |
| Wireframe tool export   | Image from Excalidraw/Balsamiq/MockFlow | Analyze with wireframe prompts        |
| Figma URL               | `figma.com` in text                     | Route to `/figma-design` instead      |
| App screenshot          | Polished UI with real data              | Route to `/design-screenshot` instead |

## Wireframe Analysis

Use `ai-multimodal` with these prompts:

### Prompt 1: Layout Extraction

"Analyze this wireframe image. Identify: (1) page layout regions (header, sidebar, main, footer), (2) all UI elements with approximate position and type (button, input, table, card, dropdown, modal, tabs), (3) content hierarchy (what is primary vs secondary), (4) interactive elements, (5) any text labels or annotations, (6) navigation patterns."

### Prompt 2: Component Identification

"From the wireframe, list every distinct UI component. For each: name it descriptively, classify its complexity (primitive=single element, composite=grouped elements, section=page region), note its purpose."

## Output Generation

After image analysis, generate output per `ui-wireframe-protocol.md`:

1. **ASCII Wireframe** — Recreate layout using box-drawing characters
2. **Component Inventory** — List with tier classification (Common/Domain-Shared/Page)
3. **States Table** — Default, Loading, Empty, Error per view
4. **Component Decomposition Tree** — If detail level warrants (refine/story)
5. **Responsive Suggestions** — Based on layout complexity

## Output Formats

### Format A: PBI Section (default)

Output as `## UI Layout` section compatible with PBI/story templates.

### Format B: Standalone Spec

Output as `team-artifacts/design-specs/{YYMMDD}-wireframe-spec-{slug}.md`

## Confidence & Review

- **Always display confidence level** for wireframe interpretation
- **Always recommend human review** before proceeding to implementation
- If confidence <70%: ask user clarifying questions about ambiguous elements via `AskUserQuestion`
