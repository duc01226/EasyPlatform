# Performance quality gates

Read before writing, reviewing or running performance tests. Evaluate applicable gates serially; each result is PASS, FAIL, UNKNOWN or justified N/A with evidence. UNKNOWN blocks a required pass. These are performance-test protocol requirements; numerical examples are proposals until selected in the project contract.

## Gate matrix

| Gate | Evidence required for PASS |
| --- | --- |
| P1 — Intended workload | Named case/journey, correct observable outcome, endpoint/command mix and weights, auth, read/write ratio, payload/response widths, user pacing and hot/long-tail distribution. Trace to intended behavior and actual production entry points. |
| P2 — Explicit budgets | Per-critical-journey p95/p99 latency, useful throughput, errors/timeouts, resource headroom, queue/async completion and recovery budgets with units, provenance and rationale. Protect existing project SLOs; separate provisional targets from accepted requirements. |
| P3 — Valid experiment | Release build/runtime/config fingerprint; warmup separated from measurement; clock/duration correctness; repeated comparable runs; enough samples per segment for claimed percentiles. Report variability and noisy/inadequate samples as INCONCLUSIVE. No averaging percentiles across runs. |
| P4 — Large realistic data | Whole-schema manifest and verified actual counts, at least `max(100000, target-volume)` per growable table/collection, realistic row sizes/relations/skew and indexes/statistics. Identify bounded dictionaries/config/migration/system tables and justify exclusions. A small per-tenant dataset must include a large tenant when plausible. |
| P5 — Enforced hardware | Verified running limits and topology, per-service **and total** CPU/RAM, swap policy, datastore/cache/worker allocations, disk/IO and generator placement. Capture hardware model/architecture, OS/kernel/VM/container/runtime versions and resource competition. CPU quota is not a portable CPU-speed specification. |
| P6 — Delivered load | Defined load model, achieved active users/connections, offered/attempted/completed successful work, errors/timeouts/rejections, generator drops/lateness and generator CPU/RAM/network/socket headroom. The configured target alone is insufficient. |
| P7 — Correctness at load | Content/state assertions, authorized access, write/async completion and data integrity under contention; retries and deduplication visible. Count useful successes only; unexpected rejection, skipped work or wrong/empty results cannot improve capacity. |
| P8 — Bounded memory/no observed OOM | Runtime + container/process evidence before/during/after load, no OOM events/errors/kills or unexplained restart, peak below a justified headroom budget and sustained memory/queue trend within declared bounds. Cover setup, heavy results, concurrent jobs, cache churn and overload/recovery. |
| P9 — Query/search access paths | Complete in-scope query/command/search inventory mapped to query fingerprints and representative actual plans at acceptance volume. No unexplained large-table hot-path scan, unbounded materialization or scan-based search. Match semantics, predicates, sort, join and index usage; inspect rows examined/returned, loops, IO/spills, lock/pool waits and query count. |
| P10 — Growth behavior | Compare at least two justified data/load sizes including acceptance volume; test larger working sets when projected to outgrow RAM. Bound page/result sizes, algorithmic work, export buffers, caches, fan-out, retries, queues and pools. Record observed time/memory/work ratios; investigate superlinear growth. |
| P11 — Sustained and failure recovery | Expected-load plateau, relevant spike/stress/breakpoint/endurance, cold/expired cache and dependency-slow cases, followed by drain/recovery. Bounded rejection beyond design capacity may be correct; target acceptance load must still meet its own success SLO. No durability/auth/correctness sacrifice. |
| P12 — Reproducibility/reporting | One verified local command, isolated owned fixtures, current complete machine/human/raw artifacts, nonzero failure exit, per-case gate status, environment/dataset/workload fingerprints and baseline identity. Failed/cancelled runs retain diagnostics. |

## Workload and hardware acceptance

For a multiuser service, include **1,000 simultaneously active users** with an explicit journey/pacing model and measure achieved concurrency. Also use independent arrivals when the production demand is independent; closed users reduce offered throughput as responses slow. Separate active users, open sockets, in-flight requests and RPS. A 1,000-user configuration that actually delivers 40 active users is not a pass. Library/batch/single-user systems record why this profile is N/A and use relevant workers/tasks/input size instead.

Start from a **2 vCPU / 4 GiB total SUT reference envelope** when no project hardware budget exists. Allocate that total explicitly across app, database, cache and workers; record an app-only envelope separately if the project requires it. The generator/collectors have separately recorded budgets. This reference is a benchmark proposal, not a claim that every stack can meet it. If it cannot start/run realistically, report the unmet reference target and propose a justified alternative; do not silently enlarge it or claim original-target PASS.

