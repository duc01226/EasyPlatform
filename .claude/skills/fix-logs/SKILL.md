---
name: fix-logs
version: 1.0.0
description: '[Implementation] Analyze logs and fix issues'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Skill Variant:** Variant of `/fix` — log-based troubleshooting and error analysis.

## Quick Summary

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Workflow:**
1. **Collect** — Gather relevant log output (error messages, stack traces, timestamps)
2. **Trace** — Map log entries to source code locations
3. **Fix** — Apply fix based on traced execution path

**Key Rules:**
- Debug Mindset: every claim needs `file:line` evidence
- Focus on log patterns: stack traces, error codes, timing anomalies
- Cross-reference logs with source code to find actual root cause

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

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

## Mission

<issue>$ARGUMENTS</issue>

## Workflow

1. Check if `./logs.txt` exists:
    - If missing, set up permanent log piping in project's script config (`package.json`, `Makefile`, `pyproject.toml`, etc.):
        - **Bash/Unix**: append `2>&1 | tee logs.txt`
        - **PowerShell**: append `*>&1 | Tee-Object logs.txt`
    - Run the command to generate logs
2. Use `debugger` subagent to analyze `./logs.txt` and find root causes:
    - Use `Grep` with `head_limit: 30` to read only last 30 lines (avoid loading entire file)
    - If insufficient context, increase `head_limit` as needed
    - **External Memory**: Write log analysis to `.ai/workspace/analysis/{issue-name}.analysis.md`. Re-read before fixing.
3. Use `scout` subagent to analyze the codebase and find the exact location of the issues, then report back to main agent.
4. Use `planner` subagent to create an implementation plan based on the reports, then report back to main agent.
5. Start implementing the fix based the reports and solutions.
6. Use `tester` agent to test the fix and make sure it works, then report back to main agent.
7. Use `code-reviewer` subagent to quickly review the code changes and make sure it meets requirements, then report back to main agent.
8. If there are issues or failed tests, repeat from step 3.
9. After finishing, respond back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
