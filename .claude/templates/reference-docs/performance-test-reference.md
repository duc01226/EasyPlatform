# Performance Test Reference

<!-- Fill in your project's details below. -->

Read before planning, writing, reviewing, running or fixing performance tests. This is the project-owned home for performance-test preferences and conventions. Record verified facts and explicit intended policies; distinguish them from unmeasured proposals. Generic gates belong to the `performance-test` skill.

## Status and Scope
Name the system/surfaces and initialized or missing capabilities. Keep excluded surfaces and unknowns explicit. A template or tool dependency does not prove a working harness.

## Commands and Prerequisites
Record the one-command local entry and its authored/runtime-verified status, profiles/filters, pinned setup owner, supported Windows/macOS/Linux behavior, target-safety checks, startup/readiness and owned cleanup. State which command is diagnostic, acceptance, endurance or capacity. Write/init stop after static review (default maximum two rounds); executing tests requires an explicit user request, which may already include write+verify. Missing commands stay unknown, never invented.

## Harness and Reuse
Link runner/config owners, clients/auth helpers, scenario conventions, seed/fixture builders, collectors and evaluator/report schema. Record first-init stack research and the chosen tools with current official sources. Explain how the next case reuses the foundation.

## Workload and Data
Link the executable workload/data manifest: journey/command mix, active-user/arrival model, pacing, auth, payloads, all growable-table targets/actual counts, bounded-table exceptions, cardinalities/skew and fixture ownership. Record non-database and non-multiuser applicability explicitly.

## Hardware and Resource Envelope
Link the authoritative per-service and total CPU/RAM/swap/IO/replica limits and their runtime verification. Record generator/collector placement and budgets, VM/host facts and resource competition. A larger measured topology cannot certify a smaller reference envelope.

## Budgets and Repeat Policy
Link the single executable owner of latency, useful throughput, error/correctness, memory/headroom/slope, query-work and recovery budgets. State whether targets are accepted or provisional, their rationale, warmup/measure/drain windows, required profiles, repetitions and bounded green-loop policy. Preserve existing requirements when tuning.

## Evidence and Analysis
Record raw and machine/human report locations under project-root `tmp/` or `temp/`, schema/run fingerprints, query/search plan coverage and exceptions, memory/OOM/restart telemetry, baseline comparison, report-reading procedure and redaction/retention. Distinguish measured capacity, unmet targets and unverified scaling forecasts.

## Extension and Maintenance
State scenario/case naming and traceability, helper reuse, how to add a profile, CI/local parity and which owner updates this reference. Preserve intentional project preferences during scans; source changes do not silently approve weaker budgets.
