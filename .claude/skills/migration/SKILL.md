---
name: migration
version: 1.0.0
description: '[Architecture] Create data or schema migrations following platform patterns'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

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
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `references/migration-patterns.md` before starting
