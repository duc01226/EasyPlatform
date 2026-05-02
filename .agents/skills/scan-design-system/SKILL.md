---
name: scan-design-system
description: '[Documentation] Scan project and populate/sync docs/project-reference/design-system/README.md with design system overview, app-to-doc mapping, design tokens, and component inventory.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan project for design system artifacts → populate `docs/project-reference/design-system/README.md` with overview, app-to-documentation mapping, design token inventory, and component catalog. (Codex has no hook injection — open this file directly before proceeding)

**Workflow:**

1. **Classify** — Detect design system type and approach before scanning
2. **Scan** — Parallel sub-agents discover structure, components, tokens
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates paths and token values

**Key Rules:**

- Generic — works with any design system approach
- Discover organization dynamically from file system
  **MUST ATTENTION** detect design system TYPE first — agent emphasis depends on type
- Every reference must point to real files — NEVER fabricate component names or token values

---

# Scan Design System

## Phase 0: Classify Design System Type

**Before any other step**, run in parallel:

1. Read `docs/project-reference/design-system/README.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect design system type:

| Signal                                                                     | Type              | Agent Emphasis                           |
| -------------------------------------------------------------------------- | ----------------- | ---------------------------------------- |
| Token files (`design-tokens.json`, `tokens.scss`, Style Dictionary config) | Token-first       | Prioritize Agent 3 (token discovery)     |
| Storybook config (`.storybook/`, `*.stories.ts`)                           | Component-library | Prioritize Agent 2 (component inventory) |
| Figma token exports or `figma-tokens.json`                                 | Figma-driven      | Prioritize Agent 3 (token import chain)  |
| Only component directories, no token files                                 | Ad-hoc/CSS-only   | Prioritize Agent 1 (structure)           |
| Mix of above                                                               | Hybrid            | Run all 3 agents with equal weight       |

3. Resolve config-driven paths from `docs/project-config.json`:
    - `designSystem.canonicalDoc` — single source of truth for new code
    - `designSystem.tokenFiles` — drop-in token files
    - **Never hardcode these names** — content varies per project, names come from config.

4. Check for app-specific design docs in the same directory

**Evidence gate:** Confidence <60% on design system type → report uncertainty, proceed with Agent 1 (structure) only.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each category — NEVER batch at end
- Cite `file:line` for every finding
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-design-system-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Design System Structure

**Think:** How is the design system organized? What's the canonical doc? What's the token chain? Which apps have design docs and which don't?

- Glob for `docs/project-reference/design-system/**` to map all design docs
- Find design token files (CSS custom properties, SCSS variables, JSON tokens)
- Discover Storybook stories (`*.stories.ts`, `*.stories.tsx`, `*.stories.mdx`)
- Find component library entry points (index files, barrel exports)
- Map app-to-design-doc relationships
- **Verify canonical doc** at `{docsPath}/{canonicalDoc}` has expected sections. Flag missing sections.
- **Verify token files** at `{docsPath}/{tokenFiles[i]}` exist and contain variable declarations. Flag empty/missing.

### Agent 2: Component Inventory

**Think:** What dimensions define a complete component inventory? Consider: Discoverability (can I find it?), Categorization (what type?), Variant coverage (size/color/state?), Accessibility (ARIA/keyboard?), Documentation completeness (JSDoc/README/Storybook?), Icon/asset library coverage.

For each dimension, derive the specific grep/glob patterns from what the project actually uses — do NOT hardcode Angular/React/Vue-specific patterns unless confirmed.

- Find reusable UI components (shared component directories, exported components)
- Find component categories (layout, forms, feedback, navigation, data display)
- Discover component variants (size, color, state variations)
- Find icon sets or asset libraries
- Look for accessibility patterns (ARIA roles, keyboard support)
- Find documentation for individual components

### Agent 3: Token & Component Source Discovery

**Think:** What design tokens actually exist in source code (not just what's documented)? Which are declarations (authoritative) vs usages (derived)?

**Source scope (whitelist, not full repo):**

- `src/**/styles/**/*.{scss,css}`, `src/**/themes/**/*.{scss,css}`, `src/**/tokens/**/*.{scss,css}`
- `src/**/*.scss` ONLY when path contains `theme`, `token`, `palette`, `design`, `style-guide`, or `variables`
- Exclude `node_modules`, `dist`, `.nx`, `coverage`, component-local styles

**Discovery rules (declarations only, NOT usages):**

- CSS custom properties (declarations): `--[a-zA-Z][a-zA-Z0-9_-]*\s*:` — capture LHS only, dedupe
- SCSS variable declarations: `^\s*\$[a-zA-Z][a-zA-Z0-9_-]*\s*:` — anchor to start-of-line
- Color values used ≥3 times across whitelist (hex, rgb, hsl)
- Spacing scale (declarations): `(padding|margin|gap)\s*:\s*[\d.]+(px|rem|em)` — extract values, dedupe
- Typography (declarations): `(font-family|font-size|font-weight)\s*:` — extract RHS, dedupe
- Breakpoints: `@media[^{]*\((min|max)-width:\s*[\d.]+(px|em|rem)\)` — extract widths, dedupe

**Categorise:** Colors / Typography / Spacing / Breakpoints / Z-Index / Elevation / Component-prefixes / Other.
**Persist incrementally** — append to report after each category.
**Quality gate:** If a category has <3 unique entries OR >200 entries, log "scope too narrow/broad — manual refinement required".

## Phase 3: Analyze & Generate

Read report. Build target sections.

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):** Independently verifies:

- All doc paths exist on filesystem (Glob check — not just "looks right")
- All token values are from actual declarations, not usages or fabricated
- Component names in inventory match actual files (Grep check)
- Gap Analysis section present (what's missing, not just what exists)

### Target Sections

| Section                    | Content                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Design System Overview** | High-level description — type, tools, organization                             |
| **App Documentation Map**  | Table: App name, Design doc path, Token source, Component library              |
| **Design Tokens**          | Token categories, file locations, naming convention — values from declarations |
| **Component Inventory**    | Table: Component name, Category, Variants, Path, Has docs?                     |
| **Gap Analysis**           | Missing docs, zero-adoption tokens, undocumented components                    |
| **Icon & Asset Library**   | Icon set source, asset directory paths, usage patterns                         |
| **Storybook**              | Setup (if exists), story organization, how to add new stories                  |
| **Usage Guidelines**       | How to consume tokens and components in application code                       |

### Authoring (init mode only)

When init mode detected (canonical doc missing or placeholder):

1. **Author `{docsPath}/{canonicalDoc}`** from Agent 3 findings:
    - **Prepend regen marker:** `<!-- Generated by $scan-design-system on YYYY-MM-DD; refine sections manually -->`
    - Sections: Foundations, Tokens, Components, Patterns, Accessibility, Adoption Strategy
2. **Author each `{docsPath}/{tokenFiles[i]}`** from grouped declarations:
    - **First: REMOVE `PLACEHOLDER_MARKER_SCSS` sentinel** before writing real tokens
    - `.scss`: SCSS variable block per category + CSS custom property mirrors in `:root {}`
    - Categories: Colors, Typography, Spacing, Breakpoints, Z-Index, Elevation/Shadow
3. **Preserve manual content in sync mode** — DO NOT overwrite populated doc/token file

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify config-driven paths: `{docsPath}/{canonicalDoc}` and every `{docsPath}/{tokenFiles[i]}`
4. Verify (Glob): ALL component paths in inventory exist — not just 3
5. Verify (Grep): Token names in doc match actual declarations in source
6. Verify: Gap Analysis section present
7. Report: sections updated / unchanged / gaps documented / canonical + token presence

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates component names/token values. Grep to confirm existence before documenting.
> **NEVER invent variable values, hex colors, or mixin signatures.** Grep to confirm before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect design system TYPE in Phase 0 — agent emphasis depends on it
**IMPORTANT MUST ATTENTION** NEVER invent variable values, hex colors, or mixin signatures — Grep to confirm
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each category — NEVER batch at end
**IMPORTANT MUST ATTENTION** Gap Analysis section is mandatory — document what's missing, not just what exists
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — validates paths and token values

**Anti-Rationalization:**

| Evasion                                              | Rebuttal                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| "Design system type obvious, skip Phase 0 detection" | Phase 0 is BLOCKING — agent emphasis depends on detected type                  |
| "Only 2 agents needed, skip token discovery agent"   | Token discovery is separate from component inventory — NEVER merge             |
| "Token values look correct"                          | Grep-verify ALL token values against declarations — "looks correct" ≠ verified |
| "Gap Analysis not needed"                            | Gap Analysis is a required section — documents what's missing for future work  |
| "Round 2 verification not needed for small scan"     | Main agent rationalizes own mistakes. Fresh-eyes mandatory.                    |
| "Verified 3 paths, that's enough"                    | Glob-verify ALL paths in inventory — spot-check is insufficient                |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
