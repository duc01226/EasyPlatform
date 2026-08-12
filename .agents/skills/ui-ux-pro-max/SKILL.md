---
name: ui-ux-pro-max
description: '[Frontend] Use when designing beautiful or aesthetic interfaces with curated UI styles, palettes, fonts, charts, and stacks.'
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

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Provide searchable UI/UX design intelligence -- 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks.

**Workflow:**

1. **Analyze** — Extract product type, style keywords, industry, and stack from user request
2. **Search** — Query `search.py` across domains: product, style, typography, color, landing, chart, UX
3. **Stack Guidelines** — Get stack-specific best practices (default: html-tailwind)
4. **Implement** — Synthesize search results into cohesive design and code

**Key Rules:**

- No emojis as UI icons (use SVG: Heroicons, Lucide, Simple Icons)
- All clickable elements need `cursor-pointer` and hover feedback
- Light mode text must have 4.5:1 minimum contrast ratio
- **Every async surface MUST handle all its states** — show a loading indicator while in-flight, a user-visible error (with retry) on failure, and a meaningful empty state when there's no data. Never a frozen blank, a silent failure, or a blank list.
- **Responsive by default** — layouts MUST stay usable on small devices. Preferred: reflow (rows `flex-wrap` or `row → column`, grids collapse to one column). Acceptable fallback when a layout genuinely can't reflow (tables, canvases, wide grids): fixed `min-width`/`min-height` + `overflow: auto` scroll — scrolling is OK. Hard minimum: nothing broken — no clipped, cut-off, or unreachable content. If small-screen support needs a refactor too big for the task, confirm scope with the user first.
- Test both light/dark modes, all UI states (loading/error/empty), and responsive breakpoints (320/768/1024/1440) before delivery

**Pre-read (project design system):** When the project has a design system, load `designSystem.canonicalDoc` + `tokenFiles` from `docs/project-config.json` and prefer project tokens/components over the generic style intelligence database.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# UI/UX Pro Max - Design Intelligence

Searchable database of UI styles, color palettes, font pairings, chart types, product recommendations, UX guidelines, and stack-specific best practices.

## Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**

```bash
brew install python3
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install python3
```

**Windows:**

```powershell
winget install Python.Python.3.12
```

---

## How to Use This Skill

When user requests UI/UX work (design, build, create, implement, review, fix, improve), follow this workflow:

### Step 1: Analyze User Requirements

Extract key information from user request:

- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, etc.
- **Style keywords**: minimal, playful, professional, elegant, dark mode, etc.
- **Industry**: healthcare, fintech, gaming, education, etc.
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Search Relevant Domains

Use `search.py` multiple times to gather comprehensive information. Search until you have enough context.

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**Recommended search order:**

1. **Product** - Get style recommendations for product type
2. **Style** - Get detailed style guide (colors, effects, frameworks)
3. **Typography** - Get font pairings with Google Fonts imports
4. **Color** - Get color palette (Primary, Secondary, CTA, Background, Text, Border)
5. **Landing** - Get page structure (if landing page)
6. **Chart** - Get chart recommendations (if dashboard/analytics)
7. **UX** - Get best practices and anti-patterns
8. **Stack** - Get stack-specific guidelines (default: html-tailwind)

### Step 3: Stack Guidelines (Default: html-tailwind)

If user doesn't specify a stack, **default to `html-tailwind`**.

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`

---

## Search Reference

### Available Domains

| Domain       | Use For                              | Example Keywords                                         |
| ------------ | ------------------------------------ | -------------------------------------------------------- |
| `product`    | Product type recommendations         | SaaS, e-commerce, portfolio, healthcare, beauty, service |
| `style`      | UI styles, colors, effects           | glassmorphism, minimalism, dark mode, brutalism          |
| `typography` | Font pairings, Google Fonts          | elegant, playful, professional, modern                   |
| `color`      | Color palettes by product type       | saas, ecommerce, healthcare, beauty, fintech, service    |
| `landing`    | Page structure, CTA strategies       | hero, hero-centric, testimonial, pricing, social-proof   |
| `chart`      | Chart types, library recommendations | trend, comparison, timeline, funnel, pie                 |
| `ux`         | Best practices, anti-patterns        | animation, accessibility, z-index, loading               |
| `prompt`     | AI prompts, CSS keywords             | (style name)                                             |

### Available Stacks

| Stack           | Focus                                          |
| --------------- | ---------------------------------------------- |
| `html-tailwind` | Tailwind utilities, responsive, a11y (DEFAULT) |
| `react`         | State, hooks, performance, patterns            |
| `nextjs`        | SSR, routing, images, API routes               |
| `vue`           | Composition API, Pinia, Vue Router             |
| `svelte`        | Runes, stores, SvelteKit                       |
| `swiftui`       | Views, State, Navigation, Animation            |
| `react-native`  | Components, Navigation, Lists                  |
| `flutter`       | Widgets, State, Layout, Theming                |

---

## Example Workflow

**User request:** "Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp"

**AI should:**

```bash
# 1. Search product type
python .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --domain product

