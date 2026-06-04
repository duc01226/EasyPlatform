---
name: performance-review
description: '[Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, algorithmic complexity (O(n²)), frontend rendering, caching, and distributed paths.'
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

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching, in-process compute/algorithmic complexity, concurrency/pool saturation.
> **[IMPORTANT]** MANDATORY MUST ATTENTION include in-process compute, not just I/O: flag O(n²)+ nested scans, linear membership lookups inside loops, ReDoS-prone regex, and per-iteration serialize/clone — CPU bottlenecks need the same evidence rigor as queries.
> **[IMPORTANT]** MANDATORY MUST ATTENTION when an operation is fast but p95/p99 is high, suspect saturation not the query: measure pool/thread acquire-wait and queue depth, and size pools by Little's Law (in-use = arrival-rate × hold-time) × replica count.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) real bottleneck — across database waste (rows/columns, missing/unused indexes, query-in-loop fan-out, unbounded materialization, slow joins/aggregations, write amplification), in-process compute (O(n²) scans, wrong data structures, ReDoS, serialize/clone churn), and concurrency saturation (pool/queue acquire-wait sized by Little's Law) — while preserving behavior, authorization, and semantics, proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

**Summary:**

- Evidence is the gate, not intuition: capture a runtime baseline (query plan/explain, row counts, p95/p99, pool acquire-wait, microbench at worst-case N) or label the finding `static risk` with the exact verify command — never recommend below 60% confidence.
- Walk dimensions ONE pass at a time (query shape → index/access path → N+1 → aggregation/join → materialization → write/locks → cache → API/distributed/frontend → compute/algorithmic), never all at once; reduce rows at the source before trimming columns or caching, and size pools by Little's Law (replica count × per-instance pool) when a fast op shows high p99.
- No finding is fixable until `$why-review --validate-findings` confirms it (Phase 6); each validated fix then restarts the FULL review from Phase 0 over the whole target (Phase 7) — a targeted before/after check alone never earns a PASS.

> **Renamed:** formerly `/performance` — that name no longer resolves as a slash command; use `$performance-review`.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline or mark static-only risk.
4. **Analyze** - Run serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, and record evidence.
7. **Validate Findings** - Run `$why-review --validate-findings <report-path>` before any fix.
8. **Fix + Full Re-Review** - Fix only validated findings, then restart from Detect over the full target.

**Key Rules:**

- MANDATORY ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY ALWAYS verify index usability with query shape/order, not index existence alone.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood.
- Findings are not eligible for fix until `$why-review --validate-findings` confirms them; every validated fix restarts the full performance review from Phase 0.

<target>$ARGUMENTS</target>

---

## Phase 0: Detect Scope

Classify before analysis. Detection drives dimensions, evidence, sub-agent choice.

| Scope               | Signals                                                                                         | Primary evidence                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| DB read             | slow query, full scan, sort spill, high rows examined                                           | query text/ORM expression, row count, plan/explain, indexes                                     |
| DB write            | slow save, lock waits, per-row updates, transaction bloat                                       | write loop, batch size, lock/deadlock logs, transaction scope                                   |
| N+1/fan-out         | loop with query/API call, lazy loading, per-item lookup                                         | caller trace, query count, loop source                                                          |
| API latency         | high p95/p99, timeout, slow endpoint/job                                                        | trace/profile/logs, call chain                                                                  |
| Saturation/Queueing | high p99 while the operation itself is fast, pool exhausted/timeout, threads blocked on acquire | pool active/idle/pending, acquire-wait time, threads/workers vs pool size, replica count × pool |
| Memory/OOM          | large materialization, blobs, no paging, buffering                                              | allocation profile, result size, collection loads                                               |
| Frontend            | slow render, huge bundle, repeated fetch, DOM churn                                             | browser profile, network waterfall, component/render trace                                      |
| Distributed         | message lag, cross-service waterfall, retry storm                                               | trace spans, queue metrics, consumer/producer chain                                             |
| Compute/CPU         | hot loop, nested iteration, quadratic scaling, regex stall, heavy serialize/clone               | input N, operation count vs N, profiler/flame-graph sample, microbench                          |

Skip reason allowed only when target explicitly narrows scope and evidence proves dimension irrelevant.

---

## Architecture-Altitude Performance Review

> **When to apply:** design/architecture reviews (e.g. via the `architect` agent) — judging performance as a **structural property of the design** _before_ it ships, not a tactical query fix _after_ a bottleneck is observed. The dimension passes below stay the tool for tactical work; this section is the design-level lens layered on top.

