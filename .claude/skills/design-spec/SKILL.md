---
name: design-spec
version: 2.0.0
description: '[Project Management] Use when you need to create UI/UX design specifications from requirements, PBIs, or user stories. Use --mode=wireframe to convert hand-drawn/digital wireframes or UI sketches into structured specs.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a structured, tech-agnostic UI/UX design specification from a requirement/PBI/story/wireframe so a developer can rebuild the UI on ANY stack — every component, state, design token, responsive rule, and accessibility need documented and linked back to the governing Feature Spec.

**Summary (read this if nothing else — PURPOSE + every main step):**

- **Purpose** — translate requirements into a developer-ready UI/UX spec (component inventory, states, design tokens, responsive behavior, accessibility), tech-agnostic: name components by UX role, never by framework/library class.
- **Step 0–0b — research first:** inventory existing related screens/components + map connected flows, record in §1 so the spec matches the live UI system; if a governing Feature Spec exists, seed from its §6 interaction surface and reuse its view + observable-state vocabulary verbatim. — why: divergent vocabulary breaks the navigable spec↔design hub.
- **Step 1–2 — read & route input, set complexity:** Figma URL → `/figma-design`; image/screenshot → visual analysis tooling; wireframe/sketch → `--mode=wireframe`; PBI/text → extract requirements. Pick Quick Spec (§1–4) vs Full Spec (§1–7, +Flow Diagram for multi-page).
- **Step 3–6 — author the body:** build component inventory (new vs existing), define all 7 states + interactions, extract design tokens (reuse design-system), document responsive breakpoints (mobile 320–767 / tablet 768–1023 / desktop 1024+).
- **Step 7–8 — save & link back:** write the artifact to `team-artifacts/design-specs/`, then set the governing Feature Spec's `design_spec:`/`mockup:` frontmatter to the saved path — frontmatter only, never the §1–8 body. — why: `artifact-review --type=design` fails if the path is not recorded.

**Workflow:**

1. **Read Source** — Extract UI requirements from PBI, story, or Figma URL
2. **Determine Complexity** — Quick Spec (sections 1-4) vs Full Spec (all 7 sections)
3. **Build Component Inventory** — List new vs existing components
4. **Define States & Tokens** — Interactions, design tokens, responsive breakpoints
5. **Save Artifact** — Output to `team-artifacts/design-specs/`

**Key Rules:**

- If Figma URL provided → auto-routes to `/figma-design` for context extraction
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

- This skill auto-routes Figma URLs to `/figma-design`; wireframes are handled internally via `--mode=wireframe` — no need to call a separate skill
- Building the actual UI -- use `design --lane=marketing` (marketing/creative) or `design --lane=product` (product UIs)
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

> **[BLOCKING] Step 0 — Inventory existing UI + map connected flows** (per the `SYNC:existing-ui-research` protocol carried by this skill). Before authoring the spec, inventory the existing related screens / components / pages already serving this feature or domain, and map every connected feature flow that links to / embeds / navigates to-or-from the new screen. Record the matched screens + flows in §1 Overview so the spec faithfully matches the current UI system. Skip only for backend-only work (state it explicitly).

> **[BLOCKING] Step 0b — Seed from the governing Feature Spec's §6 interaction surface (when one exists).** Detect whether a canonical Feature Spec already governs this feature (look under `docs/specs/**` for a spec covering the same capability). If one exists, READ its **§6 Process Flows & Interaction Surface** — the **View Inventory** (§6.2), **Navigation Map** (§6.3), **Key UI States** (§6.4), and **Per-Story Interaction Flow** (§6.5) — and use it as this design-spec's starting frame:
>
> - **Reuse the spec's vocabulary verbatim** — carry over the SAME UX-role view names from §6.2 and the SAME observable-state names from §6.4 (the Default / Loading / Disabled / Error / Empty / Success vocabulary in this skill's "Observable State Definitions" table is the shared language). NEVER rename or re-partition what the spec already named — the two artifacts MUST speak the same language or the navigable hub breaks.
> - **Deepen, do not diverge or contradict.** The spec stays tech-agnostic; this design-spec is the companion that adds visual fidelity (layout, tokens, pixel detail) ON TOP of the spec's intent. Map each §6.5 step and each §6.4 state into concrete visual treatment, preserving the `US-`/`OP-`/`BR-` logical-ID cross-refs the spec already owns.
> - This coupling is the `SYNC:ui-intent-layer` contract carried below — see that block for the full rule; do not restate it here.
>
> **Skip ONLY** when no governing Feature Spec exists (author the interaction frame from the source PBI/story instead) — state which case applies.

