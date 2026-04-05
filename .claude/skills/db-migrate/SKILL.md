---
name: db-migrate
version: 1.0.0
description: '[DevOps] Run or create database migrations'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

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

**Goal:** Create or run database migrations (EF Core migrations, MongoDB data migrations) following platform patterns.

**Workflow:**

1. **Identify** — Determine migration type (EF schema vs data migration)
2. **Create** — Generate migration using `dotnet ef` or project data migration executor (see docs/project-reference/backend-patterns-reference.md)
3. **Verify** — Run migration and confirm schema/data changes

**Key Rules:**

- Follow platform migration patterns from CLAUDE.md
- Always backup data before destructive migrations
- Use project data migration executor for MongoDB data migrations (see docs/project-reference/backend-patterns-reference.md)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Database migration: $ARGUMENTS

## Instructions

1. **Parse arguments**:
    - `add <name>` → Create new EF Core migration
    - `update` → Apply pending migrations
    - `list` → List all migrations and status
    - `rollback` → Revert last migration
    - No argument → Show migration status

2. **Identify database provider** from project:
    - SQL Server: Search for `*.Persistence` projects
    - PostgreSQL: Search for `*.Persistence.PostgreSql` projects
    - MongoDB: Uses project Mongo migration executor (code-based, see docs/project-reference/backend-patterns-reference.md)

3. **For EF Core (SQL Server/PostgreSQL)**:

    Add migration:

    ```bash
    cd src/{ExampleApp}/{ExampleApp}.TextSnippet.Persistence
    dotnet ef migrations add <MigrationName> --startup-project ../{ExampleApp}.TextSnippet.Api
    ```

    Update database:

    ```bash
    dotnet ef database update --startup-project ../{ExampleApp}.TextSnippet.Api
    ```

    List migrations:

    ```bash
    dotnet ef migrations list --startup-project ../{ExampleApp}.TextSnippet.Api
    ```

4. **For MongoDB migrations**:
    - MongoDB uses code-based migrations via project Mongo migration executor (see docs/project-reference/backend-patterns-reference.md)
    - Location: `*.Persistence.Mongo/Migrations/`
    - Migrations run automatically on application startup
    - To create: Generate new migration class following existing patterns

5. **Safety checks**:
    - Warn before applying migrations to production
    - Show what changes will be applied
    - Recommend backup before destructive operations

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
