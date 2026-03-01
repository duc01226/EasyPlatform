---
name: performance
version: 1.0.0
description: '[Debugging] Analyze and optimize performance bottlenecks'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

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

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with profiling data + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

Activate `arch-performance-optimization` skill and follow its workflow.

**CRITICAL:** Present findings and optimization plan. Wait for explicit user approval before making changes.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — performance → sre-review → test
> 2. **Execute `/performance` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/sre-review (Recommended)"** — Production readiness review after optimization
- **"/changelog"** — Document performance changes
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
