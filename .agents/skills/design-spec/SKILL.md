---
name: design-spec
description: '[Project Management] Use when you need to create UI/UX design specifications from requirements, PBIs, or user stories. Use --mode=wireframe to convert hand-drawn/digital wireframes or UI sketches into structured specs.'
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

**Goal:** Create structured UI/UX design specification documents from requirements or PBIs for developer handoff.

**Workflow:**

1. **Read Source** — Extract UI requirements from PBI, story, or Figma URL
2. **Determine Complexity** — Quick Spec (sections 1-4) vs Full Spec (all 7 sections)
3. **Build Component Inventory** — List new vs existing components
4. **Define States & Tokens** — Interactions, design tokens, responsive breakpoints
5. **Save Artifact** — Output to `team-artifacts/design-specs/`

**Key Rules:**

- If Figma URL provided → auto-routes to `$figma-design` for context extraction
- If wireframe image provided (hand-drawn/digital/tool-export) → handled internally via `--mode=wireframe` (see "Mode: wireframe" below)
- If screenshot provided → uses `visual analysis tooling` for design extraction
- Reference existing design system tokens from `docs/project-reference/design-system/`
- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Include accessibility requirements (keyboard nav, ARIA labels, contrast)
- **[BLOCKING] Tech-agnostic output:** spec prose/headings follow `docs/project-reference/spec-principles.md` §3 — describe components by UX role, not framework/library names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Design Specification

Create structured UI/UX design specification documents from requirements or PBIs for developer handoff.

## When to Use

- A PBI or user story needs a design spec before implementation
- Translating requirements into concrete UI layout, states, and tokens
- Documenting component inventory and interaction patterns
- Creating responsive breakpoint specifications

## When NOT to Use

- This skill auto-routes Figma URLs to `$figma-design`; wireframes are handled internally via `--mode=wireframe` — no need to call a separate skill
- Building the actual UI -- use `frontend-design`
- Reviewing existing UI code -- use `web-design-guidelines`

## Prerequisites

Read before executing:

- The source PBI, user story, or requirements document
- `docs/project-reference/design-system/` -- project design tokens (if applicable)
- Existing design specs in `team-artifacts/design-specs/` for format consistency

### Frontend/UI Context

> When this task involves frontend or UI changes,

- Frontend patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

## Workflow

1. **Read source input & route by type**

    | Input Detected           | Detection                                      | Action                                                                    |
    | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
    | Figma URL                | `figma.com/design` or `figma.com/file` in text | Activate `$figma-design` to extract context, then continue                |
    | Image/screenshot         | Image file attached to prompt                  | Use `visual analysis tooling` to extract design guidelines, then continue |
    | Hand-drawn wireframe     | Image + "wireframe"/"sketch" keyword           | Run `--mode=wireframe` (internal — see "Mode: wireframe" section)         |
    | PBI/story text           | Acceptance criteria present                    | Extract UI requirements from text, continue                               |
    | Verbal/text requirements | No image, no URL, no PBI                       | Clarify with user, then continue                                          |

For ANY visual input: extract design context FIRST, then proceed to spec generation.

2. **Determine spec complexity**

    ```
    IF single form or simple component → Quick Spec (sections 1-4 only)
    IF full page or multi-component view → Full Spec (all 7 sections)
    IF multi-page flow → Full Spec + Flow Diagram
    ```

3. **Build component inventory**
    - List all UI components needed
    - Identify reusable vs feature-specific components
    - Note existing components from shared component library or design system

4. **Define states and interactions**
    - Default, hover, active, disabled, error, loading, empty states
    - User interactions (click, drag, keyboard shortcuts)
    - Transitions and animations

5. **Extract design tokens**
    - Colors, typography, spacing, shadows, border-radius
    - Reference existing design system tokens where possible

6. **Document responsive behavior**
    - Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+)
    - What changes at each breakpoint (layout, visibility, sizing)

7. **Save artifact** — pick the filename variant by artifact type:
    - Design spec: `team-artifacts/design-specs/{YYMMDD}-designspec-{feature-slug}.md`
    - Accessibility audit: `team-artifacts/design-specs/{YYMMDD}-ux-audit-{feature-slug}.md`
    - Single-component doc: `team-artifacts/design-specs/{YYMMDD}-ux-component-{component-name}.md`

### Role Context & Artifact Path (canonical)

> Applies to Writes under `team-artifacts/design-specs/`.

