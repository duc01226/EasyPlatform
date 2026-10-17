# Architecture Scalability Scorecard

Use this reference from `architecture --mode=scalability`. Score every area 0-2. If evidence is missing, score `0`; do not infer a positive score from intent.

## Scoring Scale

| Score | Meaning |
| ---: | --- |
| 0 | Missing, contradicted, or unproven. |
| 1 | Partially addressed, manually documented, or implemented without strong enforcement. |
| 2 | Designed and enforced with source/config/ADR/command evidence. |

Evidence can be `file:line`, command output, optional graph output (a hint, verified by reading), accepted ADR text, architecture report sections, CI/build config, or explicit `N/A - reason`.

## Ten Areas

| # | Area | Score 0 | Score 1 | Score 2 | Required evidence | Cadence / owner |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Build & CI Scalability | No incremental build, affected-only detection, remote/local caching, or parallel build/test strategy for a project expected to grow. | Some caching or CI parallelism exists, but affected-only detection, cache invalidation, or test selection is partial/manual. | Incremental builds, changed/affected-only detection, cache strategy, parallelization, and failure visibility are documented and enforced. | CI config, build tool config, monorepo/workspace config, scripts, ADR, or setup report. | Init/audit score here; quality-gate tooling depth routes to `linter-setup`. |
| 2 | Architecture Pattern / distributed-monolith | Architecture style is unnamed or distributed services/modules share DB/state, require lockstep deploys, or mostly make sync calls across boundaries. | Modular monolith or microservice direction is named, but boundaries/deploy/data ownership are weak or partly synchronous. | Chosen pattern fits scale/team/domain, names trade-offs, and avoids the distributed-monolith anti-pattern with clear ownership and deployment boundaries. | Architecture report, ADR, service/module map, deployment topology, data ownership map. | Init/audit score here; design routes to `architecture --mode=design`; diff drift routes to `architecture --mode=review`. |
| 3 | Module Isolation | Sub-domains are mixed, share persistence, or cannot be built/tested independently when the architecture expects isolation. | Bounded contexts or modules exist, but build/test/deploy independence or ownership rules are partial. | Bounded contexts are explicit, ownership is clear, and modules/services can be built/tested/deployed independently where required. | Domain model, module graph, project structure, build/test commands, deployment config. | Init/audit score here; bounded-context depth routes to `domain-analysis`. |
| 4 | Dependency Discipline | Dependency direction is implicit, circular, or unenforced. | Directions are documented but not automatically checked, or only some stacks/modules are covered. | Dependency directions are explicit, enforceable, and checked by tooling or tests; no circular context dependencies. | Import graph, architecture tests, lint rules, module-boundary config, graph command output. | Every-change owner: `architecture --mode=review`; setup enforcement routes to `linter-setup`. |
| 5 | Loose Coupling | Contexts/services primarily call each other synchronously, share storage, or depend on internals. | Events/messages exist but sync calls, shared DB reads, or ownership ambiguity remain on important paths. | Coupling is intentionally event-driven or message-based where appropriate; sync APIs are justified and isolated behind contracts. | Event/message definitions, consumers, API contracts, integration docs, graph/grep evidence. | Domain/event modeling routes to `domain-analysis`; change-level coupling routes to `architecture --mode=review`. |
| 6 | Horizontal Scaling | Stateful app nodes, SPOFs, unbounded fan-out, no caching/back-pressure, unclear DB scaling, or no latency/throughput/resource limits. | Some scale mechanisms exist, but key ceilings or bottlenecks are undocumented or untested. | Load balancing, statelessness, caching, DB sharding/partitioning/replication, async/message queues, connection pooling, auto-scaling, SPOF handling, bottlenecks, latency/throughput limits, concurrency, rate limiting, resource utilization, and CDN posture are documented or enforced as applicable. | Architecture report, deployment/IaC, runtime config, perf baselines, capacity assumptions, SLOs, queue/cache config. | System score here; local bottleneck depth routes to `performance-review`; runtime readiness routes to `production-readiness-review`. |
| 7 | DRY | Duplicated domain rules, duplicated platform utilities, or copy-paste cross-context logic; no strategy for shared knowledge. | Some shared libs/utilities exist, but ownership/versioning/boundaries are unclear or domain concepts leak into reusable layers. | Monorepo/shared domain lib/custom platform or utility lib is used where needed, with ownership and boundaries that reduce duplicated knowledge without coupling contexts. | Workspace config, shared library structure, package boundaries, duplicated-rule grep, ownership docs. | Strategic score here; diff-level duplication routes to `architecture --mode=review`; foundation routes to `scaffold`. |
| 8 | Abstraction / Easy-to-Change | Technical concerns are hardwired into business logic; swapping repository/library/infrastructure choices requires behavior rewrites. | Interfaces/adapters exist in some areas but are inconsistent, leaky, or speculative. | Stable contracts isolate swappable technical/library concerns where change is likely; abstractions reduce future change cost without premature indirection. | Interfaces/adapters, repository contracts, dependency inversion evidence, ADR rationale, scaffold patterns. | Design routes to `architecture --mode=design`; conformance routes to `architecture --mode=review`; foundation routes to `scaffold`. |
| 9 | Clean Architecture | Business logic sits in controllers/UI/infrastructure, dependency rule is inverted, or layers are absent where domain complexity requires them. | Layering exists but responsibility placement is inconsistent or not enforced. | Clean Architecture or an equivalent dependency-rule style is appropriate for the project and enforced through structure, tests, or review rules. | Project structure, imports, architecture tests, backend/frontend reference docs, ADRs. | Every-change owner: `architecture --mode=review`; scaffold foundation routes to `scaffold`. |
| 10 | Observability & Delivery | No credible monitoring, logging, metrics, CI/CD, deployment, rollback, or IaC posture. | Some delivery/observability exists but important environments, rollback paths, metrics, or runbooks are partial. | Monitoring, logging, metrics, DevOps/deployment, CI/CD, infrastructure-as-code, rollback, and operational ownership are documented and verified for the target scope. | CI/CD config, IaC, deployment manifests, logging/metrics/tracing config, runbooks, SRE review evidence. | Runtime depth routes to `production-readiness-review`; quality gates route to `linter-setup`. |

