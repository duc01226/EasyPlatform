# Scale Technique Catalog — Applicability by Tier

> **Canonical companion to `SYNC:scale-technique-gate`** (`.claude/skills/shared/sync-inline-versions.md`).
> This is the full grouped reference the condensed gate points to. It enumerates every common system-design /
> scalability / DevOps / distributed-systems / reliability / security technique, the signal that _warrants_ it, the
> minimum scale tier at which it typically pays off, the review skill that owns its depth, and an
> anti-over-engineering caveat.
>
> **ADVICE-ONLY.** Hosting reviews surface a Technique Applicability Matrix built from this catalog as _guidance_.
> It MUST NOT mutate any scorecard `/20`, SRE `/24`, verdict band, or gate pass/fail (user decision 2026-07-06).
> A correctly-lean small system is a PASS — never a gap.

## Scale tiers

| Tier   | Profile                            | Signals (derive from evidence — never assume)                                                 |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| **T0** | Internal / single-instance / PoC   | one node, no external SLO, low traffic, single tenant, no HA requirement                      |
| **T1** | Small SaaS (<10k users)            | single region, modest RPS, basic SLA, a few instances, one primary DB                         |
| **T2** | High-scale (10k–1M users)          | multi-instance, real SLOs, high RPS, read/write pressure, HA expected                         |
| **T3** | Massive / multi-region (millions+) | global users, strict tail-latency SLOs, multi-region, partition tolerance, DR/RPO/RTO targets |

> **How to derive the tier:** read users/RPS, SLO & latency targets, data volume, tenancy model, and topology from
> `docs/specs/**`, `docs/project-config.json`, infra/compose/k8s manifests, and load/capacity notes. Cite
> `file:line`/config/infra + a confidence %. **Unknown → state the assumption; do NOT default to T3.**

## Verdicts (per warranted technique)

| Verdict             | Meaning                                | Action                                             |
| ------------------- | -------------------------------------- | -------------------------------------------------- |
| `PRESENT`           | Warranted at this tier and implemented | Acknowledge                                        |
| `MISSING-WARRANTED` | Warranted at this tier, not present    | **Advise only** — guidance, not a score/gate lever |
| `N/A-by-scale`      | Below its warranting tier              | Skip — not a gap                                   |
| `OVER-ENGINEERED`   | Present but unwarranted at this tier   | **Advise AGAINST** — cite the carrying cost        |

---

## 1 · Traffic & Edge

Owning depth: **security-review** (WAF/DDoS/CORS boundary), **production-readiness-review** (edge posture).

| Technique       | Warranting signal                                        | Min tier | Over-engineering caveat                                  |
| --------------- | -------------------------------------------------------- | -------- | -------------------------------------------------------- |
| Rate Limiting   | Any public/authenticated API surface; abuse or cost risk | T1       | Skip elaborate distributed quota stores below T2         |
| Load Balancing  | More than one app instance                               | T1       | A single instance needs none                             |
| Reverse Proxies | TLS termination, routing, static offload                 | T1       | Not for a single internal service                        |
| API Gateways    | Many services, cross-cutting auth/throttling/routing     | T2       | A monolith rarely needs a gateway (T0/T1)                |
| CDN             | Global static/media, geo-distributed reads               | T2       | Local-only internal tools don't need a CDN               |
| Edge Caching    | Cacheable content served far from origin                 | T2       | Highly dynamic per-user data caches poorly at edge       |
| WAF             | Public internet exposure, compliance                     | T2       | Internal-only services behind a VPN rarely need it       |
| DDoS Protection | Public, revenue-critical, or targeted service            | T2       | Over-provisioning scrubbing for a low-value internal app |

## 2 · Caching & Data Access

Owning depth: **performance-review**.

