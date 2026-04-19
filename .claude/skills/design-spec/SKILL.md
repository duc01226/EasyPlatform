---
name: design-spec
version: 2.0.0
description: '[Project Management] Create UI/UX design specifications from requirements, PBIs, or user stories. Produces structured design spec documents with layout, typography, colors, interactions, and responsive breakpoints. Triggers on design spec, design specification, UI specification, component spec, layout spec, wireframe, mockup.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**Goal:** Create structured UI/UX design specification documents from requirements or PBIs for developer handoff.

**Workflow:**

1. **Read Source** — Extract UI requirements from PBI, story, or Figma URL
2. **Determine Complexity** — Quick Spec (sections 1-4) vs Full Spec (all 7 sections)
3. **Build Component Inventory** — List new vs existing components
4. **Define States & Tokens** — Interactions, design tokens, responsive breakpoints
5. **Save Artifact** — Output to `team-artifacts/design-specs/`

**Key Rules:**

- If Figma URL provided → auto-routes to `/figma-design` for context extraction
- If wireframe image provided → auto-routes to `/wireframe-to-spec` for structured analysis
- If screenshot provided → uses `ai-multimodal` for design extraction
- Reference existing design system tokens from `docs/project-reference/design-system/`
- Component patterns: `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- Include accessibility requirements (keyboard nav, ARIA labels, contrast)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Design Specification

Create structured UI/UX design specification documents from requirements or PBIs for developer handoff.

## When to Use

- A PBI or user story needs a design spec before implementation
- Translating requirements into concrete UI layout, states, and tokens
- Documenting component inventory and interaction patterns
- Creating responsive breakpoint specifications

## When NOT to Use

- This skill auto-routes Figma URLs to `/figma-design` and wireframes to `/wireframe-to-spec` — no need to call those skills separately
- Building the actual UI -- use `frontend-design`
- Full UX research and design process -- use `ux-designer`
- Reviewing existing UI code -- use `web-design-guidelines`

## Prerequisites

Read before executing:

- The source PBI, user story, or requirements document
- `docs/project-reference/design-system/` -- project design tokens (if applicable)
- Existing design specs in `team-artifacts/design-specs/` for format consistency

### Frontend/UI Context

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

- Frontend patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

## Workflow

1. **Read source input & route by type**

    | Input Detected           | Detection                                      | Action                                                                   |
    | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------ |
    | Figma URL                | `figma.com/design` or `figma.com/file` in text | Activate `/figma-design` to extract context, then continue               |
    | Image/screenshot         | Image file attached to prompt                  | Use `ai-multimodal` to extract design guidelines, then continue          |
    | Hand-drawn wireframe     | Image + "wireframe"/"sketch" keyword           | Activate `/wireframe-to-spec` to generate structured spec, then continue |
    | PBI/story text           | Acceptance criteria present                    | Extract UI requirements from text, continue                              |
    | Verbal/text requirements | No image, no URL, no PBI                       | Clarify with user, then continue                                         |

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

7. **Save artifact**
    - Path: `team-artifacts/design-specs/{YYMMDD}-designspec-{feature-slug}.md`

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

## Examples

### Example 1: Simple form spec

**Input:** "Design spec for employee onboarding form"

**Output:** Quick Spec with sections 1-4 covering form fields (name, email, department dropdown, start date picker), validation rules, submit/cancel actions, and mobile stacking behavior.

### Example 2: Complex dashboard spec

**Input:** "Design spec for recruitment pipeline dashboard with drag-and-drop columns"

**Output:** Full Spec covering Kanban board layout, candidate cards (component inventory), drag-and-drop interactions, column states (empty, populated, over-limit), filter bar, responsive collapse to list view on mobile, and accessibility for keyboard drag operations.

## Related Skills

| Skill                   | When to use instead                  |
| ----------------------- | ------------------------------------ |
| `ux-designer`           | Full UX design process with research |
| `figma-design`          | Extract specs from Figma designs     |
| `frontend-design`       | Build the actual UI implementation   |
| `interface-design`      | Product UI design (dashboards, apps) |
| `web-design-guidelines` | Review existing UI for compliance    |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `design-workflow` workflow** (Recommended) — design-spec → code-review
> 2. **Execute `/design-spec` directly** — run this skill standalone

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:ui-system-context:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
