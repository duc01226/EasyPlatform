---
name: production-readiness-review
version: 1.6.0
description: '[Code Quality] Use when a workflow step or the user asks for service/API readiness: observability, reliability, data integrity and database performance.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Ensure service/API changes are production-ready across observability, reliability, data integrity, and database performance: score each dimension with evidence and expose operational gaps.

**Summary:**

- **Ordered route:** (1) Resolve scope → (2) Score 12 criteria → (3) Check 8 SRE gates → (4) Map score + gates to verdict → (5) Analyze structural impact → (6) Validate findings, fix current-round blockers, and fully re-review → (7) Emit the evidence-backed SRE report.
- The `/24` rating is advisory: Observability/8, Reliability/8, Data Integrity/4, DB Performance/4; strong 19–24, needs work 13–18, low 0–12. Unproven criteria score `0`. Failed or unresolved binary gates block PASS regardless of score or owner risk acceptance.
- Paging/index proof and findings validation are mandatory regardless of change size. After fixes, restart the full review with fresh zero-memory reviewers. Round 1 closes all validated findings; Round 2 closes CRITICAL/HIGH/MEDIUM and defers LOW. Stop at the current round's exit bar once persisted `minRounds` is met; never cycle for Round-2 LOW-only findings. Batched reviews (when grouped) re-score all criteria from combined evidence, never average batch scores.
- **`--report-only`:** run steps 1–5 and 7 plus findings validation; the caller owns fixes/re-review. No fixes, restart, nested agents, user questions or writes beyond the report. Return score, gate verdict and severity-grouped findings; read [Report-Only Mode](#report-only-mode---report-only).

**Workflow:**

1. Resolve scope from arguments or uncommitted changes; review only backend service/API files.
2. Score all 12 criteria across the four dimensions, then run the 8-item Extended SRE Readiness gate.
3. Map score plus gate to a verdict; run Structural Impact Analysis (grep/read; optional graph hint).
4. Validate every finding, fix only validated findings that block the current round, and restart a full fresh review after fixes until the exit bar is clear; Round 2 LOW-only findings are deferred without another cycle. Under `--report-only`, validate only — the caller owns fixes and re-review.
5. Emit the SRE Review Results report with `file:line` evidence for every score and gate item.

**Key Rules:**

- **MUST ATTENTION** give every score and gate item `file:line` evidence; an unprovable score is `0`.
- **NEVER** skip the DB Performance Protocol, validated-finding gate, or full re-review. Under `--report-only` the full re-review belongs to the caller that applies the fixes; the other three still run here.
- **MUST ATTENTION** re-score all 12 criteria holistically when batching; never average per-batch scores.
- **NEVER** let advisory technique or scenario matrices change the `/24` score, gate result, or verdict.

**When to use:** After implementing backend service or API changes, before committing. Frontend-only changes exempt.

**Why:** Working code that can't be debugged, monitored, or rolled back is technical debt in disguise.

**Deployment context:** Read `docs/project-config.json` → `infrastructure` when deciding which deployment evidence and gate items apply:

- `containerization` → check Dockerfiles, docker-compose
- `orchestration` → check K8s manifests, Helm charts
- `cicd.tool` → check pipeline configs

## Contents

- [Quick Summary](#quick-summary)
- [Your Mission](#your-mission)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [Review Mindset (NON-NEGOTIABLE)](#review-mindset-non-negotiable)
- [Scope Resolution](#scope-resolution)
- [Production Readiness Scoring](#production-readiness-scoring)
- [Extended SRE Readiness Gate (step-by-step, pass/fail — gating, NOT scored)](#extended-sre-readiness-gate-step-by-step-passfail--gating-not-scored)
- [Technique Applicability (advisory — NON-SCORING, NON-GATING)](#technique-applicability-advisory--non-scoring-non-gating)
- [Scoring](#scoring)
- [Structural Impact Analysis (grep/read; optional graph hint)](#structural-impact-analysis-grepread-optional-graph-hint)
- [Why-Review Findings Validation Gate (MANDATORY when findings exist)](#why-review-findings-validation-gate-mandatory-when-findings-exist)
- [Validated Fix + Full Re-Review (MANDATORY when fixes are applied)](#validated-fix--full-re-review-mandatory-when-fixes-are-applied)
- [Output Format](#output-format)
- [Important Notes](#important-notes)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Your Mission

<task>
$ARGUMENTS
</task>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow parallel review barrier or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope; review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run main steps 1–5 and 7 plus the Why-Review Findings Validation Gate.** Scope, the 12-criterion score, the Extended SRE Readiness gate, verdict mapping, the DB Performance Protocol, and the Structural Impact Analysis all run; `/why-review --validate-findings` still validates every finding. **Step 6 does not run:** no fix, no restart, no fresh re-review sub-agent. Return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **Scope.** Apply Scope Resolution to the brief's files or diff. No backend service/API file in scope → return `N/A — no service/API files in scope` with the file list as evidence.
> 3. **No nested fan-out.** Skip `SYNC:systematic-review-batching`; score the whole scope serially in this context (the holistic-scoring fallback above).
> 4. **Map every gap to a severity by consequence** (`SYNC:severity-rubric`): a criterion scored `0` → CRITICAL or HIGH, `1` → MEDIUM, LOW only for a polish-only gap with evidence of no material impact; emit score, consequence, and tier together. A `fail` gate item is a failed binary gate carried as a CRITICAL blocker with its named consequence; a `partial` item is an open evidence blocker, never LOW.
> 5. **Return** the advisory `/24` score, the `{n}/8` gate result and the verdict (PASS only when no failed or unresolved binary gate and no finding blocking the current round remains), in addition to the caller-mode return contract. The Next Steps prompt does not run.
>
> For this mode the declared step order ends at step 7 without step 6; stopping there is the mode's contract, not a skipped step.

## Review Mindset (NON-NEGOTIABLE)

Verify readiness from implementations with `file:line` proof and >80% confidence. Trace error, retry and timeout paths; test assumptions about dependency failures, logging context, correlation and metrics. Unprovable scores are `0`.

## Scope Resolution

1. Arguments specify files/directories → review those
2. Else → review uncommitted changes (`git diff --name-only`)
3. Focus: backend source files under service root (per the project's structure reference / `docs/project-config.json`), API controllers, service classes
4. Skip: frontend files, test files, documentation, config-only changes

## Production Readiness Scoring

Score each criterion 0-2: **0** = not addressed, **1** = partially, **2** = fully.

> **MANDATORY when grouped under the adaptive review plan:** re-score all 12 criteria holistically from combined cross-batch evidence; never merge or average batch scores. Batch agents surface criterion evidence; the reducer assigns scores. A query and its index migration may be in different batches, so isolated scores can falsely report `0`. If holistic scoring is infeasible, review the whole scope serially.

### Observability (max 8)

> **Think:** If this service errors at 3am, can on-call engineer diagnose root cause from logs alone — without reproducing?

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Structured Logging** | External API calls and critical operations log errors with context (request ID, user, parameters)             |
| 2   | **Error Context**      | Exceptions include enough context to diagnose without reproducing (entity IDs, operation type, input summary) |
| 3   | **Metrics Awareness**  | Operations >100ms consider tracking duration. New endpoints consider latency monitoring                       |
| 4   | **Correlation**        | Cross-service calls include or propagate correlation IDs for distributed tracing                              |

### Reliability (max 8)

> **Think:** If the downstream dependency is down or slow, does this service degrade gracefully or cascade-fail?

| #   | Criterion                 | What to Check                                                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| 5   | **Retry Strategy**        | Transient failures (HTTP, DB timeouts) have retry logic or documented reason for not retrying             |
| 6   | **Timeout Configuration** | HTTP clients and external calls have explicit timeout (not relying on defaults)                           |
| 7   | **Error Handling**        | Errors handled gracefully — no swallowed exceptions, no generic catch-all without logging                 |
| 8   | **Fallback Behavior**     | Critical paths define behavior when dependencies fail (degraded mode, cached response, user-facing error) |

### Data Integrity (max 4)

> **Think:** If database wiped and reseeded from scratch, does system still reach a valid state?

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 9   | **Seed vs Migration**  | Seed data (default records, system config) lives in startup data seeders, NOT in one-time migration executors |
| 10  | **Seeder Idempotency** | Data seeders use check-then-create pattern (query before insert) — safe for repeated runs on any environment  |

**Decision test:** _"If the database is reset, does this data still need to exist?"_ Yes → must be in seeder. No → migration acceptable.

### Database Performance (max 4)

> **Think:** At 10x current data volume, do these queries still complete in <1s?

> **Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

| #   | Criterion            | What to Check                                                                                                          |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 11  | **Pagination**       | List/collection queries use pagination (Skip/Take, cursor). No unbounded GetAll/ToList loading all records into memory |
| 12  | **Database Indexes** | Query filter fields, foreign keys, and sort columns have matching database indexes. Migrations include index creation  |

> **Spec-Loop Discipline for changed core logic (MANDATORY — gates the verdict, not a scored criterion):**
>
> 1. **Mutation bar, not coverage %** — for changed service/API core logic the bar is the **MUTATION-SCORE gate**: a surviving mutant on a changed line is a release blocker (it proves an invariant the tests do not assert), NEVER a line-coverage-% question. A green coverage number over un-asserted behavior does not clear this gate.
> 2. **Dual feedback** — every production-readiness finding that changes behavior feeds BOTH the spec (NAME the contract/invariant in Section 8) AND a guarding test; a code-only fix is INCOMPLETE. A surviving mutant → add the killing test AND record the invariant it protects in the spec.

## Extended SRE Readiness Gate (step-by-step, pass/fail — gating, NOT scored)

> **Runs as main step 3, after scoring, before verdict mapping.** Deploy-time and operate-time SRE aspects the 12-criteria `/24` model does NOT score. Check each item **step by step**; record `pass` / `partial` / `fail` with `file:line` evidence or explicit `N/A — reason`. Gate does **not** change `/24` math — it overlays it: **a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance; `partial` is unresolved, not a pass**. Separately apply the canonical review predicate: round 1 blocks every validated severity; round 2 blocks CRITICAL/HIGH/MEDIUM and defers LOW. Owner risk acceptance is recorded but does not clear a failed gate or an open blocking finding. Read deployment context from `docs/project-config.json → infrastructure` (referenced above) to decide which items are `N/A` (e.g. no orchestration → readiness/liveness probes `N/A` with stated reason).

| # | Gate Item | What to Check | Status | Evidence |
| - | --------- | ------------- | ------ | -------- |
| G1 | **Rollout & Rollback** | Deploy is staged/canary-able; a documented, fast rollback path exists (feature flag, versioned + reversible migration). No irreversible one-way change without a stated recovery plan. | pass/partial/fail | `file:line` or `N/A — reason` |
| G2 | **Health Checks** | Readiness + liveness endpoints/probes exist and reflect real dependency health (not an always-200 stub). | pass/partial/fail | ... |
| G3 | **Alerting & Runbook** | New failure modes have an actionable alert (signal, not noise) and a runbook / escalation note. | pass/partial/fail | ... |
| G4 | **SLO / Error-Budget** | Change respects an SLO or names the latency/availability target it affects; no silent new failure mode against the budget. | pass/partial/fail | ... |
| G5 | **Capacity & Resource Limits** | Load ceilings, resource limits, autoscaling/back-pressure considered; no unbounded fan-out or unbounded in-memory growth. | pass/partial/fail | ... |
| G6 | **Config & Secrets** | Required config present in all envs and fails fast if missing; no secrets committed in the diff. | pass/partial/fail | ... |
| G7 | **Graceful Shutdown/Startup** | In-flight work drains on shutdown; startup waits for / degrades gracefully on unready dependencies. | pass/partial/fail | ... |
| G8 | **Concurrency & Idempotency** | Operations are safe under retry / at-least-once delivery; no race on shared state; idempotency keys where needed. | pass/partial/fail | ... |

**Gate verdict:** `{n}/8 pass`, with each non-applicable item justified separately. Any failed or unresolved binary gate, unresolved evidence, or finding blocking the current round ⇒ overall verdict cannot be PASS even at a 19-24 score. Use `review-policy.cjs` with the persisted round/minimum; never relabel a binary failure as LOW.

**AI surface?** Only if the change creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and route depth to `/ai-engineering-review` (not a gate item; `{n}/8` unchanged); otherwise skip this line.

## Technique Applicability (advisory — NON-SCORING, NON-GATING)

Invoke `SYNC:scale-technique-gate`: derive the system's scale tier from evidence (users/RPS, SLO, data volume, tenancy, topology — cite `file:line`/config/infra + confidence), then emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) across the 10 concern groups. Surface warranted-but-missing reliability/scale techniques (rate limiting, backups, DR, failover, graceful degradation) as **advice**; flag `OVER-ENGINEERED` techniques the tier does not warrant.

> **Advisory only — this matrix does NOT add a gate item, does NOT change the `{n}/8` gate result, the `/24` score, or the verdict.** A `MISSING-WARRANTED` technique is guidance to consider at this tier, NOT a gate `fail`. `N/A-by-scale` for small systems is expected, never a failure. Full catalog → `.claude/docs/scale-technique-catalog.md`.

## Scoring

| Score | Advisory rating | Recommendation |
| ----- | --------------- | -------------- |
| 19-24 | Strong readiness | Candidate for PASS only after all binary gates, evidence, current-round severity bar and persisted minimum clear. No Git authority is granted. |
| 13-18 | Needs work | Address evidenced gaps; the score alone neither authorizes deployment nor invents a blocking finding. |
| 0-12 | Low readiness | Investigate operational gaps against the applicable criteria and evidence. |

**Overall PASS/FAIL is separate from the advisory score:** PASS requires the canonical `review-policy.cjs` round predicate, all binary gates and evidence resolved, and persisted `minRounds` met; otherwise FAIL. Keep deferred LOW findings visible after round 1.

> Optional: `python .claude/scripts/code_graph connections <file> --json` on service boundary files can hint at cross-service impact (verify by reading).

## Structural Impact Analysis (grep/read; optional graph hint)

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.

- `python .claude/scripts/code_graph graph-blast-radius --json` → blast radius >20 nodes is a rough high-risk deployment hint (confirm by reading)
- `python .claude/scripts/code_graph query tests_for <function_name> --json` → verify test coverage on changed functions
- `python .claude/scripts/code_graph trace <service-file> --direction downstream --json` → hint at downstream event handlers, bus consumers, cross-service calls to check for error handling (verify by reading)

## Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE any fix. Catches over-flagged criteria, false positives, and severity/score inflation at the source rather than letting them drive fixes or ship downstream.

**Trigger:** Any finding produced (any severity). Skip ONLY when the verdict is unconditional PASS with literally zero findings. Also skip when called with `--loop-owner=caller`: the caller validates the merged report once (`/start-workflow` → Workflow-step mode).

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review --validate-findings tmp/reports/{skill}-{date}-{slug}.md` — verify each finding has `file:line` proof, steel-man each rejected interpretation, and stress-test every severity/score classification (each finding must clear why-review's finding-survival bar to be kept)
3. Read the CLEAN / HAS-ISSUES verdict returned by why-review
4. **If why-review demotes/removes any finding:** UPDATE own report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** append a `## Why-Review Validation` line stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):** unconditional PASS with zero findings; why-review is itself the active context (avoid recursion); called with `--loop-owner=caller` (the caller validates the merged report once).

**Why this exists:** SRE sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. Validate findings BEFORE the fix so no fix is ever driven by an inflated or false finding; this gate feeds the "Validated Fix + Full Re-Review" loop below.

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

> Not run under `--report-only` — the validated report is returned to the caller, which owns fixes and any re-review.

When a review pass finds issues, validate findings before any fix. Do NOT spawn a fresh sub-agent only to re-review the same finding set before validation/fix. After validated SRE fixes applied, rerun the full SRE review. If that restarted review uses a sub-agent, spawn it with ZERO prior-round memory. A clean review pass ENDS the review once the persisted `minRounds` is met.

**When a fresh sub-agent is part of the restarted review, spawn via canonical template in `SYNC:review-protocol-injection`:**

1. `subagent_type`: `code-reviewer`
2. Task: `"SRE production readiness review after validated fixes — score all 12 criteria (0-2) for {files reviewed in the current full scope}"`
3. Review mode: `"Fresh full re-review after validated fixes. Zero memory of prior rounds. Re-read ALL target files from scratch."`
4. Reference Docs: `code-review-rules.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
5. Target Files: same files from Scope Resolution
6. Integrate sub-agent report findings — DO NOT filter or override

**Fresh re-review focus** (what prior rounds typically miss):

- Operational concerns spanning multiple services
- Subtle reliability gaps (retry, circuit breakers, timeout handling)
- Missing observability (structured logging, correlation IDs, metrics)
- Data-integrity edge cases under concurrent load

**Final verdict = every review pass that actually ran, combined.**

## Output Format

```markdown
## SRE Review Results

**Scope:** {files reviewed}
**Date:** {date}
**Score:** {X}/24
**Verdict:** PASS / NEEDS WORK / NOT READY

### Observability ({X}/8)

| #   | Criterion          | Score | Evidence                   |
| --- | ------------------ | ----- | -------------------------- |
| 1   | Structured Logging | 0/1/2 | {file:line or "not found"} |
| 2   | Error Context      | 0/1/2 | ...                        |
| 3   | Metrics Awareness  | 0/1/2 | ...                        |
| 4   | Correlation        | 0/1/2 | ...                        |

### Reliability ({X}/8)

| #   | Criterion         | Score | Evidence |
| --- | ----------------- | ----- | -------- |
| 5   | Retry Strategy    | 0/1/2 | ...      |
| 6   | Timeout Config    | 0/1/2 | ...      |
| 7   | Error Handling    | 0/1/2 | ...      |
| 8   | Fallback Behavior | 0/1/2 | ...      |

### Data Integrity ({X}/4)

| #   | Criterion          | Score | Evidence |
| --- | ------------------ | ----- | -------- |
| 9   | Seed vs Migration  | 0/1/2 | ...      |
| 10  | Seeder Idempotency | 0/1/2 | ...      |

### Database Performance ({X}/4)

| #   | Criterion        | Score | Evidence |
| --- | ---------------- | ----- | -------- |
| 11  | Pagination       | 0/1/2 | ...      |
| 12  | Database Indexes | 0/1/2 | ...      |

### Extended SRE Readiness ({n}/8 gate — pass/fail, does not change /24)

| #  | Gate Item                | Status            | Evidence          |
| -- | ------------------------ | ----------------- | ----------------- |
| G1 | Rollout & Rollback       | pass/partial/fail | `file:line` / N/A |
| G2 | Health Checks            | pass/partial/fail | ...               |
| G3 | Alerting & Runbook       | pass/partial/fail | ...               |
| G4 | SLO / Error-Budget       | pass/partial/fail | ...               |
| G5 | Capacity & Resource Limits | pass/partial/fail | ...             |
| G6 | Config & Secrets         | pass/partial/fail | ...               |
| G7 | Graceful Shutdown/Startup | pass/partial/fail | ...              |
| G8 | Concurrency & Idempotency | pass/partial/fail | ...              |

_Any failed or unresolved binary gate above blocks PASS regardless of score or owner risk acceptance; open current-round blocking findings also prevent PASS._

### Gaps to Address

- {specific actionable item}

### Recommendation

{Proceed / Address gaps first}
```

## Important Notes

- The rating/verdict informs the team and does not block commits; mandatory review processes, DB proof and binary gates retain their authority.
- Interpret verdicts proportionally to the change; small fixes never waive mandatory steps.
- Check applicable framework patterns, including background-job handlers and base-controller error handling.

---

## Next Steps

**Optional performance-test handoff:** when readiness evidence lacks repeatable workload, large-data, query or memory checks, hint at `/performance-test --mode=write <scope>`. Read [the handoff contract](../performance-test/SKILL.md#optional-handoff-from-system-reviews) when offering it. An interactive owner may ask whether to write tests; an affirmative authorizes authoring plus static review only. Report-only/caller-owned/sub-agent runs return the suggestion without asking or starting work. Never auto-init, auto-write or auto-run tests from the readiness review. This optional offer does not change the score/verdict and does not require a routine question.

**MANDATORY** after a standalone run, use `ask user question tool`. Skip it when a parent workflow or skill invoked this review, when it runs as a sub-agent, or under `--report-only` — return the report path, score, gate verdict, and findings to the caller instead:

- **"/watzup (Recommended)"** — wrap up + check doc staleness
- **"/test"** — run tests before wrapping up
- **"Skip, continue manually"** — user decides

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `/architecture --mode=full` (or `/start-workflow workflow-architecture-audit`) — fans out this skill, `architecture --mode=review`, `architecture --mode=scalability` as parallel sub-agents and synthesizes one consolidated report.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

- `domain-entities-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify code AND documentation.

> **External Memory:** Complex/lengthy work → write intermediate findings + final results to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `systematic-review-batching` — Triage all files and plan adaptive review with complete coverage and no fixed size caps; choosing review assignments or handling working-set overflow → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->



<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality/repo/runtime profile; unknowns take lower tiers. Judge all 7 outcomes: **F1** reproducible build/run/test · **F2** exercise supported/required modes; dual modes only when warranted · **F3** applicable local/CI/production-shaped test portability · **F4** test-strength proof; no universal mutation tool · **F5** measured performance at warranted scale/risk · **F6** build/change scalability at meaningful module boundaries · **F7** stack/profile-fit mechanical checks. Evidence-backed `N/A-by-profile` is valid; prevent over-engineering. Creation blocks warranted omissions; brownfield advises without score changes, with smallest next steps. Catalog: `.claude/docs/engineering-foundation-catalog.md`; update first, re-run `inject_engineering_foundation_gate.py`.

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure service/API changes are production-ready across observability, reliability, data integrity, and database performance: score each dimension with evidence and expose operational gaps.

**IMPORTANT MUST ATTENTION Main steps:** (1) Resolve backend/API scope → (2) Score 12 criteria `/24` → (3) Check 8 binary SRE gates → (4) Map score + gates to verdict → (5) Trace structural impact → (6) Validate findings, fix current-round blockers and fully re-review → (7) Emit the SRE report. `--report-only` runs 1–5 and 7 plus validation; the caller owns step 6.

- Create small tracked tasks before work, including child-skill phases; keep one `in_progress` and complete it after evidence. Persist complex reviews incrementally to `tmp/reports/`; sub-agents return a summary and report path.
- Read applicable project docs first: `code-review-rules.md`, `backend-patterns-reference.md`, `domain-entities-reference.md`, and always `lessons.md`; cite `Reference docs read: ...`. Grep 3+ relevant patterns (base handlers/controllers, paging/index helpers) and verify their fit before scoring.
- Every score, finding and recommendation needs `file:line` proof and confidence (>80% to act; verify below 80%). Unproven scores are `0`. Trace downstream effects; the optional graph is a stale-able hint verified by grep/read.
- Prove pagination for ALL list queries and matching indexes for ALL filter fields, foreign keys and sort columns. Changed core logic clears the MUTATION-SCORE gate; behavior-changing findings feed BOTH the spec's §8 invariant/contract and a guarding test.
- Validate findings BEFORE fixes; after fixes restart the FULL review with fresh zero-memory reviewers and all 11 protocol bodies embedded verbatim. Integrate every pass without filtering findings. Round 1 closes all open findings; Round 2 closes CRITICAL/HIGH/MEDIUM and defers LOW. Stop when the round bar and persisted `minRounds` clear; failed binary gates always block.
- When batching (when grouped), re-score all 12 criteria from combined evidence, never average. Tag delegation PAR/SEQ, dispatch disjoint writers together and wait for every return before advancing. Under `--report-only`, score serially without fan-out.
- Technique/scenario advice never changes `/24`, `{n}/8`, or the verdict. The score is advisory; mandatory DB proof, findings validation, re-review and binary gates are not waived by change size or owner risk acceptance.
- Ask the standalone Next Steps question; parent-invoked, sub-agent and `--report-only` runs return score, gate verdict, severity-grouped findings and report path to the caller. Report-only writes only that report and never fixes, restarts or asks.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "Fix was small, skip re-review"               | NEVER — fixes changed the target; validate findings, then rerun the FULL review before PASS  |
| "No explicit paging but it looks fine"        | Score 0 until proven with `file:line`. Assume worst without evidence                         |
| "Already checked observability"               | Show `file:line` proof. No proof = no check                                                  |
| "The score is advisory so skip MANDATORY steps" | Only the rating is advisory. Overall PASS/FAIL, binary gates and validated-fix re-review remain mandatory |
| "Score it from what I remember of the code"   | Re-read and cite `file:line`; inference is not evidence — unprovable = 0                      |
| "Batched, so average the per-batch scores"    | Re-score all 12 holistically from combined evidence; each batch sees only its own files and false-flags |
| "Tests pass, mutation gate is covered"        | Green coverage over un-asserted behavior fails the gate; a surviving mutant is a blocker     |


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