| Technique          | Warranting signal                        | Min tier | Over-engineering caveat                                       |
| ------------------ | ---------------------------------------- | -------- | ------------------------------------------------------------- |
| Caching            | Repeated reads of stable data; hot paths | T1       | Caching rarely-read data adds staleness risk for no gain      |
| Cache Invalidation | Any cache of mutable data                | T1       | Complex invalidation topologies below T2 = premature          |
| Database Indexing  | Any query with a filter/sort at volume   | T1       | Indexing every column bloats writes — index by query evidence |
| Query Optimization | Slow queries, growing data               | T1       | Micro-tuning a low-volume query wastes effort                 |
| N+1 Queries        | ORM/loop-driven per-row fetches          | T1       | — (always a bug to fix, at any tier with real data)           |
| Connection Pooling | Concurrent DB access                     | T1       | Oversized pools exhaust DB connections                        |

## 3 · Data Scaling & Consistency

Owning depth: **performance-review**, **architecture-review** (coupling/consistency boundaries).

| Technique               | Warranting signal                          | Min tier | Over-engineering caveat                                                   |
| ----------------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------------- |
| Read Replicas           | Read-heavy load exceeding a primary        | T2       | Replicas add lag + ops cost below read pressure                           |
| Sharding                | Single node can't hold data/write volume   | T3       | Sharding early is the classic premature-scaling trap                      |
| Partitioning            | Large tables, time/tenant-bounded access   | T2       | Partitioning small tables adds complexity for no gain                     |
| Replication             | HA / durability / read scaling             | T2       | Multi-primary replication below T2 is over-built                          |
| Leader Election         | Coordinated single-writer across nodes     | T2       | Needless if only one instance runs the job                                |
| CAP Theorem (trade-off) | Any distributed data store                 | T2       | A single-node store has no CAP trade-off to reason about                  |
| Eventual Consistency    | Cross-service/replica reads tolerating lag | T2       | Forcing eventual consistency on a strongly-consistent single DB adds bugs |
| Optimistic Locking      | Low-contention concurrent updates          | T1       | —                                                                         |
| Pessimistic Locking     | High-contention critical sections          | T1       | Broad pessimistic locks throttle throughput                               |
| Distributed Locks       | Cross-node mutual exclusion                | T2       | A single-node app should use in-process locks, not Redis/ZK locks         |
| Race Conditions (guard) | Any concurrent state mutation              | T0       | — (correctness, always in scope)                                          |
| Deadlocks (guard)       | Multi-lock ordering                        | T1       | —                                                                         |

## 4 · Async & Messaging

Owning depth: **architecture-review** (messaging/service boundaries).

| Technique                   | Warranting signal                           | Min tier | Over-engineering caveat                                        |
| --------------------------- | ------------------------------------------- | -------- | -------------------------------------------------------------- |
| Message Queues              | Decoupling, load leveling, spikes           | T2       | A queue between two in-process functions adds latency + ops    |
| Pub/Sub                     | Fan-out to multiple consumers               | T2       | Pub/Sub for a single consumer = needless indirection           |
| Event-Driven Architecture   | Many bounded contexts reacting to changes   | T2       | Event-sourcing a CRUD app below T2 is a common over-reach      |
| Distributed Transactions    | Atomicity across services/stores            | T2       | Prefer a local transaction whenever one store owns the data    |
| Saga Pattern                | Multi-service workflow needing compensation | T2       | Sagas for a single-service transaction = accidental complexity |
| Dead Letter Queues          | Any durable async consumer                  | T2       | — (once you have a queue, DLQ is baseline)                     |
| Backpressure                | Producer can outpace consumer               | T2       | —                                                              |
| Webhooks                    | Outbound event delivery to third parties    | T1       | —                                                              |
| Cron Jobs / Scheduled Tasks | Periodic/batch work                         | T1       | Distributed schedulers below T2 are over-built                 |
| WebSockets                  | Bidirectional real-time push                | T1       | Don't hold sockets open for request/response data              |
| Long Polling                | Near-real-time without socket support       | T1       | Prefer SSE/WebSocket when available at T2+                     |
| Server-Sent Events          | One-way server→client streaming             | T1       | —                                                              |

