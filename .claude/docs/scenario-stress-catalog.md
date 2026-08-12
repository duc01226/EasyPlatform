# Scenario Stress & Resilience Catalog — Survival by Business Criticality

> **Canonical companion to `SYNC:scenario-stress-eval`** (`.claude/skills/shared/sync-inline-versions.md`).
> This is the full scenario-reasoning reference the condensed gate points to. Where `scale-technique-catalog.md`
> asks _"is technique X present at this scale?"_ (bottom-up checklist), this catalog asks the top-down question:
> **"put the system under scenario Y — does it survive, self-heal, and does the business actually need it to?"**
>
> **ADVICE-ONLY.** Hosting reviews surface a Scenario Stress Matrix built from this catalog as _guidance_.
> It MUST NOT mutate any scorecard `/20`, SRE `/24`, verdict band, or gate pass/fail (user decision 2026-07-06).
> A correctly-lean system whose business does not need HA/DR is a **PASS** — never a gap. `OVER-HARDENED` is a
> real verdict: resilience the business does not warrant is a cost, not a win.
>
> **Scale tier is single-sourced.** The scale tier (`T0`–`T3`) is owned by `scale-technique-catalog.md` and derived
> by `SYNC:scale-technique-gate`. This catalog **references** those tiers — it never redefines them. Its new idea is
> the **orthogonal business-criticality axis `B0`–`B3`**: how much the business is hurt when a scenario is NOT
> withstood. `B` (blast if it fails) and `T` (scale of load/data) are independent — a payroll run for 40 employees is
> low-`T`, high-`B`; a public meme gallery is high-`T`, low-`B`.

## Business-criticality tiers

| Tier   | Profile                               | Signals (derive from evidence — never assume)                                                                                         |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **B0** | Non-critical / internal / best-effort | downtime tolerable, data loss tolerable, no external users, throwaway/PoC, no SLA                                                     |
| **B1** | Important                             | degradation annoys users; a short outage is acceptable; data is recoverable from source; informal SLA                                 |
| **B2** | Business-critical                     | outage costs revenue/trust; data loss is unacceptable; HA expected; real (if unwritten) availability + durability expectations        |
| **B3** | Mission-critical / regulated          | strict availability + durability SLOs; explicit RPO/RTO targets; legal/compliance obligation; failure endangers money, safety, or law |

> **How to derive the tier:** read business impact from `docs/specs/**`, product docs, SLA/SLO notes,
> `docs/project-config.json`, and the domain the system serves. Cite `file:line`/evidence + a confidence %.
> **Unknown → state the assumption; do NOT default to B3** (that would over-harden by reflex).
>
> **Criticality-signal floor (both-directions safety — MANDATORY).** Concrete signals raise the business-criticality
> floor to **at least `B2` even when SLA/SLO docs are absent** (the common case). The signals:
> **regulated / PII / financial / health data · money movement · authentication / identity · legal-compliance scope.**
> When ANY such signal is present, do NOT assume a low B-tier from missing docs — floor at `B2` (or `B3` if RPO/RTO or
> compliance obligations are explicit). Anti-over-engineering lowers hardening **ONLY when NO such signal is present.**
> This makes "right-size" safe in BOTH directions: it guards against over-hardening (`OVER-HARDENED`) **and** against
> under-hardening — the sharp failure of a critical-but-low-traffic system (a regulated filing service, 5 users, strict
> durability, no written SLA) passing clean with no backups/DR because "traffic is low."

## Verdicts (per in-scope scenario)

| Verdict               | Meaning                                                                   | Action                                             |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| `WITHSTANDS`          | System survives the scenario with acceptable degradation for its `B`-tier | Acknowledge                                        |
| `DEGRADES-GRACEFULLY` | Sheds/queues/limits under stress; core function preserved; recovers       | Acknowledge; note the shed surface                 |
| `FAILS-HARD`          | Data loss, corruption, cascading outage, or unrecoverable state           | **Advise only** — guidance, NOT a score/gate lever |
| `N/A-by-business`     | The `B`/`T` combination does not warrant hardening this scenario          | Skip — **not a gap**                               |
| `OVER-HARDENED`       | Resilience built beyond the business need at this `B`/`T`                 | **Advise AGAINST** — cite the carrying cost        |

> `FAILS-HARD` and `OVER-HARDENED` are **advice**. They tell a team which scenarios their business exposure warrants
> hardening — and, equally, which ones they should NOT spend on yet. Neither ever moves a score or a gate.