Evaluate the bottleneck **layer model** as a design concern, not just a symptom site:

```
Performance as architecture
├── Database  — data access shape baked into the model (projection, paging, N+1 surface, index strategy)
├── API       — serialization/processing cost, parallel tuple queries, response-DTO contracts
├── Network   — payload size & call-count designed into the contract (batch endpoints vs chatty waterfalls)
├── Frontend  — bundle/lazy-load topology, OnPush/track-by/virtual-scroll as default architecture
└── Background jobs — bounded parallelism (`ParallelAsync` with `maxConcurrent`) + batch (`UpdateManyAsync`) as the shape, not an afterthought
```

Architecture-altitude rules (decide at design time — cheapest to fix here):

- **Bound every result set and project only needed columns/fields in the contract itself** — never design an unbounded read-all or `SELECT *` endpoint; unbounded reads spike memory and latency under real data volume.
- **Design out N+1 at the boundary** — eager-load / batch-fetch is the default access pattern; per-item lookups are a design smell, not a tuning detail.
- **Caching is a design decision, not a patch** — choose request-scope memoization vs bounded shared cache up front, with key dimensions (tenant/user/auth/version), TTL/invalidation, size limits, and privacy constraints specified; never cache to hide an unbounded query.
- **Async I/O is structural** — never design a path that blocks threads with `.Result`; bounded parallelism for fan-out work is part of the design, with a fresh safe scope/context per worker.
- **Make the cost visible** — design slow-operation logging and query logging in from the start so regressions are observable in production.
- **Size pools and parallelism, never default them** — derive connection/thread/permit pool size from Little's Law (in-use = arrival-rate × hold-time) and state the assumptions; shrink _hold-time_ (release the resource across non-DB / external-wait spans) before growing the pool; size a shared backend against fleet-aggregate demand (replica count × per-instance pool), not one instance — local per-instance tuning becomes a thundering herd on the shared dependency.

For database index strategy at design time, see the `database-optimization` skill (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) in the phases below still applies to every recommendation made at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings (MUST ATTENTION):

- ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `contributing`, `style guide`.
- search 3+ similar local query/API patterns before proposing a fix.
- read target code and index/migration/schema files controlling the queried data.
- map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy. When `.code-graph/graph.db` exists, run a graph blast-radius pass (`trace --direction downstream` on the hot path) to size the fan-out before proposing a fix — see the Graph-Assisted Investigation gate below.
- identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, or framework defaults; derive from discovered files.

---

## Phase 2: Baseline Evidence

Prefer runtime proof. If unavailable, label finding `static risk` and include exact command/query needed to verify.

MANDATORY baseline for DB findings:

- ALWAYS capture query source: `file:line` and generated SQL/query/ORM expression when available
- ALWAYS capture volume: input size, rows matched, rows returned, rows examined/scanned, page size/limit
- ALWAYS capture access path: query plan/explain, used index, sort/group strategy, join method when available
- ALWAYS capture timing: p50/p95/p99, elapsed query time, query count, allocation or response size
- ALWAYS capture context: endpoint/job/consumer frequency and worst-case fan-out

MANDATORY baseline for compute/CPU findings:

- ALWAYS capture input size N and the growth assumption (expected and worst-case N)
- ALWAYS capture operation count vs N (constant / linear / quadratic+) and the nested-loop or repeated-scan source `file:line`
- ALWAYS capture timing: microbench / `console.time` / profiler or flame-graph sample at representative AND worst-case N

MANDATORY baseline for saturation/pooling findings:

- ALWAYS capture offered concurrency and arrival rate (RPS / worker count / threads.max)
- ALWAYS capture resource hold-time vs total request time (a connection/lock/permit is held only for the fraction it is actually used, not the whole request)
- ALWAYS capture pool state: size, active/idle/pending, and acquire-wait time / queue depth at the pool entrance
- ALWAYS capture aggregate demand on shared dependencies: replica count × per-instance pool → total connections/cores the shared backend must serve

Confidence:

| Confidence | Action                                                |
| ---------- | ----------------------------------------------------- |
| 95%+       | Recommend fix freely.                                 |
| 80-94%     | Recommend with caveats and verification command.      |
| 60-79%     | List unknowns first; gather more evidence before fix. |
| <60%       | STOP. Do not recommend.                               |

---

## Phase 3: Serial Dimension Passes

MANDATORY apply one focused pass per dimension. NEVER scan all dimensions at once.

