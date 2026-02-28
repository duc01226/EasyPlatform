---
name: migration
version: 1.0.0
description: '[Architecture] Create data or schema migrations following platform patterns'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

- `.claude/skills/shared/understand-code-first-protocol.md`
- `.claude/skills/shared/evidence-based-reasoning-protocol.md`

## Quick Summary

**Goal:** Create data or schema migrations following your project's platform patterns.

**Workflow:**
1. **Analyze** — Understand migration requirements and target database
2. **Create** — Generate migration following platform conventions
3. **Verify** — Run and validate the migration

**Key Rules:**
- Follow platform migration patterns (EF migrations or `PlatformDataMigrationExecutor`)
- Always use understand-code-first protocol before creating migrations

<migration-description>$ARGUMENTS</migration-description>

Activate `easyplatform-backend` skill. **⚠️ MUST READ** `references/migration-patterns.md` for migration patterns.

**IMPORTANT:** Present your migration design and wait for explicit user approval before creating files.

## Example

```bash
/migration "Add department field to Employee entity"
```

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
