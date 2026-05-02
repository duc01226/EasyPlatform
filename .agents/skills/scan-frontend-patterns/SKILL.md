---
name: scan-frontend-patterns
description: '[Documentation] Scan project and populate/sync docs/project-reference/frontend-patterns-reference.md with component base classes, state management, forms, API services, routing, and styling conventions.'
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

**Goal:** Scan frontend codebase → populate `docs/project-reference/frontend-patterns-reference.md` with component base classes, state management patterns, form handling, API service patterns, routing conventions, and directory structure.

**Workflow:**

1. **Classify** — Detect framework and scan mode
2. **Scan** — Parallel sub-agents discover patterns with `file:line` evidence
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates all examples

**Key Rules:**

- Generic — works with any frontend framework (Angular, React, Vue, Svelte, etc.)
  **MUST ATTENTION** detect framework FIRST — agent scope and grep patterns depend on it
- Every code example from actual project files with `file:line`

---

# Scan Frontend Patterns

## Phase 0: Detect Framework & Mode

**[BLOCKING]** Before any other step, run in parallel:

1. Read `docs/project-reference/frontend-patterns-reference.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect frontend framework:

| Signal                                   | Framework       | Key Patterns to Search                                               |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------- |
| `angular.json` + `nx.json`               | Angular (Nx)    | `AppBaseComponent`, `PlatformVmStore`, `untilDestroyed`, BEM classes |
| `angular.json` (no Nx)                   | Angular         | `@Component`, `OnDestroy`, reactive forms, `HttpClient`              |
| `package.json` with `react`/`next`       | React           | hooks, context, `useState`, `useEffect`, `fetch` wrappers            |
| `package.json` with `vue`/`nuxt`         | Vue             | Composition API, `ref`, `reactive`, Pinia stores                     |
| `package.json` with `svelte`/`sveltekit` | Svelte          | `$:` reactivity, stores, `onMount`/`onDestroy`                       |
| Multiple frameworks                      | Multi-framework | Document each separately — DO NOT merge                              |

3. Detect scan mode:

| Mode | Condition                                    | Action                                               |
| ---- | -------------------------------------------- | ---------------------------------------------------- |
| Init | Target doc doesn't exist or placeholder only | Full scan, create all sections                       |
| Sync | Target doc has real content                  | Diff scan — check new base classes, changed patterns |

4. Load app paths from `docs/project-config.json` `contextGroups`/`modules[]` if available.

**Evidence gate:** Confidence <60% on framework → report uncertainty, ask user before proceeding.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each pattern category — NEVER batch at end
- Cite `file:line` for every pattern example
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-frontend-patterns-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Component & Form Patterns

**Think (Base Class dimension):** What base classes exist? What does each provide — lifecycle, subscriptions, form helpers, DI? Which base class is used for simple components vs complex state vs forms?

**Think (Form dimension):** Is form state reactive or template-driven? Where does validation live — in the form, in validators, in the model? What's the error display pattern?

**Think (Cleanup dimension):** How are subscriptions cleaned up? Is there a shared mechanism (e.g., `untilDestroyed()`) or is each component responsible?

- Grep for component base classes (`extends.*Component`, `AppBaseComponent`, `React.Component`, `defineComponent`)
- Find form handling patterns (reactive forms, form builders, validation approach, error display)
- Discover component lifecycle conventions (init, destroy, cleanup patterns)
- Find template/JSX conventions (structural patterns, conditional rendering, BEM class patterns)
- Find component communication patterns (inputs/outputs, props/events, signals, `@Input`/`@Output`)

### Agent 2: State Management & API Services

**Think (State dimension):** What is the data flow — unidirectional? How does a component trigger a data load? How does it receive updates? What prevents race conditions?

**Think (API dimension):** Is there a service base class? What does it provide — base URL, auth headers, error mapping? Who calls the HTTP layer — directly in components or via service abstraction?

**Think (Subscription dimension):** What patterns prevent memory leaks? Is cleanup enforced by a linter/base class or left to developer discipline?

- Grep for state management (`PlatformVmStore`, `Store`, `useReducer`, `createStore`, `defineStore`, signals)
- Find API service base classes (`extends.*Service`, `PlatformApiService`, `HttpClient`, `fetch` wrappers)
- Discover data fetching patterns (interceptors, error handling, loading states, caching)
- Find subscription/cleanup patterns (`untilDestroyed`, `takeUntil`, `unsubscribe`, dispose callbacks)
- Look for shared/common service patterns and DI registration

### Agent 3: Routing, Directives & Directory Structure

**Think (Routing dimension):** How are routes protected? What's the lazy-loading boundary? How are navigation events handled? Is there a routing hierarchy?

**Think (Reuse dimension):** What custom directives/pipes exist? Are they in a shared library? What naming conventions distinguish feature-specific from cross-cutting reusables?

**Think (Organization dimension):** What's the pattern for where things live — feature modules, domain libraries, shared libs? How do apps consume shared code?

- Grep for routing configuration (route definitions, guards, resolvers, lazy loading, `canActivate`)
- Find custom directives/pipes/hooks and their registration patterns
- Discover module/library organization (shared modules, feature modules, Nx library structure)
- Map directory structure conventions (where components, services, models, and specs live)
- Find build configuration and environment patterns (proxy configs, env-specific settings)

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Does every code example exist at the claimed `file:line`? (Glob + Grep verify)
- Do base class names in examples match actual class definitions? (Grep verify)
- Are store method names real (not hallucinated)? (Grep verify)
- Are cleanup patterns documented with actual implementation evidence?

### Target Sections

| Section                    | Content                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **Component Base Classes** | Hierarchy with what each base provides; when to use which              |
| **State Management**       | Store pattern, reactivity approach, data flow conventions              |
| **Forms**                  | Form creation pattern, validation approach, error display              |
| **API Services**           | Service base class, HTTP call pattern, error handling                  |
| **Routing**                | Route definition pattern, guards, lazy loading, navigation conventions |
| **Directives & Pipes**     | Custom reusable behaviors, naming conventions, registration            |
| **Directory Structure**    | Where things live: components, services, models, shared code           |
| **Subscription Cleanup**   | How subscriptions/listeners are managed and cleaned up                 |
| **Styling Conventions**    | Component styling approach (scoped, BEM, utility classes)              |

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob + Grep): ALL code example file paths exist AND class/method names match
4. Verify base class hierarchy from at least 3 concrete examples
5. Report: sections created vs updated, framework detected, gaps

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
> **Verify AI-generated content against actual code.** AI hallucinates class names, method signatures, and base class hierarchies. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.
> **NEVER fabricate base class names, lifecycle hooks, or store method names.** Grep to confirm before documenting.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect framework in Phase 0 — agent patterns depend on framework
**IMPORTANT MUST ATTENTION** cite `file:line` for every code example — NEVER fabricate class or method names
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each category — NEVER batch at end
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — NEVER declare PASS after Round 1

**Anti-Rationalization:**

| Evasion                                        | Rebuttal                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"    | Phase 0 is BLOCKING — grep patterns and agent scope depend on detected framework |
| "Base class names look right"                  | Grep-verify ALL base class names — AI hallucinates class hierarchies             |
| "Store method names are standard"              | Every store method name must be grep-verified against actual source              |
| "Round 2 not needed for frontend scan"         | Main agent rationalizes own fabricated examples. Fresh-eyes mandatory.           |
| "Cleanup pattern documented, 1 example enough" | Cleanup is the most project-specific pattern — verify with 3+ grep hits          |

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