### 1. Query Shape And Data Minimization

**Think:** Which rows/columns load? Are filters, projection, sorting, and limits executed by data source before materialization?

MUST ATTENTION find:

- unbounded list/read-all APIs without page, limit, cursor, or bounded business invariant
- filter after materialization (`ToList`/array/load-all before `Where`/filter)
- projection after materialization; full entity/document loaded for list/summary view
- unused includes/joins/lookup data; large text/blob/json fields in list queries
- client-side sort/group/distinct; offset pagination on very deep pages where cursor/keyset fits better
- missing tenant/auth/status/date filters in hot-path queries

Prefer fixes: push predicates to data source, select only needed fields, bound result set, use cursor/keyset for deep sequential access, keep reusable predicates near domain/query-owner layer discovered locally.

### 2. Index And Access Path

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order?

Find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- index exists but plan ignores it because query wraps field in function/cast, uses incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis

Prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, verify with plan/explain before/after, include write-cost risk.

### 3. N+1 And Fan-Out

**Think:** Does work scale with item count instead of request/job count?

Find:

- query/API/cache call inside loop, map, serializer, resolver, template/render loop, event handler loop
- per-item existence/count lookup; per-item lazy-loaded relation
- repeated same lookup with different IDs that could be one `IN`/batch/group query
- nested fan-out across services, queues, jobs, or retries
- sequential awaits where independent calls can batch or run bounded parallel with separate safe resources

Prefer fixes: batch IDs once, join/include only needed fields, prefetch dictionaries, aggregate counts in one query, use bounded concurrency, preserve ordering/authorization semantics.

### 4. Aggregation, Join, And Pipeline Shape

**Think:** Does the pipeline reduce data before expensive join/unwind/group/sort/window stages?

Find:

- join/unwind/group before selective filter
- cartesian joins or duplicate expansion not collapsed
- grouping/sorting without pre-filter or supporting index
- aggregation loads all related rows/documents when only existence/count/min/max needed
- repeated post-processing that database can compute safely

Prefer fixes: filter early, project early, aggregate at source, reduce join cardinality, use existence/count queries, repeat necessary post-expansion filters when array/child semantics require it.

### 5. Materialization And Memory

**Think:** What enters memory? Is it bounded, streamed, and tracking-free when read-only?

Find:

- large collection materialized before paging/filtering
- read-only queries tracking entities/objects unnecessarily
- blob/file/large JSON fields loaded for lightweight responses
- buffering entire export/report when streaming/chunking fits
- accidental multiple enumeration re-running query

Prefer fixes: page/chunk/stream, use no-tracking/read-only mode when local stack supports it, project lightweight DTOs, move filter before load, memoize intentionally.

### 6. Write Path, Locks, And Transactions

**Think:** Does write work batch safely and keep locks/transactions small?

Find:

- per-row save/update/delete inside loop
- long transaction wrapping remote calls or heavy reads
- unnecessary unique checks per row instead of bulk validation
- lock escalation/hot-row contention/counter updates without batching
- parallel writes sharing unsafe session/context/unit-of-work

Prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

Find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data

Prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics.

### 8. API, Distributed, Frontend

**Think:** Is slow work caused by network waterfall, payload size, render churn, or background fan-out?

Find:

- endpoint returns more payload than view needs
- sequential remote calls where backend aggregation or batch endpoint fits
- message consumer publishes one message per item without batching/backpressure
- frontend repeated fetch, missing list virtualization, expensive render loop, missing stable keys/track-by
- bundle or asset load dominates interaction

Prefer fixes: batch API, reduce payload, add backpressure, virtualize large lists, stabilize render keys, lazy-load cold assets/routes, measure browser/network trace.

### 9. Compute And Algorithmic Complexity

**Think:** Does in-process work grow super-linearly with input size, independent of any query or network call?

MUST ATTENTION find:

- nested iteration over the same/related collection (O(n²)+): loop-in-loop, `map` inside `map`, repeated full re-scan
- linear membership/lookup inside a loop — `.find`/`.includes`/`.indexOf`/`in list`/`.contains` where a `Set`/`Map`/dict gives O(1)
- wrong data structure for the access pattern: array used as a keyed store; repeated `.filter().length` for existence
- string built by concatenation in a loop; repeated `JSON.parse`/`stringify`/deep-clone/serialize per iteration
- catastrophic-backtracking regex on user- or attacker-sized input (ReDoS — cross-link `$security-review`)
- pure-CPU result recomputed every call when inputs are stable (memoization candidate, distinct from data cache)
- redundant sort/re-sort, or sorting when a single-pass min/max/partition suffices