## Pass/Fail Gates

| Gate | Pass | Partial | Fail |
| --- | --- | --- | --- |
| G1 Evidence Integrity | Every score has evidence or `N/A - reason`. | Minor evidence gaps are clearly marked and down-scored. | Positive scores rely on unverified claims. |
| G2 Build & CI Scalability | Incremental/affected/cache/parallel strategy is present or N/A is justified. | Some strategy exists, but expected growth makes gaps material. | No credible strategy for a project expected to grow. |
| G3 Distributed-Monolith Risk | Boundaries, ownership, deployment, and data flow avoid distributed-monolith coupling. | Risks are known and tracked. | Architecture is distributed in topology but monolithic in coupling/deploy/data ownership. |
| G4 Boundary Enforcement | Dependency direction and module boundaries are explicit and enforced. | Documented but not consistently enforced. | Circular or implicit dependencies are plausible/uncontrolled. |
| G5 Horizontal Scaling Bottlenecks | Scaling assumptions and bottlenecks are known, owned, and mitigated, AND a metastable-state escape hatch is named (shed / drain / warm / restart at lower concurrency), AND every latency figure states how load was generated. | Some ceilings are known; important limits remain unmeasured, or latency evidence has no stated load-generation method. | Stateful/SPOF/unbounded bottlenecks are unknown or ignored, or recovery is assumed automatic once the load spike passes. |
| G6 Reuse Without Coupling | Shared code reduces duplication without leaking consumer domain concepts. | Shared code exists with some ownership/boundary ambiguity. | Shared code creates hidden coupling or duplicated knowledge remains unmanaged. |
| G7 Secrets And Sensitive Output | Report redacts credentials and never prints secrets. | Sensitive-looking values are summarized, not copied. | Report exposes credentials, tokens, secrets, or private customer data. |

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| --- | --- | --- | --- |
| Build & CI Scalability | `architecture --mode=scalability` | `architecture --mode=review` only when a change adds/removes quality gates | Build topology changes rarely per diff; evaluate at setup and periodic audits. |
| Architecture Pattern / distributed-monolith | `architecture --mode=scalability`, `architecture --mode=design` | `architecture --mode=review` | Pattern choice is strategic, but each diff can introduce boundary drift. |
| Module Isolation | `architecture --mode=scalability`, `domain-analysis` | `architecture --mode=review` | Context design is strategic; imports/sync calls regress per change. |
| Dependency Discipline | `architecture --mode=scalability`, `linter-setup` | `architecture --mode=review` | Enforcement is setup-level; violations happen in diffs. |
| Loose Coupling | `architecture --mode=scalability`, `domain-analysis` | `architecture --mode=review` | Event ownership is strategic; sync coupling is introduced per change. |
| Horizontal Scaling | `architecture --mode=scalability`, `performance-review`, `production-readiness-review` | `performance-review` for hot paths; `architecture --mode=review` for statelessness smells | System scaling is periodic; local bottlenecks and statefulness regress in code. |
| DRY | `architecture --mode=scalability`, `scaffold` | `architecture --mode=review` | Strategic shared libraries are setup decisions; duplication appears per diff. |
| Abstraction / Easy-to-Change | `architecture --mode=scalability`, `architecture --mode=design`, `scaffold` | `architecture --mode=review` | Abstraction strategy is planned; conformance drifts per change. |
| Clean Architecture | `architecture --mode=scalability`, `scaffold` | `architecture --mode=review` | Layering is scaffolded once and enforced continuously. |
| Observability & Delivery | `architecture --mode=scalability`, `production-readiness-review`, `linter-setup` | `production-readiness-review` | Delivery posture is setup/periodic; runtime readiness changes with service/API diffs. |

## Report Notes

- If a sibling skill already produced a recent report, cite it as evidence and summarize the relevant score only.
- If a recommendation needs a new package, platform, or hosted service, record it under "New Tech/Lib Recommendations" and require user confirmation before implementation.
- Use route pointers for sibling-owned depth, for example: `-> route to performance-review for p95 baseline and query-plan proof`.
- For generated mirrors or catalogs, audit canonical source first and verify generated artifacts only through the sync phase owned by the active plan.