1. **Read source input & route by type**

    | Input Detected           | Detection                                      | Action                                                                    |
    | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
    | Figma URL                | `figma.com/design` or `figma.com/file` in text | Activate `/figma-design` to extract context, then continue                |
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
    - **Small-screen minimum bar (spec it explicitly):** the layout MUST stay usable on mobile. Preferred = reflow (rows `flex-wrap` / `row → column`, grids collapse to one column). Where a component genuinely can't reflow (data tables, canvases, wide grids), specify a `min-width`/`min-height` + `overflow: auto` scroll as the accepted fallback — scrolling is OK. Hard requirement = nothing broken (no clipped, cut-off, or unreachable content/controls). If a component needs a large redesign to work on mobile, flag it for the user rather than assuming a rewrite.

7. **Save artifact** — pick the filename variant by artifact type:
    - Design spec: `team-artifacts/design-specs/{YYMMDD}-designspec-{feature-slug}.md`
    - Accessibility audit: `team-artifacts/design-specs/{YYMMDD}-ux-audit-{feature-slug}.md`
    - Single-component doc: `team-artifacts/design-specs/{YYMMDD}-ux-component-{component-name}.md`

8. **Link back to the governing Feature Spec (when one exists).** After saving the artifact, keep the spec the navigable hub: open the governing Feature Spec under `docs/specs/**` and set its frontmatter `design_spec:` key to this design-spec's saved path (add the key if absent, update it if stale). If a mockup was also produced (e.g. via `/pbi-mockup`), set the `mockup:` key the same way. Edit **frontmatter only** — never touch the §1–§8 spec body. This satisfies the `artifact-review --type=design` link-back gate, which fails when a design-spec exists but its path is not recorded in the spec's `design_spec:` frontmatter. Skip ONLY when no governing Feature Spec exists (the design-spec is standalone) — state that.

### Role Context & Artifact Path (canonical)

> Applies to Writes under `team-artifacts/design-specs/`.

- **Active Role:** ui-ux-designer · **Skill:** design-spec
- **Path:** `team-artifacts/design-specs/` · **Type:** designspec · **Role token:** ux
- **Template:** `.claude/docs/team-artifacts/templates/design-spec-template.md`
- **Naming:** `{YYMMDD}-ux-{type}-{slug}.md` (general artifact-path pattern: `{YYMMDD}-{role}-{type}-{slug}.md`)
- **Context:** DESIGN SPEC — include component states, design tokens, accessibility requirements.
- **Quality checklist:** `- [ ]` All states documented · `- [ ]` Design tokens specified · `- [ ]` Accessibility notes included · `- [ ]` Responsive breakpoints defined

## Mode: wireframe (image → spec)

> **Invoke with `--mode=wireframe`** (or whenever a hand-drawn wireframe, digital wireframe, or UI sketch is the input). This mode is an INPUT adapter: it analyzes the image, then flows into the normal spec sections (Output Format) and the M1-M5/M7 compliance gate. `design-spec` is the canonical owner of wireframe→spec conversion.

### Input Routing (wireframe)

| Input                   | Detection                               | Action                                       |
| ----------------------- | --------------------------------------- | -------------------------------------------- |
| Hand-drawn sketch photo | Image with rough/organic lines          | Analyze with wireframe prompts (this mode)   |
| Digital wireframe       | Image with clean lines/shapes           | Analyze with wireframe prompts (this mode)   |
| Wireframe tool export   | Image from Excalidraw/Balsamiq/MockFlow | Analyze with wireframe prompts (this mode)   |
| Figma URL               | `figma.com` in text                     | Route to `/figma-design` instead             |
| App screenshot          | Polished UI with real data              | Route to `/design --mode=screenshot` instead |

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

Apply the **M1-M5/M7 Compliance for UI Specs** gate (below) to all wireframe-derived prose: business-level component names, no code-prop refs, map to feature logic by logical ID, observable state transitions, rebuild-from-spec, business-visible subject matter.

