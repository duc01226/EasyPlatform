---
name: scan-code-review-rules
description: '[Documentation] Scan project and populate/sync docs/project-reference/code-review-rules.md with code conventions, anti-patterns, architecture rules, and review checklists.'
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

**Goal:** Scan project codebase for established conventions, lint rules, common patterns, and anti-patterns → populate `docs/project-reference/code-review-rules.md` with actionable review rules and checklists. (Codex has no hook injection — open this file directly before proceeding)

**Workflow:**

1. **Classify** — Detect project scope, scan mode
2. **Scan** — Discover conventions and patterns via parallel sub-agents
3. **Report** — Write findings to external report file (incremental)
4. **Generate** — Build/update reference doc from report
5. **Verify** — Fresh-eyes round validates rules against actual code

**Key Rules:**

- Derive rules from ACTUAL codebase patterns, not generic best practices
- Every rule has a "DO" example from the project with `file:line`
- Focus on project-specific conventions that differ from framework defaults
  **MUST ATTENTION** detect project scope FIRST — agent routing depends on it

---

# Scan Code Review Rules

## Phase 0: Classify Scan Scope

**Before any other step**, run in parallel:

1. Read `docs/project-reference/code-review-rules.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect project scope:

| Signal                                                     | Scope                      | Agent Routing              |
| ---------------------------------------------------------- | -------------------------- | -------------------------- |
| `.csproj` files present                                    | Full-stack or Backend-only | Run Agent 1 (Backend)      |
| `angular.json` / `nx.json` / `package.json` with framework | Frontend present           | Run Agent 2 (Frontend)     |
| Both above                                                 | Full-stack                 | Run Agents 1+2+3           |
| `docker-compose.yml` / K8s manifests                       | Infrastructure present     | Run Agent 3 (Architecture) |
| Linter configs (`.eslintrc`, `stylecop.json`)              | Code quality infra found   | Prioritize Agent 1/2       |

3. Discover code quality infrastructure:
    - Linter configs (`.eslintrc`, `.editorconfig`, `stylecop.json`, `.prettierrc`, `ruff.toml`)
    - CI quality gates, code analysis configs (SonarQube, CodeClimate)
    - Existing standards docs (CONTRIBUTING.md, CODING_STANDARDS.md)
    - Git hooks (pre-commit, husky)

**Evidence gate:** Confidence <60% on scope → report uncertainty, ask user before proceeding.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each review dimension. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch sub-agents matching detected scope. Each MUST:

- Write findings incrementally after each section — NEVER batch at end
- Cite `file:line` for every rule example
- Confidence: HIGH (3+ consistent examples), MEDIUM (1-2), LOW (<1) — document HIGH and MEDIUM only

All findings → `plans/reports/scan-code-review-rules-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Backend Rules

**Think:** What does a GOOD backend file look like in this project? What naming, error handling, and DI choices separate "good code" from "code that got merged but shouldn't have"? Where are the active anti-patterns?

Scan targets:

- Naming conventions — class suffixes, method prefixes, interface naming with examples
- Base classes — when used vs when not used (detect violations)
- Error handling — try-catch, Result types, error middleware patterns
- Dependency injection — registration conventions, lifetime choices
- Anti-patterns — direct DB access from controllers, business logic in wrong layer
- Logging — structured logging, log levels, correlation IDs

### Agent 2: Frontend Rules

**Think:** What makes Angular/React/Vue code reviewable vs unmaintainable here? Where is state management discipline enforced? What cleanup patterns are used?

Scan targets:

- Component conventions — naming, file organization, template patterns with examples
- State management — what goes in store vs component vs service (with rule evidence)
- Styling — BEM, CSS modules, utility classes, naming (derive from detected approach)
- Subscription/memory management — cleanup, unsubscribe, dispose patterns
- Accessibility — ARIA, semantic HTML, keyboard navigation (if patterns found)
- Performance — lazy loading, change detection, memoization patterns

### Agent 3: Architecture Rules

**Think:** What dependency directions are enforced here? Where do services communicate directly vs via messages? What's shared vs duplicated, and is that intentional?

Scan targets:

- Layer boundaries — what imports what, dependency direction rules
- Cross-service communication — direct calls vs messages (find violations)
- Shared code — what's shared vs duplicated, rationale
- Testing conventions — naming, organization, mock patterns
- Security — auth checks, input validation, output encoding (derive from existing patterns)
- Configuration — env vars, config files, secrets management patterns

## Phase 3: Analyze & Generate

Read report. Apply evidence confidence to classify each rule:

| Confidence                     | Documentation                           |
| ------------------------------ | --------------------------------------- |
| HIGH (3+ examples, consistent) | Document as rule with DO/DON'T pair     |
| MEDIUM (1-2 examples)          | Document as "observed pattern (verify)" |
| LOW (<1 consistent example)    | Omit — insufficient evidence            |

**Round 1 (main agent):** Build section drafts from report.

**Round 2 (fresh sub-agent, zero memory):** Re-reads report + draft independently.

- Does every decision tree node have real code examples?
- Are anti-patterns documented with real `file:line` violations (not hypothetical)?
- Is every rule specific to this project (not generic)?

### Target Sections

| Section                | Content                                                        |
| ---------------------- | -------------------------------------------------------------- |
| **Critical Rules**     | Top 5-10 rules that cause most bugs if violated                |
| **Backend Rules**      | Naming, patterns, error handling, DI with DO/DON'T examples    |
| **Frontend Rules**     | Component, state, styling, cleanup with DO/DON'T examples      |
| **Architecture Rules** | Layer boundaries, cross-service rules, shared code conventions |
| **Anti-Patterns**      | Common mistakes found in codebase with real `file:line`, fixes |
| **Decision Trees**     | For common decisions: which base class, where to put logic     |
| **Checklists**         | PR review checklists for backend, frontend, cross-cutting      |

### Content Rules

- Every rule has a "DO" code example from the actual project
- Every rule has a "DON'T" counterexample (real `file:line` or clearly marked realistic)
- Use `file:line` references for all code examples
- Prioritize rules by impact (bugs prevented, not style preferences)

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve sections unchanged, update only diverged
3. Verify (Glob check): ALL code example file paths exist
4. Verify (Grep check): Anti-pattern examples use real class/method names
5. Verify: Decision trees have concrete outcomes (not "it depends")
6. Report: sections updated, rules count, anti-patterns discovered

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
> **Verify AI-generated content against actual code.** AI hallucinates class names/signatures. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Always trace full chain.
> **Holistic-first — resist nearest-attention trap.** List EVERY precondition before forming hypothesis.
> **Surgical changes — apply diff test.** Every changed line traces directly to the task.
> **Surface ambiguity before coding.** Multiple interpretations → present each with effort estimate. NEVER pick silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect project scope FIRST in Phase 0 — agent routing depends on it
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** derive rules from ACTUAL patterns — generic best practices are forbidden
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally — NEVER batch at end
**IMPORTANT MUST ATTENTION** two review rounds — Round 2 fresh sub-agent catches what main agent missed

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "Scope obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — agent routing depends on detected scope             |
| "Rules are standard, don't need examples" | Every rule MUST have `file:line` evidence from this project               |
| "Anti-patterns are hypothetical"          | Anti-Patterns section requires REAL `file:line` violations only           |
| "Round 2 review not needed"               | Main agent rationalizes own decisions. Fresh sub-agent is non-negotiable. |
| "Doc has content, skip re-read"           | Show section list extracted from doc as proof of re-read                  |

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