- **Active Role:** ui-ux-designer · **Skill:** design-spec
- **Path:** `team-artifacts/design-specs/` · **Type:** designspec · **Role token:** ux
- **Template:** `.claude/docs/team-artifacts/templates/design-spec-template.md`
- **Naming:** `{YYMMDD}-ux-{type}-{slug}.md` (general artifact-path pattern: `{YYMMDD}-{role}-{type}-{slug}.md`)
- **Context:** DESIGN SPEC — include component states, design tokens, accessibility requirements.
- **Quality checklist:** `- [ ]` All states documented · `- [ ]` Design tokens specified · `- [ ]` Accessibility notes included · `- [ ]` Responsive breakpoints defined

## Mode: wireframe (image → spec)

> **Invoke with `--mode=wireframe`** (or whenever a hand-drawn wireframe, digital wireframe, or UI sketch is the input). This mode is an INPUT adapter: it analyzes the image, then flows into the normal spec sections (Output Format) and the M1-M5 compliance gate. `design-spec` is the canonical owner of wireframe→spec conversion.

### Input Routing (wireframe)

| Input                   | Detection                               | Action                                       |
| ----------------------- | --------------------------------------- | -------------------------------------------- |
| Hand-drawn sketch photo | Image with rough/organic lines          | Analyze with wireframe prompts (this mode)   |
| Digital wireframe       | Image with clean lines/shapes           | Analyze with wireframe prompts (this mode)   |
| Wireframe tool export   | Image from Excalidraw/Balsamiq/MockFlow | Analyze with wireframe prompts (this mode)   |
| Figma URL               | `figma.com` in text                     | Route to `$figma-design` instead             |
| App screenshot          | Polished UI with real data              | Route to `$design --mode=screenshot` instead |

### Wireframe Analysis

Use `visual analysis tooling` with these prompts:

**Prompt 1: Layout Extraction** — "Analyze this wireframe image. Identify: (1) page layout regions (header, sidebar, main, footer), (2) all UI elements with approximate position and type (button, input, table, card, dropdown, modal, tabs), (3) content hierarchy (what is primary vs secondary), (4) interactive elements, (5) any text labels or annotations, (6) navigation patterns."

**Prompt 2: Component Identification** — "From the wireframe, list every distinct UI component. For each: name it descriptively, classify its complexity (primitive=single element, composite=grouped elements, section=page region), note its purpose."

### Wireframe Output Generation

After image analysis, generate (per the `SYNC:ui-wireframe-protocol` block below):

1. **ASCII Wireframe** — Recreate layout using box-drawing characters
2. **Component Inventory** — List with tier classification (Common/Domain-Shared/Page)
3. **States Table** — Default, Loading, Empty, Error per view
4. **Component Decomposition Tree** — If detail level warrants (refine/story)
5. **Responsive Suggestions** — Based on layout complexity

Apply the **M1-M5 Compliance for UI Specs** gate (below) to all wireframe-derived prose: business-level component names, no code-prop refs, map to feature logic by logical ID, observable state transitions, rebuild-from-spec.

### Mapped Business Operations

Emit this table linking each interactive component to the feature operations/rules it drives (logical ID is the primary spine; mark `[UNVERIFIED — needs feature-spec mapping]` when the wireframe alone cannot determine it):

| Interactive Component | Interaction (observable) | Feature Operation / Rule (logical ID) | Notes                            |
| --------------------- | ------------------------ | ------------------------------------- | -------------------------------- |
| Primary Button        | Click → submit form      | OP-XX                                 | Triggers create/update operation |
| Filter Dropdown       | Select → reload list     | OP-XX                                 | Drives query/search operation    |
| Row Action Menu       | Click → confirm dialog   | BR-XX                                 | Guarded by authorization rule    |

### Wireframe Output Formats

- **Format A: PBI Section (default)** — output a standalone `## UI Layout` section compatible with PBI/story templates (consumed by `$pbi-mockup`).
- **Format B: Standalone Spec** — output to `team-artifacts/design-specs/{YYMMDD}-wireframe-spec-{slug}.md`.

### Confidence & Review (wireframe)

- **Always display confidence level** for wireframe interpretation (analysis is 70-80% accurate).
- **Always recommend human review** before proceeding to implementation.
- If confidence <70%: ask clarifying questions about ambiguous elements via a direct user question.

## Output Format

