# Scan Target: performance-tests

Read `../targets.md` first for selection, roots and ownership; the `scan` host loads this file only for `--target=performance-tests`.

- **doc:** `<ref>/performance-test-reference.md`
- **applies when:** a project performance harness, executable workload/budget profile or explicit performance-test setup request is evidenced. A requested first setup can document intended policies and missing capability; it cannot invent a runnable command or measured capacity.
- **skip when:** no performance-test capability or setup intent exists; an ordinary functional test, tool dependency or generic container file alone is insufficient.
- **description:** `[Documentation] Use when reconciling project performance-test preferences, reusable harness conventions, workload/data/resource budgets, commands and evidence.`
- **sub-agents:** main agent performs the focused scan; use the host's required fresh-eyes verification on the resulting document. Do not run load or install tools during this documentation scan.

## Detect and preserve ownership

Resolve optional config and the selected reference root. Read the existing reference, project decisions, manifests, runner entrypoints, workload profiles, fixtures, resource limits, collectors, evaluator and CI where present. `framework.performanceTestDoc` and `testing.filePatterns.performance` are optional discovery hints; verify them against sources. Init creates only evidence-backed facts or explicitly labeled intended preferences; Sync repairs stale facts without replacing intentional policies.

Keep executable budgets in their existing single owner and link them. A source default is not evidence of owner approval to reduce an SLO or workload. Distinguish accepted targets, provisional proposals, verified commands and unexecuted profiles. Missing evidence remains unknown; no guessed runner, helper, data count, hardware profile or throughput.

## Evidence lenses

| Section | Record only actionable project facts/preferences |
| --- | --- |
| Scope/status | Actual surfaces, growth dimensions, initialized/missing capability and justified N/A cases |
| Commands/prerequisites | Verified one-command local/CI entrypoints, supported OSs, pins, setup, target isolation, readiness/cancellation and owned cleanup |
| Harness/reuse | Config owner, shared clients/auth/fixtures/seeders/collectors/evaluator, extension example and case conventions |
| Workload/data | Journey/read-write/payload/pacing/load model, schema manifest, growable counts/exceptions, relationships/skew and fixture safety |
| Hardware/budgets | Verified per-service and total limits, host/VM/generator topology, SLO provenance, measurement/repeat/green policy and unresolved targets |
| Evidence/analysis | Current report formats/paths, memory/OOM/restart collection, query/search-plan coverage and scan exceptions, scaling limits, redaction/retention |

Preserve curated section names and local policies; do not paste the generic skill gate matrix into the project reference. Reports are disposable under project-root `tmp/reports/`. A template copied by initialization is discovery scaffolding, not a passing performance system.

## Verification and output

Trace every documented command/helper/config path to its owner and state its actual execution status. Check the one-command lifecycle and fail-closed evaluator by source inspection; do not execute tests as part of this scan. Preserve unknowns and rejected interpretations in the temporary report. Refresh through the host's prompt-enhance/verification procedure, then return changed sections, source evidence and remaining gaps.
