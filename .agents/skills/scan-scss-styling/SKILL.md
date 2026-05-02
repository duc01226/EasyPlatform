---
name: scan-scss-styling
description: '[Documentation] Scan project and populate/sync docs/project-reference/scss-styling-guide.md with BEM methodology, SCSS architecture, mixins, variables, theming, and responsive patterns.'
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

**Goal:** Scan project stylesheets → populate `docs/project-reference/scss-styling-guide.md` with BEM methodology usage, SCSS architecture, mixin/variable inventory, theming patterns, responsive breakpoints, and design token conventions.

**Workflow:**

1. **Classify** — Detect styling approach and scan mode
2. **Scan** — Parallel sub-agents discover patterns with `file:line` evidence
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates all variable names and file paths

**Key Rules:**

- Generic — works with any CSS methodology (SCSS, Less, CSS Modules, Tailwind, CSS-in-JS)
  **MUST ATTENTION** detect styling approach FIRST — scan patterns differ significantly
- Every variable value, mixin signature, and breakpoint must come from actual declarations
- Focus on project conventions — NOT generic CSS tutorials

---

# Scan SCSS Styling

## Phase 0: Detect Styling Approach & Mode

**[BLOCKING]** Before any other step, run in parallel:

1. Read `docs/project-reference/scss-styling-guide.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect styling approach:

| Signal                                | Approach     | Agent Emphasis                                          |
| ------------------------------------- | ------------ | ------------------------------------------------------- |
| `*.scss` files present                | SCSS/Sass    | Both agents (variables + BEM)                           |
| `*.less` files present                | Less         | Adapt variable patterns to Less syntax                  |
| `*.module.css`/`*.module.scss`        | CSS Modules  | Focus on naming conventions, composition                |
| `tailwind.config.*` present           | Tailwind CSS | Config-first: extract theme overrides, custom utilities |
| `styled-components`/`emotion` in deps | CSS-in-JS    | Component-level style colocation, theme provider        |
| Multiple approaches                   | Hybrid       | Document each separately with clear boundary            |

3. Detect BEM usage:

| Signal                                           | BEM Adoption | Notes                                      |
| ------------------------------------------------ | ------------ | ------------------------------------------ |
| `block__element--modifier` patterns in templates | Active BEM   | Document separator style and nesting rules |
| Mixed BEM and utility classes                    | Partial BEM  | Document which layer uses which approach   |
| Only utility classes (Tailwind, Bootstrap)       | No BEM       | Document utility class conventions instead |

4. Load styling config from `docs/project-config.json` `designSystem.tokenFiles` if available.

5. Detect source scope for token discovery (whitelist):
    - `src/**/styles/**/*.{scss,css}` — global styles
    - `src/**/themes/**/*.{scss,css}` — theme files
    - `src/**/tokens/**/*.{scss,css}` — token files
    - EXCLUDE: `node_modules`, `dist`, `.nx`, `coverage`, component-local styles

**Evidence gate:** Confidence <60% on primary approach → report uncertainty, proceed with Agent 1 (structure) only.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each category — NEVER batch at end
- Cite `file:line` for every variable name, mixin, and example
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit
- **Declarations only — NOT usages** when cataloguing variables and mixins

All findings → `plans/reports/scan-scss-styling-{YYMMDD}-{HHMM}-report.md`

### Agent 1: SCSS Architecture & Variables

**Think (Import chain dimension):** What's the entry point? Where do global styles load? Is there a predictable import order (reset → tokens → utilities → components)? What breaks if the order changes?

**Think (Variable declaration dimension):** Which variables are authoritative declarations vs usages? Are CSS custom properties mirroring SCSS variables (dual-declaration pattern)? What's the naming convention (BEM-inspired, semantic, functional)?

**Think (Breakpoint dimension):** Where are breakpoints defined? Is there a responsive mixin or just raw media queries scattered across files? Mobile-first or desktop-first?

- Glob for `**/*.scss` (or detected extension) within whitelist scope
- Find global stylesheet entry points and their `@import`/`@use`/`@forward` chains
- Grep for SCSS variable declarations (`^\s*\$[a-zA-Z][a-zA-Z0-9_-]*\s*:`) — dedupe, group by category
- Grep for CSS custom property declarations (`--[a-zA-Z][a-zA-Z0-9_-]*\s*:`) in `:root` or theme blocks
- Find mixin definitions (`@mixin\s+[a-zA-Z]`) — capture signature + one usage example
- Find function definitions (`@function\s+[a-zA-Z]`)
- Find breakpoint definitions — extract values from media queries and breakpoint variables

Quality gate: If a variable category has <3 unique declarations OR >200, log "scope too narrow/broad — manual refinement required."

### Agent 2: BEM Patterns & Theming

**Think (BEM convention dimension):** What's the exact separator style (double-underscore `__`, double-dash `--`, or variants)? What's the maximum nesting depth before patterns break? Are modifiers on blocks, elements, or both?

**Think (Theming dimension):** How many themes exist? Is theming via CSS custom property overrides, SCSS theme maps, or class-based switching? How does a developer add a new theme?

**Think (Component scoping dimension):** Are styles co-located with components (scoped) or global? What naming convention prevents cross-component contamination?

- Grep for BEM class patterns in templates/HTML (`__` and `--` separators) — find 5+ concrete examples
- Find BEM naming conventions in SCSS (nesting patterns, `&__element`, `&--modifier`)
- Discover theming patterns — CSS custom property overrides, theme class switching, dark mode
- Find component-scoped vs global style patterns and where each is used
- Look for z-index management (variables, scale, stacking context rules)
- Find animation/transition conventions (duration variables, easing variables)
- Identify color palette — grep declarations only (hex, hsl, rgb in variable declarations)

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Do ALL variable names in examples exist as actual declarations? (Grep verify — declarations, not usages)
- Do mixin names in examples match actual `@mixin` definitions? (Grep verify)
- Do color values come from declarations, not fabricated hex codes?
- Are breakpoint values read from actual config, not assumed from common values?

### Target Sections

| Section                 | Content                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **BEM Methodology**     | Separator style, nesting rules, block/element/modifier examples from actual components |
| **SCSS Architecture**   | File organization, import chain, global vs component style boundary                    |
| **Mixins & Functions**  | Table: name, signature, purpose, `file:line` — declarations only                       |
| **Variables & Tokens**  | Table: category (color/spacing/type/breakpoint), variable name, purpose, `file:line`   |
| **Theming**             | Theme approach, CSS custom property blocks, how to add/modify a theme                  |
| **Responsive Patterns** | Breakpoint definitions, responsive mixin usage, mobile-first vs desktop-first          |
| **Color Palette**       | Color variables/tokens grouped by semantic role (not raw hex list)                     |
| **Z-Index Scale**       | Z-index variable definitions and layer naming conventions                              |
| **Anti-Patterns**       | What NOT to do — global overrides, specificity hacks, hardcoded values                 |

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob): ALL stylesheet file paths in examples exist
4. Verify (Grep): ALL variable names match actual declarations — NOT usages
5. Verify (Grep): ALL mixin names match actual `@mixin` definitions
6. Report: sections created vs updated, approach detected, undocumented styling gaps

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
> **Verify AI-generated content against actual code.** AI hallucinates variable names, mixin signatures, and hex color values. Grep to confirm existence before documenting.
> **NEVER invent variable values, hex colors, breakpoint values, or mixin signatures.** Grep declarations — NOT usages — to confirm before documenting.
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
**IMPORTANT MUST ATTENTION** detect styling approach in Phase 0 — patterns differ significantly by approach
**IMPORTANT MUST ATTENTION** NEVER invent variable values, hex colors, or mixin signatures — grep declarations
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each category — NEVER batch at end
**IMPORTANT MUST ATTENTION** declarations only for variables/mixins — NOT usages — in the catalog
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — validates variable names and values

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| "Styling approach obvious, skip Phase 0 detection" | Phase 0 is BLOCKING — SCSS vs Tailwind vs CSS-in-JS require completely different agent patterns |
| "Variable names look standard (`$primary-color`)"  | Grep-verify every variable name against actual declarations — AI hallucinates variable names    |
| "Breakpoints are probably 768px/1024px"            | Read breakpoint declarations — NEVER assume common values                                       |
| "Color values look right"                          | ALL color values must come from grep of actual declarations                                     |
| "Usages and declarations are the same thing"       | NEVER mix them — document only declarations as authoritative                                    |
| "Round 2 not needed for styling docs"              | Main agent rationalizes fabricated variable values. Fresh-eyes mandatory.                       |

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