```markdown
# Design Spec: {Feature Name}

**Source:** {PBI/story reference}
**Date:** {YYMMDD}
**Status:** Draft | Review | Approved

## 1. Overview

{1-2 sentence summary of what this UI does}

## 2. Component Inventory

| Component | Type     | Source           | Notes                       |
| --------- | -------- | ---------------- | --------------------------- |
| UserCard  | New      | Feature-specific | Displays user avatar + name |
| DataTable | Existing | shared library   | Reuse with custom columns   |

## 3. Layout

{Description or ASCII wireframe of layout structure}

- Desktop: {layout description}
- Tablet: {layout changes}
- Mobile: {layout changes}

## 4. Design Tokens

| Token      | Value          | Usage                 |
| ---------- | -------------- | --------------------- |
| $primary   | #1976D2        | Action buttons, links |
| $text-body | 14px/1.5 Inter | Body text             |
| $gap-md    | 16px           | Section spacing       |

## 5. States & Interactions

| Element  | Default    | Hover      | Active     | Disabled         | Error |
| -------- | ---------- | ---------- | ---------- | ---------------- | ----- |
| Save btn | Blue/white | Darken 10% | Scale 0.98 | Gray/50% opacity | --    |

## 6. Accessibility

- Keyboard navigation order
- ARIA labels for interactive elements
- Color contrast compliance notes

## 7. Open Questions

- {Any unresolved design decisions}
```

## M1-M5 Compliance for UI Specs

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. A UI spec MUST satisfy these before handoff:

- **M1 — Business-level component names.** Name every component by its UX role — Primary Button, Secondary Button, Modal Dialog, Data Table, Dropdown, Toast — NEVER by a framework component class name or library import. FAIL on tech-term prose.
- **M2 — No code-prop refs in prose.** Describe behavior and appearance in plain UX language. NEVER reference component-state props, CSS class names, framework directives, or selectors in prose. Those belong only in `**Evidence**`/`[Source:]` carriers, frontmatter, and Mermaid.
- **M3 — Cross-reference by logical ID.** For every behavior driven by feature logic, cite the driving operation or rule by its logical ID (`OP-`/`BR-`/`FR-`) — link UI behavior back to the feature spec, not to handler code. Keep any `[Source: namespace/service/id]` abstract anchor strictly in the Evidence carrier — never physical code coordinates or repository-root paths.
- **M4 — Testable, unambiguous behavior.** Every state and interaction MUST have exactly one valid interpretation and an observable completion marker. Replace vague phrases ("handle appropriately", "show feedback") with the concrete observable result.
- **M5 — Rebuild-from-spec.** A reader with zero codebase knowledge MUST be able to rebuild this UI on ANY framework from the spec alone. If a marker is only resolvable by reading source, it fails M5 — restate it as a visual/textual observable.

### Observable State Definitions

Define every state by what a user can SEE (color, icon, position, text), the business meaning, and the operation/rule that triggers it — NEVER by CSS class or component-state prop:

| State    | Visual Markers (observable)                            | Business Meaning                           | Triggering Operation / Rule (logical ID) |
| -------- | ------------------------------------------------------ | ------------------------------------------ | ---------------------------------------- |
| Default  | Primary fill color, enabled label, no spinner          | Action available to the actor              | OP-XX (entry state)                      |
| Loading  | Spinner icon replaces label, control non-interactive   | Operation in progress, awaiting result     | OP-XX (request submitted)                |
| Disabled | Muted/gray fill, label dimmed, no pointer affordance   | Precondition not met / actor not permitted | BR-XX (authorization or guard rule)      |
| Error    | Error-color border, inline message text, alert icon    | Operation rejected or validation failed    | BR-XX (validation rule)                  |
| Empty    | Placeholder illustration + guidance text, no data rows | No records exist for the current view      | OP-XX (query returned zero results)      |
| Success  | Confirmation toast/checkmark, updated visible data     | Operation completed and persisted          | OP-XX (operation succeeded)              |

## Component States Checklist

Every interactive component MUST document all 7 states by their **observable appearance and business meaning** — never by CSS class or framework prop (see M2):

- **Default** — resting appearance; action available to the actor
- **Hover** — pointer-over affordance change (cursor / elevation / color shift)
- **Active** — pressed/engaged feedback during interaction
- **Focus** — keyboard-focus indicator (visible ring/outline) for a11y traversal
- **Disabled** — muted/non-interactive; precondition or permission not met
- **Error** — validation/operation failure with inline message + alert affordance
- **Loading** — in-progress indicator (spinner / skeleton); control non-interactive

## Accessibility Audit (WCAG 2.1 AA)

