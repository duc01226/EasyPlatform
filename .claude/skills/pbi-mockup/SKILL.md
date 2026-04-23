---
name: pbi-mockup
version: 1.0.0
description: "[Project Management] Generate an HTML mockup report from PBI and story artifacts. Creates a self-contained HTML file visualizing the UI described in the PBI, styled to match the project's design system. Use after PBI/story finalization, before implementation. Triggers on 'mockup', 'html mockup', 'pbi mockup', 'visual mockup', 'generate mockup'."
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

## Quick Summary

**Goal:** Generate a self-contained HTML mockup file from finalized PBI/story artifacts, styled to match the project's existing UI, components, and domain entities. One HTML file per PBI covering all stories.

**Workflow:**

1. **Locate Artifacts** — Find PBI and story files in `team-artifacts/pbis/`
2. **Extract UI Specs** — Parse UI Layout, Wireframe, Components, States sections
3. **Load Design System** — Read module-specific design tokens, colors, typography
4. **Load Existing UI** — Read existing components, page layouts, and patterns from the project
5. **Load Domain Entities** — Read entity fields, relationships, and enums for realistic sample data
6. **Generate HTML** — Create self-contained HTML mockup matching the current system's look and feel
7. **Save** — Write HTML file alongside the PBI artifact

**Key Rules:**

- One HTML file per PBI (all stories shown as sections/tabs)
- Self-contained: inline CSS/JS, no external dependencies except Google Fonts
- **Must resemble the project's current UI** — read existing component templates and page layouts
- Match project design system: colors, typography, spacing, BEM naming
- Use **real domain entity fields and realistic sample data** — not Lorem ipsum
- Include component states (default, loading, empty, error)
- Responsive layout with mobile/desktop preview
- Save in same directory as the PBI artifact

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# PBI HTML Mockup Generator

Generate visual HTML mockup reports from PBI and user story artifacts.

---

## When to Use

- After PBI and stories are finalized (reviewed, challenged, gated)
- Before moving to implementation planning or design spec
- When stakeholders need a visual preview of the feature
- As the final step in `idea-to-pbi` and similar workflows

**NOT for**: Implementing production UI (use `/cook`), creating design specs (use `/design-spec`), or wireframing from scratch (use `/wireframe-to-spec`).

---

## Quick Reference

### Input

| Source          | Path                                                    |
| --------------- | ------------------------------------------------------- |
| PBI artifact    | `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`            |
| Story artifacts | `team-artifacts/pbis/stories/{YYMMDD}-us-{pbi-slug}.md` |
| Explicit path   | User provides path as argument                          |

### Output

| Type        | Path                                           |
| ----------- | ---------------------------------------------- |
| HTML mockup | `{same-dir-as-pbi}/{pbi-filename}-mockup.html` |

### Related

- **Input from:** `/refine`, `/story`
- **Command:** `/pbi-mockup`
- **Next Step:** `/prioritize`, `/design-spec`, `/plan`

---

## Detailed Workflow

### Step 1: Locate PBI Artifact

1. If argument provided, use it as path
2. Otherwise, find most recent PBI: `Glob("team-artifacts/pbis/*-pbi-*.md")` sorted by modification time
3. Read the PBI artifact fully
4. Check for associated stories: `Glob("team-artifacts/pbis/stories/*-us-{pbi-slug}*.md")`
5. Read all story artifacts if found

### Step 2: Extract UI Specifications

From the PBI and story artifacts, extract:

| Section                            | What to Extract                       |
| ---------------------------------- | ------------------------------------- |
| `## UI Layout` / `## UI Wireframe` | ASCII wireframe, layout description   |
| `### Components`                   | Component names, behaviors, tiers     |
| `### States`                       | Default, Loading, Empty, Error states |
| `### Interaction Flow`             | User actions and system responses     |
| `## Acceptance Criteria`           | GIVEN/WHEN/THEN scenarios for context |
| `## Description`                   | User role, capability, business value |

If no UI sections exist (backend-only PBI), inform user and skip mockup generation:

> "This PBI has no UI sections (marked as backend-only). No mockup generated."

