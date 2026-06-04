---
name: pbi-mockup
version: 1.0.0
description: '[Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Give stakeholders a realistic, system-matching visual preview of every story's UI — by generating a self-contained HTML mock-up file (one per PBI covering all stories) from finalized PBI/story artifacts, styled from the project's reference design docs, existing UI, components, and real domain entity data — before implementation begins, so layout/UX/state gaps surface while changes are still cheap.

**Summary:**

- This is a PRE-implementation preview tool, not a UI builder: only run on finalized PBIs/stories (reviewed, gated); for backend-only PBIs with no UI sections, skip generation and tell the user — do NOT use it for production UI, design specs, or scratch wireframes.
- Output is exactly ONE self-contained HTML file per PBI (all stories as tabs/sections), inline CSS/JS, no external deps except Google Fonts, saved alongside the PBI artifact as `{pbi-filename}-mockup.html`.
- Fidelity is the whole point — the mock-up must LOOK like the existing app: load the canonical + matched per-app design-system docs (NEW→canonical, REFACTOR→per-app), read real shared/module components for layout patterns, and populate with real domain entity fields and realistic sample data, never Lorem ipsum.
- Render every defined component state (default/loading/empty/error) as toggleable, keep any accompanying prose/captions tech-agnostic (business terms, not framework/CSS class names) per the M1/M2 mandates, even though the rendered HTML may use real class names internally.

**Workflow:**

1. **Locate Artifacts** — Find PBI and story files in `team-artifacts/pbis/`
2. **Extract UI Specs** — Parse UI Layout, Wireframe, Components, States sections
3. **Load Design System** — Read module-specific design tokens, colors, typography
4. **Load Existing UI** — Read existing components, page layouts, and patterns from the project
5. **Load Domain Entities** — Read entity fields, relationships, and enums for realistic sample data
6. **Generate HTML** — Create self-contained HTML mockup matching the current system's look and feel
7. **Save** — Write HTML file alongside the PBI artifact

**Key Rules:**

- Ask AI to generate an **HTML mock-up** for UI PBIs; do not stop at an ASCII-only mockup.
- One HTML file per PBI (all stories shown as sections/tabs)
- Self-contained: inline CSS/JS, no external dependencies except Google Fonts
- **Must resemble the project's current UI** — read existing component templates and page layouts
- Design must be based on project reference design docs: `docs/project-reference/design-system/README.md`, `docs/project-reference/design-system/design-system-canonical.md`, and the matched per-app design-system doc from `docs/project-config.json`
- Match project design system: colors, typography, spacing, BEM naming
- Use **real domain entity fields and realistic sample data** — not Lorem ipsum
- Include component states (default, loading, empty, error)
- Responsive layout with mobile/desktop preview
- Save in same directory as the PBI artifact
- **Tech-agnostic descriptive prose (M1/M2):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Any narrative, captions, annotations, generation notes, or component/state descriptions accompanying the mock-up describe components and states by business/observable terms (e.g., "status indicator", "record list", "loading placeholder"), NOT by framework component names or CSS class names. The rendered HTML itself may use real class names internally (that is implementation, not prose), but the human-readable descriptions stay tech-agnostic per `docs/project-reference/spec-principles.md` §3.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# PBI HTML Mockup Generator

Generate visual HTML mockup reports from PBI and user story artifacts.

---

## When to Use

- After PBI and stories are finalized (reviewed, challenged, gated)
- Before moving to implementation planning or design spec
- When stakeholders need a visual preview of the feature
- As the final step in `workflow-idea-to-pbi` and similar workflows

**NOT for**: Implementing production UI (use `/feature-implement`), creating design specs (use `/design-spec`), or wireframing from scratch (use `/design-spec --mode=wireframe`).

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
2. Load design system docs dynamically (project-config.json + glob fallback). The HTML mock-up design must be based on these project reference design docs:
    - **Mandatory baseline:** Read `docs/project-reference/design-system/README.md` and `docs/project-reference/design-system/design-system-canonical.md`
    - **Primary:** Read top-level `designSystem` in `docs/project-config.json`: use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the PBI/app context against `designSystem.appMappings[]` to select the per-app doc. Do NOT look for `designSystem` on module entries.
    - **Fallback:** `Glob("docs/project-reference/design-system/*.md")` → match module name against discovered file names (case-insensitive substring match)
    - **Default:** If no match found, use `docs/project-reference/design-system/README.md`
    - **Triage rule (NEW vs REFACTOR):** For NEW pages/components → load `designSystem.canonicalDoc` from top-level `project-config.json` (single source of truth for new code). For REFACTOR of existing screens → load the matched per-app doc via top-level `designSystem.appMappings` (current-state inventory).

