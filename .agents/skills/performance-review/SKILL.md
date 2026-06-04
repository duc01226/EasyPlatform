---
name: performance-review
description: '[Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, frontend rendering, caching, and distributed paths.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** MANDATORY MUST ATTENTION stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
> **[IMPORTANT]** MANDATORY MUST ATTENTION prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
> **[IMPORTANT]** MANDATORY MUST ATTENTION review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update task tracking: set `in_progress` when step starts, `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If task tools unavailable, maintain equivalent step-by-step tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) real bottleneck — especially database waste (too many rows, too many columns, missing/unused indexes, query-in-loop fan-out, unbounded materialization, slow joins/aggregations, write amplification) — while preserving behavior, authorization, and semantics, proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.

> **Renamed:** formerly `/performance` — that name no longer resolves as a slash command; use `$performance-review`.

**Workflow:**

1. **Detect** - Classify scope and bottleneck type.
2. **Discover** - Read local code, metrics, docs, query/index definitions, similar patterns.
3. **Measure** - Capture baseline or mark static-only risk.
4. **Analyze** - Run serial dimension passes with evidence.
5. **Plan** - Propose smallest fix preserving behavior.
6. **Verify** - Re-measure, run tests, and record evidence.
7. **Validate Findings** - Run `$why-review --validate-findings <report-path>` before any fix.
8. **Fix + Full Re-Review** - Fix only validated findings, then restart from Detect over the full target.

**Key Rules:**

- MANDATORY MUST ATTENTION ALWAYS measure before/after; static review findings need explicit verification command.
- MANDATORY MUST ATTENTION ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
- MANDATORY MUST ATTENTION ALWAYS verify index usability with query shape/order, not index existence alone.
- NEVER recommend caching until query shape, indexes, pagination, batching, and data volume are understood.
- Findings are not eligible for fix until `$why-review --validate-findings` confirms them; every validated fix restarts the full performance review from Phase 0.

<target>$ARGUMENTS</target>

---

## Phase 0: Detect Scope

Classify before analysis. Detection drives dimensions, evidence, sub-agent choice.

| Scope       | Signals                                                   | Primary evidence                                              |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| DB read     | slow query, full scan, sort spill, high rows examined     | query text/ORM expression, row count, plan/explain, indexes   |
| DB write    | slow save, lock waits, per-row updates, transaction bloat | write loop, batch size, lock/deadlock logs, transaction scope |
| N+1/fan-out | loop with query/API call, lazy loading, per-item lookup   | caller trace, query count, loop source                        |
| API latency | high p95/p99, timeout, slow endpoint/job                  | trace/profile/logs, call chain                                |
| Memory/OOM  | large materialization, blobs, no paging, buffering        | allocation profile, result size, collection loads             |
| Frontend    | slow render, huge bundle, repeated fetch, DOM churn       | browser profile, network waterfall, component/render trace    |
| Distributed | message lag, cross-service waterfall, retry storm         | trace spans, queue metrics, consumer/producer chain           |

Skip reason allowed only when target explicitly narrows scope and evidence proves dimension irrelevant.

---

## Architecture-Altitude Performance Review

> **When to apply:** design/architecture reviews (e.g. via the `architect` agent) — judging performance as a **structural property of the design** _before_ it ships, not a tactical query fix _after_ a bottleneck is observed. The dimension passes below stay the tool for tactical work; this section is the design-level lens layered on top.

Evaluate the bottleneck **layer model** as a design concern, not just a symptom site:

```
Performance as architecture
├── Database  — data access shape baked into the model (projection, paging, N+1 surface, index strategy)
├── API       — serialization/processing cost, parallel tuple queries, response-DTO contracts
├── Network   — payload size & call-count designed into the contract (batch endpoints vs chatty waterfalls)
├── Frontend  — bundle/lazy-load topology, OnPush/track-by/virtual-scroll as default architecture
└── Background jobs — bounded parallelism (`ParallelAsync` with `maxConcurrent`) + batch (`UpdateManyAsync`) as the shape, not an afterthought
```

Architecture-altitude rules (decide at design time — cheapest to fix here):

- **Bound every result set and project only needed columns/fields in the contract itself** — never design an unbounded read-all or `SELECT *` endpoint; unbounded reads spike memory and latency under real data volume.
- **Design out N+1 at the boundary** — eager-load / batch-fetch is the default access pattern; per-item lookups are a design smell, not a tuning detail.
- **Caching is a design decision, not a patch** — choose request-scope memoization vs bounded shared cache up front, with key dimensions (tenant/user/auth/version), TTL/invalidation, size limits, and privacy constraints specified; never cache to hide an unbounded query.
- **Async I/O is structural** — never design a path that blocks threads with `.Result`; bounded parallelism for fan-out work is part of the design, with a fresh safe scope/context per worker.
- **Make the cost visible** — design slow-operation logging and query logging in from the start so regressions are observable in production.

For database index strategy at design time, see the `database-optimization` skill (composite key order, covering/partial indexes, write-cost analysis). The tactical evidence gate (measure baseline, prove with plan/explain) in the phases below still applies to every recommendation made at this altitude.

---

## Phase 1: Discover Local Context

MANDATORY discovery before findings:

- MUST ATTENTION ALWAYS search local standards: `performance`, `index`, `query`, `pagination`, `projection`, `database`, `profiling`, `contributing`, `style guide`.
- MUST ATTENTION search 3+ similar local query/API patterns before proposing a fix.
- MUST ATTENTION read target code and index/migration/schema files controlling the queried data.
- MUST ATTENTION map callers and frequency using available graph/call-trace/profiler tools; if none exist, use grep/import/call hierarchy.
- MUST ATTENTION identify data shape: tenant/security-review filters, cardinality, expected max rows, selected columns/fields, sort, joins, aggregation/grouping, cache keys.
- NEVER hardcode project names, repository paths, ID formats, DB engines, ORMs, or framework defaults; derive from discovered files.

---

## Phase 2: Baseline Evidence

Prefer runtime proof. If unavailable, label finding `static risk` and include exact command/query needed to verify.

MANDATORY baseline for DB findings:

- ALWAYS capture query source: `file:line` and generated SQL/query/ORM expression when available
- ALWAYS capture volume: input size, rows matched, rows returned, rows examined/scanned, page size/limit
- ALWAYS capture access path: query plan/explain, used index, sort/group strategy, join method when available
- ALWAYS capture timing: p50/p95/p99, elapsed query time, query count, allocation or response size
- ALWAYS capture context: endpoint/job/consumer frequency and worst-case fan-out

Confidence:

| Confidence | Action                                                |
| ---------- | ----------------------------------------------------- |
| 95%+       | Recommend fix freely.                                 |
| 80-94%     | Recommend with caveats and verification command.      |
| 60-79%     | List unknowns first; gather more evidence before fix. |
| <60%       | STOP. Do not recommend.                               |

---

## Phase 3: Serial Dimension Passes

MANDATORY MUST ATTENTION apply one focused pass per dimension. NEVER scan all dimensions at once.

### 1. Query Shape And Data Minimization

**Think:** Which rows/columns load? Are filters, projection, sorting, and limits executed by data source before materialization?

MUST ATTENTION find:

- unbounded list/read-all APIs without page, limit, cursor, or bounded business invariant
- filter after materialization (`ToList`/array/load-all before `Where`/filter)
- projection after materialization; full entity/document loaded for list/summary view
- unused includes/joins/lookup data; large text/blob/json fields in list queries
- client-side sort/group/distinct; offset pagination on very deep pages where cursor/keyset fits better
- missing tenant/auth/status/date filters in hot-path queries

MUST ATTENTION prefer fixes: push predicates to data source, select only needed fields, bound result set, use cursor/keyset for deep sequential access, keep reusable predicates near domain/query-owner layer discovered locally.

### 2. Index And Access Path

**Think:** Can existing indexes satisfy equality/range filters, joins, sort, grouping, and projection in the actual query order?

MUST ATTENTION find:

- no index for high-cardinality filters, joins, foreign keys, sort columns, or frequent group keys
- composite index field order mismatched with equality -> range -> sort access pattern
- index exists but plan ignores it because query wraps field in function/cast, uses incompatible type/collation, leading wildcard, broad `OR`, negative predicate, or low selectivity
- sort spill/filesort because index order does not match filter + order by
- covering/partial/filtered index opportunity for hot narrow query
- index bloat from adding every field without write-cost analysis

MUST ATTENTION prefer fixes: add/adjust smallest useful index, reorder composite keys to match query, rewrite predicate to be sargable, verify with plan/explain before/after, include write-cost risk.

### 3. N+1 And Fan-Out

**Think:** Does work scale with item count instead of request/job count?

MUST ATTENTION find:

- query/API/cache call inside loop, map, serializer, resolver, template/render loop, event handler loop
- per-item existence/count lookup; per-item lazy-loaded relation
- repeated same lookup with different IDs that could be one `IN`/batch/group query
- nested fan-out across services, queues, jobs, or retries
- sequential awaits where independent calls can batch or run bounded parallel with separate safe resources

MUST ATTENTION prefer fixes: batch IDs once, join/include only needed fields, prefetch dictionaries, aggregate counts in one query, use bounded concurrency, preserve ordering/authorization semantics.

### 4. Aggregation, Join, And Pipeline Shape

**Think:** Does the pipeline reduce data before expensive join/unwind/group/sort/window stages?

MUST ATTENTION find:

- join/unwind/group before selective filter
- cartesian joins or duplicate expansion not collapsed
- grouping/sorting without pre-filter or supporting index
- aggregation loads all related rows/documents when only existence/count/min/max needed
- repeated post-processing that database can compute safely

MUST ATTENTION prefer fixes: filter early, project early, aggregate at source, reduce join cardinality, use existence/count queries, repeat necessary post-expansion filters when array/child semantics require it.

### 5. Materialization And Memory

**Think:** What enters memory? Is it bounded, streamed, and tracking-free when read-only?

MUST ATTENTION find:

- large collection materialized before paging/filtering
- read-only queries tracking entities/objects unnecessarily
- blob/file/large JSON fields loaded for lightweight responses
- buffering entire export/report when streaming/chunking fits
- accidental multiple enumeration re-running query

MUST ATTENTION prefer fixes: page/chunk/stream, use no-tracking/read-only mode when local stack supports it, project lightweight DTOs, move filter before load, memoize intentionally.

### 6. Write Path, Locks, And Transactions

**Think:** Does write work batch safely and keep locks/transactions small?

MUST ATTENTION find:

- per-row save/update/delete inside loop
- long transaction wrapping remote calls or heavy reads
- unnecessary unique checks per row instead of bulk validation
- lock escalation/hot-row contention/counter updates without batching
- parallel writes sharing unsafe session/context/unit-of-work

MUST ATTENTION prefer fixes: bulk write, chunk, shorten transaction, move remote calls outside transaction, use idempotent commands, create fresh safe scope/context per parallel worker.

### 7. Cache And Reuse

**Think:** Is repeated expensive work stable, safe to reuse, and invalidated correctly?

MUST ATTENTION find:

- same lookup repeated within request/job
- hot reference data fetched every request
- cache key missing tenant/user/auth/filter/version dimensions
- cache hides unbounded query or stale security-sensitive data

MUST ATTENTION prefer fixes: request-scope memoization first, then bounded shared cache with explicit key, TTL/invalidation, size limits, privacy constraints, and hit/miss metrics.

### 8. API, Distributed, Frontend

**Think:** Is slow work caused by network waterfall, payload size, render churn, or background fan-out?

MUST ATTENTION find:

- endpoint returns more payload than view needs
- sequential remote calls where backend aggregation or batch endpoint fits
- message consumer publishes one message per item without batching/backpressure
- frontend repeated fetch, missing list virtualization, expensive render loop, missing stable keys/track-by
- bundle or asset load dominates interaction

MUST ATTENTION prefer fixes: batch API, reduce payload, add backpressure, virtualize large lists, stabilize render keys, lazy-load cold assets/routes, measure browser/network trace.

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

Before code changes:

- MUST ATTENTION present baseline, proposed change, behavior invariants, risks, verification commands, and rollback path.
- MUST ATTENTION preserve functional behavior, authorization, ordering, pagination semantics, consistency, and idempotency.
- MUST ATTENTION inspect affected tests/specs/docs when behavior, SLA, public contract, or limits change.
- NEVER change query semantics only to improve speed unless user approves changed behavior.
- NEVER add broad indexes/caches without write-cost, storage-cost, invalidation, and privacy analysis.

---

## Sub-Agent Routing

Use specialized help when available:

| Detected focus                                                     | Sub-agent                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| DB/query/N+1/memory/backend hot path                               | `performance-optimizer`                                |
| Auth, PII, tenant isolation, sensitive cache keys                  | `security-auditor` first, then `performance-optimizer` |
| Cross-service architecture, caching policy, capacity/SLO trade-off | architecture/performance specialist                    |
| Frontend render/bundle/network waterfall                           | frontend or performance specialist                     |

Sub-agent prompt MUST include target, detected scope, local context evidence, required dimensions, report path, and "return summary only; write full report incrementally."

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Validate performance findings before optimization work. Performance reports are easy to overstate when evidence is static-only, a plan lacks production-like scale, or a proposed index/cache changes write cost or data freshness risk.

**Trigger:** Any performance finding or optimization recommendation (Critical, High, Medium, Low, WARN, or static risk). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/performance-{date}-{slug}.md` or the exact report path written by the caller.
2. Invoke `$why-review --validate-findings <performance-report-path>`.
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
2. Fix only findings that survived `$why-review --validate-findings`; if this skill is running inside a workflow, route implementation through the parent `$plan` + `$cook` flow.
3. Re-measure or run the verification command named in the finding.
4. Restart the full `$performance-review` review from Phase 0 over the complete current target, not only the fixed files.
5. The restarted pass MUST create brand-new review tasks, re-detect scope, rediscover local context, rerun baseline/graph/profiler checks where applicable, and analyze all dimensions again from the beginning.
6. Repeat validate → fix → full performance re-review until a complete pass has zero findings.
7. If the same validated blocker repeats across 3 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a performance finding before `$why-review --validate-findings` validates it.
- Never mark performance review clean after a targeted before/after check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass.
- Never reuse old todo/task items for the recursive review pass.