# 2. Search style (based on industry: beauty, elegant)
python .claude/skills/ui-ux-pro-max/scripts/search.py "elegant minimal soft" --domain style

# 3. Search typography
python .claude/skills/ui-ux-pro-max/scripts/search.py "elegant luxury" --domain typography

# 4. Search color palette
python .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --domain color

# 5. Search landing page structure
python .claude/skills/ui-ux-pro-max/scripts/search.py "hero-centric social-proof" --domain landing

# 6. Search UX guidelines
python .claude/skills/ui-ux-pro-max/scripts/search.py "animation" --domain ux
python .claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux

# 7. Search stack guidelines (default: html-tailwind)
python .claude/skills/ui-ux-pro-max/scripts/search.py "layout responsive" --stack html-tailwind
```

**Then:** Synthesize all search results and implement the design.

---

## Tips for Better Results

1. **Be specific with keywords** - "healthcare SaaS dashboard" > "app"
2. **Search multiple times** - Different keywords reveal different insights
3. **Combine domains** - Style + Typography + Color = Complete design system
4. **Always check UX** - Search "animation", "z-index", "accessibility" for common issues
5. **Use stack flag** - Get implementation-specific best practices
6. **Iterate** - If first search doesn't match, try different keywords

---

## Common Rules for Professional UI

These are frequently overlooked issues that make UI look unprofessional:

### Icons & Visual Elements

| Rule                       | Do                                              | Don't                                  |
| -------------------------- | ----------------------------------------------- | -------------------------------------- |
| **No emoji icons**         | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis like 🎨 🚀 ⚙️ as UI icons   |
| **Stable hover states**    | Use color/opacity transitions on hover          | Use scale transforms that shift layout |
| **Correct brand logos**    | Research official SVG from Simple Icons         | Guess or use incorrect logo paths      |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with w-6 h-6          | Mix different icon sizes randomly      |

### Interaction & Cursor

| Rule                   | Do                                                    | Don't                                        |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------- |
| **Cursor pointer**     | Add `cursor-pointer` to all clickable/hoverable cards | Leave default cursor on interactive elements |
| **Hover feedback**     | Provide visual feedback (color, shadow, border)       | No indication element is interactive         |
| **Smooth transitions** | Use `transition-colors duration-200`                  | Instant state changes or too slow (>500ms)   |

### Light/Dark Mode Contrast

| Rule                      | Do                                  | Don't                                   |
| ------------------------- | ----------------------------------- | --------------------------------------- |
| **Glass card light mode** | Use `bg-white/80` or higher opacity | Use `bg-white/10` (too transparent)     |
| **Text contrast light**   | Use `#0F172A` (slate-900) for text  | Use `#94A3B8` (slate-400) for body text |
| **Muted text light**      | Use `#475569` (slate-600) minimum   | Use gray-400 or lighter                 |
| **Border visibility**     | Use `border-gray-200` in light mode | Use `border-white/10` (invisible)       |

### Layout & Spacing

| Rule                     | Do                                  | Don't                                  |
| ------------------------ | ----------------------------------- | -------------------------------------- |
| **Floating navbar**      | Add `top-4 left-4 right-4` spacing  | Stick navbar to `top-0 left-0 right-0` |
| **Content padding**      | Account for fixed navbar height     | Let content hide behind fixed elements |
| **Consistent max-width** | Use same `max-w-6xl` or `max-w-7xl` | Mix different container widths         |

