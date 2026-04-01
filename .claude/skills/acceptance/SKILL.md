---
name: acceptance
version: 1.0.0
description: '[Process] PO acceptance decision flow. Use when QA hands off to PO for sign-off.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Quick Summary

**Goal:** Facilitate PO acceptance decision with structured criteria review.

**Workflow:**

1. **Review** — Check acceptance criteria from PBI/story
2. **Verify** — Confirm each criterion is met with evidence
3. **Decision** — ACCEPT, REJECT (with reasons), or CONDITIONAL ACCEPT
4. **Record** — Document decision with date, reviewer, conditions

**Key Rules:**

- Every acceptance criterion must have a PASS/FAIL verdict
- REJECT must include specific items that failed
- CONDITIONAL ACCEPT must list conditions and timeline

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Acceptance Criteria Review

For each acceptance criterion from the PBI/story:

1. **Read criterion** — Ensure it's testable and measurable
2. **Check evidence** — Review test results, screenshots, demo recordings
3. **Verify** — Does the implementation satisfy the criterion?
4. **Verdict** — PASS or FAIL with specific evidence

## Output Format

```
## Acceptance Decision

**Feature/PBI:** [Reference]
**Reviewer:** [PO name/role]
**Date:** {date}
**Verdict:** ACCEPT | REJECT | CONDITIONAL ACCEPT

### Criteria Review

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [AC text] | PASS | [Evidence] |
| 2 | [AC text] | FAIL | [Why it failed] |

### Decision Details
- [Rationale for overall verdict]

### Conditions (if CONDITIONAL)
- [Condition 1 — deadline]
- [Condition 2 — deadline]

### Rejected Items (if REJECT)
- [Item 1 — what needs to change]
```

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