On Docker Desktop, account for the Linux VM's CPU/memory and host competition. Hard runtime limits must actually be enabled. Document swap explicitly; use equal memory/memory-swap limits when intentionally testing without swap and supported by the host. Never disable OOM safeguards. Confirm these details against [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/).

Duration follows the failure mechanism: warm to a stable runtime/cache state, measure enough full workload cycles and per-case tail samples, soak across relevant GC/cache TTL/job cycles, then observe recovery. Declare wall-clock/time/cost bounds before execution; a short local profile can leave long-endurance proof outstanding. Repeated accepted runs, not a universal CPU utilization percentage, establish sustainable capacity.

## Memory evidence

Collect cgroup memory/current/peak/events where supported, process RSS/private/native/heap/allocation/GC data and swap/pressure; kernel/container memory includes costs beyond the language heap. Save OOM event counters as before/after deltas, container OOMKilled/exit state, application OOM exceptions and restarts. Exit 137 alone does not identify an OOM cause. Read [cgroup v2 memory events](https://docs.kernel.org/admin-guide/cgroup-v2.html) for platform semantics.

Choose peak/headroom, steady-state slope/window and drain/recovery tolerances from the runtime's behavior and fixture size. Managed heaps and allocators may retain memory legitimately; require a bounded plateau rather than exact return to startup RSS. A bounded slope over a short run does not prove absence of a slow leak: extend/profile when the evidence suggests one. Missing OOM/runtime telemetry is UNKNOWN, even if the load process exits zero.

Exercise pagination extremes, large exports/imports, decompression/serialization, slow consumers, background batches, wide joins, queue buildup and cache high cardinality where present. Stream/chunk/bound work at the owner and verify cancellation/cleanup. Include datastore memory, sort/hash spills, per-connection costs and index maintenance, not only app heap.

## Query and search proof

Inventory **reads and writes**: list/detail/search, filters/sorts/counts, joins, authorization/tenant filters, background commands, updates/deletes/cascades and foreign-key checks. Map each path to a tested representative plan and adverse parameter cases; unobserved dynamic variants remain explicit coverage gaps. An index definition alone does not prove use. Exercise current optimizer statistics, parameter sensitivity and realistic selectivity under cold and warm cache.

For large interactive selective paths, fail on unexplained full-table/collection or full-index scans, in-memory filtering, N+1, repeated counts or unbounded sorting/materialization. Inspect plan work, not just node names: an “index scan” traversing most of the index can still be bad. Do not snapshot exact plan text or disable sequential scans to force an attractive plan.

Match the search contract to the engine:

- Linguistic word/token search: prove usable native full-text/inverted indexes and matching tokenization, language, weights/ranking and predicate; test common/rare/no-hit tokens and updates becoming searchable within the contract.
- Exact/prefix search: prove a suitable B-tree or native indexed access path with matching collation/types. Substring/fuzzy search needs a supported trigram/ngram/inverted strategy or equivalent; full-text search alone may change required semantics.
- `LIKE`/`ILIKE` is not a universal defect: reject large unindexed scan-based search; allow semantics-preserving indexed execution proven by actual plans. Test short/empty/broad patterns, function/cast/collation mismatches, optional filters and sort/pagination. Keep wildcard escaping, injection safety and tenant filtering intact.
- Every in-scope search needs verified index/access-path coverage at acceptance volume. Index rechecks or bounded candidate filtering must fit work/latency budgets. Preserve correctness and do not add a search service solely to satisfy a preferred tool.

Sequential scans can be correct for small bounded tables, low-selectivity/analytic reads, maintenance and intentional full exports. Record the path, cardinality/selectivity, measured cost, streaming/batching/concurrency bound and governing budget for each justified exception. Large interactive scan-based search is not such an exception. [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [text-search indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) and [trigram indexes](https://www.postgresql.org/docs/current/pgtrgm.html) demonstrate why query semantics and actual plans govern the decision; verify the project's own engine.

Use native safe plan collection. `EXPLAIN ANALYZE` can execute writes: capture it only in authorized disposable fixtures; rollback does not undo every external side effect. Evaluate index storage/write amplification, online-build constraints and changed write latency before adopting an index. Validate representative concurrent reads/writes after changes.

## Profile selection

Maintain a profile registry: `profile | cases | data | resource envelope | load model/schedule | warmup/measure/drain | repeats | budgets | rationale`. Smaller smoke is explicitly diagnostic. Acceptance includes all applicable gates and user targets. Longer endurance, capacity sweeps and dependency-fault tests may have separate bounded commands; missing required profiles prevent whole-scope PASS.

No arbitrary global milliseconds, universal “safe memory percentage”, or fixed replica multiplier is a best-practice target. Document project choices and prove them under repeated comparable measurement; changing a target is a contract change, not a performance fix.
