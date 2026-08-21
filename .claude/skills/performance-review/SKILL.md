---
name: performance-review
version: 3.5.0
description: "[Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory/GC, concurrency and pool saturation, algorithmic complexity (O(n²)), network/protocol round trips, frontend rendering and Core Web Vitals, caching, and distributed/resilience paths. Calibration constants and domain laws (latency ladder, Little's Law, utilization knee, CWV thresholds, symptom→cause triage) live in references/performance-knowledge.md."
---

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review performance one dimension at a time — ALL **12**: (1) query shape/over-fetching, (2) index/access path/data topology, (3) N+1 fan-out, (4) aggregation/join shape, (5) materialization/memory, (6) write path/locks/transactions, (7) caching, (8) API payload/frontend delivery/Core Web Vitals, (9) in-process compute/algorithmic complexity, (10) network/protocol round trips, (11) runtime/memory/GC pauses, (12) distributed resilience/load management (timeouts, retries, queue bounds). NEVER stop at 9 — 10-12 are the layers a code-only reading habitually never opens.
> **[IMPORTANT]** MANDATORY MUST ATTENTION include in-process compute, not just I/O: flag O(n²)+ nested scans, linear membership lookups inside loops, ReDoS-prone regex, and per-iteration serialize/clone — CPU bottlenecks need the same evidence rigor as queries.
> **[IMPORTANT]** MANDATORY MUST ATTENTION when an operation is fast but p95/p99 is high, suspect saturation not the query: measure pool/thread acquire-wait and queue depth, and size pools by Little's Law (in-use = arrival-rate × hold-time) × replica count.
> **[IMPORTANT]** MANDATORY MUST ATTENTION calibrate every number against a known anchor before assigning severity — latency ladder, utilization knee, Core Web Vitals thresholds, hit-ratio math (`references/performance-knowledge.md`); a breached anchor is a HYPOTHESIS to verify with local evidence, NEVER a finding on its own.

> **[PERFORMANCE-FIRST PRINCIPLES — three non-negotiable checks on every hot path, OOM first]**
>
> 1. **[MOST IMPORTANT] Hunt every OOM / out-of-memory bad practice.** Unbounded read-all / `SELECT *` / no page bound, full materialization before paging/filtering, buffering a whole export/report instead of streaming/chunking, loading blobs / large JSON / tracked entities for list views, accidental multiple enumeration, unbounded caches / accumulators / queues / in-memory joins. Triage row **COUNT before row SIZE**, reduce rows **AT THE SOURCE** — a fast query pulling millions of rows still OOMs the process. Bound EVERY result set with a page/limit/cursor or proven business invariant.
> 2. **Right data structure & algorithm for the stack.** Match the structure to the access pattern via the runtime's efficient primitive — O(1) `Set`/`Map`/dict/hash lookup instead of a linear `find`/`includes`/`contains`/`in list` scan inside a loop; no O(n²) where O(n log n) / O(n) / O(1) exists; single-pass min/max/partition instead of redundant re-sort. Prove the complexity class at worst-case N, never by intuition.
> 3. **Batch once, or parallelize — never serial fan-out.** Collapse per-item query / API / cache calls into ONE batched call (`IN` / bulk / aggregate / prefetch dictionary); where independent calls remain, run bounded-parallel with a fresh safe resource per worker instead of sequential awaits — always preserving ordering, authorization, idempotency.