## 5 · Resilience

Owning depth: **production-readiness-review**.

| Technique                   | Warranting signal                        | Min tier | Over-engineering caveat                                         |
| --------------------------- | ---------------------------------------- | -------- | --------------------------------------------------------------- |
| Circuit Breakers            | Calls to a failable dependency           | T1       | Breakers around in-process calls add noise                      |
| Timeouts                    | Any network/IO call                      | T0       | — (always required on remote calls)                             |
| Retries                     | Transient-failure-prone calls            | T1       | Retrying non-idempotent writes without idempotency causes dupes |
| Exponential Backoff         | Retries against shared/rate-limited deps | T1       | Fixed tight retries cause thundering herds                      |
| Idempotency                 | Retried or at-least-once operations      | T1       | — (paired with retries/queues)                                  |
| Health Checks               | Any deployed service                     | T1       | —                                                               |
| Liveness & Readiness Probes | Orchestrated/containerized deploys       | T2       | Only meaningful where an orchestrator consumes them             |
| Failover                    | HA requirement                           | T2       | Standby infra below an availability SLA is cost for no benefit  |
| Graceful Degradation        | User-facing service with optional deps   | T2       | —                                                               |

## 6 · Scaling & Compute

Owning depth: **architecture-scalability-review**.

| Technique                      | Warranting signal                          | Min tier | Over-engineering caveat                                        |
| ------------------------------ | ------------------------------------------ | -------- | -------------------------------------------------------------- |
| Autoscaling                    | Variable load, elastic infra               | T2       | Autoscaling a steady low-traffic app adds config risk          |
| Horizontal Scaling             | Load exceeds one node; statelessness       | T1       | Requires stateless design first — don't bolt on                |
| Vertical Scaling               | Simple headroom, low complexity budget     | T0       | Has a hard ceiling — don't rely on it at T2+                   |
| Serverless Limits (design-for) | FaaS deployment                            | T1       | Serverless for steady high-throughput can cost more than nodes |
| Cold Starts (mitigate)         | Latency-sensitive serverless               | T2       | Provisioned concurrency everywhere wastes money                |
| Thread Safety                  | Any shared mutable state under concurrency | T0       | — (correctness)                                                |
| Garbage Collection (tuning)    | GC-pause-sensitive latency SLOs            | T2       | Premature GC tuning is a classic time sink                     |
| Memory Leaks (guard)           | Long-running processes                     | T0       | — (correctness)                                                |

## 7 · Deployment & Release

Owning depth: **production-readiness-review**, **architecture-scalability-review** (delivery/CI).

| Technique                | Warranting signal                         | Min tier | Over-engineering caveat                                         |
| ------------------------ | ----------------------------------------- | -------- | --------------------------------------------------------------- |
| CI/CD                    | Any team-maintained codebase              | T0       | — (baseline everywhere)                                         |
| Docker                   | Reproducible build/deploy env             | T0       | Containerizing a static site can be overkill                    |
| Kubernetes               | Many services, elastic orchestration      | T2       | K8s for one container is the canonical over-engineering example |
| Service Discovery        | Dynamic multi-service topology            | T2       | Static config suffices below T2                                 |
| Blue-Green Deployments   | Zero-downtime releases                    | T2       | Full duplicate env below an uptime SLA is cost for no benefit   |
| Canary Releases          | Risk-controlled rollout at scale          | T2       | Canarying a low-traffic app yields no signal                    |
| Rolling Deployments      | Multi-instance zero-downtime              | T2       | —                                                               |
| Rollbacks                | Any production deploy                     | T1       | — (must always be possible)                                     |
| Feature Flags            | Decouple deploy from release; experiments | T1       | Flag sprawl becomes its own debt — prune flags                  |
| Infrastructure as Code   | Any non-trivial infra                     | T1       | IaC for a single hand-managed box may not pay off yet           |
| Terraform                | Multi-resource cloud infra                | T1       | — (an IaC choice)                                               |
| Helm Charts              | Kubernetes app packaging                  | T2       | Only relevant once on K8s                                       |
| Build Caching            | Slow/large CI builds                      | T1       | —                                                               |
| Dependency Hell (manage) | Many transitive deps                      | T0       | Lockfiles + renovate; don't hand-pin everything                 |
| Semantic Versioning      | Published libraries/APIs                  | T0       | —                                                               |
| API Versioning           | Evolving public/consumed APIs             | T1       | Versioning an internal-only unstable API early adds ceremony    |
| Database Migrations      | Any schema change over time               | T0       | — (baseline)                                                    |
| Schema Versioning        | Evolving event/message/DB schemas         | T1       | —                                                               |

