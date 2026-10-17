---
name: performance-review
description: '[Debugging] Use when a workflow step or the user asks for performance bottleneck analysis and validated fixes: queries, memory, network, rendering and concurrency.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Ensure every shipped performance fix removes a measured or static-risk-labeled bottleneck across data access, compute, runtime/GC, network, client delivery, and concurrency/resilience; calibrate every number against a known anchor, preserve behavior/authorization/semantics, prove before/after evidence, pass `$why-review` before any fix, and complete a clean full Phase-0 re-review — never hide waste or break correctness.

**Summary:**

- **Main path:** detect scope → discover local patterns → measure or label static risk → review all applicable performance dimensions → calibrate severity → plan → validate findings → fix at the owning layer → prove before/after → run a fresh full re-review.
- **Gates:** count rows before row size; bound memory, queues and concurrency; preserve authorization and semantics. Round 1 clears all validated findings, with a LOW-only fix set reviewed after the fix (LOW deferral). Round 2 clears CRITICAL/HIGH/MEDIUM and defers LOW; failed binary gates always block.
- **`--report-only`:** read-only leaf mode for a caller that owns every fix — Phases 0–6 only, no nested sub-agents, no writer beyond the report; see [Report-Only Mode](#report-only-mode---report-only).

**Workflow:** Detect scope → discover local patterns → measure or label static risk → run 12 serial dimension passes → findings and severity → plan → validate findings → fix → run a full re-review.

**Key Rules:** Evidence beats intuition; calibrate numbers against the local performance reference; bound rows, memory, queues, and concurrency; Round 1 fixes every open validated severity (LOW deferral), while Round 2 fixes only CRITICAL/HIGH/MEDIUM and defers LOW-only findings; failed binary gates always block.

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
>
> **AI surface?** Only if the change creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): apply `AE-4`, `AE-5` (context budget, caching layout, timeouts, cost caps) from `.claude/skills/shared/protocols/ai-engineering-gate.md` and route depth to `$ai-engineering-review`; otherwise skip this line.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review performance one dimension at a time — ALL **12**: (1) query shape/over-fetching, (2) index/access path/data topology, (3) N+1 fan-out, (4) aggregation/join shape, (5) materialization/memory, (6) write path/locks/transactions, (7) caching, (8) API payload/frontend delivery/Core Web Vitals, (9) in-process compute/algorithmic complexity, (10) network/protocol round trips, (11) runtime/memory/GC pauses, (12) distributed resilience/load management (timeouts, retries, queue bounds). NEVER stop at 9 — 10-12 are the layers a code-only reading habitually never opens.
> **[IMPORTANT]** MANDATORY MUST ATTENTION include in-process compute, not just I/O: flag O(n²)+ nested scans, linear membership lookups inside loops, ReDoS-prone regex, and per-iteration serialize/clone — CPU bottlenecks need the same evidence rigor as queries.
> **[IMPORTANT]** MANDATORY MUST ATTENTION when an operation is fast but p95/p99 is high, investigate saturation: measure pool/thread acquire-wait and queue depth. Little's Law estimates average demand at the measured pool boundary; validate burst/wait behavior and the sum of per-instance connection budgets against shared-backend limits.
> **[IMPORTANT]** MANDATORY MUST ATTENTION calibrate every number against a known anchor before assigning severity — latency ladder, utilization knee, Core Web Vitals thresholds, hit-ratio math (`references/performance-knowledge.md`); a breached anchor is a HYPOTHESIS to verify with local evidence, NEVER a finding on its own.

> **[PERFORMANCE-FIRST PRINCIPLES — three non-negotiable checks on every hot path, OOM first]**
>
> 1. **[MOST IMPORTANT] Hunt every OOM / out-of-memory bad practice.** Unbounded read-all / `SELECT *` / no page bound, full materialization before paging/filtering, buffering a whole export/report instead of streaming/chunking, loading blobs / large JSON / tracked entities for list views, accidental multiple enumeration, unbounded caches / accumulators / queues / in-memory joins. Triage row **COUNT before row SIZE**, reduce rows **AT THE SOURCE** — a fast query pulling millions of rows still OOMs the process. Bound EVERY result set with a page/limit/cursor or proven business invariant.
> 2. **Right data structure & algorithm for the stack.** Match the structure to the access pattern via the runtime's efficient primitive — O(1) `Set`/`Map`/dict/hash lookup instead of a linear `find`/`includes`/`contains`/`in list` scan inside a loop; no O(n²) where O(n log n) / O(n) / O(1) exists; single-pass min/max/partition instead of redundant re-sort. Prove the complexity class at worst-case N, never by intuition.
> 3. **Batch once, or parallelize — never serial fan-out.** Collapse per-item query / API / cache calls into ONE batched call (`IN` / bulk / aggregate / prefetch dictionary); where independent calls remain, run bounded-parallel with a fresh safe resource per worker instead of sequential awaits — always preserving ordering, authorization, idempotency.

