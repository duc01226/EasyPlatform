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

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

<!-- SYNC:ui-wireframe-protocol -->

> **UI Wireframe Protocol** — Wireframe-to-implementation flow: (1) Process design input (Figma/screenshot/sketch via ai-multimodal). (2) Create ASCII wireframe with box-drawing chars. (3) Build component inventory with tier classification (Common/Domain-Shared/Page). (4) Document states (Default/Loading/Empty/Error). (5) Map to design tokens. (6) Define responsive breakpoints. Search existing component libraries before creating new. Progressive detail by skill level (idea=sketch, story=full tree+specs).

<!-- /SYNC:ui-wireframe-protocol -->

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

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:ui-system-context:reminder -->
- **IMPORTANT MUST ATTENTION** read frontend pattern docs, SCSS guide, and design system tokens BEFORE any UI implementation.
  <!-- /SYNC:ui-system-context:reminder -->
  <!-- SYNC:ui-wireframe-protocol:reminder -->
- **IMPORTANT MUST ATTENTION** follow wireframe protocol: ASCII wireframe, component inventory with tiers, states table, design tokens, responsive breakpoints.
  <!-- /SYNC:ui-wireframe-protocol:reminder -->
- **IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting
