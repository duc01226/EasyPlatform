---
name: business-evaluation
description: '[Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
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

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Evaluate business idea viability with BMC, financials, risk matrix, GTM, and execution plan.

**Workflow:**

1. **Capture idea** — Problem, solution, target customer
2. **Load market analysis** — Market data from market-analysis
3. **Business Model Canvas** — All 9 blocks with evidence
4. **Financial projections** — 3-year revenue, costs, break-even
5. **Risk assessment** — 5+ risks with mitigation
6. **Execution plan** — 3 phases with milestones
7. **Verdict** — Viability score, confidence, recommendation

**Key Rules:**

- All 9 BMC blocks required, each with evidence
- Financial projections: explicit assumptions table
- Minimum 5 risks with mitigation AND residual risk
- Verdict must be evidence-backed with confidence declaration

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Business Evaluation

## Step 1: Capture the Idea

From user input, extract:

- **One-liner** — Elevator pitch in 1 sentence
- **Problem** — What pain point does it solve?
- **Solution** — How does it solve it?
- **Target customer** — Who specifically benefits?

## Step 2: Business Model Canvas

All 9 blocks required:

| Block                      | Key Question                      | Evidence Required    |
| -------------------------- | --------------------------------- | -------------------- |
| **Customer Segments**      | Who are we serving?               | Market research      |
| **Value Propositions**     | What value do we deliver?         | Customer pain points |
| **Channels**               | How do we reach customers?        | Channel analysis     |
| **Customer Relationships** | How do we maintain relationships? | Retention strategy   |
| **Revenue Streams**        | How do we make money?             | Pricing research     |
| **Key Resources**          | What do we need?                  | Resource assessment  |
| **Key Activities**         | What must we do?                  | Operational analysis |
| **Key Partnerships**       | Who helps us?                     | Partner landscape    |
| **Cost Structure**         | What does it cost?                | Cost analysis        |

## Step 3: Financial Projections (3 Years)

### Revenue Model

| Year | Users/Customers | ARPU | Revenue | Growth |
| ---- | --------------- | ---- | ------- | ------ |

### Cost Structure

| Category | Y1  | Y2  | Y3  |
| -------- | --- | --- | --- |

### Break-Even

- **Monthly burn:** ${X}
- **Break-even point:** Month/Year
- **Funding needed:** ${X}

### Assumptions Table

Every number must list its assumption and source.

## Step 4: Risk Assessment

Minimum 5 risks:

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
| ---- | ---------- | ------ | ---------- | ------------- |

Categories to consider: market, execution, financial, competitive, regulatory, technical.

## Step 5: Execution Plan

| Phase          | Timeline    | Focus                     | Key Milestones             |
| -------------- | ----------- | ------------------------- | -------------------------- |
| **Validation** | 0-3 months  | Customer discovery, MVP   | N interviews, prototype    |
| **Build**      | 3-6 months  | Core product, early users | Beta launch, first revenue |
| **Growth**     | 6-12 months | Scale, optimize           | Revenue target, team size  |

## Step 6: Go-to-Market

- **Launch strategy** — How to enter the market
- **Initial channels** — Top 3 acquisition channels
- **Pricing strategy** — Model + rationale + competitive comparison

## Step 7: Verdict

- **Viability score:** 1-10 with rationale
- **Confidence:** 95%/80%/60%/<60% with evidence basis
- **Recommendation:** Pursue | Pivot | Pause | Pass
- **Key condition:** What must be true for this to succeed?

## Output

Write to `docs/knowledge/strategy/business/{descriptive-slug}.md` using enforced template from `.claude/templates/business-evaluation-template.md`.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$domain-analysis (Recommended)"** — Analyze domain model from business evaluation
- **"$plan-hard"** — If ready to plan implementation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. ALWAYS cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-05-09] **User name materialization MUST ATTENTION go through `User.UpdateName(firstName, middleName, lastName)`.** Domain method (`src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/User.cs:202-209`) recomputes `FullName` as single source of truth. Three sites still manually patch `user.FullName = user.GetFullName()` after assigning name fields — `src/Services/bravoTALENTS/Employee.Application/Factories/UserFactory.cs:50`, `src/Services/bravoSURVEYS/LearningPlatform.Application/ApplyPlatform/MessageBus/Consumers/AccountUserDeletedEventBusConsumer.cs:102`, `src/Services/bravoINSIGHTS/Analyze/Analyze.Application/MessageBus/Consumers/AccountUserDeletedEventBusConsumer.cs:66`. Next time touching any: replace manual patch with `user.UpdateName(...)` to maintain invariant.
- [2026-03-31] **ParallelAsync + repo/UoW MUST ATTENTION use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST ATTENTION include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) leaders. Feature services (Growth, Talents) sending to core MUST ATTENTION use `{CoreServiceName}...RequestBusMessage` — NEVER define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be bash PATH under those names. Check: `where python` / `where py`. ALWAYS prefer `py` (Windows Python Launcher) one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`
- **IMPORTANT MUST ATTENTION** every claim needs `file:line` evidence — confidence >80% to act, NEVER speculate

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
