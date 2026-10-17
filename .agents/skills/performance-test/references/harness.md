# Reusable performance harness

Read on first initialization or when changing runner, orchestration, shared helpers or evidence collection. Reuse a fitting existing harness; migrate only with measured benefit and a retained extension path.

**Authoring boundary:** write/init research, install/pin dependencies and author the owners/cases below, then perform the skill's static review (default two rounds maximum). Do not start the system, seed data or execute tests. The lifecycle and foundation acceptance below describe what the authored command must do **when the user explicitly requests verification**. Mark all runtime evidence NOT RUN until then.

## Research before installation

Inspect actual languages/versions, transports, deployment, persistence, existing tests/seeders, CI, developer OSs and offline constraints. The research agent returns a short comparison of credible maintained options, exact official documentation/release links, compatible versions, licensing, local cost, protocol support, open/closed workload support, assertions, metrics/export and generator resource use. Compare the existing tool too. Select by project fit, not a globally “best” tool.

Starting points, to verify against current docs in [sources.md](sources.md):

| Surface | Candidates / distinction |
| --- | --- |
| HTTP/gRPC/WebSocket services | k6; Locust when Python behavior/custom clients fit; Gatling for supported protocol/code ecosystems; JMeter for an existing plan/plugin ecosystem. Confirm required protocol/version and local reporting support. |
| Library/CPU/allocation hot paths | Native statistical benchmarks, e.g. Go `testing`, BenchmarkDotNet or the stack's maintained equivalent. Pair with end-to-end tests when a service exists; microbenchmarks do not establish service capacity. |
| Browser/native UI | Small real-device/browser journeys with runtime/network/render budgets; run server load separately. Confirm device/CPU/network profiles; local lab results are not field percentiles. |
| Workers/queues/CLI/storage/ML | Native driver or maintained protocol adapter that records completed correct work, queue age/drain, memory and task cost; for ML include token/input/output shape and accelerator resources where applicable. |

Keep generator, system, datastore and resource collectors distinct in ownership. Prefer existing lightweight metrics plus runtime/DB-native profilers; a full monitoring cluster is optional. Pin executable/image/package versions and any extensions in project-owned manifests/locks. Record the chosen combination and rejected alternative in the project performance reference.

## One-time foundation

| Shared owner | Required behavior |
| --- | --- |
| Executable config/profile registry | One owner for target identity, limits, SLOs, schedules, data cardinalities/skew, timeouts, repeats and evidence policy. Validate units/required fields; unresolved values cannot silently become zero or “pass”. |
| Runner adapter | Native clients/protocols, named request groups, monotonic durations, stable low-cardinality labels, retries visible as attempts, bounded buffers, connection reuse matching production. Wrap only an actual volatile/repeated seam. |
| Actor/fixture helpers | Valid auth/permissions, distinct sessions and writable identities, deterministic random seed, fixture ownership and bounded setup; no copied login or seeding in every test. |
| Data manifest + seeder | Enumerate all tables/collections, growable/bounded rationale, row targets and actual counts, width/skew and relationships. Chunk/stream creation, enforce constraints, wait for async indexing/replication readiness and update optimizer statistics through engine-supported operations. |
| Resource/DB collectors | Effective limits, baseline and peak memory/CPU/throttling, OOM/restart deltas, runtime/GC, pool/queue waits and query plans; collect from resource-relevant startup and seeding through drain, including failures. Sampling rate/overhead must be disclosed. |
| Evaluator/report adapter | Gate status, exit propagation, no matching tests and missing/stale/corrupt artifacts fail closed; machine-readable results plus human summary and raw artifact references. Bound/redact retained output. |
| Lifecycle owner | One local entrypoint, readiness probes, unique run identity, bounded stage timeouts, shutdown/cancellation and cleanup in finally-equivalent code. Preserve primary failure even if reporting/cleanup also fails. |

Extend fitting project helpers; new abstractions need a real repeated consumer or volatile boundary. Keep system-specific behavior in the project harness, not in the portable skill.

## One-command lifecycle

Choose a project-native command with equivalent behavior on Windows, macOS and Linux, or document a platform limitation and the supported container/VM path. For example, a Node project **could create** `node tests/performance/run.cjs --profile=acceptance`; this is a prospective interface, not a command supplied by this skill.

The implementation must:

1. Probe locked runtimes/tools, container engine/VM capacity, ports, disk and memory; recover missing dependencies through the project's supported bounded install/local fallback. Re-probe the actual consumer. Offer a pre-provisioned image/cache path when network/install is unavailable; no sudo or forced system-package changes.
2. Refuse unexpected targets by default. Use a run-owned disposable environment and synthetic data. External/shared/paid targets require the user's explicit scope/authorization; load testing can send writes or incur cost.
3. Prepare bounded resource collection and lifecycle/event capture **before resource-relevant startup or seeding**. Capture each instance's identity and initial counters at creation/first availability; retain startup failures, OOM events and restarts even when an instance is replaced. If startup coverage cannot be established, the required memory gate stays UNKNOWN.
4. Build/start the production-equivalent system and real in-scope dependencies; keep release settings, durability, auth, indexes and resource limits representative. Confirm effective CPU/memory/swap/process limits at first runtime availability, not merely a YAML declaration, and save topology/applied config. With collection active, apply schema setup via the normal owner, seed, verify counts and await observable readiness. Do not use sleep as readiness.
5. Run preflight smoke, then requested profiles while collection continues through drain. Separate startup/seed evidence from declared warmup/measurement/recovery windows so setup work does not contaminate steady-state distributions. A smoke failure prevents expensive load; a smoke success is not acceptance.
6. Evaluate all gates, write uniquely named machine/human reports even on nonzero runner exit, then clean up only owned resources. Collect OOM/exit/telemetry evidence **before** removal; handle child death, interruption and timeouts. Never blanket-prune containers/volumes or reset a shared database.
7. Exit nonzero for any failed, incomplete, unmatched or invalid required profile. Preserve the runner and evaluator exit statuses in the result; stale output from a prior run is not a fallback.

“One command” includes automated setup/start/seed/report/cleanup; it does not imply installing an operating-system service silently. Name any one-time prerequisite and fail with an actionable reason when it is unavailable.

## Foundation acceptance

Author validation cases for an isolated representative scenario plus test doubles for: intentional SLO/correctness failure, no selected cases, missing telemetry, killed runner, interrupted startup and cleanup after failure. Include a setup-phase peak/OOM-counter event followed by healthy load: it must still fail the memory gate; absent setup samples must remain UNKNOWN/nonzero. After explicit verify authorization, execute these cases, prove the wrapper emits a current report preserving setup evidence before cleanup, and validate collectors on the real runtime as well. Never create an actual host OOM as a self-test.

During authorized verification, use small smoke fixtures for harness mechanics, then the full acceptance data/load for capacity. Explain which result proves which contract. Persist the command and its authored/runtime-verified status, config owner, extension example, helper locations, prerequisites and report format in `performance-test-reference.md`; future authors add scenarios without rebuilding orchestration. Write/init stop after static review and may offer verification through the host question tool.