3. Extract from design system docs (read enough of the canonical and matched per-app docs to apply the rules):
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
    - String fields → domain-appropriate sample text (customer names, invoice titles, etc.)

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

- Base every visual decision on the loaded project reference design docs; cite the docs used in the generation notes when reporting the mock-up.
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
- [ ] Design is based on `design-system-canonical.md` plus the matched per-app design-system doc when available
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
| No stories yet (PBI only)         | Generate HTML mock-up from PBI's UI Layout section only |
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
> 1. **Activate `workflow-idea-to-pbi` workflow** (Recommended) — includes mockup as final step
> 2. **Execute `/pbi-mockup` directly** — run this skill standalone on an existing PBI

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — Prioritize the PBI in the backlog
- **"/design-spec"** — Create detailed design specification from mockup
- **"/plan"** — Start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Give stakeholders a realistic, system-matching visual preview of every story's UI — built from real domain data and the project's actual design system — before implementation begins, so layout/UX/state gaps surface while changes are still cheap.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced proof per claim, confidence >80% to act, NEVER guess.

**IMPORTANT MUST ATTENTION** run ONLY on finalized PBIs/stories (reviewed, challenged, gated); for a backend-only PBI with no UI sections, SKIP generation and tell the user — never fabricate UI — why: a mock-up of an unfinished or UI-less PBI previews the wrong thing.
**IMPORTANT MUST ATTENTION** emit exactly ONE self-contained HTML file per PBI (all stories as tabs/sections), inline CSS/JS, no external deps except Google Fonts, saved as `{pbi-filename}-mockup.html` beside the PBI artifact — why: stakeholders open one file with no server, no build step.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; add a final review todo to verify quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/next-step decisions with the user via `AskUserQuestion` — never auto-decide complexity for the user.

**Domain rules this skill must not skip:**

**IMPORTANT MUST ATTENTION** fidelity is the whole point — the mock-up must LOOK like the existing app: load the mandatory baseline + matched per-app design-system docs (NEW→`designSystem.canonicalDoc`, REFACTOR→matched `designSystem.appMappings` per-app doc), read real shared/module components for layout patterns — why: a generic-HTML mock-up previews a system that does not exist.
**IMPORTANT MUST ATTENTION** populate with real domain entity field names and realistic sample data — NEVER Lorem ipsum or "Item 1, Item 2" — why: fake data hides the real layout/overflow/state gaps the preview exists to surface.
**IMPORTANT MUST ATTENTION** render every defined component state (default/loading/empty/error) as a toggleable view — why: stakeholders must see how the UI degrades, not only the happy path.
**IMPORTANT MUST ATTENTION** keep all accompanying prose/captions/notes tech-agnostic (business/observable terms, NOT framework or CSS class names) per the M1/M2 mandates in `.claude/skills/shared/sdd-artifact-contract.md`; the rendered HTML MAY use real class names internally (implementation, not prose) — why: tech-coupled descriptions break the spec-principles §3 contract while the rendered markup stays free to be concrete.
**IMPORTANT MUST ATTENTION** read design-system docs, existing components, and domain-entities reference (`docs/project-reference/*`) BEFORE generating — grep/read 2-3 real components first — why: skipping the read produces a mock-up that looks nothing like the app.

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim/finding (confidence >80% to act, <80% verify first) — NEVER speculate about entity fields, design tokens, or component patterns without reading the source — why: hallucinated fields and class names produce a misleading preview.

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "PBI looks ready, skip the gated/finalized check" | Run only on reviewed-and-gated PBIs. An unfinished PBI previews the wrong thing.             |
| "Lorem ipsum is faster"                           | Fake data hides real overflow/state gaps. Use real entity field names + realistic values.    |
| "Generic clean HTML is good enough"               | Fidelity is the point — read design-system docs + 2-3 real components, mimic the actual UI.  |
| "Class names in the notes are fine"               | Prose stays tech-agnostic (M1/M2). Real class names live in the rendered HTML, not captions. |
| "Only need the default state"                     | Render every defined state (default/loading/empty/error) as toggleable.                      |
| "Already know the entity fields"                  | Show `file:line` from the domain-entities reference. No proof = no read.                     |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION Goal:** realistic, system-matching UI preview from real domain data + the actual design system, BEFORE implementation — so gaps surface while cheap.
**IMPORTANT MUST ATTENTION** ONE self-contained HTML per PBI (Google Fonts only), real domain data not Lorem ipsum, every component state toggleable, prose tech-agnostic (M1/M2).
**IMPORTANT MUST ATTENTION** read design-system docs + real components + domain-entities reference first; cite `file:line` (>80% confidence) — NEVER guess fields or tokens.