> **Performance Knowledge (calibration constants & domain laws)** — the anchors severity depends on:
>
> - **Latency ladder** `1 ns → 100 ns → 100 µs → 10 ms → 100 ms` (L1 → RAM → SSD → disk seek → intercontinental), each rung ~100-1000×; **~1 ms RTT per 100 km of fiber is a hard floor** no code fix beats.
> - **Utilization knee ~70-80%** — queue wait ≈ `service_time × ρ/(1−ρ)`: 80%→4×, 90%→9×, 95%→19×. **Little's Law** `L = λ × W` sizes every pool. **Tail amplification** — fan-out to 100 backends hits a p99 ~63% of the time, so a backend p99 becomes the user's median.
> - **Core Web Vitals** LCP ≤2.5 s · INP ≤200 ms · CLS ≤0.1 · TTFB ≤800 ms, measured at **p75 of real users** (field), never a lab score alone.
> - **Cache hit-ratio math** — 90%→99% cuts origin load **10×**; percentiles are NEVER averageable.
>
> **MANDATORY MUST ATTENTION [BLOCKING at the severity/anchor moment]** READ `references/performance-knowledge.md` — full ladder, universal laws, symptom→cause triage matrix, and deep tables for network/protocol, DB engine + isolation + sharding, caching, web/CWV, memory/GC, distributed resilience, measurement rigor. The read is REQUIRED — never optional — before you **assign a severity** or **quote/compare any anchor constant**; NEVER assign a severity or cite an anchor from memory or from the 4-bullet digest above. A scope-narrowed review that assigns no severity and quotes no constant may proceed on the digest alone. — why: the digest orders hypotheses but only the body carries the thresholds severity depends on, and quoting a constant without measuring THIS system is the guess-as-fact failure this skill exists to prevent.

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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) real bottleneck — across database waste (rows/columns, missing/unused indexes, query-in-loop fan-out, unbounded materialization, slow joins/aggregations, write amplification, partition/shard skew), in-process compute (O(n²) scans, wrong data structures, ReDoS, serialize/clone churn), runtime cost (GC pauses, allocation pressure, blocked event loop), network round trips (handshake/keep-alive, chatty contracts, RTT floors), client delivery (Core Web Vitals, long tasks, payload/asset weight), and concurrency/resilience saturation (pool acquire-wait sized by Little's Law, timeouts, retries, unbounded queues) — every number calibrated against a known anchor, while preserving behavior, authorization, and semantics, proven by before/after evidence, validated via `/why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

**Summary:**

- **Purpose & 8-phase pipeline (the main tasks):** drive a target through **Phase 0 Detect scope (+ symptom→cause triage) → Phase 1 Discover local context (grep 3+ patterns, read index/schema, map callers) → Phase 2 Baseline evidence + anchor calibration (or `static risk` + verify cmd) → Phase 3 twelve serial dimension passes → Phase 4 Findings + Severity → Phase 5 Optimize plan (behavior-preserving) → Phase 6 `/why-review --validate-findings` gate → Phase 7 validated-fix + full Phase-0 re-review** — so every recommendation removes a real bottleneck, preserves behavior, is evidence-proven; an Architecture-Altitude lens applies the same gate at design time.
- Evidence is the gate, not intuition: capture a runtime baseline (query plan/explain, row counts, p95/p99 distributions, pool acquire-wait, GC pauses, call count × RTT, field CWV, microbench at worst-case N) or label the finding `static risk` with the exact verify command — never recommend below 60% confidence, never average percentiles, always name the load model.
- **Calibrate against the anchors in `references/performance-knowledge.md`** — latency ladder (`1 ns → 100 ns → 100 µs → 10 ms → 100 ms`), utilization knee ~70-80% (`ρ/(1−ρ)`), Little's Law, tail amplification, CWV thresholds, cache hit-ratio math — a breached anchor is a hypothesis to prove locally, NEVER a finding by itself.
- Walk dimensions ONE pass at a time — (1) query shape/data-minimization → (2) index/access-path/data-topology → (3) N+1/fan-out → (4) aggregation/join/pipeline → (5) materialization/memory → (6) write/locks/transactions → (7) cache/reuse → (8) API payload/frontend/CWV → (9) compute/algorithmic → (10) network/protocol → (11) runtime/memory/GC → (12) distributed resilience/load — never all at once; reduce rows at the source before trimming columns or caching, and size pools by Little's Law (replica count × per-instance pool) when a fast op shows high p99.
- No finding is fixable until `/why-review --validate-findings` confirms it (Phase 6); each validated fix then restarts the FULL review from Phase 0 over the whole target (Phase 7) — a targeted before/after check alone never earns a PASS.

> **Renamed:** formerly `/performance` — that name no longer resolves as a slash command; use `/performance-review`.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type; order hypotheses via the symptom→cause matrix.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline against a known anchor, or mark static-only risk.
4. **Analyze** - Run 12 serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, and record evidence.
7. **Validate Findings** - Run `/why-review --validate-findings <report-path>` before any fix.
8. **Fix + Full Re-Review** - Fix only validated findings, then restart from Detect over the full target.

**Key Rules:**

- MANDATORY ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY ALWAYS calibrate a number against a known anchor before assigning severity; an anchor breach alone is a hypothesis, never a finding.
- MANDATORY ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY ALWAYS verify index usability with query shape/order, not index existence alone.
- MANDATORY ALWAYS count `call count × RTT` on a remote path, and check the timeout/retry/queue-bound before optimizing inside a call.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood; NEVER call a cache done without its measured hit ratio and bound.
- NEVER average percentiles, and NEVER trust a throughput number whose load model (open vs closed) is unstated.
- Findings are not eligible for fix until `/why-review --validate-findings` confirms them; every validated fix restarts the full performance review from Phase 0.

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
| Network/protocol    | chatty call count, per-request handshake, no keep-alive, large payload, cross-region hop        | call count × RTT, connection reuse state, TLS/DNS timing, payload size, HTTP version            |
| Runtime/GC          | latency spikes uncorrelated with load, pauses, RSS growth, blocked event loop                   | GC log/pause histogram, allocation rate, RSS vs heap, thread states, event-loop lag             |
| Resilience/load     | retry storm, no timeout, unbounded queue, cold-start blip, one tenant degrades all              | timeout/retry config, queue depth AND age, breaker state, per-tenant rate limits                |

Skip reason allowed only when target explicitly narrows scope and evidence proves dimension irrelevant.

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
- **Size pools and parallelism, never default them** — derive connection/thread/permit pool size from Little's Law (in-use = arrival-rate × hold-time), state the assumptions; shrink _hold-time_ (release the resource across non-DB / external-wait spans) before growing the pool; size a shared backend against fleet-aggregate demand (replica count × per-instance pool), not one instance — local per-instance tuning becomes a thundering herd on the shared dependency.
- **Budget the round trips and the geography in the contract** — count `call count × RTT` for every designed interaction and place the endpoint (edge/region/replica) against the latency budget; ~1 ms RTT per 100 km and a 2-RTT TCP+TLS handshake are floors no later optimization removes, so a chatty contract or a distant endpoint is a permanent design cost, not a tuning detail.
- **Design the load-management controls in, not on** — a decreasing timeout budget per hop, backoff + full jitter + retry budget + idempotency keys, breaker/bulkhead/shedding, and a BOUND on every queue belong in the design; leave them out and the system amplifies its own partial failures. Plan capacity **below the ~70-80% utilization knee** (`wait ≈ service × ρ/(1−ρ)`) and autoscale on a leading indicator (queue depth/concurrency), never lagging CPU.
- **Choose the runtime cost profile deliberately** — allocation rate and collector choice set the tail (GC pauses are correlated fleet-wide and invisible in the mean); an event-loop runtime must keep CPU work off the loop by design; state the working-set target so the RAM/page-cache cliff is a known bound, not a surprise.

DB index strategy at design time → dimension 2 below (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) still applies to every recommendation at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings (MUST ATTENTION):

- ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `cache`, `timeout`, `retry`, `pool`, `contributing`, `style guide`.
- search 3+ similar local query/API patterns before proposing a fix.
- read target code and index/migration/schema files controlling the queried data.
- map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy. When `.code-graph/graph.db` exists, run a graph blast-radius pass (`trace --direction downstream` on the hot path) to size the fan-out before proposing a fix — see the Graph-Assisted Investigation gate below.
- identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys, partition/shard key, primary vs replica routing.
- ALWAYS discover the local **SLA/budget** (latency target, page-size cap, throughput/SLO) before judging any number — the local budget outranks every anchor in `references/performance-knowledge.md`.
- ALWAYS read the local resilience + delivery configuration the new dimensions rest on: HTTP client/keep-alive and pool settings, timeout/retry/breaker policy, queue and consumer bounds, rate limits, GC/runtime and container memory limits, CDN/asset caching headers, and whatever RUM/field-metrics source exists.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, runtime/GC flags, HTTP clients, or framework defaults; derive every one from discovered files.

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

MANDATORY calibration + measurement rigor on EVERY baseline (`references/performance-knowledge.md` §1-2, §10):

- ALWAYS state which anchor the number violates (ladder rung, utilization knee, CWV threshold, hit-ratio target) — a raw number with no anchor cannot carry a severity.
- ALWAYS report distributions, never means: p50/p90/p99/p99.9 + max, segmented by endpoint/tenant/region. NEVER average percentiles across instances or windows — aggregate histograms instead.
- ALWAYS name the load model behind any throughput/latency number: open-model (arrival-rate) exposes queueing collapse, closed-model (fixed VUs) HIDES it; flag suspected **coordinated omission** when a tool reports an implausibly clean tail.
- ALWAYS state data volume and cache state of the measurement — a benchmark on toy data or a warm-only cache is fiction; soak/endurance is the only shape that surfaces leaks, fragmentation, and bloat.
- ALWAYS warm up (JIT + caches), measure steady state, repeat, and name the environment before comparing to a baseline; NEVER present a microbenchmark as system behavior.
- NEVER quote an anchor from the reference as a project requirement — local SLA/spec/config wins; the anchor calibrates, it does not govern.

Confidence:

| Confidence | Action                                                |
| ---------- | ----------------------------------------------------- |
| 95%+       | Recommend fix freely.                                 |
| 80-94%     | Recommend with caveats and verification command.      |
| 60-79%     | List unknowns first; gather more evidence before fix. |
| <60%       | STOP. Do not recommend.                               |

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

> **MUST ATTENTION — Non-sargable predicate spot-check (any ORM/SQL).** Wrapping a column in a function/cast/transformation inside a query predicate translates to `func(column) = $param` — the DB CANNOT use an index on that column and full-scans. Scan every query expression for a **transformation on the COLUMN side**, not the parameter side: `.ToLower()`/`.ToUpper()`/`.Trim()`/`.Substring()` on a column, `col1 + " " + col2 == x` (concatenation), `.Date`/date-part extraction, `Convert`/cast/collation change, leading-wildcard `LIKE '%x'`, or a computed expression compared to a value. Fix — keep the column bare and move the transformation to the in-memory PARAMETER (e.g. case-insensitive via a candidate list `col == x || col == xLower`), OR persist a normalized indexed column, OR add a functional/expression index. ALWAYS prove with `EXPLAIN`/query plan: Index Scan/Seek expected, Seq Scan = the smell confirmed.

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
- **no hit-ratio evidence** — a cache added without measuring the ratio; the ratio IS the value (90%→99% cuts origin load 10×, so a 60% hit ratio is barely a cache)
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
- catastrophic-backtracking regex on user- or attacker-sized input (ReDoS — cross-link `/security-review`)
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

Use specialized help when available:

| Detected focus                                                     | Sub-agent                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| DB/query/N+1/memory/backend hot path                               | `performance-optimizer`                                                                                |
| Auth, PII, tenant isolation, sensitive cache keys                  | `security-auditor` first, then `performance-optimizer`                                                 |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist                                                                    |
| Frontend render/bundle/CWV/network waterfall                       | frontend or performance specialist                                                                     |
| Runtime/GC pauses, allocation profile, pool + event-loop sizing    | `performance-optimizer` (runtime evidence: GC log, allocation profile, RSS trend, off-CPU profile)     |
| Timeouts/retries/breakers/queue bounds, resilience under load      | `performance-optimizer` with the resilience config in scope; escalate design-level gaps to `architect` |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, the calibration anchors in play (`references/performance-knowledge.md`), report path, and "return summary only; write full report incrementally."

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports overstate easily when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write-cost or data-freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `/why-review --validate-findings <performance-report-path>`.
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
2. Fix only findings that survived `/why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the parent `/plan` + `/feature-implement` flow.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `/performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/graph/profiler checks where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass has zero findings.
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `/why-review --validate-findings` validates it.
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
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of _"is technique X present?"_, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scenario-stress-eval -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **3-round ceiling** below.
>
> **Round cap — 3 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 3 with blocking findings still open (severity floor applied) → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 3, LOW stops blocking.** The exit bar tightens by round, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in rounds 1–2 and only validated CRITICAL/HIGH/MEDIUM findings in round 3+. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so.
>
> | Round | Exit bar — loop ENDS when the fresh full review has…                      | Must be fixed to continue      |
> | ----- | ------------------------------------------------------------------------- | ------------------------------ |
> | 1-2   | zero validated findings at ANY severity                                   | CRITICAL · HIGH · MEDIUM · LOW |
> | 3+    | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only is a PASS** | CRITICAL · HIGH · MEDIUM only  |
>
> From round 3 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop immediately** — do not open another round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM should-fix · LOW nice-to-fix); rounds 1-2 are unchanged, so an easy LOW still gets fixed early when it is cheap.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥3)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **The floor bounds the loop, not the standard.** It ends _iteration_; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared → END; blocking findings remain → validate findings → fix → restart from the first review phase. Rounds 1-2 clear on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop** (deferred LOWs go in the report). Capped at **3 rounds**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 3 completes with CRITICAL/HIGH/MEDIUM still open. NEVER loop past 3 rounds, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - From round 3 on, a round whose validated findings are ALL LOW ENDS the loop — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-3 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The 3-round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early at any round, and cap exhaustion escalates rather than passes
> - Enforce the round cap of 3 alongside the 2 repeated-no-progress blocker rule; both are escalation triggers, neither is a completion criterion
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥3)` whenever the loop ended on the round-3+ bar with LOWs still open.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

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

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `/why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: rounds 1-2 exit on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **round cap of 3 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 3 completing with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) bottleneck — across data access, in-process compute, runtime/GC, network round trips, client delivery, and concurrency/resilience saturation — with every number calibrated against a known anchor, while preserving behavior, authorization, and semantics, proven by before/after evidence, validated via `/why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; NEVER present a guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Graph-Assisted Investigation:** ALWAYS run a graph trace on key files when `graph.db` exists.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive per-category concerns from first principles, NEVER a fixed checklist.
- **Systematic Batching:** Large changeset → size-capped parallel batches, then reduce.
- **Performance Knowledge (`references/performance-knowledge.md`):** latency ladder · universal laws (Little, utilization knee, Amdahl, USL, tail amplification) · symptom→cause triage · network/DB/cache/web/memory-GC/distributed deep tables · measurement rigor. Calibrates severity; NEVER governs over local SLA/spec.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** run ALL 8 phases in order — Detect scope (+ symptom→cause triage) → Discover local context → Baseline evidence + anchor calibration → 12 serial dimension passes → Findings+Severity → Optimize plan → Why-Review validation gate → Validated-fix + full Phase-0 re-review; NEVER skip a phase or jump to a fix — why: AI forgets its own steps and ships unmeasured, unvalidated changes.
**IMPORTANT MUST ATTENTION** cover ALL 12 dimensions one pass each — (1) query-shape/data-minimization, (2) index/access-path/data-topology, (3) N+1/fan-out, (4) aggregation/join/pipeline, (5) materialization/memory, (6) write/locks/transactions, (7) cache/reuse, (8) API-payload/frontend/CWV, (9) compute/algorithmic, (10) network/protocol, (11) runtime/memory/GC, (12) distributed-resilience/load — why: a single combined scan silently drops a dimension, and 10-12 are the layers a code-only reading habitually never opens.
**IMPORTANT MUST ATTENTION** calibrate every number against a known anchor before assigning severity — latency ladder (`1 ns → 100 ns → 100 µs → 10 ms → 100 ms`, ~1 ms RTT per 100 km as a hard floor), utilization knee ~70-80% (`wait ≈ service × ρ/(1−ρ)`; 90%→9×), Little's Law, tail amplification (fan-out to 100 backends hits a p99 ~63% of the time), CWV (LCP 2.5 s/INP 200 ms/CLS 0.1/TTFB 800 ms at field p75), cache hit-ratio math (90%→99% = 10× less origin load) — and treat a breached anchor as a HYPOTHESIS needing local proof, never a finding — why: an uncalibrated number cannot carry a severity, and a quoted constant with no local measurement is guess-as-fact.
**IMPORTANT MUST ATTENTION** on any remote path count `call count × RTT` FIRST and verify connection reuse (keep-alive/pooled client) — why: per-request TCP+TLS handshakes and chatty contracts dominate paths where every individual handler is already fast.
**IMPORTANT MUST ATTENTION** check the resilience controls as performance defects — decreasing timeout budget per hop, backoff + FULL JITTER + retry budget + idempotency keys, breaker/bulkhead/load-shedding, and a BOUND on every queue (watch age, not only depth) — why: these are invisible at low load and surface only as the outage they cause; an unbounded queue turns a throughput problem into unbounded latency and then OOM.
**IMPORTANT MUST ATTENTION** report distributions not means (p50/p90/p99/p99.9 + max, segmented), NEVER average percentiles, always name the load model (open-model exposes queueing collapse, closed-model hides it), and flag suspected coordinated omission — why: the aggregate mean hides exactly the tail users complain about.
**IMPORTANT MUST ATTENTION** apply the Performance-First Principles on every hot path — (1) [MOST IMPORTANT] hunt every OOM bad practice: bound every result set, reduce rows at the source, stream instead of buffer, triage row-count before row-size; (2) pick the data structure/algorithm that matches the access pattern (O(1) Set/Map over linear scan-in-loop, no needless O(n²)) and prove the complexity class at worst-case N; (3) batch per-item calls into one, else run bounded-parallel — never serial fan-out — why: unbounded memory OOMs the process, the wrong structure melts at scale, and serial fan-out multiplies latency.
**IMPORTANT MUST ATTENTION** prove every performance claim with measurement or static evidence — `file:line`, query text/shape, row counts, query plan/explain, trace, profile, or logs; confidence >80% to act, 60-79% gather more, <60% STOP — why: a number without a measured baseline is a guess that ships unverified waste.
**IMPORTANT MUST ATTENTION** review performance one dimension at a time — ALL **12**: (1) query shape/over-fetching, (2) index/access path/data topology, (3) N+1 fan-out, (4) aggregation/join shape, (5) materialization/memory, (6) write path/locks/transactions, (7) caching, (8) API payload/frontend delivery/Core Web Vitals, (9) in-process compute/algorithmic complexity, (10) network/protocol round trips, (11) runtime/memory/GC pauses, (12) distributed resilience/load management — NEVER stop at 9 — why: split attention misses violations, and 10-12 are the layers a code-only reading habitually never opens.
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
| "Validated nothing, just fix the obvious one" | No fix until `/why-review --validate-findings` confirms it; then restart the FULL review from Phase 0.                                                        |
| "Every handler is fast, so the path is fast"  | Count `call count × RTT` and check connection reuse. 12 avoidable round trips beat any handler micro-optimization.                                            |
| "Latency is high, optimize the code"          | Check the RTT/geography floor first (~1 ms per 100 km) — physics and handshakes are not fixable in code; only moving the endpoint is.                         |
| "Spikes are random / just noise"              | Correlate against GC pauses, cold cache, deploys, and pool wait before calling anything random. Uncorrelated-with-load spikes are usually the runtime.        |
| "Added a cache, that's the fix"               | Show the measured hit ratio AND the size/TTL bound. 60% hit ratio is barely a cache; unbounded is a leak.                                                     |
| "Resilience is not a performance concern"     | A missing timeout, jitterless retry, or unbounded queue IS a latency defect — same queues, and it converts partial failure into total.                        |
| "Lighthouse score is green"                   | CWV verdicts come from field p75 (RUM/CrUX). Lab locates causes; field defines truth.                                                                         |
| "Only 9 dimensions matter, 10-12 are infra"   | 10-12 (network, runtime/GC, resilience) are where code-only reviews are blindest. NEVER drop a dimension without an evidence-backed skip reason.              |
| "Anchor says it's slow, that's the finding"   | An anchor breach is a hypothesis. Promote it with `file:line` + measurement or an explicit `static risk` label and verify command.                            |
| "Digest is enough, skip the references body"  | The digest orders hypotheses; only the body carries the thresholds. NEVER assign a severity or quote an anchor constant from memory or the digest — read it.  |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; update each status immediately.

**IMPORTANT MUST ATTENTION** prove every claim with measurement/static evidence + `file:line` (confidence >80% to act, <60% STOP); calibrate the number against a known anchor, and treat an anchor breach as a hypothesis, never a finding.
**IMPORTANT MUST ATTENTION** walk ALL 12 dimensions one pass each — dimensions 10-12 (network/protocol, runtime/GC, distributed resilience) are the ones a code-only reading skips.
**IMPORTANT MUST ATTENTION** push row filters to the data source before projection/caching; verify index usability via plan/explain, never existence alone.
**IMPORTANT MUST ATTENTION** no fix before `/why-review --validate-findings`; after every validated fix restart the full review from Phase 0 before claiming PASS.

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