> **[BLOCKING] Query Scan Gate — no search or query scans rows on large data.** Every query, search or filter the change adds or alters on data that can grow large (no proven small, invariant-bounded size) reaches its rows through an index-backed, sargable access path and returns a bounded result (page, limit or cursor). A full table or collection scan, a leading-wildcard `LIKE`, unanchored regex or `contains` search, a non-sargable predicate (dimension 2), or an unindexed filter, join, sort or group key on such data is at least a HIGH finding and blocks the verdict; free-text search needs a full-text or search index, not a scan. Evidence: the serving index (`file:line` in the schema or migration) and, when available, plan/explain output at realistic volume. A scan stays only when the data is provably bounded (state the bound) or the plan is shown cheap at production volume. This gate sets the severity floor for these patterns; the scale-evidence rule under severity governs every other finding.

> **Performance Knowledge (calibration constants & domain laws)** — the anchors severity depends on:
>
> - **Latency ladder** `1 ns → 100 ns → 100 µs → 10 ms → 100 ms` (L1 → RAM → SSD → disk seek → intercontinental), each rung ~100-1000×; **~1 ms RTT per 100 km of fiber is a hard floor** no code fix beats.
> - **Measure the local SLO knee** — M/M/1 illustrates mean queue wait `service_time × ρ/(1−ρ)`: 80%→4×, 90%→9×, 95%→19× under its assumptions, not a universal CPU limit. **Little's Law** `L = λ × W` estimates average in-flight work, not a pool-size floor. **Tail amplification** — fan-out to 100 backends hits a p99 ~63% of the time, so a backend p99 becomes the user's median.
> - **Core Web Vitals** LCP ≤2.5 s · INP ≤200 ms · CLS ≤0.1 · TTFB ≤800 ms, measured at **p75 of real users** (field), never a lab score alone.
> - **Cache hit-ratio math** — 90%→99% cuts origin load **10×**; percentiles are NEVER averageable.
>
> **MANDATORY MUST ATTENTION [BLOCKING at the severity/anchor moment]** READ `references/performance-knowledge.md` — full ladder, universal laws, symptom→cause triage matrix, and deep tables for network/protocol, DB engine + isolation + sharding, caching, web/CWV, memory/GC, distributed resilience, measurement rigor. The read is REQUIRED — never optional — before you **assign a severity** or **quote/compare any anchor constant**; NEVER assign a severity or cite an anchor from memory or from the 4-bullet digest above. A scope-narrowed review that assigns no severity and quotes no constant may proceed on the digest alone. — why: the digest orders hypotheses but only the body carries the thresholds severity depends on, and quoting a constant without measuring THIS system is the guess-as-fact failure this skill exists to prevent.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `systematic-review-batching` — Triage all files and plan adaptive review with complete coverage and no fixed size caps; choosing review assignments or handling working-set overflow → .claude/skills/shared/protocols/systematic-review-batching.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step/sub-skill call, update todo tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Contents

