---
name: performance
version: 1.0.0
description: '[Debugging] Analyze and optimize performance bottlenecks'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

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

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT assume a bottleneck location — verify with actual code traces and profiling evidence
- Every performance claim must include `file:line` evidence
- If you cannot prove a bottleneck with a code trace, state "suspected, not confirmed"
- Question assumptions: "Is this really slow?" → trace the actual execution path and query plan
- Challenge completeness: "Are there other bottlenecks?" → check the full request pipeline
- No "should improve performance" without proof — measure before and after

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MUST** declare `Confidence: X%` with profiling data + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

Activate `arch-performance-optimization` skill and follow its workflow.

**CRITICAL:** Present findings and optimization plan. Wait for explicit user approval before making changes.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
