# Performance Knowledge Reference — Calibration Constants & Domain Laws

> **Role:** the **calibration** body for `/performance-review`. SKILL.md owns the procedure and gates; this file owns the NUMBERS and LAWS a finding's severity depends on. Consult during Phase 0 (triage), Phase 2 (baseline calibration), Phase 3 (per-dimension deep pass).
>
> **MUST ATTENTION** these are order-of-magnitude ANCHORS and RATIOS, never a substitute for measuring THIS system — cite a local measurement plus the anchor it violates, never the anchor alone — why: hardware, stack, and data volume shift absolutes; the ratios stay stable and are what make "is 40 ms slow here?" answerable.
> **MUST ATTENTION** an anchor breach is a HYPOTHESIS to verify, not a finding — promote it to a finding only with `file:line` + measured or explicitly-labelled `static risk` evidence per SKILL.md Phase 2.
>
> **Drift-guard:** this file is AUTHORITATIVE for performance calibration constants and domain laws; architecture laws and the anti-pattern catalog stay single-sourced in `.claude/docs/architecture-knowledge.md`. Consuming skills address this file by **section number**, so renumbering, splitting, or inserting a section silently invalidates those pointers. On any change to the section structure here, grep `performance-knowledge.md` and update every consuming skill's inline `§` pointer (currently `performance-review/SKILL.md:121` → §3, `:197` → §1-2 + §10, `:219` → §4-§9, `:347` → §7).

---

## Contents