---

## Output

MANDATORY final report sections:

- Scope and detected bottleneck type
- Baseline evidence and unknowns
- Findings ordered by severity
- Optimization plan and rejected alternatives
- Verification plan with before/after metrics
- Test/spec/doc impact or explicit skip reason
- Confidence and assumptions

If evidence insufficient, output: `Insufficient evidence. Verified: [...]. Not verified: [...]. Next evidence needed: [...].`

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every shipped performance fix removes a measured (or static-risk-labeled) bottleneck while preserving behavior, authorization, and semantics — proven by before/after evidence, validated via `$why-review` before any fix, and confirmed by a clean full Phase-0 re-review — never a guess-driven change that hides waste or breaks correctness.
**IMPORTANT MANDATORY MUST ATTENTION** stay project-generic: discover local stack, conventions, query APIs, index definitions, metrics, and report paths before judging.
**IMPORTANT MANDATORY MUST ATTENTION** prove every performance claim with measurement or static evidence: `file:line`, query text/shape, row counts, query plan/explain output, trace, profile, or logs.
**IMPORTANT MANDATORY MUST ATTENTION** review database performance one dimension at a time: over-fetching, filters, indexes, N+1 fan-out, batching, aggregation/join shape, materialization, writes, caching.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS measure before/after; static review findings need explicit verification command.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS verify index usability with actual query shape/order and plan/explain; index existence alone is not proof.
**IMPORTANT MANDATORY MUST ATTENTION** ALWAYS push row filters to data source before projection/caching; row-count reduction beats column trimming.
**IMPORTANT MUST ATTENTION** after any validated performance fix, restart the full performance review from Phase 0 before claiming PASS.
**IMPORTANT MUST ATTENTION** add final review task checking doc/test/spec staleness.

**Anti-Rationalization:**

| Evasion                             | Rebuttal                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| "Bottleneck obvious, skip baseline" | No measurement = guess. Capture metric or label static risk.                               |
| "Index exists, so query fine"       | Show plan/explain and access path. Existing unused index proves nothing.                   |
| "Projection enough"                 | First reduce rows. Loading fewer columns from too many rows still wastes work.             |
| "Just cache it"                     | Fix query shape/index/bounds first. Cache can hide stale, unsafe, unbounded work.          |
| "Only one query in code"            | Trace loops, serializers, resolvers, consumers, and retries. Fan-out often hides upstream. |

**[TASK-PLANNING]** Break work into small tracked tasks before starting; update each status immediately.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
