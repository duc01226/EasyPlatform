# Verification, green loop and capacity report

Read before runtime verification or green mode. Keep one orchestration/fixing owner, frozen acceptance targets and a bounded round/time budget. Reports prove only their observed scope.

**Entry gate:** an explicit user run/verify/green request must already exist. Write/init/review, a suggested command or an unanswered offer never satisfy it. A prior “write and verify” request does; finish static authoring review first. First verification executes the deferred foundation acceptance in [harness.md](harness.md) before load acceptance. No performance execution is implicit in installation or authoring.

## Preflight and measurement

1. Resolve exact command/profile/cases from the project performance reference and executable config. Record source/config/dataset fingerprints, expected case count, required gates and any baseline. Reject a missing/unmatched profile, unresolved budgets or an unexpected target. Never fall back to a smaller dataset/load without labeling the result diagnostic and keeping acceptance incomplete.
2. Preflight pinned tools, available host/VM CPU/RAM/disk, isolated target/data ownership, collector capability and generator capacity. Execute the full selected command using the harness lifecycle: collection/event capture begins before resource-relevant startup and seeding, with per-instance initial counters and effective limits captured at creation/first availability. Retain setup/restart history; then verify release build, healthy services, auth/fixture actors, declared counts/index readiness/statistics and limits before load. Differentiate host failure from a valid constrained SUT that fails its intended budget. Do not “fix” the test by increasing resources.
3. Capture representative plans and mark load-window baselines without discarding startup/seed samples or earlier OOM/restart events. Preserve runner/evaluator statuses and artifacts on any exit, before cleanup, and inspect them before another action. Unavailable required setup/load telemetry or a saturated generator yields INCONCLUSIVE/ENVIRONMENT-BLOCKED, not a product-capacity verdict. Identify the discriminator: e.g. same target, independently provisioned generator, measured scheduling lag.
4. Warmup, measurement and recovery have explicit windows. Separate each journey/operation's distributions, counts, correct-success rate and offered/achieved traffic; report timeouts, dropped iterations and rejections as demand, never censor them from the result. Inspect app, database and other dependency resources together.
5. Follow the project's declared repeat policy; absent one, use **three comparable independent acceptance runs** with isolated fixtures/reset owned by the harness, collecting variability. A repeat is not a repair round. Preserve comparable data/index/cache state; state which cold/warm states each run tests. If samples/host noise cannot support the tail claim, extend within the declared budget or report INCONCLUSIVE.

## Bounded green mode

`--mode=green` normalizes to `--mode=verify --fix-loop`. Default three measured rounds maximum; retain a stricter project limit and all time/cost/safety bounds. Verify without fix-loop reports after the measured pass and performs no product/test repair. Environment startup/owned fixtures are normal run lifecycle in both modes.

For every green round:

1. Execute the default verify pass above without recursively passing `--fix-loop`. Write a round report before repairs. Evaluate every applicable quality gate, including evidence completeness; successful exit alone is not PASS.
2. Record a provisional fault classification **before** tracing/editing: SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED or AMBIGUOUS. Use `/investigate --mode=debug` to establish the mechanism, comparing intended budget/outcome, production source, test and environment. Expected saturation in a deliberate breakpoint profile is not automatically a defect; early saturation at acceptance demand is a failure.
3. Invoke `/performance-review --report-only --loop-owner=caller` on the complete selected system with workload/config, query plans, memory/GC, pool/queue waits, load report and hypothesis. Preserve its applicable full-dimension coverage and findings validation; the caller runs `/why-review --validate-findings` once on merged optimization findings before fixes. Keep both skills' gates and the caller's round budget; report-only reviewers do not fix or spawn a competing loop. A zero-finding review still cannot erase a failed runtime gate.
4. Fix validated source issues through `/fix` at the authoritative owner; test/harness faults receive a read-only performance-test quality pass first, then a root fix that preserves intent. Environmental failures stop source/test edits until the environment is valid. AMBIGUOUS intent needs owner input. Preserve failures that disappear on retry as unexplained until their mechanism is established.
5. Update affected cases/spec constraints and project references through their owners; add targeted regression coverage for the actual root cause. Static-review the complete repair diff with `/changes-review --report-only` and fix validated issues. Revisit memory, writes, indexes, cache correctness and all affected consumers, not just the improved endpoint. Run the functional checks appropriate to the repair.
6. Run final functional regression checks and the **full unchanged acceptance contract**, including repeats, required endurance/query/memory/recovery evidence. Read the fresh reports and performance-review the settled target in caller-owned report-only mode before closing; if that review requires another edit, prior runtime evidence is stale. A targeted diagnostic result cannot close the round.

