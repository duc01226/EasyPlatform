---
name: test
version: 1.0.0
description: '[Testing] Run tests locally and analyze the summary report.'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

## Quick Summary

**Goal:** Run tests locally via `tester` subagent and analyze the summary report.

**Workflow:**

1. **Delegate** — Launch `tester` subagent with test scope from arguments
2. **Analyze** — Review test results, identify failures and patterns
3. **Report** — Summarize pass/fail counts, highlight failing tests

**Key Rules:**

- READ-ONLY: do not implement fixes, only report results
- Activate relevant skills from catalog during process
- Always use `tester` subagent, not direct test commands

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: **Do not** start implementing.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
