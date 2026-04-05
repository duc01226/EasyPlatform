---
name: handoff
version: 1.0.0
description: '[Process] Create structured handoff record between roles. Use when transitioning work between PO/BA/Dev/QA.'
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

**Goal:** Create a structured handoff record documenting what's ready, what's outstanding, and context for the receiving role.

**Workflow:**

1. **Summarize** — What was completed by the sending role
2. **Artifacts** — List deliverables (PBI, stories, designs, code, tests)
3. **Outstanding** — Known issues, open questions, risks
4. **Context** — Key decisions made, rationale, assumptions
5. **Next Steps** — What the receiving role should do first

**Key Rules:**

- Handoff must include artifact references (file paths, PBI IDs)
- Flag any blockers or dependencies
- Include contact/escalation info if applicable

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Handoff Types

| From         | To                   | Key Artifacts                                         |
| ------------ | -------------------- | ----------------------------------------------------- |
| PO → BA      | Idea, PBI draft      | Problem statement, business value, constraints        |
| BA → Dev     | Refined PBI, stories | Acceptance criteria, wireframes, dependencies         |
| Dev → QA     | Code, unit tests     | Test data, deployment steps, known limitations        |
| QA → PO      | Test results         | Coverage report, defect list, sign-off recommendation |
| Design → Dev | Design spec          | Component inventory, tokens, states, interactions     |

## Output Format

```
## Handoff Record

**From:** [Role]
**To:** [Role]
**Date:** {date}
**Feature/PBI:** [Reference]

### Completed Work
- [Item with artifact reference]

### Artifacts
| Artifact | Location | Status |
|----------|----------|--------|

### Outstanding Items
- [Open question/risk with owner]

### Context & Decisions
- [Key decision + rationale]

### Next Steps for [Receiving Role]
1. [First action]
2. [Second action]

### Blockers
- [Any blocking items]
```

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `dev-qa-handoff` workflow** (Recommended) — handoff → test-spec
> 2. **Execute `/handoff` directly** — run this skill standalone

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:understand-code-first:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
