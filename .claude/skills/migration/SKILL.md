---
name: migration
version: 1.0.0
description: '[Architecture] Create data or schema migrations following platform patterns'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Quick Summary

**Goal:** Create data or schema migrations following your project's platform patterns.

**Workflow:**

1. **Analyze** — Understand migration requirements and target database
2. **Create** — Generate migration following platform conventions
3. **Verify** — Run and validate the migration

**Key Rules:**

- Follow platform migration patterns (EF migrations or project data migration executor, see docs/project-reference/backend-patterns-reference.md)
- Always use understand-code-first protocol before creating migrations

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<migration-description>$ARGUMENTS</migration-description>

**⚠️ MUST READ** `references/migration-patterns.md` for migration patterns.

**IMPORTANT:** Present your migration design and wait for explicit user approval before creating files.

## Example

```bash
/migration "Add department field to Employee entity"
```

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST** READ the following files before starting:
    <!-- SYNC:understand-code-first:reminder -->
- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
- **MUST** READ `references/migration-patterns.md` before starting
