---
name: pbi-mockup
description: '[Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

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

**NOT for**: Implementing production UI (use `$feature-implement`), creating design specs (use `$design-spec`), or wireframing from scratch (use `$design-spec --mode=wireframe`).

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

- **Input from:** `$refine`, `$story`
- **Command:** `$pbi-mockup`
- **Next Step:** `$prioritize`, `$design-spec`, `$plan`

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

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** (Recommended) — includes mockup as final step
> 2. **Execute `$pbi-mockup` directly** — run this skill standalone on an existing PBI

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$prioritize (Recommended)"** — Prioritize the PBI in the backlog
- **"$design-spec"** — Create detailed design specification from mockup
- **"$plan"** — Start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

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

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; add a final review todo to verify quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/next-step decisions with the user via a direct user question — never auto-decide complexity for the user.

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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**IMPORTANT MUST ATTENTION Goal:** realistic, system-matching UI preview from real domain data + the actual design system, BEFORE implementation — so gaps surface while cheap.
**IMPORTANT MUST ATTENTION** ONE self-contained HTML per PBI (Google Fonts only), real domain data not Lorem ipsum, every component state toggleable, prose tech-agnostic (M1/M2).
**IMPORTANT MUST ATTENTION** read design-system docs + real components + domain-entities reference first; cite `file:line` (>80% confidence) — NEVER guess fields or tokens.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
