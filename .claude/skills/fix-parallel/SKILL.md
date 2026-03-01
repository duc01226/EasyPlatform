---
name: fix-parallel
version: 1.0.0
description: '[Implementation] Analyze & fix issues with parallel fullstack-developer agents'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Skill Variant:** Variant of `/fix` — parallel multi-issue resolution using subagents.

## Quick Summary

**Goal:** Fix multiple independent issues simultaneously using parallel fullstack-developer subagents.

**Workflow:**
1. **Triage** — Classify issues and verify independence (no shared files)
2. **Assign** — Distribute issues to parallel subagents with strict file ownership
3. **Execute** — Subagents fix issues independently
4. **Merge** — Review and integrate all fixes

**Key Rules:**
- Debug Mindset: every claim needs `file:line` evidence
- Issues MUST be independent (no overlapping file modifications)
- Each subagent owns specific files; no cross-boundary edits

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify the fix addresses the traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

**Ultrathink parallel** to fix: <issues>$ARGUMENTS</issues>

**IMPORTANT:** Activate needed skills. Ensure token efficiency. Sacrifice grammar for concision.

## Workflow

### 1. Issue Analysis

- Use `debugger` subagent to analyze root causes
- Use `/scout-ext` to find related files
- Categorize issues by scope/area (frontend, backend, auth, payments, etc.)
- Identify dependencies between issues
- **External Memory**: Each parallel agent writes findings to `.ai/workspace/analysis/{issue-name}-{agent}.analysis.md`. Main agent re-reads all before coordinating fixes.

### 2. Parallel Fix Planning

- Trigger `/plan-parallel <detailed-fix-instructions>` for parallel-executable fix plan
- Wait for plan with dependency graph, execution strategy, file ownership matrix
- Group independent fixes for parallel execution
- Sequential fixes for dependent issues

### 3. Parallel Fix Implementation

- Read `plan.md` for dependency graph
- Launch multiple `fullstack-developer` agents in PARALLEL for independent fixes
    - Example: "Fix auth + Fix payments + Fix UI" → launch 3 agents simultaneously
    - Pass phase file path: `{plan-dir}/phase-XX-*.md`
    - Include environment info
- Wait for all parallel fixes complete before dependent fixes
- Sequential fixes: launch one agent at a time

### 4. Testing

- Use `tester` subagent for full test suite
- NO fake data/mocks/cheats
- Verify all issues resolved
- If fail: use `debugger`, fix, repeat

### 5. Code Review

- Use `code-reviewer` for all changes
- Verify fixes don't introduce regressions
- If critical issues: fix, retest

### 6. Project Management & Docs

- If approved: use `project-manager` + `docs-manager` in parallel
- Update plan files, docs, roadmap
- If rejected: fix and repeat

### 7. Final Report

- Summary of all fixes from parallel phases
- Verification status per issue
- Ask to commit (use `git-manager` if yes)

**Example:** Fix 1 (auth) + Fix 2 (payments) + Fix 3 (UI) → Launch 3 fullstack-developer agents → Wait → Fix 4 (integration) sequential

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