## 8 · Observability

Owning depth: **production-readiness-review**.

| Technique                | Warranting signal               | Min tier | Over-engineering caveat                                        |
| ------------------------ | ------------------------------- | -------- | -------------------------------------------------------------- |
| Monitoring               | Any deployed service            | T1       | —                                                              |
| Logging                  | Any service                     | T0       | Verbose debug logging in prod hurts cost + signal              |
| Distributed Tracing      | Multi-service request paths     | T2       | Tracing a monolith yields little; adds overhead                |
| Metrics                  | SLO/health measurement          | T1       | —                                                              |
| Alerting                 | On-call / user-facing SLA       | T1       | Alert on symptoms (SLO burn), not every metric — avoid fatigue |
| SLOs                     | User-facing reliability targets | T2       | Formal SLOs for an internal PoC are premature                  |
| SLIs                     | Backing SLOs                    | T2       | —                                                              |
| Error Budgets            | SLO-driven release governance   | T3       | Only meaningful with mature SLOs + release cadence             |
| Observability (holistic) | Debuggable distributed systems  | T2       | —                                                              |

## 9 · Security & Compliance

Owning depth: **security-review** (OWASP + secrets + boundary).

| Technique             | Warranting signal                 | Min tier | Over-engineering caveat                                             |
| --------------------- | --------------------------------- | -------- | ------------------------------------------------------------------- |
| Secrets Management    | Any credential/key                | T0       | — (never hardcode, at any tier)                                     |
| IAM                   | Multi-role/least-privilege access | T1       | Fine-grained IAM for a single-user tool is ceremony                 |
| OAuth                 | Third-party/delegated auth        | T1       | Rolling OAuth for a purely internal single-app login may over-reach |
| JWT Rotation          | Token-based auth                  | T1       | —                                                                   |
| TLS                   | Any network transport             | T0       | — (baseline everywhere)                                             |
| Encryption at Rest    | Sensitive/regulated data          | T1       | Encrypting non-sensitive internal data adds key-mgmt cost           |
| Encryption in Transit | Any external transport            | T0       | —                                                                   |
| CORS                  | Browser-facing API                | T0       | — (correctness/security)                                            |
| CSRF                  | Cookie-auth browser app           | T0       | —                                                                   |
| SQL Injection (guard) | Any DB query with input           | T0       | — (correctness)                                                     |
| XSS (guard)           | Any rendered user input           | T0       | —                                                                   |
| SSRF (guard)          | Server fetches user-supplied URLs | T0       | —                                                                   |

## 10 · DR & Infra

Owning depth: **production-readiness-review**, **architecture-scalability-review**.

