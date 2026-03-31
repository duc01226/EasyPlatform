---
name: journal
version: 1.0.0
description: '[Utilities] Write some journal entries.'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Write journal entries documenting significant technical events, decisions, or incidents.

**Workflow:**

1. **Capture** -- Record the event, context, and impact
2. **Write** -- Create structured journal entry in plans/reports/

**Key Rules:**

- Use for significant events: bugs found, architectural decisions, incidents
- Follow report naming convention from plan context
- Break work into todo tasks; add final self-review task

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Use the `journal-writer` subagent to explore the memories and recent code changes, and write some journal entries.
Journal entries should be concise and focused on the most important events, key changes, impacts, and decisions.
Keep journal entries in the `./docs/journals/` directory.

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