---

## Scenario families

Columns: **Scenario** · **Simulate** (the stimulus to imagine) · **Trace** (what to walk) · **Failure signature**
(what breaking looks like) · **Self-heal / recovery** (auto-recover? MTTR? manual runbook?) · **Business gate**
(min `B`-tier at which it is in scope) · **Trade-off it forces** · **Min scale-tier** (from `scale-technique-catalog.md`).

### Load

| Scenario             | Simulate                | Trace                                                  | Failure signature                                           | Self-heal / recovery                                    | Business gate | Trade-off                                                                       | Min tier          |
| -------------------- | ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------- | ----------------- |
| **Traffic spike**    | sudden 10×/100× burst   | ingress → LB → app pool → DB/locks → downstream        | pool/connection exhaustion, timeouts, 5xx, queue overflow   | autoscale? load-shed? queue+drain? MTTR to steady state | B1            | latency vs cost vs shedding (drop some requests to save the rest)               | T1 (autoscale T2) |
| **Sustained growth** | organic 2×/yr for 3 yrs | capacity headroom → vertical ceiling → horizontal path | gradual latency creep, ceiling hit, forced emergency rework | none — needs capacity planning ahead of the curve       | B1            | vertical ceiling (simple, capped) vs horizontal complexity (stateless refactor) | T1                |

### Data

| Scenario                 | Simulate                    | Trace                                                        | Failure signature                                         | Self-heal / recovery                                  | Business gate | Trade-off                                                               | Min tier          |
| ------------------------ | --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------- | ------------- | ----------------------------------------------------------------------- | ----------------- |
| **Volume growth**        | a table/collection 10×/100× | query plans → indexes → partition/hot keys → memory          | slow scans, index miss, OOM, timeouts, hot-partition skew | none — design-time; reindex/partition is planned work | B1            | normalization vs read cost; partition-key choice (hard to change later) | T1 (partition T2) |
| **Write / ingest burst** | bulk import or event flood  | producer → WAL/journal → replica/replication lag → consumers | backpressure, replica lag, WAL bloat, disk pressure       | queue + drain, batch, throttle ingest                 | B1            | durability (sync commit) vs throughput (async/batch)                    | T2                |

### Failure

| Scenario                                           | Simulate                                                                | Trace                                                               | Failure signature                                                     | Self-heal / recovery                                                  | Business gate               | Trade-off                                                                               | Min tier         |
| -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- | ---------------- |
| **Dependency down / slow**                         | a downstream API/DB/cache/broker unavailable or p99-slow                | call site → timeout config → thread/connection pool → fallback path | cascading timeout, thread-pool saturation, whole-request stalls       | circuit breaker + timeout + fallback/stale-cache                      | B1                          | fail-fast (lose the feature) vs retry (risk pileup); stale-cache vs hard error          | T1               |
| **Instance / node loss**                           | one app or DB node dies mid-request                                     | in-flight requests → session/state → LB health → replica failover   | in-flight loss, session loss, capacity drop, split reads              | LB eviction + readiness probe + replica failover                      | B1 (B2 for stateful)        | statelessness cost (externalize session) vs replica lag on failover                     | T1 (failover T2) |
| **Zone / region loss**                             | an AZ or whole region outage                                            | replica topology → data residency → DNS/traffic steering → RPO      | full unavailability, data stranded in dead region                     | multi-AZ auto-failover; multi-region is a deliberate design           | B2 (region: B3)             | multi-region cost + cross-region consistency bugs vs availability                       | T2 (region T3)   |
| **Data loss / corruption**                         | bad deploy, bad migration, accidental mass delete                       | write path → backup coverage → PITR window → rollback               | irreversible loss, silent corruption spreading to backups             | backups + point-in-time recovery + migration rollback + restore drill | **B1+** (any data of value) | backup cost/retention/restore-drills vs RPO; the one scenario a lean system still needs | T1               |
| **Poison message / retry storm / thundering herd** | a bad event loops; synchronized clients retry together                  | consumer → retry policy → DLQ → idempotency key                     | infinite redelivery, duplicate side-effects, synchronized load pulse  | DLQ + jittered exponential backoff + idempotency                      | B2                          | at-least-once duplicate handling cost vs at-most-once lost-message risk                 | T2               |
| **Cascading failure / backpressure**               | one slow dependency saturates a shared pool; producer outpaces consumer | shared pool/queue → bulkhead boundaries → shed points               | one slow dep freezes unrelated features; unbounded queue growth → OOM | bulkheads + backpressure + load-shedding                              | B2                          | isolation cost (pool partitioning, resource reservation) vs simplicity                  | T2               |

