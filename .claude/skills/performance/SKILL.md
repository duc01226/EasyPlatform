---
name: performance
version: 2.0.0
description: '[Debugging] Analyze and optimize performance bottlenecks'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. For simple tasks, ask user whether to skip.

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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, cross-service sync (content auto-injected by hook — check for [Injected: ...] header before reading)

> **External Memory:** Write intermediate findings + results to `plans/reports/` — prevents context loss, serves as deliverable.

## Quick Summary

**Goal:** Analyze + optimize perf bottlenecks — DB queries, API endpoints, frontend rendering.

**Workflow:**

1. **Detect** — Classify bottleneck type (DB/API/frontend/memory/N+1/distributed)
2. **Profile** — Identify hot paths via profiling data/metrics
3. **Analyze** — Trace execution path + measure impact with `file:line` evidence
4. **Optimize** — Apply targeted fixes with before/after measurements
5. **Verify** — Re-measure + confirm improvement, present plan for user approval

**Key Rules:**

- Measure before AND after — NEVER optimize blindly
- Every claim requires profiling data + `file:line` proof
- Row-count reduction before projection — higher OOM ROI

<target>$ARGUMENTS</target>

---

## Phase 0: Detect Bottleneck Type

**MANDATORY IMPORTANT MUST ATTENTION** — classify BEFORE analyzing. Detection drives: which dimensions apply, which tools to use, which sub-agent to route to.

| Type            | Signals                                      | Primary Investigation                |
| --------------- | -------------------------------------------- | ------------------------------------ |
| DB query        | slow SELECT, missing index, full scan        | Query plan + index analysis          |
| API latency     | slow endpoint, timeout, high p95             | Profiler + call chain trace          |
| N+1 queries     | loop + DB call, lazy load in serialization   | `graph trace --direction downstream` |
| Memory/OOM      | unbounded collections, no paging, blob loads | Row count + memory profiler          |
| Frontend render | slow paint, excessive change detection       | DevTools perf tab + bundle analysis  |
| Distributed     | cross-service latency, message bus delays    | `trace` for MESSAGE_BUS edges        |

Anti-pattern: same analysis applied regardless of bottleneck type.

---

## Performance Dimensions

For each dimension: state role → derive failure modes → apply to bottleneck with `file:line` evidence.

### 1. Query Efficiency

**Think:** What data volume loads? Are filters pushed to DB? Do indexes cover all WHERE/JOIN/ORDER BY columns?

- Paging REQUIRED — NEVER unbounded `GetAll()`/`ToList()`/`Find()` without `Skip/Take` or cursor
- Index REQUIRED — every filter field, FK, sort column needs DB index; verify field order matches query
- OOM triage order: (1) missing DB-level filter → push to DB (eliminates OOM absolutely); (2) unbounded arrays/blobs → apply projection (reduces severity proportionally). Row reduction higher ROI than projection.

### 2. Hot Path Frequency

**Think:** How often does this code execute? What triggers it? Is there call fan-out?

- `python .claude/scripts/code_graph query callers_of <function> --json` — call frequency + trigger chain
- `python .claude/scripts/code_graph trace <file> --direction downstream --json` — N+1 cascade, excessive event handlers
- MESSAGE_BUS edges in trace output = distributed perf bottleneck signals

### 3. Memory Pressure

**Think:** What loads into memory? Is data bounded? Are projections applied before materialization?

- Diagnose unbounded row count BEFORE document size — always row-count first
- Identify: no pagination, full entity loads, blob fields in list queries
- Verify projections applied at DB layer, not after `ToList()`

### 4. Concurrency & Parallelism

**Think:** Are parallel ops sharing non-thread-safe resources? Are sequential ops blocking hot path unnecessarily?

- Parallel + repo/UoW → ALWAYS `ExecuteInjectScopedAsync` (new DI scope per iteration), NEVER `ExecuteUowTask` (shared DbContext = silent corruption)
- Sequential DB calls in loops → batch or `Include()`
- Unnecessary sequential awaits → identify parallelizable chains

### 5. Frontend Performance

**Think:** What triggers change detection? Is data fetched eagerly when lazy suffices? Is bundle size bounded?

- `OnPush` change detection + `async` pipe for observable streams
- Lazy-loaded modules for feature routes
- `trackBy` on `*ngFor` — prevents full DOM re-renders
- Profile observable chains for unnecessary emissions