- [1. Latency Ladder — the order-of-magnitude anchor](#1-latency-ladder--the-order-of-magnitude-anchor)
- [2. Universal Laws — apply before blaming any single component](#2-universal-laws--apply-before-blaming-any-single-component)
- [3. Symptom -> Usual Cause Triage Matrix (Phase 0 accelerator)](#3-symptom---usual-cause-triage-matrix-phase-0-accelerator)
- [4. Network & Protocol](#4-network--protocol)
- [5. Database](#5-database)
- [6. Caching](#6-caching)
- [7. Web / Frontend](#7-web--frontend)
- [8. Runtime, Memory & GC](#8-runtime-memory--gc)
- [9. Distributed Resilience & Load Management](#9-distributed-resilience--load-management)
- [10. Measurement Rigor — how not to be fooled by your own numbers](#10-measurement-rigor--how-not-to-be-fooled-by-your-own-numbers)
- [Closing Reminders](#closing-reminders)

## 1. Latency Ladder — the order-of-magnitude anchor

| Operation | Time | Anchor ratio |
| --- | --- | --- |
| L1 cache reference | ~1 ns | baseline |
| Branch mispredict | ~3-5 ns | |
| L2 / L3 cache | ~4 ns / ~10-30 ns | |
| Uncontended mutex lock+unlock | ~17-25 ns | |
| Main memory (RAM) reference | ~80-100 ns | **~100x L1** |
| NUMA remote-socket memory | ~150-250 ns | ~2x local RAM |
| Compress 1 KB (lz4/snappy) | ~1-3 us | |
| Syscall | ~100-600 ns | higher with CPU-vuln mitigations |
| Context switch | ~1-5 us | |
| Read 1 MB sequentially from RAM | ~30-100 us | at 10-30 GB/s |
| NVMe SSD random 4K read | ~20-100 us | **~1000x RAM** |
| SATA SSD random read | ~100-200 us | |
| Read 1 MB sequentially from NVMe | ~150-350 us | at 3-7 GB/s |
| Round trip inside one datacenter | ~0.5 ms | |
| AZ to AZ, same region | ~1-2 ms | |
| HDD seek | ~5-10 ms | **~100x SSD** |
| Cross-country RTT (US E-W) | ~60-70 ms | |
| Cross-Atlantic RTT | ~80-90 ms | |
| Antipodal RTT | ~150-250 ms | |

**Ladder mnemonic:** `1 ns -> 100 ns -> 100 us -> 10 ms -> 100 ms` = L1 -> RAM -> SSD -> disk seek -> intercontinental. Each rung ~100-1000x.

**Derived anchors**
- Light in fiber ~200,000 km/s -> **~1 ms RTT per 100 km**. Geography is a HARD FLOOR — no code change beats distance; only an edge/CDN/replica move does. NEVER accept a "optimize the query" fix for a latency budget already consumed by RTT.
- Throughput: 1 Gbps = 125 MB/s. NVMe 3-7 GB/s, 500K-1M IOPS. Per-socket memory bandwidth 20-200 GB/s.
- Sequential vs random on the SAME bytes: 10-100x. Access ORDER is a design variable, not an implementation detail.
- **Availability multiplies in series:** five 99.9% dependencies in one request path ~= 99.5%. 99% = 3.65 d/yr down · 99.9% = 8.8 h · 99.99% = 52 min · 99.999% = 5 min.
- Byte sizing for capacity math: char/bool 1 B · int 4 B · long/double/timestamp 8 B · UUID 16 B binary / 36 B text · typical row 100 B-1 KB. `1M rows x 1 KB = 1 GB`.
- Traffic math: `1M req/day ~= 12 rps` · `1B req/day ~= 12k rps`. **Peak is typically 2-10x average** — size for peak, not mean.

---

## 2. Universal Laws — apply before blaming any single component

| Law | Statement | Review use |
| --- | --- | --- |
| **Little's Law** | `L = lambda x W` — stable long-run average in-system work = throughput x time in the same boundary | 2000 rps x 50 ms = 100 average in-flight requests, not a pool-size floor or active-session count. Pool demand uses resource hold-time and arrival rate to that pool; validate variability and shared-backend limits. |
| **Utilization-latency (M/M/1)** | Under the model's single-server, Poisson-arrival and exponential-service assumptions, mean queue wait = `service_time x rho/(1-rho)` | Illustrative 80%->4x, 90%->9x, 95%->19x wait. The often-used ~70-80% warning is a hypothesis, not a universal safe CPU limit; measure the actual SLO knee and reserve justified headroom. |
| **Amdahl's Law** | speedup <= `1/(s + p/N)` | 5% serial work caps speedup at 20x regardless of cores. A global lock IS the serial section |
| **Universal Scalability Law** | `C(N) = N/(1 + alpha(N-1) + betaN(N-1))` | Coherency term beta makes throughput **peak then DECLINE** as nodes are added — explains "more servers made it slower" |
| **Tail amplification** | fan-out to 100 backends hits a p99 with `1 - 0.99^100 ~= 63%` | Your backend p99 becomes the user's MEDIAN. Reduce fan-out, hedge requests, per-shard timeouts |
| **Queueing > buffering** | an unbounded queue converts a throughput problem into unbounded latency, then OOM | Bound EVERY queue. Backpressure or shed — never buffer silently |
| **Percentile algebra** | percentiles are NOT averageable | Aggregate histograms. A "mean p99" across instances is a meaningless number |
| **End-to-end argument** | guarantees belong at the endpoints | A lower layer can optimize but cannot supply correctness the endpoints skipped |

Read [MIT's queueing notes](https://web.mit.edu/1.041/spring2023/lectures/L8-queuing-models-2023sp.pdf) when checking Little's Law and M/M/1 assumptions; their averages support a model, while the local workload and SLO determine operational limits.

**MUST ATTENTION** a fast operation with a high p95/p99 is a **queueing/saturation signature**, not a slow-operation signature — measure acquire-wait and queue depth at the pool entrance BEFORE touching the operation itself.

---

## 3. Symptom -> Usual Cause Triage Matrix (Phase 0 accelerator)

| Symptom | Usual cause | First evidence to pull |
| --- | --- | --- |
| Latency scales with result-set size | N+1 / per-row round trip | query count vs item count |
| Fine in dev, slow in prod | data volume -> missing index, or unwarmed cache | row counts + plan/explain |
| Sudden cliff at some load level | utilization knee, pool exhaustion, working set exceeded cache | pool pending + acquire-wait, cache hit ratio |
| p99 bad but p50 fine | GC pause, lock contention, fan-out tail, cold cache, noisy neighbour | GC log, pool wait, per-shard latency |
| Everything slow at once | shared bottleneck (DB, cache, pool) or a retry storm | dependency saturation + retry rate |
| Memory grows until OOM | unbounded query / unbounded cache-queue / leaked listener | result-set size, cache bounds, heap growth curve |
| Degrades over days, fine after restart | leak, fragmentation, index/table bloat, connection leak | RSS trend, bloat stats, pool active over time |
| Slow only for one tenant/customer | hot key or hot partition, data skew, selectivity collapse | per-key/per-partition distribution |
| Fast locally, slow over network | chatty API, no connection reuse, no compression | call count x RTT, keep-alive state |
| CPU low but throughput capped | I/O wait, lock contention, single-threaded section (Amdahl) | thread states, flame graph off-CPU |
| Spike right after deploy | cold cache/JIT, no LB slow-start, config regression | warmup window, LB health/slow-start config |

---

## 4. Network & Protocol

- **Handshake floor:** TCP 1 RTT + TLS 1.3 1 RTT (TLS 1.2 = 2) — a cold HTTPS request costs **>=2 RTTs before any application byte**, plus cold DNS 20-120 ms. **Connection reuse (keep-alive, pooled clients) is the single largest network win** — per-request handshakes are the classic latency defect.
- **Slow start:** initial congestion window ~10 segments (~14 KB) is "free"; beyond it you pay RTTs. Put critical content in the first round trip.
- **BDP** = bandwidth x RTT = bytes needed in flight to saturate a link. On long fat links you are RTT-bound, not bandwidth-bound; window/buffer sizing is the fix, not more bandwidth.
- Nagle + delayed-ACK interaction causes ~40 ms stalls on small writes -> `TCP_NODELAY` for RPC paths.
- MTU 1500 / MSS ~1460; jumbo 9000 intra-DC. Broken PMTU discovery = stalls only on large payloads.
- Congestion control: CUBIC (loss-based) vs **BBR** (model-based, better on lossy/long paths). Bufferbloat inflates latency under load despite spare bandwidth.
- **OS/infra exhaustion limits that present as "random" latency or errors:** file descriptors, listen backlog, **ephemeral ports (~28k default)**, `TIME_WAIT` accumulation, conntrack table, NAT-gateway SNAT ports.
- **HTTP versions:** 1.1 = 6 conns/origin + per-conn head-of-line blocking · 2 = multiplexing + HPACK (domain sharding becomes an ANTI-pattern) but retains TCP-level HOL · 3/QUIC = per-stream loss isolation + 0-RTT, best on lossy/mobile.
- **Load balancing:** round-robin < least-connections < **power-of-two-choices (best practical default)** < consistent hashing (cache affinity). L4 fast/opaque vs L7 routing+retries+observability. MUST have health checks, outlier ejection, and **slow-start for new instances** — a cold-cache/cold-JIT node given full traffic times out.
- Sticky sessions trade scalability and rebalancing for statefulness — prefer stateless + external session store.

---

## 5. Database

**Indexing**
- Every index is a trade: faster reads, slower writes (each insert maintains EVERY index), more space, more maintenance/bloat.
- **Leftmost-prefix rule:** index `(a,b,c)` serves `a`, `(a,b)`, `(a,b,c)` — NOT `b` alone.
- **Composite order: equality columns first, range/sort column last.** A range predicate stops later columns being used for seeking.
- **Selectivity decides usefulness** — a lone low-cardinality column index is usually dead weight; use a partial/filtered index instead.
- **Covering / index-only scan** — include projected columns so the heap is never touched; frequently a 10x win.
- Index killers: function/cast on the COLUMN side, leading wildcard `LIKE '%x'`, implicit type coercion, collation mismatch, broad `OR`, negative predicates.
- Index types by access pattern: B-tree (range/order) · hash (equality) · GIN/inverted (text, JSON, array) · GiST/R-tree (spatial) · bitmap (low-cardinality analytics) · HNSW/IVF (vector ANN).
- **A full scan is not always wrong** — above roughly 5-20% selectivity a sequential scan beats random index lookups. NEVER file "add an index" without the selectivity number.

**Query execution**
- Read the PLAN, not the query. Compare **estimated vs actual rows** — a large mismatch means stale statistics, so the plan is wrong for a reason no rewrite fixes.
- Cost order: index-only < index seek < bitmap < full scan. Joins: nested loop (small outer + indexed inner) · hash (large, equality) · merge (pre-sorted).
- `SELECT *` inflates I/O and network, defeats covering indexes, and couples callers to schema drift.
- **Keyset/seek pagination** over `OFFSET n` — OFFSET is O(n) and degrades every page.
- Batch to avoid per-row round trips: bulk insert, `COPY`, multi-row upsert, pipelining. 1000 single-row inserts = 1000 RTTs.

**Transactions & concurrency**
- Anomalies by level: Read Uncommitted -> dirty read · Read Committed -> non-repeatable read, lost update · Repeatable Read/Snapshot -> phantoms, **write skew** · Serializable -> none.
- Lost update needs `SELECT ... FOR UPDATE`, a version column (optimistic), or an atomic in-place `UPDATE ... SET x = x + 1`.
- **MVCC cost:** readers don't block writers, but old versions become garbage -> bloat, vacuum pressure. **A long-running or idle-in-transaction connection is a slow-motion outage** — it pins old versions fleet-wide.
- Keep transactions short; NEVER hold one across a network call or user think-time.
- Deadlocks: acquire resources in one consistent order; expect and retry the deadlock error.
- Schema change is a locking event — online patterns: add nullable column -> batched backfill -> add constraint `NOT VALID` -> validate; create index `CONCURRENTLY`; **expand/contract** for zero-downtime evolution.

**Storage engines**
- **B-tree** — read/range optimized, in-place update, WAL write amplification. **LSM** — write optimized (sequential), pays read amplification + compaction CPU/IO. Tune the **RUM trade-off (Read, Update, Memory — pick two)**.
- **WAL/fsync is the commit floor** — durability costs an fsync; group commit amortizes it. Relaxing sync trades durability for throughput; name the trade explicitly.
- Row-store (OLTP) vs **column-store (OLAP)**: columnar + compression + vectorized execution is 10-100x on analytical scans. NEVER run analytics on the OLTP primary.

**Connections**
- **The correct pool is SMALL.** Classic guidance `~= (cores x 2) + effective_spindles`; validate with Little's Law. Oversized pools REDUCE throughput via contention.
- Serverless/short-lived clients need an external pooler or they exhaust connections instantly.
- Set statement, lock, and pool-acquire timeouts — otherwise one slow query becomes a total outage through pool exhaustion.

**Scaling data** — escalate in this order: **tune query/index -> cache -> vertical -> read replicas -> partition -> shard.** Jumping to sharding early is the expensive mistake.
- **Read replicas** scale reads only and introduce **replication lag** -> stale reads, broken read-your-writes. Fixes: read-from-primary after write, sticky window, LSN/GTID-aware reads.
- **Partitioning** (one DB): range (time-series — retention becomes `DROP PARTITION`), list, hash. Cheap, large win. Every query MUST carry the partition key or pruning fails.
- **Sharding** (many DBs): key needs high cardinality + even distribution + alignment with the dominant query. Monotonic keys create **hot shards**. Cross-shard joins and resharding are the real cost; consistent hashing with virtual nodes limits reshuffle.
- **Hot key / hot partition is the most common practical failure** in distributed stores: salt the key, shard the counter, front it with a local cache.
- Monotonic PK insert contention; UUIDv4 destroys B-tree locality and inflates indexes -> prefer time-ordered UUIDv7/ULID.

---

## 6. Caching

- **Quantify reuse value.** A simplified mean is `avg = h x t_cache + (1-h) x t_miss`, with lookup/refill work included in miss cost. At fixed demand, moving 90% -> 99% hit ratio cuts miss traffic **10x**; also measure tail latency, work avoided, memory and consistency cost.
- Patterns: cache-aside (default) · read-through · write-through (consistent, slower writes) · write-behind (fast, loss risk) · refresh-ahead.
- **Invalidation is the hard part** — prefer short TTL + versioned/immutable keys over precise invalidation. Put schema/build version IN the key so a deploy cannot serve poisoned entries.
- **Stampede / thundering herd:** a hot key expiring sends every request to origin at once. Fixes: single-flight/request coalescing, per-key lease, **TTL jitter**, probabilistic early recompute, stale-while-revalidate. NEVER expire a whole key class simultaneously.
- **Cold start** after deploy or failover is indistinguishable from an origin outage — warm before taking traffic, pair with LB slow-start.
- Negative caching stops miss-storms on nonexistent keys; a Bloom filter does it in constant space.
- Eviction: LRU · LFU (skewed access) · **W-TinyLFU (best general default)** · TTL. **Cache thrash** when working set > cache size is a cliff, not a slope.
- An unbounded cache is a memory leak with a friendly name. Bound size AND entry lifetime. NEVER cache per-user data under a shared key.

### 6.1 Safe cache placement and origin protection

Read this section when choosing a cache layer. Prefer the earliest boundary that safely avoids the measured work: request reuse avoids duplicate calls, a process cache avoids origin queries, and a proxy response hit can avoid application execution. Compare key cardinality, hit/miss cost and consistency; process-local caches diverge between instances and refill after restarts. Test cold, expired and unavailable caches with bounded origin demand, coalescing and an explicit stale/fail policy. These failure modes and local/external trade-offs are documented in [AWS's caching guidance](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/).

Authenticated/personalized responses require authorization on every hit and all response-varying dimensions in the cache contract, including tenant/user scope, query, locale and representation where applicable. A scoped key alone cannot enforce revocation. Default to private/bypassed handling until safe sharing is established; respect `Cache-Control`, `Vary` and authentication restrictions. [RFC 9111 §§3.5,4,5.2](https://www.rfc-editor.org/rfc/rfc9111.html) governs HTTP reuse.

For Nginx, verify both retrieval bypass (`proxy_cache_bypass`) and storage prevention (`proxy_no_cache`); they serve different purposes. Inspect the actual key, response-header processing and bounded cache-lock behavior. Do not disable safeguards just to raise hit rate. [Nginx proxy module documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) is authoritative for these directives.

Guard the intended behavior with cross-user/tenant, expired/revoked-auth, write→read visibility, stale-policy and concurrent-refill tests when applicable. Cached and uncached responses must preserve the contract; timing alone does not prove correctness.

---

## 7. Web / Frontend

**Core Web Vitals thresholds — measure at the 75th percentile of REAL users (field/RUM), not a local run**
| Metric | Good | Meaning |
| --- | --- | --- |
| **LCP** | <= 2.5 s | largest contentful paint |
| **INP** | <= 200 ms | interaction to next paint (replaced FID in 2024) |
| **CLS** | <= 0.1 | cumulative layout shift |
| **TTFB** | <= 800 ms | server + network to first byte |
| FCP | <= 1.8 s | first contentful paint |

- Lab tools (Lighthouse) find CAUSES; field data defines TRUTH. NEVER close a CWV finding on a lab score alone.
- Render-blocking = synchronous CSS/JS in `<head>` -> inline critical CSS, `defer`/`async`/`type=module`.
- **Long tasks > 50 ms** block the main thread and destroy INP — break work up, yield, move to a Worker.
- **Layout thrashing** — interleaved DOM read/write forces a synchronous reflow per iteration; batch reads then writes.
- Animate **transform/opacity only** (compositor-only). width/top/left animation triggers layout every frame.
- Reserve space (`width`/`height`/`aspect-ratio`) for images, ads, embeds -> CLS. `font-display: swap` for FOIT.
- **JS is the most expensive byte** — parse + compile + execute, unlike an image. Practical budget **~150-200 KB compressed JS** for a fast mid-tier-mobile start.
- Compression: Brotli ~15-20% better than gzip on text. Assets: AVIF/WebP, responsive `srcset`, `loading="lazy"` below the fold.
- Resource hints: `preconnect` (saves DNS+TCP+TLS), `dns-prefetch`, `preload` for late-discovered critical assets, `fetchpriority`.
- **Third-party scripts are usually the #1 regression source** — tag managers, chat, analytics. Audit and defer.
- HTTP caching: hashed filenames + `Cache-Control: max-age=31536000, immutable` for assets; revalidated `no-cache` + ETag for HTML; `stale-while-revalidate`. Get `Vary` right or the cache is poisoned.
- Rendering strategy IS a performance decision: CSR vs SSR/streaming vs SSG/ISR vs islands/partial hydration. **Hydration cost scales with component count.**
- Long lists -> virtualization. Frequent events -> debounce/throttle + `passive` listeners. Avoid client-side request waterfalls (N+1 over HTTP).

---

## 8. Runtime, Memory & GC

- **Memory hierarchy:** cache line 64 B. **False sharing** — threads writing different fields in one line ping-pong ownership; pad hot counters. **NUMA** — co-locate thread and memory or pay ~2x.
- **Working set, not total data, sets the cliff** — performance breaks when the working set exceeds L3, then RAM, then page cache. Capacity planning targets the working set.
- TLB pressure on large heaps with 4 KB pages -> huge pages help DBs/JVMs.
- **GC:** allocation RATE (not heap size) drives collection frequency — cut garbage before tuning the collector. Generational hypothesis: most objects die young; promotion is the expensive path. **Stop-the-world pauses are a TAIL-latency source, correlated across the fleet** — they never show in the mean.
- Heap too small -> constant GC; too large -> long pauses + swap risk. Leave headroom for off-heap/native/thread stacks.
- **Managed-language "leaks"** = unbounded caches, un-removed listeners/subscriptions, closures capturing large scopes, static collections, thread-locals on pooled threads.
- **RSS != heap.** Fragmentation, native buffers, thread stacks (~1 MB each) all count; container limits kill on RSS.
- **Swap is death for latency-sensitive services** — prefer fail-fast OOM over swap thrash.
- Page cache is a free read cache; app-cache + page-cache double buffering wastes RAM — trust one.
- **Concurrency:** threads cost stack + scheduler pressure; async trades that for complexity. **NEVER block an event loop** — one CPU-bound task stalls every connection. Pool sizing: CPU-bound ~= cores; I/O-bound ~= `cores x (1 + wait/compute)`.
- Contention: lock GRANULARITY beats lock speed — shard/stripe locks, lock-free counters, immutable data, copy-on-write.

---

## 9. Distributed Resilience & Load Management

- **Timeouts everywhere, with a budget that DECREASES down the stack.** No timeout = a hung dependency exhausts threads and takes the caller down.
- **Retries: exponential backoff + FULL JITTER, capped, with a retry budget (e.g. <=10% of traffic).** Naive retries create **retry storms** that convert a partial outage into a total one. Retry only idempotent operations; make writes idempotent via **idempotency keys**.
- **Circuit breaker** (fail fast on a sick dependency) · **bulkhead** (per-dependency pools so one slow dep cannot consume all threads) · **load shedding** (reject early — a fast 429/503 beats a slow timeout) · **graceful degradation** (serve stale/partial over nothing).
- **Backpressure over buffering** — propagate slowness rather than accumulating queues.
- **Queue-based load leveling** absorbs spikes; watch queue AGE, not only depth. Add DLQ + poison-message handling.
- **Exactly-once delivery does not exist** — at-least-once + idempotent consumers, or effectively-once via transactional outbox / idempotent sink.
- **Transactional outbox + CDC instead of dual writes** (DB + broker) — dual writes are unsafe by construction.
- **Saga / compensating transactions** for cross-service workflows; 2PC couples availability and blocks on coordinator failure.
- **Eventual consistency is a product decision** — surface it in UX (optimistic UI, processing states).
- Quorum `W + R > N` for read-your-writes on replicated stores. Consensus (Raft/Paxos) costs >=1 RTT to a quorum — keep it off the hot path.
- **Clocks lie.** NTP skew is ms-to-s; NEVER order cross-machine events by wall clock. Monotonic clocks for durations, logical/hybrid clocks for ordering.
- **Fencing** — a GC-paused or VM-frozen leader still believes it leads; use fencing tokens/leases, never a bare lock.
- **Fan-out shape:** write-fan-out (read-heavy) vs read-fan-out (high-fanout/celebrity) vs hybrid. Scatter-gather amplifies tails (see §2).
- **Autoscaling lags** — boot + warmup can exceed the spike. Scale on a LEADING indicator (queue depth, concurrency), not lagging CPU; keep headroom; pre-scale known events.
- **Metastable failure** — the system stays broken after the trigger clears (retry storm + empty cache). Recovery needs explicit shedding, not patience.
- Failure isolation: cells/shuffle sharding, AZ/region redundancy. Correlated failure (shared dependency, shared config push) defeats naive redundancy.
- **Multi-tenancy needs quotas** — token bucket (bursty, common) · leaky bucket (smooth) · fixed window (cheap, boundary spikes) · sliding window (accurate, costlier). Without per-tenant limits one loud tenant is everyone's outage.

---

## 10. Measurement Rigor — how not to be fooled by your own numbers

- **Signals:** four golden signals (latency, traffic, errors, saturation) · **RED** for services (rate, errors, duration) · **USE** for resources (utilization, saturation, errors).
- Report DISTRIBUTIONS: p50/p90/p99/p99.9 + max, segmented by endpoint, tenant, region. Aggregate means hide per-segment disasters.
- **SLI/SLO/error budget** define the target BEFORE optimizing — the budget decides whether reliability or features get the next unit of work.
- Tracing finds WHERE time goes across services; profiling (**flame graphs**, on-CPU vs off-CPU) finds where it goes inside a process. Continuous production profiling is the ground truth.
- **Metric cardinality explosion** (user IDs as labels) kills the monitoring system before it saves you.
- **Load-test taxonomy:** smoke -> load (expected) -> stress (beyond) -> **soak/endurance (finds leaks + fragmentation)** -> spike -> breakpoint/capacity.
- **Load model:** fixed-VU closed loops fit journeys with think time, but slower responses can lower their offered demand. Open arrival-rate models fit independently arriving traffic; disclose the model and its limitations. [k6 open/closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).
- **Coordinated omission:** reduced arrivals while blocked can hide demand the system would otherwise receive. Prefer a representative arrival schedule for that question; histogram correction cannot supply requests that were never sent or prove capacity by itself.
- Benchmark discipline: warm up (JIT + caches), measure steady state, repeat, control variables, compare to a baseline, state the environment. Microbenchmarks lie about SYSTEM behaviour.
- State realistic data VOLUME and cache state; a toy or warm-only result does not establish production or cold-cache capacity.
- **Cost is a performance dimension** — $/request, $/tenant. Egress and cross-AZ traffic are the common surprise line items.

### 10.1 Workload-defined capacity experiments

Read this section when making a user-capacity claim or choosing the next scaling step; apply `SYNC:measured-capacity-engineering` from its canonical owner in `.claude/skills/shared/sync-inline-versions.md`.

**Define the units.** In a sequential journey, estimated demand = `active sessions × expected requests per cycle / mean cycle seconds`; cycle time includes think time and responses. Example: 2500 sessions × 2 requests / 20 seconds ≈ 250 RPS. This arithmetic estimate is not measured capacity. DAU additionally needs visit frequency/duration and peak distribution. Little's Law (§2) concerns average in-flight work within a consistent boundary, not users thinking between requests.

**Record the experiment contract:** endpoint mix/read-write probabilities, authentication/personalization, payloads, dataset/indexes and working-set-to-memory ratio, hot-key/skew distribution, runtime/config/hardware, network/TLS path, generator placement/capacity, ramp, warmup, duration and repeats. Preserve raw results and scripts; near-origin server latency is not global user experience.

**Report useful throughput:** offered versus completed successful RPS, attempted/completed work, timeouts/errors and generator drops. Include segment-specific latency distributions and enough samples/duration to support the claimed tail. Aggregate success must not hide a slow or failing write endpoint. k6's [built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/) distinguish `dropped_iterations`; disclose them alongside generator CPU/network limits.

**Attribute before changing:** correlate latency with per-process resource use and waits; on shared hosts inspect competing proxy/app/DB work. Profile synchronous runtime work where applicable ([Node's event-loop guidance](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)); inspect representative plans and actual rows ([PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)). `EXPLAIN ANALYZE` executes the statement: use an authorized safe fixture for writes. Test one candidate under the same workload, then rerun the complete journey because a component gain can move the bottleneck.

**Choose sustainable capacity:** find the highest repeated load meeting the workload's latency, error and correctness targets, then reserve headroom justified by bursts, deploy/refill work and resource variability. Exercise sustained/spike, cold/expiry and post-overload recovery where warranted; bound queues, retries and origin fallback so accepted demand remains useful. [Google SRE overload guidance](https://sre.google/sre-book/handling-overload/) supports these controls; [capacity best practices](https://sre.google/sre-book/service-best-practices/) recommend measuring resource-to-capacity ratios.

**Select the next step:** compare reducing work/offload, vertical capacity and separating or replicating the limiting owner. Include memory, engineering, operating, network and availability cost. Single-instance throughput does not prove node-loss availability. Distribution needs an evidenced load or business requirement and a state/session/cache/connection-budget plan; no benchmark price, user count or fixed CPU percentage chooses the architecture.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** supply the calibration constants and domain laws that let every `/performance-review` finding be judged against a known anchor — so severity reflects a real breach of a known bound, never intuition about what "feels slow".

**IMPORTANT MUST ATTENTION** anchors are RATIOS and ORDERS OF MAGNITUDE — always pair an anchor with a local measurement (`file:line`, plan, profile, metric) or the explicit `static risk` label plus its verify command — why: quoting a constant without measuring THIS system is the exact guess-as-fact failure the skill exists to prevent.
**IMPORTANT MUST ATTENTION** an anchor breach is a hypothesis, promoted to a finding only after Phase 2 evidence — why: a breached anchor with no local proof produces confident false positives.
**MUST ATTENTION** check the universal laws (§2) BEFORE blaming a component — a fast operation with a bad p99 is saturation/queueing, and added nodes can reduce throughput (USL) — why: component-level tuning cannot fix a system-level law.
**MUST ATTENTION** geography, handshake RTTs, and availability-in-series are HARD FLOORS (§1, §4) — NEVER accept a code-level fix for a budget already consumed by physics or protocol round trips.
**NEVER** quote a threshold from this file as a project requirement — local SLA/spec/config wins; this file calibrates, it does not govern.
**MUST** keep capacity tied to the workload, load model and useful throughput (§10.1); prove safe cache hits and cold-origin behavior before moving reuse outward (§6.1).