### Ops

| Scenario                     | Simulate                                          | Trace                                                  | Failure signature                                                 | Self-heal / recovery                           | Business gate | Trade-off                                                    | Min tier          |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------- | ------------- | ------------------------------------------------------------ | ----------------- |
| **Cold start / deploy blip** | scale-from-zero; rolling deploy drops connections | scheduler → readiness gate → warm-up → in-flight drain | first-request latency spike, dropped connections mid-deploy, 502s | readiness gating + graceful drain + warm pools | B1            | warm-pool/provisioned-concurrency cost vs cold-start latency | T1 (readiness T2) |

### Ordering & Distribution

| Scenario                                           | Simulate                                                   | Trace                                                     | Failure signature                                                 | Self-heal / recovery                                       | Business gate          | Trade-off                                                                  | Min tier |
| -------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- | -------- |
| **Clock skew / duplicate delivery / out-of-order** | node clocks drift; a message arrives twice or out of order | timestamp/expiry logic → dedup key → ordering assumptions | wrong expiry, double-processing, out-of-order state, lost updates | idempotency keys + logical clocks/versioning + dedup store | B2 (`N/A` single-node) | idempotency + logical-clock complexity vs assuming a single ordered stream | T2       |

---

## Business × Scale in-scope quick-reference

Which scenario families a system's `B`/`T` combination warrants stress-testing. Read DOWN to your business-criticality
floor, ACROSS to your scale tier. `—` = `N/A-by-business` (skip, not a gap). This mirrors the "per-tier baseline"
section of the technique catalog, crossed with the criticality axis.

| Business floor                      | Always in scope (any `T`)                                                           | Adds at T1                                                   | Adds at T2                                   | Adds at T3                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------- |
| **B0** (best-effort)                | — (a PoC that can be re-run needs none; note it as intentionally lean)              | Traffic spike (if user-facing)                               | —                                            | —                                             |
| **B1** (important)                  | **Data loss / corruption** (backups), Dependency down, Instance loss                | + Traffic spike, Sustained growth, Volume growth, Cold start | + Write burst                                | —                                             |
| **B2** (business-critical)          | above + Zone loss, Cascading/backpressure, Retry storm, Clock skew (if distributed) | + all B1@T1                                                  | + Instance-loss failover, Poison-message DLQ | Region loss                                   |
| **B3** (mission-critical/regulated) | above + **Region loss + DR (RPO/RTO)** — even at low `T`                            | (data-loss/DR are in scope regardless of traffic)            | + full failover drills                       | + Chaos engineering, multi-region consistency |

> **The B3/T0 corner is the trap the criticality-signal floor closes.** A mission-critical but low-traffic system
> (regulated, few users, strict durability, no written SLA) sits at **B3/T0**. Its scale tier is genuinely low, so most
> _technique_ checks read `N/A-by-scale` — but **Data loss / corruption** and, if the obligation is explicit, **Region
> loss / DR** are in scope by BUSINESS, not by scale. Deriving `B` only from traffic would mark them `N/A` and pass a
> system that needs backups + DR. Apply the criticality-signal floor: the regulated/financial/health/identity signal
> floors `B` at `B2`+ regardless of `T`.

---

## Closing reminder (ADVICE-ONLY)

- The **Scenario Stress Matrix** a review emits from this catalog is **guidance**. `FAILS-HARD` and `OVER-HARDENED`
  are advice — never a `/20`, `/24`, verdict band, or gate pass/fail lever.
- **Right-size in BOTH directions.** Do not advise resilience a `B0`/`B1` system does not need (`OVER-HARDENED`); do
  not pass a `B2`+ system that skips backups/DR because its traffic is low (criticality-signal floor).
- **Scale tier stays single-sourced** in `scale-technique-catalog.md`. On any tier change, update that catalog — not
  this one. On any scenario/verdict/business-tier change HERE, update this catalog FIRST, then re-run
  `.claude/scripts/inject_scenario_stress_gate.py` to re-propagate the condensed `SYNC:scenario-stress-eval` block.
- Redact any infra secret you cite as evidence.