Wireframe-derived specs carry the same **Design-Principles Obligations** (below): the States Table (item 3) is authored empty/loading/error FIRST (`UI-1.5`) and covers all 5 interaction states per interactive element (`UI-5.2`); the Responsive Suggestions (item 5) break where the CONTENT breaks, not at device names (`UI-4.4`); and where the sketch is silent on type scale, spacing unit, or contrast (`UI-2.5`, `UI-4.1`, `UI-3.1`), record them in §4 as `[UNVERIFIED — needs design-system mapping]` rather than inventing one-off values measured off the drawing.

### Mapped Business Operations

Emit this table linking each interactive component to the feature operations/rules it drives (logical ID is the primary spine; mark `[UNVERIFIED — needs feature-spec mapping]` when the wireframe alone cannot determine it):

| Interactive Component | Interaction (observable) | Feature Operation / Rule (logical ID) | Notes                            |
| --------------------- | ------------------------ | ------------------------------------- | -------------------------------- |
| Primary Button        | Click → submit form      | OP-XX                                 | Triggers create/update operation |
| Filter Dropdown       | Select → reload list     | OP-XX                                 | Drives query/search operation    |
| Row Action Menu       | Click → confirm dialog   | BR-XX                                 | Guarded by authorization rule    |

### Wireframe Output Formats

- **Format A: PBI Section (default)** — output a standalone `## UI Layout` section compatible with PBI/story templates (consumed by `/pbi-mockup`).
- **Format B: Standalone Spec** — output to `team-artifacts/design-specs/{YYMMDD}-wireframe-spec-{slug}.md`.

### Confidence & Review (wireframe)

- **Always display confidence level** for wireframe interpretation (analysis is 70-80% accurate).
- **Always recommend human review** before proceeding to implementation.
- If confidence <70%: ask clarifying questions about ambiguous elements via `AskUserQuestion`.

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

## Design-Principles Obligations (per spec section)