### Async UI States & Feedback (the most-missed fundamentals)

> **Every screen or component that fetches, submits, or mutates data MUST render all of its states — not just the happy path.** A UI that looks perfect when populated but shows a frozen blank while loading, fails silently on error, or shows nothing when empty is broken UX. Canonical state vocabulary (shared with `design-spec`): **Default / Loading / Disabled / Error / Empty / Success**.

| State                    | Do                                                                        | Don't                                                              |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Loading**              | Show a spinner / skeleton / progress while any request is in-flight       | Leave a frozen or blank screen; block the whole page silently      |
| **Error**                | Show a human-readable message with a retry / recovery action              | Fail silently, swallow the error, or dump a raw stack trace / JSON |
| **Empty**                | Show a meaningful empty state (illustration/message + optional CTA)       | Render a blank area when a list/table has zero items               |
| **In-flight / disabled** | Disable the submit/action button (or show it busy) while its request runs | Allow double-submit by leaving the trigger active                  |
| **Success**              | Confirm completion (toast / inline / visibly updated data)                | Complete a mutation with no acknowledgment to the user             |

### Responsive & Multi-Device (usable on small screens)

| Rule                       | Do                                                                                                           | Don't                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Rows reflow**            | `flex-wrap: wrap` or switch `flex-direction: row → column` at small widths                                   | Fixed `flex-direction: row` that overflows on a phone                             |
| **Grids collapse**         | Multi-column grids collapse to one column on small screens                                                   | Fixed column counts / track widths that never collapse                            |
| **Scroll fallback OK**     | Can't reflow (table/canvas/wide grid)? Fixed `min-width`/`min-height` + `overflow: auto` — scrolling is fine | Content clipped, cut off, or a control unreachable off-screen with no scroll path |
| **Fluid over fixed**       | `min/max-width`, `flex-grow`, `%`/`rem` sizing                                                               | Large fixed px widths on containers/cards/dialogs                                 |
| **Big refactor → confirm** | Small-screen support needs a large layout rewrite → flag it, confirm scope with the user                     | Silently rewriting a big layout, or shipping it broken on small screens           |

---

## Pre-Delivery Checklist

Before delivering UI code, verify these items:

### Visual Quality

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift

### Interaction

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### States & Feedback (async surfaces — verify every one)

- [ ] **Loading** — every data fetch / submit / mutation shows a spinner or skeleton while in-flight (never a frozen blank screen)
- [ ] **Error** — every operation that can fail shows a human-readable error with a retry / recovery path (no silent failure, no raw stack trace)
- [ ] **Empty** — every list / table / collection view has a meaningful empty state (message + optional CTA), not a blank area
- [ ] **In-flight disable** — submit/action buttons are disabled or busy while their request runs (no double-submit)
- [ ] **Success** — completed mutations give confirmation feedback (toast / inline / updated data)

### Light/Dark Mode

- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout & Responsiveness

- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Rows `flex-wrap` or switch `row → column` on small screens; multi-column grids collapse to one column
- [ ] Usable down to 320px — **nothing broken** (no clipped, cut-off, or unreachable content); where a layout genuinely can't reflow, a `min-width`/`min-height` + `overflow: auto` scroll is acceptable
- [ ] Any small-screen fix that needs a large layout refactor was flagged and confirmed with the user (not silently rewritten)

### Accessibility

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

## Related

- `design --lane=marketing` — Marketing/creative UI (landing pages, campaigns)
- `design --lane=product` — Product UIs (dashboards, admin panels, SaaS apps)
- `shadcn-tailwind`
- `design-spec`

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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Provide searchable UI/UX design intelligence — 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks — synthesized into accessible, professional, contrast-correct interfaces.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act, never guess.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
- **Test failure → adjudicate WHO is at fault (source vs test) before forcing green.** A green-again suite is not the goal; the correct verdict on what was actually wrong is. Root-cause first, then triangulate the failure against the governing spec (`docs/specs/**` if one exists) AND the source: SOURCE-WRONG → fix code at the owning layer and keep/strengthen the test; TEST-WRONG → fix the stale assertion/setup at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green, and never change source to satisfy a broken test. Spec silent or ambiguous about which side is correct → STOP and ask the user.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
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
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
