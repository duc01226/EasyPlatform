---
name: retro
version: 1.0.0
description: '[Process] Sprint retrospective facilitation. Use at end of sprint to gather feedback and action items.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

## Quick Summary

**Goal:** Facilitate sprint retrospective with structured feedback collection.

**Workflow:**

1. **What went well** — Collect positive outcomes, wins, good practices
2. **What didn't go well** — Identify pain points, blockers, frustrations
3. **Action items** — Concrete improvements for next sprint
4. **Metrics** — Sprint velocity, completion rate, bug count

**Key Rules:**

- Focus on process improvements, not blame
- Every "didn't go well" should have a proposed action item
- Action items must be specific, assignable, and time-bound
- Output to plans/reports/ directory

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Retrospective Structure

### 1. Data Gathering

- Review sprint status report (if available from `/status`)
- Collect git activity: commits, PRs merged, branches
- Review task completion rate

### 2. What Went Well

- Identify practices worth continuing
- Celebrate wins and improvements from previous action items

### 3. What Didn't Go Well

- Identify friction points, blockers, delays
- Look for patterns across multiple sprints
- No blame — focus on systemic issues

### 4. Action Items

Each action item must have:

- **Description** — What needs to change
- **Owner** — Who is responsible
- **Deadline** — When it should be addressed
- **Success criteria** — How we know it's done

## Output Format

```
## Sprint Retrospective

**Sprint:** [Sprint name/number]
**Date:** {date}
**Output:** plans/reports/retro-{date}-{sprint}.md

### What Went Well
- [Positive item]

### What Didn't Go Well
- [Pain point] → Action: [proposed fix]

### Action Items
| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| 1 | [Action] | [Who] | [When] | Pending |

### Metrics
- Planned: X items | Completed: Y | Completion rate: Z%
```

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:understand-code-first:reminder -->
- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