---

## ⚠️ Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` + profiling data + `file:line` for EVERY claim.

| Confidence | Action                      |
| ---------- | --------------------------- |
| ≥95%       | Recommend freely            |
| 80-94%     | Recommend with caveats      |
| 60-79%     | List unknowns first         |
| <60%       | STOP — gather more evidence |

---

## Sub-Agent Routing

Route based on detected bottleneck type:

| Bottleneck                                      | Sub-agent                                              |
| ----------------------------------------------- | ------------------------------------------------------ |
| DB queries / OOM / backend hot path             | `performance-optimizer` (backend)                      |
| Security-adjacent (auth queries, PII fields)    | `security-auditor` first, then `performance-optimizer` |
| Cross-service / caching strategy / architecture | activate `arch-performance-optimization` skill         |
| Frontend bundle / change detection / rendering  | `performance-optimizer` (frontend focus)               |

**Activate `arch-performance-optimization` skill for architectural-level decisions.**

**CRITICAL:** Present findings + optimization plan. Wait for explicit user approval before making changes.

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

---

## Sub-Agent Type Override

> **MANDATORY:** Performance analysis spawns `performance-optimizer` sub-agent as the **Round 1 proactive lead**, not just a Round 2 challenger.
> **Rationale:** `performance-optimizer` specializes in N+1 patterns, query plans, bundle analysis, and memory profiling for both backend (.NET/MongoDB/SQL) and frontend (Angular/RxJS). Main agent synthesizes findings — it does not lead analysis alone.

## Recursive Quality Loop

1. **Round 1 (Proactive):** Spawn `performance-optimizer` sub-agent (`subagent_type: "performance-optimizer"`) as the analysis lead. Main agent provides scope context; sub-agent drives all dimension analysis and produces the draft optimization plan.
2. **Round 2 (Challenge):** Spawn NEW fresh `performance-optimizer` sub-agent — ZERO memory of Round 1. Challenges Round 1 findings: missed bottlenecks, wrong root cause, premature optimization.
3. Issues found → fix → Round 3 with NEW fresh `performance-optimizer` sub-agent
4. Max 3 rounds → escalate to user via `AskUserQuestion`
5. **NEVER declare PASS after Round 1 alone** — main agent rationalizes own work

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** NEVER use `code-reviewer` for specialized domains (architecture, security, performance, DB, E2E, integration-test, git).

<!-- /SYNC:sub-agent-selection -->

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** Not already in workflow → use `AskUserQuestion`:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — performance → sre-review → test
> 2. **Execute `/performance` directly** — standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION** after completing, use `AskUserQuestion`:

- **"/sre-review (Recommended)"** — production readiness after optimization
- **"/changelog"** — document perf changes
- **"Skip, continue manually"** — user decides

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** classify bottleneck type (Phase 0) BEFORE analyzing — detection drives dimension selection and sub-agent routing
- **MANDATORY IMPORTANT MUST ATTENTION** measure before AND after every change — NEVER "should improve performance" without proof
- **MANDATORY IMPORTANT MUST ATTENTION** row-count reduction before projection — push DB filters first (eliminates OOM absolutely)
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small tasks via `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` + profiling data for EVERY claim — `Confidence: X%` required
- **MANDATORY IMPORTANT MUST ATTENTION** run graph trace before concluding — `callers_of` + `trace --direction downstream` for hot paths
- **MANDATORY IMPORTANT MUST ATTENTION** wait for explicit user approval before applying changes
- **MANDATORY IMPORTANT MUST ATTENTION** recursive quality loop — NEVER declare PASS after Round 1 alone

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| "Bottleneck is obvious, skip profiling"       | Assumption without measurement = guess. Always measure.          |
| "Already checked code, no N+1"                | Show graph trace output. No proof = no check.                    |
| "Simple optimization, skip user approval"     | User decides complexity. Always present plan first.              |
| "Round 2 redundant, Round 1 found everything" | Main agent rationalizes own work. Fresh eyes catch blind spots.  |
| "Performance type is clear, skip Phase 0"     | Wrong type = wrong dimensions = wasted analysis. Classify first. |

<!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Break task into small todo tasks via `TaskCreate` BEFORE starting.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
