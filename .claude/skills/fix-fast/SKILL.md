---
name: fix-fast
version: 1.0.0
description: '[Implementation] Analyze and fix small issues [FAST]'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Skill Variant:** Variant of `/fix` — quick fixes with minimal investigation.

## Quick Summary

**Goal:** Rapidly fix small, well-understood issues with minimal investigation overhead.

**Workflow:**
1. **Identify** — Quick root cause analysis from error message
2. **Fix** — Apply targeted fix directly
3. **Verify** — Run affected tests to confirm

**Key Rules:**
- Debug Mindset: every claim needs `file:line` evidence
- Use for simple, isolated bugs only — escalate to `/fix-hard` for complex issues
- Minimize investigation time; if root cause isn't clear within minutes, escalate

Analyze the skills catalog and activate the skills that are needed for the task during the process.

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

**Think hard** to analyze and fix these issues:
<issues>$ARGUMENTS</issues>

## Workflow

1. If the user provides a screenshots or videos, use `ai-multimodal` skill to describe as detailed as possible the issue, make sure developers can predict the root causes easily based on the description.
2. Use `debugger` subagent to find the root cause of the issues and report back to main agent.
   2.5. Write root cause analysis to `.ai/workspace/analysis/{issue-name}.analysis.md`. Re-read before implementing fix.
3. Activate `debug` skills and `problem-solving` skills to tackle the issues.
4. Start implementing the fix based the reports and solutions.
5. Use `tester` agent to test the fix and make sure it works, then report back to main agent.
6. If there are issues or failed tests, repeat from step 2.
7. After finishing, respond back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