### Step 3: Load Design System Context

1. Read PBI `module` field from frontmatter
2. Load design system docs dynamically (project-config.json + glob fallback):
    - **Primary:** Read `docs/project-config.json` → find the module entry → check if it has a `designSystem` or related mapping field
    - **Fallback:** `Glob("docs/project-reference/design-system/*.md")` → match module name against discovered file names (case-insensitive substring match)
    - **Default:** If no match found, use `docs/project-reference/design-system/README.md`
    - **Triage rule (NEW vs REFACTOR):** For NEW pages/components → ALSO load `designSystem.canonicalDoc` from `project-config.json` (single source of truth for new code). For REFACTOR of existing screens → load per-app doc via `appMappings` (current-state inventory).

3. Extract from design system doc (read first 200 lines for tokens):
    - **Colors:** Primary, secondary, accent, background, text colors
    - **Typography:** Font families, sizes, weights
    - **Spacing:** Margin/padding scale
    - **Border radius:** Component roundness
    - **Shadows:** Elevation levels

4. Optionally read `docs/project-reference/scss-styling-guide.md` (first 100 lines) for BEM patterns

### Step 3b: Load Existing UI Components (match current system UI)

The mockup should resemble the project's actual UI, not generic HTML. Discover existing components:

1. Read `docs/project-reference/frontend-patterns-reference.md` (first 200 lines) — extract base component classes, common UI patterns, form patterns, table/grid patterns, dialog/modal patterns
2. Glob the project's shared component library (if exists):
    - `Glob("**/libs/*common*/**/*.component.ts")` or `Glob("**/shared/**/*.component.ts")` — discover reusable components (buttons, tables, forms, dialogs, filters, status badges)
    - Read 2-3 key component files to understand their HTML template structure and CSS class naming
3. Glob the module's own components (if PBI module detected):
    - Search for existing page components in the module to understand the current UI layout patterns
    - Read 1-2 existing page templates to capture the actual look and feel (sidebar layout, toolbar patterns, card grids, etc.)
4. Extract from discovered components:
    - **Layout patterns:** Sidebar + content, full-width, split-panel, tabbed
    - **Common components:** Table with pagination, filter bar, action buttons, status chips, breadcrumbs
    - **Form patterns:** Form groups, validation display, multi-step forms
    - **Navigation:** Tab bars, breadcrumbs, sidebar menus

> **Key principle:** Mimic existing system UI. If the project has a table with specific column patterns, use that pattern. If it has card-based layouts, use cards. The mockup should feel like it belongs in the existing application.

### Step 3c: Load Domain Entity Context

Use real domain entities and relationships for realistic mockup data:

1. Read `docs/project-reference/domain-entities-reference.md` (if exists) — extract entities, fields, relationships for the PBI's module
2. From the PBI artifact, extract referenced entities from `## Domain Context` section
3. Use entity field names and types to generate **realistic sample data** in the mockup:
    - Entity names → table column headers, form field labels
    - Entity relationships → navigation links, dropdowns, nested displays
    - Entity statuses/enums → status badges, filter options
    - Date fields → realistic date values
    - String fields → domain-appropriate sample text (employee names, goal titles, etc.)

> **Key principle:** Sample data should use actual entity field names and realistic domain values — not "Lorem ipsum" or "Item 1, Item 2".

### Step 4: Generate HTML Mockup