The spec is where the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`, the `SYNC:ui-ux-design-principles` block below) become INHERITABLE — a downstream implementer builds what the spec SAYS, so an unstated clause is an unbuilt clause. Every spec this skill emits MUST carry these obligations in the named Output Format sections. Project design-system docs OUTRANK the clauses; a genuine conflict is surfaced to the user with both sides, NEVER resolved silently.

| Spec section                  | Clause obligation the section MUST carry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **§1 Overview**               | Name the ONE focal point of the screen (`UI-1.1`), and name the surface(s) in scope (web / mobile / both) so the mobile clauses (`UI-8.1`–`UI-8.4`) are either binding or explicitly skipped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **§3 Layout**                 | Group by proximity and shared alignment edges, never by nested borders (`UI-1.3`, `UI-1.4`); justify each breakpoint by where the CONTENT stops working, not by a device name (`UI-4.4`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **§4 Design Tokens**          | **DECLARE the type scale as 6 named steps with no one-off sizes** (`UI-2.5`): body 16px web / 17px mobile and NEVER below 14px (`UI-2.2`), measure 45–75 characters (`UI-2.3`), leading 1.5 body / 1.1–1.2 display (`UI-2.4`), max 2 families × 3 weights (`UI-2.1`). **DECLARE ONE spacing unit** — 4px or 8px base with every gap a multiple (`UI-4.1`), space owned by the container via a gap property (`UI-4.2`), inner padding tighter than the gap to the next group (`UI-4.3`). A token table of ad-hoc values instead of a declared scale FAILS this gate.                                                                                                                                                                                    |
| **§4 Design Tokens (colour)** | State the contrast TARGET AND THE MEASURED VALUE for every token pair — 4.5:1 text, 3:1 UI edges (`UI-3.1`) — measured, never eyeballed. One accent with one job (`UI-3.2`); dark mode specified as lifted surfaces + softened white text, NOT an inversion (`UI-3.4`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **§5 States & Interactions**  | **Author the empty, loading and error state FIRST — before the populated state (`UI-1.5`).** Enumerate ALL 5 interaction states per interactive element — default, hover, focus, active, disabled — plus loading where it applies (`UI-5.2`, consistent with the 7-state Component States Checklist below). Response under 100ms even when the result takes longer (`UI-5.1`); motion 150–250ms ease-out honouring reduced-motion (`UI-5.4`); undo preferred over confirmation, confirm ONLY the irreversible (`UI-5.3`). Forms: labels always visible, placeholders are hints NEVER labels (`UI-7.2`); validate on blur with the fix-it message beside the field (`UI-7.3`); NEVER lose entered data across errors, navigation or refresh (`UI-7.5`). |
| **§6 Accessibility**          | The focus ring stays VISIBLE — restyled if it clashes, NEVER removed (`UI-5.5`); colour is never the sole carrier of meaning (`UI-3.3`); on any mobile/touch surface hit targets ≥44×44pt and 8px apart (`UI-8.1`), primary actions in the bottom third (`UI-8.2`), gestures never the only route (`UI-8.3`), safe areas and the on-screen keyboard respected (`UI-8.4`).                                                                                                                                                                                                                                                                                                                                                                              |
| **§7 Open Questions**         | Every clause deliberately deviated from, with the project doc or user decision that authorises it — an undocumented deviation is a spec defect, not a style choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Keep every clause obligation written in observable UX language so it survives the M1-M5/M7 gate below — state the visible outcome, never a CSS property or framework prop.

**Skip ONLY** when the feature has no user-facing surface — state that explicitly so the skip is auditable, not an omission.

## M1-M5/M7 Compliance for UI Specs

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. A UI spec MUST satisfy these before handoff:

- **M1 — Business-level component names.** Name every component by its UX role — Primary Button, Secondary Button, Modal Dialog, Data Table, Dropdown, Toast — NEVER by a framework component class name or library import. FAIL on tech-term prose.
- **M2 — No code-prop refs in prose.** Describe behavior and appearance in plain UX language. NEVER reference component-state props, CSS class names, framework directives, or selectors in prose. Those belong only in `**Evidence**`/`[Source:]` carriers, frontmatter, and Mermaid.
- **M3 — Cross-reference by logical ID.** For every behavior driven by feature logic, cite the driving operation or rule by its logical ID (`OP-`/`BR-`/`FR-`) — link UI behavior back to the feature spec, not to handler code. Keep any `[Source: namespace/service/id]` abstract anchor strictly in the Evidence carrier — never physical code coordinates or repository-root paths.
- **M4 — Testable, unambiguous behavior.** Every state and interaction MUST have exactly one valid interpretation and an observable completion marker. Replace vague phrases ("handle appropriately", "show feedback") with the concrete observable result.
- **M5 — Rebuild-from-spec.** A reader with zero codebase knowledge MUST be able to rebuild this UI on ANY framework from the spec alone. If a marker is only resolvable by reading source, it fails M5 — restate it as a visual/textual observable.
- **M7 — Business-visibility.** A UI spec is a business-tree artifact, so apply the demo test to each case's BODY: _"what would a stakeholder SEE change?"_ — no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count. Judge the BODY, never the title or ID. ⚠️ **A UI state a user can SEE is business and PASSES M7** — a spinner, an empty placeholder, an error border, a disabled control are all demoable outcomes, not technical cases. Only invocation-shaped or schema-asserting cases fail.

> **M1 vs M7 — they are not the same gate.** M1 governs **vocabulary**; M7 governs **subject matter**. A technical case in impeccably tech-free prose satisfies M1 while violating M7 — _"the view correctly reflects the synchronized record"_ names no framework, passes M1, and is still a technical case wearing a business costume. That gap is the most common way business specs rot. Ask what a user could SEE, not which words were used.

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

| Skill                     | When to use instead                 |
| ------------------------- | ----------------------------------- |
| `figma-design`            | Extract specs from Figma designs    |
| `design --lane=marketing` | Build marketing/creative UI         |
| `design --lane=product`   | Build product UI (dashboards, apps) |
| `web-design-guidelines`   | Review existing UI for compliance   |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Run the design sequence** (Recommended) — `/design-spec` → `/design --lane=product` (product UIs) or `/design --lane=marketing` (marketing/creative) → `/workflow-review-changes`
> 2. **Execute `/design-spec` directly** — run this skill standalone

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:existing-ui-research -->

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult design-system docs + the real component inventory).
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer existing components, patterns, and layout conventions; justify any new component against what already exists.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

<!-- /SYNC:existing-ui-research -->

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable UI States** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story interaction flow** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the spec already owns (`US-`/`OP-`/`BR-`).
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked `design-spec`/mockup. Record that companion's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and flows. Technology detail belongs in the companion design artifact, never here.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
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

<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile)** — the working rule set for ANY task that designs, plans, implements, or reviews a user interface. Applies to BOTH platforms unless a clause names one (§8 is mobile/touch). Cite clauses by ID: `UI-3.1`, `UI-8.2`.
>
> **Precedence:** project design-system / SCSS / frontend-pattern docs OUTRANK these clauses; these clauses outrank generic taste. A genuine conflict is SURFACED to the user with both sides — NEVER resolved silently. — why: the project's own recorded decision is the authority; these clauses are the default when it is silent.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per screen. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity, NEVER by border. Whitespace separates cleanly; boxes inside boxes do not.
> - `UI-1.4` Align to a shared edge. Every unexplained indent reads as an accident.
> - `UI-1.5` Design the empty, loading and error state FIRST. The full state is the easy one.
>
> **2.0 Typography**
>
> - `UI-2.1` Max 2 families, 3 weights each. More variety reads as inconsistency, not range.
> - `UI-2.2` Body text 16px web, 17px mobile. NEVER below 14px for anything a user must read.
> - `UI-2.3` Line length 45–75 characters. Constrain the measure, not the container.
> - `UI-2.4` Leading scales inversely with size: 1.5 body, 1.1–1.2 display.
> - `UI-2.5` Fixed type scale — 6 named steps shared with engineering. NEVER one-off sizes.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Contrast 4.5:1 text, 3:1 UI edges. Measure it — NEVER judge by eye on a bright screen.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` One spacing unit, multiplied — 4px or 8px base; every gap a multiple of it.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Tighter inside, looser between — inner padding always smaller than the gap to the next group.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Every action gets a response under 100ms, even when the result takes longer.
> - `UI-5.2` Specify all 5 states — default, hover, focus, active, disabled — plus loading where it applies.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Motion clarifies cause and effect: 150–250ms, ease-out, honours reduced-motion.
> - `UI-5.5` Keep the visible focus ring. Restyle it if it clashes; NEVER remove it.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Max 5 top-level destinations. Depth beats a crowded first level.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Every state deserves a URL or a back path. Deep links and hardware back must land somewhere sensible.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason it exists today.
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate on blur, not on keystroke. Errors sit next to the field and say how to fix it.
> - `UI-7.4` Match keyboard to data type — correct input type, autocomplete and autocapitalise on every field.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Hit target ≥44×44pt, 8px apart. The target may exceed the visible icon.
> - `UI-8.2` Primary actions in the bottom third — that is where the thumb lives.
> - `UI-8.3` Gestures are shortcuts, NEVER the only route. Anything swipeable is also tappable.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Show structure before data — skeletons for known layouts, spinners only for unknown waits.
> - `UI-9.2` Assume success optimistically. Update UI first, reconcile after, roll back visibly on failure.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` Design for the slow connection. Offline, timeout and retry are states, NOT edge cases.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role                                | Obligation                                                                                                                                                              |
> | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | DESIGN / PLAN a surface             | Clauses shape the artifact: empty/loading/error specified first (`UI-1.5`), all 5 states enumerated (`UI-5.2`), type scale + spacing unit declared (`UI-2.5`, `UI-4.1`) |
> | IMPLEMENT a component               | Pre-completion gate: states · tokens · contrast · focus ring · touch target · reserved space (`UI-5.2`, `UI-2.5`/`UI-4.1`, `UI-3.1`, `UI-5.5`, `UI-8.1`, `UI-9.3`)      |
> | REVIEW UI code or a design artifact | Each clause is a fail-condition; every finding cites `UI-<clause>` + `file:line` + severity. NEVER a tick-box sweep — one focused pass per section                      |
> | SCAN / document a UI system         | Record where the PROJECT deliberately deviates, so the overriding doc becomes the recorded authority                                                                    |
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

<!-- /SYNC:ui-ux-design-principles -->

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

<!-- SYNC:ui-ux-design-principles:reminder -->

- **MUST ATTENTION** apply the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) to any user-facing surface: one focal point, proximity grouping, empty/loading/error designed FIRST (§1) · ≤2 families, 16px web / 17px mobile body, never <14px, 45–75ch, fixed 6-step scale (§2) · 4.5:1 text / 3:1 edges measured, one accent, colour never alone, dark mode ≠ inversion (§3) · one 4/8px unit, `gap` over margins, tighter-inside-looser-between, content-driven breakpoints (§4) · <100ms response, all 5 states, undo over confirm, 150–250ms ease-out honouring reduced-motion, visible focus ring (§5) · where-am-I/what's-here/where-next, ≤5 top-level destinations, user's words, URL or back path (§6) · fewer fields, visible labels, validate on blur, matched keyboard, NEVER lose input (§7) · ≥44×44pt targets 8px apart, bottom-third primaries, gestures never the only route, safe areas (§8) · structure before data, optimistic update with visible rollback, reserved space, slow-connection states (§9). Project design-system docs OUTRANK these clauses — a genuine conflict goes to the user, NEVER resolved silently. Cite every finding as `UI-<clause>` + `file:line`. Skip ONLY for changes with no user-facing surface, stated explicitly.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:ui-wireframe-protocol:reminder -->

**IMPORTANT MUST ATTENTION** follow wireframe protocol: ASCII wireframe, component inventory with tiers, states table, design tokens, responsive breakpoints.

<!-- /SYNC:ui-wireframe-protocol:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (View Inventory + Navigation Map + observable UI States + per-story `US-/OP-/BR-`-traced flow); keep deep visual fidelity in the linked `design-spec`/mockup recorded in frontmatter; name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a structured, tech-agnostic UI/UX design specification from a requirement/PBI/story/wireframe so a developer can rebuild the UI on ANY stack — every component, state, design token, responsive rule, and accessibility need documented and linked back to the governing Feature Spec.

**IMPORTANT MUST ATTENTION main steps (do not forget any):**

- **Step 0–0b first** — inventory existing related UI + map connected flows (record in §1); seed from the governing Feature Spec's §6 and reuse its view/state vocabulary verbatim — why: reinventing what exists or renaming spec terms breaks the navigable hub.
- **Step 1–2** — route by input type (Figma→`/figma-design`, image→visual analysis, wireframe→`--mode=wireframe`, PBI/text→extract), then set Quick (§1–4) vs Full (§1–7) complexity.
- **Step 3–6** — author component inventory (new vs existing), all 7 states + interactions, design tokens (reuse design-system), responsive breakpoints.
- **Step 7–8** — save to `team-artifacts/design-specs/`, then set the governing Feature Spec's `design_spec:`/`mockup:` frontmatter to the saved path (frontmatter only) — why: the link-back gate fails without it.
- **M1–M5 gate (BLOCKING)** — business-level component names, no code-prop refs in prose, cross-ref behavior by logical ID (`OP-`/`BR-`/`FR-`), one testable interpretation per state, rebuildable from spec alone — why: a tech-leaking spec cannot be rebuilt on another stack.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** read frontend-patterns, scss-styling, design-system before any UI change.
- **UI Wireframe:** ASCII wireframe, tiered component inventory, states table, tokens, responsive breakpoints.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** carry the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) into the spec sections so implementers INHERIT them: §5 authors empty/loading/error FIRST (`UI-1.5`) and enumerates all 5 interaction states per interactive element (`UI-5.2`); §4 DECLARES the 6-step type scale (`UI-2.5`) and the ONE 4/8px spacing unit (`UI-4.1`) instead of one-off values, with contrast targets measured and stated (4.5:1 text / 3:1 edges, `UI-3.1`); §6 keeps the focus ring visible (`UI-5.5`), colour never alone (`UI-3.3`), and ≥44×44pt targets + bottom-third primaries on touch surfaces (`UI-8.1`, `UI-8.2`); §7 records every deliberate deviation — why: an unstated clause is an unbuilt clause once the spec leaves this skill

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "I'll skip the existing-UI inventory and design"   | Step 0 is BLOCKING — inventory existing screens/flows first or the spec contradicts the live UI.    |
| "Naming the framework component is clearer"        | M1/M2 FAIL — name by UX role; framework/CSS names live only in Evidence/frontmatter/Mermaid.        |
| "The spec already names views — I'll re-partition" | Reuse §6 view + state vocabulary verbatim; renaming breaks the navigable spec↔design hub.           |
| "Saved the file — done"                            | Step 8 link-back is required; set the spec's `design_spec:` frontmatter or `artifact-review` fails. |
| "'Show feedback' describes the error state"        | M4 FAIL — every state needs one observable completion marker, not a vague phrase.                   |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
