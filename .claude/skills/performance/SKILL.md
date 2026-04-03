---
name: performance
version: 1.0.0
description: '[Debugging] Analyze and optimize performance bottlenecks'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

## Quick Summary

**Goal:** Analyze and optimize performance bottlenecks in database queries, API endpoints, or frontend rendering.

**Workflow:**

1. **Profile** — Identify bottlenecks using profiling data or metrics
2. **Analyze** — Trace hot paths and measure impact
3. **Optimize** — Apply targeted optimizations with before/after measurements

**Key Rules:**

- Analysis Mindset: measure before and after, never optimize blindly
- Evidence-based: every claim needs profiling data or benchmarks
- Focus on highest-impact bottlenecks first

<target>$ARGUMENTS</target>

## Analysis Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume a bottleneck location — verify with actual code traces and profiling evidence
- Every performance claim must include `file:line` evidence
- If you cannot prove a bottleneck with a code trace, state "suspected, not confirmed"
- Question assumptions: "Is this really slow?" → trace the actual execution path and query plan
- Challenge completeness: "Are there other bottlenecks?" → check the full request pipeline
- No "should improve performance" without proof — measure before and after

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with profiling data + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

Activate `arch-performance-optimization` skill and follow its workflow.

**CRITICAL:** Present findings and optimization plan. Wait for explicit user approval before making changes.

> **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding. Pattern: Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details. Use `connections` for 1-hop, `callers_of`/`tests_for` for specific queries, `batch-query` for multiple files.
> MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.
> Run `python .claude/scripts/code_graph query callers_of <function> --json` on hot functions to understand call frequency.

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Identify hot paths calling bottleneck:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See `.claude/skills/shared/graph-intelligence-queries.md` for full query reference.

### Graph-Trace for Hot Path Analysis

When graph DB is available, use `trace` to map execution paths for performance analysis:

- `python .claude/scripts/code_graph trace <bottleneck-file> --direction both --json` — full call chain: what triggers this code + what it triggers downstream
- `python .claude/scripts/code_graph trace <bottleneck-file> --direction downstream --json` — downstream cascade (N+1 queries, excessive event handlers)
- Cross-service MESSAGE_BUS edges reveal distributed performance bottlenecks

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — performance → sre-review → test
> 2. **Execute `/performance` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/sre-review (Recommended)"** — Production readiness review after optimization
- **"/changelog"** — Document performance changes
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` before starting