Prefer fixes: build a `Set`/`Map`/dict index once and look up in O(1); hoist invariant work out of the loop; accumulate into an array + single `join` instead of `+=`; precompute/memoize stable pure results; anchor/bound regex and cap input length; pick the data structure that matches the access pattern. Prove with a microbench/profiler sample at representative AND worst-case N — never reasoning alone.

---

## Phase 4: Findings And Severity

Finding format:

```markdown
- [Severity] [file:line] [dimension] Problem. Evidence: metric/plan/query count. Impact: user/system effect. Fix: smallest behavior-preserving change. Verify: command/query/metric.
```

Severity:

- Critical: outage/OOM/data corruption risk, unbounded hot path, lock storm, runaway fan-out.
- High: p95/p99 timeout risk, full scan on large/hot table/collection, N+1 on user-visible list, missing page bound.
- Medium: avoidable over-fetch, suboptimal index, repeated lookup, moderate memory waste.
- Low: cleanup with small measurable benefit or future-proofing.

NEVER inflate severity without production-like scale/frequency evidence.

---

## Phase 5: Optimize Plan

Before code changes (MUST ATTENTION):

- present baseline, proposed change, behavior invariants, risks, verification commands, and rollback path.
- preserve functional behavior, authorization, ordering, pagination semantics, consistency, and idempotency.
- inspect affected tests/specs/docs when behavior, SLA, public contract, or limits change.
- NEVER change query semantics only to improve speed unless user approves changed behavior.
- NEVER add broad indexes/caches without write-cost, storage-cost, invalidation, and privacy analysis.

> **Spec-Loop Discipline (Dual-Feedback half — tailored).** Performance is **orthogonal** to functional correctness, so the property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to functional core-logic and do **NOT** apply here — N/A. Apply only the **dual-feedback half**: when a finding establishes or moves a behavior-defining boundary — an SLA/latency budget (p95/p99 target), a result-set bound, a max-rows/page-size limit, a pool-size assumption — feed it BOTH (a) the **spec** — record the SLA/limit as a §5 invariant / documented constraint so the budget is intended contract, not an undocumented tuning value — AND (b) a **guarding test** — a benchmark/assertion that fails when the budget or bound regresses. A fix that improves the number but leaves the boundary undocumented OR unguarded is **INCOMPLETE**, never a code-only change.

---

## Sub-Agent Routing

Use specialized help when available:

| Detected focus                                                     | Sub-agent                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| DB/query/N+1/memory/backend hot path                               | `performance-optimizer`                                |
| Auth, PII, tenant isolation, sensitive cache keys                  | `security-auditor` first, then `performance-optimizer` |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist                    |
| Frontend render/bundle/network waterfall                           | frontend or performance specialist                     |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, report path, and "return summary only; write full report incrementally."

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports are easy to overstate when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write cost or data freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `$why-review --validate-findings <performance-report-path>`.
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`.
4. **If why-review demotes/removes any finding:** update the performance report with revised severity, removed false positives, and a `## Why-Review Validation Notes` section.
5. **If why-review confirms all findings:** append `## Why-Review Validation` stating all findings were re-validated against measurement/static evidence.
6. **If the report changed after validation:** re-run this validation gate, maximum 2 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings.
- Why-review skill itself is the active context.

---

## Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 6 returns CLEAN/validated and the performance report still has one or more findings that must be fixed.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the parent `$plan` + `$feature-implement` flow.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `$performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/graph/profiler checks where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass has zero findings.
7. If the same validated blocker repeats across 3 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `$why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.

---

## Output

MANDATORY final report sections:

- Scope and detected bottleneck type
- Baseline evidence and unknowns
- Findings ordered by severity
- Optimization plan and rejected alternatives
- Verification plan with before/after metrics
- Test/spec/doc impact or explicit skip reason
- Confidence and assumptions

If evidence insufficient, output: `Insufficient evidence. Verified: [...]. Not verified: [...]. Next evidence needed: [...].`

---

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) bottleneck while preserving behavior, authorization, and semantics — proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; NEVER present a guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Graph-Assisted Investigation:** ALWAYS run a graph trace on key files when `graph.db` exists.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive per-category concerns from first principles, NEVER a fixed checklist.
- **Systematic Batching:** Large changeset → size-capped parallel batches, then reduce.

**IMPORTANT MUST ATTENTION** prove every performance claim with measurement or static evidence — `file:line`, query text/shape, row counts, query plan/explain, trace, profile, or logs; confidence >80% to act, 60-79% gather more, <60% STOP — why: a number without a measured baseline is a guess that ships unverified waste.
**IMPORTANT MUST ATTENTION** review performance one dimension at a time — over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching, in-process compute/algorithmic complexity, concurrency/pool saturation — why: split attention misses violations.
**MANDATORY** search 3+ similar local query/API patterns before proposing a fix, and read the index/migration/schema files controlling the data — why: local conventions override generic framework defaults; the closest example must match preconditions (base class, scope, cardinality) before you copy it.
**MANDATORY** ALWAYS measure before/after; static review findings need an explicit verification command attached.
**MANDATORY** ALWAYS verify index usability with actual query shape/order and plan/explain — index existence alone is not proof.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS push row filters to the data source before projection/caching; row-count reduction beats column trimming — why: fewer columns from too many rows still scans the rows.
**MANDATORY** size pools/parallelism by Little's Law (in-use = arrival-rate × hold-time) × replica count, and shrink hold-time before growing the pool — why: a fast op with high p99 is saturation at the pool entrance, not a slow query.
**MANDATORY** Break work into small tracked tasks before starting; one `in_progress` at a time; mark each `completed` immediately after its evidence lands — why: compaction wipes memory and untracked review scope silently goes uncovered.
**MANDATORY** when a finding moves a behavior-defining boundary (SLA/p95 budget, result-set bound, page-size limit, pool-size assumption), feed it BOTH the spec (record as a §5 invariant) AND a guarding test/benchmark — why: a faster number left undocumented OR unguarded regresses silently.
**MANDATORY** add a final review task checking doc/test/spec staleness.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Bottleneck obvious, skip baseline"           | No measurement = guess. Capture metric or label static risk with the verify command.                                                                          |
| "Index exists, so query fine"                 | Show plan/explain and access path. Existing unused index proves nothing.                                                                                      |
| "Projection enough"                           | First reduce rows. Loading fewer columns from too many rows still wastes work.                                                                                |
| "Just cache it"                               | Fix query shape/index/bounds first. Cache can hide stale, unsafe, unbounded work.                                                                             |
| "Only one query in code"                      | Trace loops, serializers, resolvers, consumers, and retries. Fan-out often hides upstream.                                                                    |
| "Loop is fine, the list is small"             | Show N and worst-case N. O(n²) that's fine at 10 melts at 10k. Bench at real scale.                                                                           |
| "Query is fast, so the endpoint is fast"      | Measure pool acquire-wait and queue depth. A 2ms query behind a saturated pool still yields a 200ms p99 — the wait is at the pool entrance, not in the query. |
| "Found one similar pattern, good enough"      | Grep 3+ and verify preconditions match. One nearby example ≠ a fit; cite `file:line`.                                                                         |
| "Fix it where it errors/spikes"               | Trace caller (wrong data) vs callee (wrong handling); fix at the layer owning the invariant, not the symptom site.                                            |
| "Validated nothing, just fix the obvious one" | No fix until `$why-review --validate-findings` confirms it; then restart the FULL review from Phase 0.                                                        |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; update each status immediately.

**IMPORTANT MUST ATTENTION** prove every claim with measurement/static evidence + `file:line` (confidence >80% to act, <60% STOP).
**IMPORTANT MUST ATTENTION** push row filters to the data source before projection/caching; verify index usability via plan/explain, never existence alone.
**IMPORTANT MUST ATTENTION** no fix before `$why-review --validate-findings`; after every validated fix restart the full review from Phase 0 before claiming PASS.

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the _concern axis_; orient with these examples, derive what fits the repository:
>
> | Category Type       | Example Groupings                                                     |
> | ------------------- | --------------------------------------------------------------------- |
> | Agent/Tooling       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs    | Root README, project config, CI/CD pipeline configs                   |
> | Reference docs      | Architecture docs, patterns references, setup guides                  |
> | Feature/domain docs | Business feature documentation, spec files, ADRs                      |
> | Backend logic       | Service/handler/controller source (infer from project structure)      |
> | Frontend logic      | UI component/state/API source (infer from project structure)          |
> | Data/Schema         | Migrations, schema files, seed data                                   |
> | Tests               | Unit, integration, E2E test files                                     |
> | Infrastructure      | Docker, k8s, CI/CD, cloud manifests                                   |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>     - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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