- [Quick Summary](#quick-summary)
- [Detailed Summary](#detailed-summary)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [Phase 0: Detect Scope](#phase-0-detect-scope)
- [Architecture-Altitude Performance Review](#architecture-altitude-performance-review)
- [Phase 1: Discover Local Context](#phase-1-discover-local-context)
- [Phase 2: Baseline Evidence](#phase-2-baseline-evidence)
- [Phase 3: Serial Dimension Passes](#phase-3-serial-dimension-passes)
- [Phase 4: Findings And Severity](#phase-4-findings-and-severity)
- [Phase 5: Optimize Plan](#phase-5-optimize-plan)
- [Sub-Agent Routing](#sub-agent-routing)
- [Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)](#phase-6-why-review-findings-validation-gate-mandatory-when-findings-exist)
- [Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)](#phase-7-validated-fix--full-performance-re-review-loop-mandatory-when-validated-findings-remain)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

## Detailed Summary

Read [Architecture-Altitude Performance Review](#architecture-altitude-performance-review) when judging a design; apply the same evidence gate before recommendations. Before recommending caching, understand query shape, indexes, pagination, batching and data volume; completion requires measured hit ratio and a bound.

<target>$ARGUMENTS</target>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow parallel review barrier over a plan or design, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` selects it; review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run Phases 0–6 only.** A plan or design target uses the Architecture-Altitude lens with `static risk` labels. Phase 5 becomes the report's recommended optimization plan — no code, plan, or artifact edit. Phase 6 `$why-review --validate-findings` still validates every finding. **Phase 7 does not run:** return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **No nested fan-out.** Skip Sub-Agent Routing and size-capped batching; review sequentially in this context.
>
> For this mode the declared step order ends at Phase 6; stopping there is the mode's contract, not a skipped step.

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
| Network/protocol    | chatty call count, per-request handshake, no keep-alive, large payload, cross-region hop        | call count × RTT, connection reuse state, TLS/DNS timing, payload size, HTTP version            |
| Runtime/GC          | latency spikes uncorrelated with load, pauses, RSS growth, blocked event loop                    | GC log/pause histogram, allocation rate, RSS vs heap, thread states, event-loop lag             |
| Resilience/load     | retry storm, no timeout, unbounded queue, cold-start blip, one tenant degrades all               | timeout/retry config, queue depth AND age, breaker state, per-tenant rate limits                |

Check applicability for all 12 dimensions; skip a dimension when project configuration and inspected paths prove its surface absent or outside the selected scope. Record the evidence; do not invent dependencies or setup to fill an inapplicable dimension.

**Triage accelerator (symptom → usual cause).** MUST ATTENTION use the symptom→cause matrix in `references/performance-knowledge.md` §3 to pick the FIRST evidence to pull — it maps signatures AI habitually misreads, e.g. `p99 bad + p50 fine` → GC pause / lock contention / fan-out tail / cold cache (NOT a slow query); `latency scales with result size` → N+1; `sudden cliff at some load` → utilization knee or pool exhaustion; `degrades over days, fine after restart` → leak/bloat/connection leak; `slow for one tenant only` → hot key/partition skew. NEVER let the matrix replace evidence — it orders the hypotheses, Phase 2 proves one.

---

## Architecture-Altitude Performance Review

> **When to apply:** design/architecture reviews (e.g. `architect` agent) — judge performance as a **structural property of the design** BEFORE it ships, not a tactical query fix after a bottleneck appears. Dimension passes stay the tactical tool; this section is the design-level lens.

Evaluate the **layer model** as a design concern, not a symptom site:

```
Performance as architecture
├── Database  — data access shape baked into the model (projection, paging, N+1 surface, index strategy, partition/shard key)
├── API       — serialization/processing cost, batched vs per-item queries, response-DTO contracts
├── Network   — payload size & call-count designed into the contract (batch endpoints vs chatty waterfalls), endpoint placement vs RTT budget
├── Frontend  — bundle/lazy-load topology, change-detection/list-keying/virtual-scroll as default architecture
├── Runtime   — allocation profile & collector choice, event-loop discipline, pool sizing, working-set target
└── Background jobs — bounded parallelism (local concurrency-limited primitive) + bulk write (local batch API) as the shape, not an afterthought
```

Architecture-altitude rules (decide at design time — cheapest to fix here):

- **Bound every result set and project only needed columns/fields in the contract itself** — never design an unbounded read-all or `SELECT *` endpoint; unbounded reads spike memory/latency under real data volume.
- **Design out N+1 at the boundary** — eager-load / batch-fetch is the default access pattern; per-item lookups are a design smell, not a tuning detail.
- **Caching is a design decision, not a patch** — choose request-scope memoization vs bounded shared cache up front, with key dimensions (tenant/user/auth/version), TTL/invalidation, size limits, privacy constraints specified; never cache to hide an unbounded query.
- **Async I/O is structural** — never design a path blocking threads with `.Result`; bounded parallelism for fan-out is part of the design, with a fresh safe scope/context per worker.
- **Make the cost visible** — design slow-operation + query logging in from the start so regressions are observable in production.
- **Size pools and parallelism, never default them** — estimate average in-use demand using Little's Law (arrival-rate × resource hold-time at the same boundary), then validate burst/wait behavior and dependency limits. Shorten unnecessary _hold-time_ before growing the pool; validate fleet-wide connection budgets (sum of per-instance pools) against shared-backend capacity — local tuning can overload a shared dependency.
- **Budget the round trips and the geography in the contract** — count `call count × RTT` for every designed interaction and place the endpoint (edge/region/replica) against the latency budget; ~1 ms RTT per 100 km and a 2-RTT TCP+TLS handshake are floors no later optimization removes, so a chatty contract or a distant endpoint is a permanent design cost, not a tuning detail.
- **Design the load-management controls in, not on** — a decreasing timeout budget per hop, backoff + full jitter + retry budget + idempotency keys, breaker/bulkhead/shedding, and a BOUND on every queue belong in the design; leave them out and the system amplifies its own partial failures. Reserve headroom below the measured SLO boundary and validate scaling indicators against the limiting resource and warmup delay; queue depth/concurrency can lead aggregate CPU.
- **Choose the runtime cost profile deliberately** — allocation rate and collector choice set the tail (GC pauses are correlated fleet-wide and invisible in the mean); an event-loop runtime must keep CPU work off the loop by design; state the working-set target so the RAM/page-cache cliff is a known bound, not a surprise.

DB index strategy at design time → dimension 2 below (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) still applies to every recommendation at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings (MUST ATTENTION):

- ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `cache`, `timeout`, `retry`, `pool`, `contributing`, `style guide`.
- search 3+ similar local query/API patterns before proposing a fix.
- read target code and index/migration/schema files controlling the queried data.
- map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy. Optional: when the hot-path fan-out is hard to see by grep and `.code-graph/graph.db` exists, a graph blast-radius pass (`trace --direction downstream` on the hot path) can hint at the fan-out (it may be stale — verify by reading) — see the Graph-Assisted Investigation advice below.
- identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys, partition/shard key, primary vs replica routing.
- ALWAYS discover the local **SLA/budget** (latency target, page-size cap, throughput/SLO) before judging any number — the local budget outranks every anchor in `references/performance-knowledge.md`.
- Read the local configuration used by the inspected path: runtime/memory settings and, where present, HTTP/connection pools, timeout/retry/breaker policy, queue/consumer bounds, rate limits, container limits, CDN/assets or field metrics. Record absent surfaces as N/A; a CPU-only utility need not acquire service or database configuration.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, runtime/GC flags, HTTP clients, or framework defaults; derive every one from discovered files.

---

## Phase 2: Baseline Evidence

For capacity/load or cache-placement work, apply `SYNC:measured-capacity-engineering`: disclose workload and offered/achieved demand, attribute resource pressure, preserve cache correctness, and verify cold-state/overload recovery. Read `references/performance-knowledge.md` §10.1 and §6.1 when designing those experiments.

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

MANDATORY calibration + measurement rigor on EVERY baseline (`references/performance-knowledge.md` §1-2, §10):

- ALWAYS state which anchor the number violates (ladder rung, utilization knee, CWV threshold, hit-ratio target) — a raw number with no anchor cannot carry a severity.
- Report sample count, repetitions and meaningful distributions; do not hide tails behind a mean. Segment by the workload dimensions that exist (such as endpoint/tenant/region in a service). NEVER average percentiles across instances or windows — aggregate histograms instead; do not invent segments for a CPU-only benchmark.
- For concurrent request/load measurements, disclose the load model: open arrival-rate versus closed fixed-user demand, offered/achieved work and possible coordinated omission. For a compute microbenchmark, disclose input shape, iteration/repetition and timing method instead; do not present it as system capacity.
- State input/data volume and relevant cache state. For growth comparisons use representative and worst-case sizes with realistic shape/skew; a roughly 10× comparison can expose super-linear work. Persistent-data tests reuse the project’s supported seed/fixture owner; compute-only tests generate valid inputs without a database/seeder. Capacity/leak claims require the applicable cold-state or soak evidence; toy or warm-only data cannot establish those claims.
- ALWAYS warm up (JIT + caches), measure steady state, repeat, and name the environment before comparing to a baseline; NEVER present a microbenchmark as system behavior.
- NEVER quote an anchor from the reference as a project requirement — local SLA/spec/config wins; the anchor calibrates, it does not govern.

Confidence:

| Confidence | Action                                                |
| ---------- | ----------------------------------------------------- |
| 95%+       | Recommend fix freely.                                 |
| 80-94%     | Recommend with caveats and verification command.      |
| 70-79%     | List unknowns first; gather more evidence before fix. |
| <70%       | STOP. Do not recommend.                               |

---

## Phase 3: Serial Dimension Passes

MANDATORY apply one focused pass per dimension. NEVER scan all dimensions at once. **12 dimensions** — 1-9 are the in-process/data-access core, 10-12 cover the layers a code-only reading habitually skips (network round trips, runtime/GC, resilience under load). `references/performance-knowledge.md` carries deep tables for network/protocol (§4), database (§5), caching (§6), web/CWV (§7), memory/GC (§8), and distributed resilience (§9); the remaining dimensions calibrate against the ladder, universal laws, and triage matrix (§1-3) instead of a dedicated table.

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

### 2. Index, Access Path And Data Topology

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order? **Sargability first:** for EVERY filter/join predicate, is the indexed COLUMN left bare, or is it wrapped in a function/transformation that the DB must compute per row (killing the index)? Then: does the query reach the data through the right partition/shard/replica?

> **MUST ATTENTION — Non-sargable predicate spot-check (any ORM/SQL).** A function, cast, concatenation, date extraction, or leading-wildcard predicate on a column can prevent an ordinary index seek; expression indexes and optimizer support depend on the actual database. Inspect the translated query and actual collation/normalization rules before proposing a rewrite. For case-insensitive comparisons, use a database-supported collation/operator or a normalized indexed column/expression index only after proving equivalent results. Moving normalization to the parameter alone or listing a few casing variants does not preserve arbitrary mixed-case or Unicode matches. Preserve tenant/auth filters, null behavior, locale, Unicode normalization and result sets with representative fixtures before measuring performance. Verify improvement separately with `EXPLAIN`/the query plan and representative load; a sequential scan can be optimal for low selectivity and is not by itself proof of a defect.

Find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- **non-sargable predicate: an indexed column wrapped in a function/cast/concat/date-part/transformation** (see spot-check above) — the single most common silent index-loss; also incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis
- **leftmost-prefix violation** — a query filtering only on the SECOND column of a composite index gets no seek from it
- **selectivity not established** — "add an index" proposed without the selectivity number; above ~5-20% selectivity a sequential scan legitimately beats random index lookups
- **stale statistics** — plan/explain shows estimated rows far from actual rows; the plan is wrong for a reason no rewrite fixes (refresh stats/analyze first)
- **partition pruning lost** — partitioned table queried without the partition key, so every partition is scanned
- **shard/partition key skew** — monotonic (timestamp/auto-increment) or low-cardinality key creating a hot shard/partition; per-partition throughput ceilings hit by one key
- **replica read correctness-vs-lag** — read-your-writes broken by replication lag, or a lag-sensitive read pointed at a replica
- random-UUID primary key destroying index locality and inflating index size (time-ordered UUIDv7/ULID fits)

Prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, refresh statistics, carry the partition/shard key into the predicate, salt or re-key a hot partition, route lag-sensitive reads to primary (or a sticky/LSN-aware window), verify with plan/explain before/after, include write-cost risk. **Escalate in order — tune query/index → cache → vertical → read replicas → partition → shard**; NEVER propose sharding before the earlier rungs are proven exhausted (why: resharding and cross-shard joins are the most expensive reversal in the ladder).

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
- **long-running or idle-in-transaction connection** — under MVCC it pins old row versions and drives bloat/vacuum pressure fleet-wide (a slow-motion outage, not a local slowdown)
- **isolation level mismatched to the invariant** — lost update at Read Committed, or write skew at Snapshot/Repeatable Read where Serializable (or an explicit lock/version column) is required; read-modify-write done in application code instead of one atomic `UPDATE`
- inconsistent lock acquisition ORDER across code paths (deadlock source), or no retry on the deadlock error
- schema/migration change taking a blocking lock proportional to table size instead of an online pattern (nullable add → batched backfill → `NOT VALID` constraint → validate; concurrent index build; expand/contract)
- durability setting silently traded for throughput without the trade named (fsync/commit-sync relaxation)

Prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker, pick the isolation level the invariant needs (or an explicit `FOR UPDATE`/version column), make write conflicts atomic in one statement, order lock acquisition consistently and retry deadlocks, use the online migration pattern for large tables.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

Find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data
- **no cache-value evidence** — measure hit rate and work avoided: at fixed demand, 90%→99% reduces miss traffic 10×. Value also depends on miss cost, key cardinality, memory and consistency cost.
- **stampede/thundering-herd exposure** — hot key expiring sends every request to origin at once; no single-flight/request-coalescing, no per-key lease, no TTL jitter, or a whole key class expiring simultaneously
- **cold-start blindness** — post-deploy/failover empty cache indistinguishable from an origin outage; no warming and no LB slow-start
- unbounded cache (a memory leak with a friendly name): no size bound, no entry lifetime, no eviction policy matched to access skew — and **cache thrash** once the working set exceeds cache size (a cliff, not a slope)
- missing negative caching, so nonexistent keys generate repeated miss-storms
- schema/build version absent from the key, so a deploy can serve poisoned entries

Prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics. Add single-flight + TTL jitter for hot keys, stale-while-revalidate where staleness is acceptable, negative caching (or a Bloom filter) for absent keys, a version segment in the key, and an eviction policy matched to the access skew (LRU default, LFU/W-TinyLFU for skewed). NEVER treat "we added a cache" as a completed fix without the measured hit ratio and the bound.

### 8. API Payload, Frontend Delivery And Rendering

**Think:** Does the user-perceived time come from payload size, render/interaction work on the main thread, or asset delivery? Judge against the Core Web Vitals thresholds at **p75 of real users**, never a single lab run.

Find:

- endpoint returns more payload than the view needs; response DTO shaped by the table, not the screen
- **CWV breach** — LCP > 2.5 s, INP > 200 ms, CLS > 0.1, TTFB > 800 ms (`references/performance-knowledge.md` §7)
- **long task > 50 ms** blocking the main thread (destroys INP); CPU-bound work never yielded or moved to a Worker
- **layout thrashing** — interleaved DOM read/write forcing a synchronous reflow per iteration
- animation on layout-triggering properties (width/top/left) instead of compositor-only `transform`/`opacity`
- **CLS source** — image/ad/embed with no reserved space (`width`/`height`/`aspect-ratio`); FOIT from missing `font-display`
- render-blocking synchronous CSS/JS in `<head>`; critical CSS not inlined
- **JS weight/parse cost** — the most expensive byte class (parse + compile + execute, unlike an image); no code splitting, no route-level lazy load, no tree-shaking
- **third-party scripts** loaded eagerly (tag managers, chat, analytics) — habitually the #1 regression source
- repeated fetch, client-side request waterfall (N+1 over HTTP), missing list virtualization, unstable render keys/track-by
- hydration cost scaling with component count; rendering strategy (CSR/SSR/streaming/SSG/islands) never chosen as a performance decision
- HTTP caching wrong: assets not hashed+immutable, HTML not revalidated, `Vary` incorrect (cache poisoning), no Brotli/gzip on text
- missing resource hints where they pay (`preconnect` saves DNS+TCP+TLS, `preload` for late-discovered critical assets, `fetchpriority`)

Prefer fixes: shape the payload to the view, batch/aggregate server-side, break or yield long tasks, batch DOM reads then writes, animate compositor-only properties, reserve space for media, defer third-party and cold routes, virtualize long lists, stabilize keys, hash+immutable asset caching with correct `Vary`, Brotli text compression, AVIF/WebP + `srcset` + lazy below-fold. ALWAYS confirm with a browser profile/network waterfall AND field (RUM/CrUX) data — a lab score locates the cause, field data defines the truth.

### 9. Compute And Algorithmic Complexity

**Think:** Does in-process work grow super-linearly with input size, independent of any query or network call?

MUST ATTENTION find:

- nested iteration over the same/related collection (O(n²)+): loop-in-loop, `map` inside `map`, repeated full re-scan
- linear membership/lookup inside a loop — `.find`/`.includes`/`.indexOf`/`in list`/`.contains` where a `Set`/`Map`/dict gives O(1)
- wrong data structure for the access pattern: array used as a keyed store; repeated `.filter().length` for existence
- string built by concatenation in a loop; repeated `JSON.parse`/`stringify`/deep-clone/serialize per iteration
- catastrophic-backtracking regex on user- or attacker-sized input (ReDoS — cross-link `$security-audit`)
- pure-CPU result recomputed every call when inputs are stable (memoization candidate, distinct from data cache)
- redundant sort/re-sort, or sorting when a single-pass min/max/partition suffices

Prefer fixes: build a `Set`/`Map`/dict index once and look up in O(1); hoist invariant work out of the loop; accumulate into an array + single `join` instead of `+=`; precompute/memoize stable pure results; anchor/bound regex and cap input length; pick the data structure that matches the access pattern. Prove with a microbench/profiler sample at representative AND worst-case N — never reasoning alone.

### 10. Network And Protocol Efficiency

**Think:** How many round trips does this path cost, and what is the RTT floor it can never beat? Count calls × RTT before optimizing anything inside a single call.

MUST ATTENTION find:

- **per-request connection setup** — no keep-alive/connection pooling/reused client, so every call pays TCP (1 RTT) + TLS (1-2 RTT) + possibly cold DNS; the single largest and most common network defect
- **chatty contract** — many small sequential remote calls where one batch endpoint or server-side aggregation fits; call count grows with items (network N+1, distinct from DB N+1)
- **RTT floor ignored** — latency budget already consumed by geography (~1 ms per 100 km) or cross-region hops, with a code-level fix proposed instead of an edge/replica/CDN move
- payload not compressed (no Brotli/gzip on text), or over-large for the consumer; critical response exceeding the ~14 KB initial congestion window when first-round-trip delivery matters
- protocol left on the table: HTTP/1.1 head-of-line blocking with 6-conn/origin limits, domain sharding retained under HTTP/2 (now an anti-pattern), lossy/mobile path that would benefit from HTTP/3/QUIC
- small-write RPC path suffering Nagle + delayed-ACK (~40 ms stalls) without `TCP_NODELAY`
- **infra exhaustion limits unchecked** — file descriptors, listen backlog, ephemeral ports (~28k default), `TIME_WAIT` accumulation, conntrack table, NAT/SNAT ports: these present as "random" latency or errors, never as a slow function
- load balancing weak: naive round-robin where least-connections/power-of-two-choices fits, no health check or outlier ejection, **no slow-start for new instances** (a cold node given full traffic times out)
- sticky sessions used where stateless + external session store fits, blocking rebalancing

Prefer fixes: reuse connections (keep-alive + pooled clients), collapse chatty calls into one batch/aggregate endpoint, move the endpoint closer (edge/CDN/regional replica) when RTT is the floor, compress and shrink payloads, enable the protocol version that matches the path, raise/verify the OS and infra limits, and configure LB algorithm + health checks + slow-start. ALWAYS quantify as `call count × RTT` before and after — why: a faster handler behind 12 avoidable round trips is not a fix.

### 11. Runtime, Memory And GC

**Think:** Does the runtime itself inject latency the code cannot see — collector pauses, allocation pressure, a blocked event loop, memory that never returns?

MUST ATTENTION find:

- **GC pause as a tail-latency source** — latency spikes uncorrelated with load, invisible in the mean and correlated across the fleet; allocation RATE (not heap size) driving collection frequency
- heap mis-sized: too small → continuous GC; too large → long pauses and swap risk; no headroom left for off-heap/native buffers/thread stacks
- **managed-language leak shapes** — unbounded caches, un-removed listeners/subscriptions, closures capturing large scopes, static collections, thread-locals on pooled threads
- **RSS ≠ heap confusion** — container/pod killed on RSS while heap looks healthy (fragmentation, native buffers, ~1 MB per thread stack)
- swap active on a latency-sensitive service (prefer fail-fast OOM over swap thrash); page cache double-buffered against an app cache
- **working-set cliff** — data outgrowing L3 → RAM → page cache, producing a step change rather than a gradual slope
- **blocked event loop / blocking call in an async path** — one CPU-bound task stalling every connection; `.Result`/`.await`-blocking on a thread-pool thread
- thread/worker pool mis-sized for the workload class (CPU-bound ≈ cores; I/O-bound ≈ `cores × (1 + wait/compute)`)
- contention shaped wrong: one coarse global lock (the Amdahl serial section) where sharded/striped locks, lock-free counters, or immutable/copy-on-write data fit
- cache-line issues on genuinely hot paths: false sharing on adjacent hot counters, NUMA-remote allocation (~2× local), random access where sequential is available (10-100× on the same bytes)

Prefer fixes: cut allocation rate before tuning the collector, right-size the heap with headroom, bound every cache and unregister every listener, measure RSS not heap against the container limit, disable swap for latency-critical services, move CPU work off the event loop, size pools by workload class, reduce lock granularity, and restore sequential access order. Prove with GC-pause histogram, allocation profile, RSS trend, event-loop lag, or off-CPU flame graph — NEVER from code reading alone.

### 12. Distributed Resilience And Load Management

**Think:** Under load or partial failure, does this path degrade gracefully — or amplify the failure? Performance and resilience share the same queues, so a missing timeout is a latency defect.

MUST ATTENTION find:

- **missing or non-decreasing timeout budget** — no timeout anywhere, or a callee timeout ≥ the caller's remaining budget; a hung dependency then exhausts threads/pool and takes the caller down
- **retry amplification** — retries without exponential backoff + FULL JITTER, no cap, no retry budget (≤~10% of traffic), or retries on non-idempotent writes with no idempotency key → a partial outage becomes total
- no circuit breaker on a failing dependency; no bulkhead (shared pool lets one slow dependency consume every thread); no load shedding (slow timeouts served where a fast 429/503 is correct)
- **unbounded queue/buffer** — converts a throughput problem into unbounded latency then OOM; queue AGE not monitored (only depth); no DLQ or poison-message handling; no backpressure propagated to the producer
- **per-item message publish** — producer/consumer emits one message or event per item where one batched message or bulk event fits; broker round trips and consumer invocations then grow linearly with item count (the messaging form of N+1)
- **fan-out tail amplification** — scatter-gather over many backends where a backend p99 becomes the user's median (~63% hit rate across 100 calls); no hedged requests or per-shard timeout
- dual write to DB + broker instead of a transactional outbox/CDC; exactly-once assumed instead of at-least-once + idempotent consumer
- cross-service workflow with no saga/compensation, or 2PC on a latency-sensitive path; consensus/quorum round trips on the hot path
- **wall-clock used for cross-machine ordering** (NTP skew is ms-to-s) instead of monotonic/logical/hybrid clocks; leader action without a fencing token/lease (a GC-paused leader still believes it leads)
- **autoscaling lag** — scaling on lagging CPU rather than a leading indicator (queue depth, concurrency), boot+warmup exceeding the spike, no pre-scale for known events, no headroom below the utilization knee
- **metastable failure risk** — system stays broken after the trigger clears (retry storm + cold cache) with no explicit shedding path to recover
- no per-tenant quota/rate limit (token bucket / leaky bucket / sliding window) — one loud tenant becomes everyone's outage; correlated failure via a shared dependency or shared config push defeating nominal redundancy

Prefer fixes: set a decreasing timeout budget per hop, add backoff+jitter with a retry budget and idempotency keys, add breaker + bulkhead + load shedding, bound every queue and propagate backpressure, reduce fan-out or hedge it, replace dual writes with an outbox, order events by logical clock and fence leaders, autoscale on a leading indicator with headroom, and enforce per-tenant quotas. Prove with timeout/retry config `file:line` + queue depth AND age + breaker state + per-tenant limits — why: these defects are invisible at low load and only surface as the outage they cause.

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

Use specialized help when available (never under `--report-only`):

| Detected focus                                                     | Sub-agent                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| DB/query/N+1/memory/backend hot path                               | `performance-optimizer`                                |
| Auth, PII, tenant isolation, sensitive cache keys                  | `security-auditor` first, then `performance-optimizer` |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist                    |
| Frontend render/bundle/CWV/network waterfall                       | frontend or performance specialist                     |
| Runtime/GC pauses, allocation profile, pool + event-loop sizing    | `performance-optimizer` (runtime evidence: GC log, allocation profile, RSS trend, off-CPU profile) |
| Timeouts/retries/breakers/queue bounds, resilience under load      | `performance-optimizer` with the resilience config in scope; escalate design-level gaps to `architect` |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, the calibration anchors in play (`references/performance-knowledge.md`), report path, and "return summary only; write full report incrementally."

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports overstate easily when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write-cost or data-freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings. Also skip when called with `--loop-owner=caller`: the caller validates the merged report once (`$start-workflow` → Workflow-step mode).

**Protocol:**

1. Read own finalized report from `tmp/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `$why-review --validate-findings <performance-report-path>`.
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`.
4. **If why-review demotes/removes any finding:** update the performance report with revised severity, removed false positives, and a `## Why-Review Validation Notes` section.
5. **If why-review confirms all findings:** append `## Why-Review Validation` stating all findings were re-validated against measurement/static evidence.
6. **If the report changed after validation:** re-run this validation gate, maximum 3 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings.
- Why-review skill itself is the active context.
- Called with `--loop-owner=caller` → log "Skipped — the caller validates the merged report once".

---

## Phase 7: Validated Fix + Full Performance Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 6 returns CLEAN/validated and the performance report still has one or more findings that must be fixed. Under `--report-only` this phase never runs — the validated report is returned to the caller.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the caller's fix step; standalone, apply it with `$fix --target=review`.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `$performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/profiler checks (and any optional graph hint) where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass clears the current round's exit bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `$why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.

---

## Output

MANDATORY final report sections:

- Scope and detected bottleneck type
- Baseline evidence and unknowns — each number with the anchor it is calibrated against, the load model behind it, and the dimensions covered vs explicitly skipped (with reason)
- Findings ordered by severity
- Optimization plan and rejected alternatives
- Verification plan with before/after metrics
- Test/spec/doc impact or explicit skip reason
- Confidence and assumptions

If evidence insufficient, output: `Insufficient evidence. Verified: [...]. Not verified: [...]. Next evidence needed: [...].`

**Optional performance-test handoff:** when missing repeatable workload/query/memory evidence would benefit this scope, include a hint to `$performance-test --mode=write <scope>`. Read [the handoff contract](../performance-test/SKILL.md#optional-handoff-from-system-reviews) when offering it: an interactive owner may ask whether to write tests; report-only/caller-owned leaves only return the suggestion. An affirmative authorizes writing plus static review, never execution. Do not automatically initialize, write or verify tests from a review.

---

<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->



<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every shipped performance fix removes a measured or static-risk-labeled bottleneck across data access, compute, runtime/GC, network, client delivery, and concurrency/resilience; calibrate every number against a known anchor, preserve behavior/authorization/semantics, prove before/after evidence, pass `$why-review` before any fix, and complete a clean full Phase-0 re-review — never hide waste or break correctness.

**IMPORTANT MUST ATTENTION — Main steps:** Detect scope and symptom→cause triage → discover local context and 3+ patterns → baseline evidence and calibrate anchors → run 12 serial dimension passes → order findings by severity → plan the smallest behavior-preserving optimization → validate findings with `$why-review --validate-findings` → fix only validated findings that block the current round and restart the full Phase-0 review (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block).

- **Evidence and calibration:** measure before/after or label `static risk` with an exact verification command. Read `references/performance-knowledge.md` before severity or anchor comparisons; local SLA/spec wins. An anchor breach is a hypothesis requiring local proof. Apply the confidence table in Phase 2.
- **Coverage:** check all 12 dimensions serially and record evidence-backed N/A for absent or out-of-scope surfaces. Inspect actual runtime/dependencies; count calls × RTT, connection reuse and resilience where those paths exist.
- **Hot paths:** reduce rows at the source before projection/caching, bound result sets and memory, verify index usability with query shape and plan/explain, prove worst-case complexity, and batch or use safe bounded parallelism.
- **Measurement:** report segmented distributions, never average percentiles, disclose load model and cache/data state, and measure pool acquire-wait, resource hold-time and fleet dependency budgets. Shorten unnecessary hold-time before growing pools.
- **Fix authority:** validate findings through `$why-review --validate-findings` before fixing. Restart the full Phase-0 review over the complete target after current-round blocking fixes; retain the LOW deferral exception. Under `--report-only`, return the validated report after Phase 6; the caller owns fixes/re-review.
- **Delegation:** tag tasks PAR/SEQ, group PAR tasks into disjoint-write waves, spawn each wave together, and wait for all returns before advancing. `--report-only` forbids fan-out.
- **Local fit and contracts:** search 3+ matching local patterns and inspect schema/index owners. Put changed SLA, result/page bounds or pool assumptions in both a §5 spec invariant and a guarding test/benchmark. Track tasks and finish with a doc/test/spec staleness review.

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
| "Validated nothing, just fix the obvious one" | No fix until `$why-review --validate-findings` confirms it; then fix only the current round's blocking severities and restart the FULL review from Phase 0. Round 2 LOW-only findings are deferred. |
| "Every handler is fast, so the path is fast"  | Count `call count × RTT` and check connection reuse. 12 avoidable round trips beat any handler micro-optimization.                                             |
| "Latency is high, optimize the code"          | Check the RTT/geography floor first (~1 ms per 100 km) — physics and handshakes are not fixable in code; only moving the endpoint is.                          |
| "Spikes are random / just noise"              | Correlate against GC pauses, cold cache, deploys, and pool wait before calling anything random. Uncorrelated-with-load spikes are usually the runtime.         |
| "Added a cache, that's the fix"               | Show the measured hit ratio AND the size/TTL bound. Hit ratio alone does not establish value; unbounded is a leak.                                                      |
| "Resilience is not a performance concern"     | A missing timeout, jitterless retry, or unbounded queue IS a latency defect — same queues, and it converts partial failure into total.                         |
| "Lighthouse score is green"                   | CWV verdicts come from field p75 (RUM/CrUX). Lab locates causes; field defines truth.                                                                          |
| "Only 9 dimensions matter, 10-12 are infra"   | 10-12 (network, runtime/GC, resilience) are where code-only reviews are blindest. NEVER drop a dimension without an evidence-backed skip reason.               |
| "Anchor says it's slow, that's the finding"   | An anchor breach is a hypothesis. Promote it with `file:line` + measurement or an explicit `static risk` label and verify command.                             |
| "Digest is enough, skip the references body"  | The digest orders hypotheses; only the body carries the thresholds. NEVER assign a severity or quote an anchor constant from memory or the digest — read it.    |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; keep one `in_progress`, mark each completed after evidence, and include the final doc/test/spec review.


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