Stop on unsafe/external target without authority, missing mandatory capability, uncertain intended behavior, two consecutive non-progress rounds, or the round/time budget. At the cap report unresolved gates and ask before a specified extension; never continue silently. Preserve the run/round history across interruptions.

Converged means all required profiles/gates pass with current complete evidence and no open required finding. Do not improve the score by deleting cases, changing selectivity, shrinking rows/users/duration, increasing hardware, relaxing limits, serving stale/unauthorized data or weakening durability. A separately authorized target change creates a new contract/baseline; it does not retroactively pass the old one.

## Result and report contract

Use the project's native output formats; include these fields in a versioned machine-readable result and a readable Markdown or HTML summary. Keep implementation/config/schema in source control; store raw run evidence under project-root `tmp/`/`temp/`, with bounded retention and redaction.

| Group | Required fields |
| --- | --- |
| Identity | Schema version, run/round/repetition IDs, timestamp, source/config/dataset hashes, exact argv, host/model and tool/image versions, selected/executed/skipped/failed cases, profile, status, runner/evaluator exit and start/end times |
| Experiment | SLO provenance, topology and effective per-service/total limits, CPU model/architecture/VM/disk/network, generator placement/resources, seed/randomness, all-table targets/actual counts/exceptions, cache/statistics state, load schedule/mix/pacing and windows |
| Outcome | Per-operation count, useful success/error/timeout/rejection rates, offered/achieved throughput/concurrency, generator drops/lateness, latency distributions and raw histogram references, resource/GC/pool/queue timelines, OOM/error/restart deltas, recovery time |
| Data access | Query/search path → fingerprint → representative parameters/selectivity → plan artifact → rows/IO/latency/bounds/index → result/justified scan exception; show unmapped/unobserved paths |
| Decision | Every applicable gate expected/actual/status/artifact, before/after baseline comparison and variability, faults/root causes/fixes, validated review findings, uncovered/unknown evidence and next action |

The evaluator must detect stale/missing artifacts, wrong run IDs, zero cases/samples, missing required profile results and nonzero subprocess exits. Make correctness failure a failing gate even when the runner only records a check (k6 checks alone do not affect its exit status). Never emit an unqualified PASS for a subset, partial cleanup, incomplete telemetry or smoke-only proof.

Read raw artifacts for failed/required gates, query plans and memory/recovery windows; do not merely trust a generated summary or the agent's narrative. Preserve final runtime proof against the source/config fingerprint; an edit invalidates affected evidence.

## Capacity and scaling analysis

Report **measured sustainable useful throughput** under the recorded workload/SLO and a justified headroom allowance. Include CPU-seconds per successful operation, peak/steady memory, successful throughput per allocated CPU where meaningful, latency/error distributions and resource contention. Ratios compare the same hardware/topology/workload; a quota alone cannot normalize different processors.

For `U` active sequential sessions making `k` requests in mean cycle time `T` seconds (including think time and responses), demand estimate is `U × k / T` RPS. Keep it labeled a demand model. Little's Law is `L = lambda × W` for a stable consistent boundary; users thinking are not in-flight requests. Reconcile estimated demand with observed traffic before extrapolation.

For target useful throughput `D` and measured per-instance design capacity `C` **after headroom**, `ceil(D/C)` is only a starting replica estimate. If `C` is the measured maximum and retained fraction is `h`, the equivalent estimate is `ceil(D/(C*h))`; state `0<h<1` and avoid counting headroom twice. No measured `C` means no defensible replica number.

Validate candidate counts with at least a measured **one-versus-two-instance** comparison when making a horizontal scaling claim; keep workload, per-instance resources and shared dependency budgets explicit. Check database limits, aggregate connections, cache/session coherence, hot keys, locks, disk/network, queue partitions, load balancing, cold starts and failure/recovery. Shared bottlenecks and contention can make scaling sublinear or worse. Without that experiment label the forecast UNVERIFIED and state its limiting assumption.

Vertical scaling needs its own resource sweep; never multiply memory/CPU linearly from a single run. Availability/failover needs independent evidence, not throughput arithmetic. Return a concise measured envelope, unmet target, limiting resource, plausible next experiment and what would change the recommendation.
