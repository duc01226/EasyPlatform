---
name: test
version: 1.0.0
description: '[Testing] Run tests locally and analyze the summary report.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: **Do not** start implementing.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `testing` workflow** (Recommended) — test
> 2. **Execute `/test` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/docs-update (Recommended)"** — Update documentation after tests pass
- **"/fix"** — If tests revealed failures that need fixing
- **"/watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