For an accessibility-audit deliverable, produce this checklist report and save it as `{YYMMDD}-ux-audit-{feature-slug}.md`:

```markdown
## Accessibility Audit: {Feature}

**Date:** {Date}
**Auditor:** {Name}
**Standard:** WCAG 2.1 AA

### Criteria Checklist

#### Perceivable

- [ ] 1.1.1 Non-text Content: Alt text for images
- [ ] 1.3.1 Info and Relationships: Semantic HTML
- [ ] 1.3.2 Meaningful Sequence: Logical reading order
- [ ] 1.4.1 Use of Color: Not sole means of conveying info
- [ ] 1.4.3 Contrast (Minimum): 4.5:1 text, 3:1 large text
- [ ] 1.4.4 Resize Text: Readable at 200% zoom
- [ ] 1.4.11 Non-text Contrast: 3:1 for UI components

#### Operable

- [ ] 2.1.1 Keyboard: All functions keyboard accessible
- [ ] 2.1.2 No Keyboard Trap: Can navigate away
- [ ] 2.4.1 Bypass Blocks: Skip navigation available
- [ ] 2.4.3 Focus Order: Logical tab sequence
- [ ] 2.4.4 Link Purpose: Clear from link text
- [ ] 2.4.6 Headings and Labels: Descriptive
- [ ] 2.4.7 Focus Visible: Clear focus indicator

#### Understandable

- [ ] 3.1.1 Language of Page: lang attribute set
- [ ] 3.2.1 On Focus: No unexpected context change
- [ ] 3.2.2 On Input: No unexpected context change
- [ ] 3.3.1 Error Identification: Clear error messages
- [ ] 3.3.2 Labels or Instructions: Form labels present

#### Robust

- [ ] 4.1.1 Parsing: Valid HTML
- [ ] 4.1.2 Name, Role, Value: ARIA where needed

### Issues Found

| #   | Criterion | Issue | Severity | Recommendation |
| --- | --------- | ----- | -------- | -------------- |
| 1   |           |       | P1/P2/P3 |                |

### Audit Status: PASS / FAIL / CONDITIONAL

**Remediation Priority:**
{List items by severity}
```

## Examples

### Example 1: Simple form spec

**Input:** "Design spec for customer onboarding form"

**Output:** Quick Spec with sections 1-4 covering form fields (name, email, company name, plan-tier dropdown), validation rules, submit/cancel actions, and mobile stacking behavior.

### Example 2: Complex dashboard spec

**Input:** "Design spec for order pipeline dashboard with drag-and-drop columns"

**Output:** Full Spec covering Kanban board layout, order cards (component inventory), drag-and-drop interactions, column states (empty, populated, over-limit), filter bar, responsive collapse to list view on mobile, and accessibility for keyboard drag operations.

## Related Skills

| Skill                   | When to use instead                  |
| ----------------------- | ------------------------------------ |
| `figma-design`          | Extract specs from Figma designs     |
| `frontend-design`       | Build the actual UI implementation   |
| `interface-design`      | Product UI design (dashboards, apps) |
| `web-design-guidelines` | Review existing UI for compliance    |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Run the design sequence** (Recommended) — `$design-spec` → `$interface-design` (product UIs) or `$frontend-design` (marketing/creative) → `$workflow-review-changes`
> 2. **Execute `$design-spec` directly** — run this skill standalone

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:ui-wireframe-protocol -->

> **UI Wireframe Protocol** — Wireframe-to-implementation flow: (1) Process design input (Figma/screenshot/sketch via visual analysis tooling). (2) Create ASCII wireframe with box-drawing chars. (3) Build component inventory with tier classification (Common/Domain-Shared/Page). (4) Document states (Default/Loading/Empty/Error). (5) Map to design tokens. (6) Define responsive breakpoints. Search existing component libraries before creating new. Progressive detail by skill level (idea=sketch, story=full tree+specs).

<!-- /SYNC:ui-wireframe-protocol -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ui-system-context:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
  <!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:ui-wireframe-protocol:reminder -->

**IMPORTANT MUST ATTENTION** follow wireframe protocol: ASCII wireframe, component inventory with tiers, states table, design tokens, responsive breakpoints.

<!-- /SYNC:ui-wireframe-protocol:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Create structured, tech-agnostic UI/UX design specification documents from requirements or PBIs for developer handoff.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** read frontend-patterns, scss-styling, design-system before any UI change.
- **UI Wireframe:** ASCII wireframe, tiered component inventory, states table, tokens, responsive breakpoints.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
