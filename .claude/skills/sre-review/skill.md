---
name: sre-review
version: 1.0.0
description: '[Code Quality] Production readiness review for service-layer and API changes'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Double Round-Trip Review** — Every review executes TWO full rounds: Round 1 builds understanding (normal review), Round 2 leverages accumulated context to catch what Round 1 missed. Round 2 is MANDATORY — never skip, never combine into single pass.
> MUST READ `.claude/skills/shared/double-round-trip-review-protocol.md` for full protocol and checklists.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Assess production readiness of service-layer and API changes by scoring observability, reliability, and operational preparedness.

**When to use:** After implementing backend service or API changes, before committing.

**Scope:** Service-layer and API changes only — frontend-only changes exempt.

**Why this exists:** Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.

> **Deployment Context:** Read `docs/project-config.json` → `infrastructure` section for deployment platform:
>
> - `containerization` — e.g., "docker" → check Dockerfiles, docker-compose
> - `orchestration` — e.g., "kubernetes" → check K8s manifests, Helm charts
> - `cicd.tool` — e.g., "azure-devops" → check pipeline configs

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT accept operational readiness at face value — verify by reading actual implementations
- Every score must include `file:line` evidence (grep results, read confirmations)
- If you cannot prove a score with a code trace, score it 0
- Question assumptions: "Is this really handled?" → trace the error/retry/timeout path to confirm
- Challenge completeness: "Are all failure modes covered?" → check what happens when dependencies fail
- Verify observability: "Can we actually debug this in production?" → check logging, correlation, metrics
- No "looks fine" without proof — state what you verified and how

## Scope Resolution

1. If arguments specify files/directories → review those
2. Else review uncommitted changes (`git diff --name-only`)
3. Focus on: `*.cs` files in `src/Services/`, API controllers, service classes
4. Skip: frontend files, test files, documentation, configuration-only changes

## Production Readiness Checklist

Review the changed files and score each criterion 0-2:

- **0** = Not addressed
- **1** = Partially addressed
- **2** = Fully addressed

### Observability (max 8 points)

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Structured Logging** | External API calls and critical operations log errors with context (request ID, user, parameters)             |
| 2   | **Error Context**      | Exceptions include enough context to diagnose without reproducing (entity IDs, operation type, input summary) |
| 3   | **Metrics Awareness**  | Operations >100ms consider tracking duration. New endpoints consider latency monitoring                       |
| 4   | **Correlation**        | Cross-service calls include or propagate correlation IDs for distributed tracing                              |

### Reliability (max 8 points)

| #   | Criterion                 | What to Check                                                                                                 |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5   | **Retry Strategy**        | Transient failures (HTTP, DB timeouts) have retry logic or documented reason for not retrying                 |
| 6   | **Timeout Configuration** | HTTP clients and external calls have explicit timeout (not relying on defaults)                               |
| 7   | **Error Handling**        | Errors handled gracefully — no swallowed exceptions, no generic catch-all without logging                     |
| 8   | **Fallback Behavior**     | Critical paths define what happens when dependencies fail (degraded mode, cached response, user-facing error) |

### Data Integrity (max 4 points)

| #   | Criterion              | What to Check                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 9   | **Seed vs Migration**  | Seed data (default records, system config) lives in startup data seeders, NOT in one-time migration executors |
| 10  | **Seeder Idempotency** | Data seeders use check-then-create pattern (query before insert) — safe for repeated runs on any environment  |

**Decision test for reviewers:** _"If the database is reset, does this data still need to exist?"_ Yes → must be in a seeder. No → migration is acceptable.

### Database Performance (max 4 points)

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

| #   | Criterion            | What to Check                                                                                                          |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 11  | **Pagination**       | List/collection queries use pagination (Skip/Take, cursor). No unbounded GetAll/ToList loading all records into memory |
| 12  | **Database Indexes** | Query filter fields, foreign keys, and sort columns have matching database indexes. Migrations include index creation  |

## Scoring

| Score | Verdict        | Recommendation                                                                            |
| ----- | -------------- | ----------------------------------------------------------------------------------------- |
| 15-20 | **PASS**       | Production-ready. Proceed to commit.                                                      |
| 10-14 | **NEEDS WORK** | Address gaps before deploying to production. OK for dev/staging.                          |
| 0-9   | **NOT READY**  | Significant operational gaps. Review Operational Readiness rules in code-review-rules.md. |

> **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding. Pattern: Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details. Use `connections` for 1-hop, `callers_of`/`tests_for` for specific queries, `batch-query` for multiple files.
> MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.
> Run `python .claude/scripts/code_graph connections <file> --json` on service boundary files for cross-service impact.

## Structural Impact Analysis (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, include structural impact in production readiness assessment:

- Run: `python .claude/scripts/code_graph graph-blast-radius --json`
- High blast radius (>20 impacted nodes) --> flag as high-risk deployment
- Check if changed functions have test coverage via `python .claude/scripts/code_graph query tests_for <function_name> --json`

### Graph-Trace for Production Flow

When graph DB is available, use `trace` to verify production readiness:

- `python .claude/scripts/code_graph trace <service-file> --direction downstream --json` — verify all downstream dependencies are accounted for (event handlers, bus consumers, cross-service calls)
- `python .claude/scripts/code_graph trace <service-file> --direction both --json` — full flow: entry points + downstream cascade
- Flag any cross-service MESSAGE_BUS consumer that lacks error handling or monitoring

## Round 2: Focused Re-Review (MANDATORY)

> **Protocol:** `.claude/skills/shared/double-round-trip-review-protocol.md`

After completing Round 1 scoring, execute a **second full review round**:

1. **Re-read** the Round 1 score and findings
2. **Re-evaluate** ALL scoring criteria — do NOT rely on Round 1 memory
3. **Focus on** what Round 1 typically misses:
    - Operational concerns that span multiple services
    - Subtle reliability gaps (retry logic, circuit breakers, timeout handling)
    - Missing observability (structured logging, correlation IDs, metrics)
    - Data integrity edge cases under concurrent load
4. **Re-score** all criteria — verify Round 1 scoring accuracy
5. **Update report** with `## Round 2 Findings` section
6. **Final score** must incorporate findings from BOTH rounds

## Output Format

```markdown
## SRE Review Results

**Scope:** {files reviewed}
**Date:** {date}
**Score:** {X}/16
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

### Gaps to Address

- {specific actionable item}

### Recommendation

{Proceed / Address gaps first}
```

## Important Notes

- Advisory only — provides awareness, does not block commits
- Evidence-based — cite specific file:line for each score
- Proportional — small bug fixes need less rigor than new endpoints
- Check for project framework patterns (background job handlers, base controller error handling)

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `feature` workflow** (Recommended) — scout → investigate → plan → cook → review → sre-review → test → docs
> 2. **Execute `/sre-review` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/watzup (Recommended)"** — Wrap up and check for doc staleness
- **"/test"** — Run tests before wrapping up
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/double-round-trip-review-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` before starting