| Technique                | Warranting signal                      | Min tier | Over-engineering caveat                                  |
| ------------------------ | -------------------------------------- | -------- | -------------------------------------------------------- |
| Backups                  | Any persistent data of value           | T1       | — (baseline once data matters)                           |
| Disaster Recovery        | RPO/RTO targets, business-critical     | T3       | Full DR runbooks for a T0/T1 PoC are premature           |
| Multi-Region Deployments | Global users, region-failure tolerance | T3       | Multi-region below T3 multiplies cost + consistency bugs |
| Failover (infra)         | HA availability targets                | T2       | —                                                        |
| Chaos Engineering        | Mature resilient distributed system    | T3       | Chaos testing an immature/small system just breaks it    |
| Cost Optimization        | Non-trivial cloud spend                | T1       | Premature cost-tuning before product-fit wastes effort   |

---

## Cross-cutting network & protocol concerns

These arise across tiers; surface them where the topology makes them relevant (owning depth: **architecture-review** / **performance-review**).

| Technique                       | Warranting signal                           | Min tier | Over-engineering caveat                                        |
| ------------------------------- | ------------------------------------------- | -------- | -------------------------------------------------------------- |
| Latency (budget)                | User-facing responsiveness                  | T1       | —                                                              |
| Throughput (budget)             | High request/data volume                    | T2       | —                                                              |
| P99 Latency / Tail Latency      | SLO on worst-case, not average              | T2       | Optimizing tail before mean is measured is premature           |
| Network Partitions (design-for) | Multi-node/region communication             | T2       | Not a concern for a single node (T0)                           |
| Clock Skew (guard)              | Distributed ordering/expiry                 | T2       | Irrelevant on a single host                                    |
| DNS (design/failover)           | Service addressing, failover routing        | T1       | —                                                              |
| TCP vs UDP (choice)             | Protocol-sensitive transport                | T1       | Reaching for UDP without a latency/loss reason adds complexity |
| HTTP/2 & HTTP/3                 | Many concurrent streams, mobile/global      | T2       | HTTP/1.1 is fine for low-traffic internal APIs                 |
| gRPC                            | High-throughput internal service-to-service | T2       | gRPC for a browser CRUD app adds tooling for no gain           |

## Operational practices (people/process)

Owning depth: **production-readiness-review**.

| Technique                      | Warranting signal                  | Min tier | Over-engineering caveat                                    |
| ------------------------------ | ---------------------------------- | -------- | ---------------------------------------------------------- |
| Production Incidents (process) | Any production service             | T1       | —                                                          |
| On-call                        | User-facing SLA / 24×7 expectation | T2       | Formal on-call rotation for an internal tool is over-built |
| Postmortems                    | Recurring/high-impact incidents    | T2       | Blameless postmortem ceremony for a PoC is premature       |

---

## Per-tier expected baseline (quick reference)

- **T0 (internal/single-instance):** CI/CD, Docker, TLS, Secrets Management, Logging, DB Migrations, Timeouts, correctness guards (SQLi/XSS/SSRF/CORS/CSRF/race/thread-safety/memory). Almost everything else is `N/A-by-scale`.
- **T1 (<10k):** + Rate Limiting, Caching (+invalidation), Indexing, Connection Pooling, Circuit Breakers/Retries/Backoff/Idempotency, Health Checks, Monitoring/Metrics/Alerting, Backups, Rollbacks, Feature Flags, IaC, Load Balancing/Reverse Proxy.
- **T2 (10k–1M):** + API Gateway, CDN/Edge/WAF/DDoS, Read Replicas/Partitioning/Replication, Queues/Pub-Sub/Event-Driven/Saga/DLQ/Backpressure, Autoscaling/K8s, Blue-Green/Canary/Rolling, Distributed Tracing, SLOs/SLIs, Liveness/Readiness, Failover, HTTP/2-3, gRPC, On-call.
- **T3 (millions+/multi-region):** + Sharding, Multi-Region, Disaster Recovery, Chaos Engineering, Error Budgets, global leader-election/consensus. Full anti-over-engineering scrutiny applies below this tier.

> **Reminder:** MISSING-WARRANTED entries are **advice**, never a score or gate penalty. The gate's value is telling a
> team which techniques their scale _warrants considering_ — and, equally, which ones they should NOT build yet.