Generate a **single self-contained HTML file** with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mockup: {PBI Title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
            /* Design system tokens as CSS variables */
            /* Component styles matching project BEM conventions */
            /* Responsive breakpoints */
            /* Dark/light theme support */
        </style>
    </head>
    <body>
        <!-- PBI Header: title, description, metadata -->
        <!-- Navigation tabs (one per story) -->
        <!-- Story sections with mockup UI -->
        <!-- Component state toggles (default/loading/empty/error) -->
        <script>
            /* Tab navigation */
            /* State toggles */
            /* Theme toggle */
            /* Responsive preview toggle */
        </script>
    </body>
</html>
```

#### HTML Structure Requirements

1. **Header Section:**
    - PBI ID and title
    - Module badge
    - Story count summary
    - Generation date

2. **Navigation:**
    - Tab bar with one tab per story (or section per PBI acceptance criteria)
    - Active tab highlight using design system primary color

3. **Story Panels:**
    - Story title and description ("As a... I want... So that...")
    - Visual mockup of the UI described in wireframe/layout sections
    - Component placeholders with realistic sample data
    - State toggle buttons (Default | Loading | Empty | Error)

4. **Footer:**
    - "Generated from PBI {ID}" attribution
    - Link back to artifact path
    - Generation timestamp

#### Styling Rules

- Use CSS custom properties (variables) from design system tokens
- Follow BEM naming: `mockup__header`, `mockup__nav`, `mockup__panel`
- Match the project's color palette, typography, and spacing
- Include both light and dark theme (toggle button in header)
- Responsive: mobile (< 768px) and desktop layout
- Use realistic placeholder data (names, dates, numbers) — not "Lorem ipsum"

#### Component Rendering

Map wireframe components to HTML elements:

| Wireframe Component | HTML Rendering                             |
| ------------------- | ------------------------------------------ |
| Table/Grid          | `<table>` with design system styles        |
| Form                | `<form>` with labeled inputs               |
| Button              | `<button>` with primary/secondary variants |
| Card                | `<div class="card">` with shadow           |
| List                | `<ul>` or data list                        |
| Modal/Dialog        | Overlay `<div>` (toggleable)               |
| Tab panel           | Tab navigation with content panels         |
| Search/Filter       | Input with icon                            |
| Status badge        | `<span>` with color coding                 |
| Empty state         | Centered message with icon                 |
| Loading state       | Skeleton placeholder or spinner            |
| Error state         | Error banner with message                  |

### Step 5: Save HTML File

- **Path:** Same directory as the PBI artifact
- **Name:** `{pbi-filename-without-ext}-mockup.html`
- Example: `team-artifacts/pbis/260324-pbi-goal-tracking-mockup.html`

### Step 6: Report to User

After generation, output:

```
Mockup generated: {path}
- Stories covered: {count}
- Components rendered: {list}
- States included: {default, loading, empty, error}

Open in browser to preview. Use theme toggle for dark/light mode.
```

---

## Mockup Quality Checklist

Before completing:

- [ ] HTML file is self-contained (opens correctly without a server)
- [ ] All stories from PBI are represented as sections/tabs
- [ ] Design system colors and typography match the project
- [ ] Component states are toggleable (where defined in artifact)
- [ ] Responsive layout works for mobile and desktop
- [ ] Realistic placeholder data used (not Lorem ipsum)
- [ ] PBI metadata shown in header (ID, title, module, date)
- [ ] File saved alongside the PBI artifact

---

## Edge Cases

| Scenario                          | Handling                                                |
| --------------------------------- | ------------------------------------------------------- |
| Backend-only PBI (no UI sections) | Skip mockup, inform user                                |
| No stories yet (PBI only)         | Generate mockup from PBI's UI Layout section only       |
| Multiple modules                  | Load primary module's design system                     |
| No design system docs             | Use sensible defaults (Inter font, neutral palette)     |
| Very large PBI (10+ stories)      | Group stories into categories, use collapsible sections |

---

## Anti-Patterns

| Anti-Pattern                     | Correct Approach                         |
| -------------------------------- | ---------------------------------------- |
| Production-quality CSS framework | Simple inline CSS matching design tokens |
| External dependencies (CDN libs) | Self-contained except Google Fonts       |
| Pixel-perfect implementation     | Approximate visual representation        |
| Interactive functionality        | Static mockup with state toggles only    |
| Lorem ipsum placeholder text     | Realistic domain-specific sample data    |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `idea-to-pbi` workflow** (Recommended) — includes mockup as final step
> 2. **Execute `/pbi-mockup` directly** — run this skill standalone on an existing PBI

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — Prioritize the PBI in the backlog
- **"/design-spec"** — Create detailed design specification from mockup
- **"/plan"** — Start implementation planning
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

  <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
