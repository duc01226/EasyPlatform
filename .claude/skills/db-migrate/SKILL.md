---
name: db-migrate
version: 1.0.0
description: '[DevOps] Use when running or creating database migrations.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Create or run database migrations following the repository's documented patterns.

**Workflow:**

1. **Identify** — Determine migration type (schema migration vs data/document migration)
2. **Create** — Generate migration using the configured migration tool or data migration executor (see backend-patterns-reference.md under the reference-docs root, default docs/project-reference, overridable via docsRoots.projectReference.path in docs/project-config.json)
3. **Verify** — Run migration and confirm schema/data changes

**Key Rules:**

- Follow the repository's migration patterns (see CLAUDE.md / project-reference docs)
- For CREATE: present the migration design and wait for explicit user approval before creating migration files
- Always backup data before destructive migrations
- Use the configured data migration executor for data/document migrations (see backend-patterns-reference.md under the reference-docs root, default docs/project-reference, overridable via docsRoots.projectReference.path in docs/project-config.json)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Database migration: $ARGUMENTS

## Contents

- [Quick Summary](#quick-summary)
- [Instructions](#instructions)
- [Sub-Agent Type Override](#sub-agent-type-override)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Instructions

1. **Parse arguments**:
    - `add <name>` → Create new schema/data migration with the configured tool
    - `update` → Apply pending migrations
    - `list` → List all migrations and status
    - `rollback` → Revert last migration
    - No argument → Show migration status

2. **Identify database provider + migration tooling** from project config and project-reference docs:
    - Relational stores: managed by the configured schema-migration tool.
    - Document/key-value/event stores: may use code-based migrations or startup executors defined by the repository.

3. **For schema migrations**:

Add migration:

    ```bash
    {configured-migration-add-command} <MigrationName>
    ```

Update database:

    ```bash
    {configured-migration-update-command}
    ```

List migrations:

    ```bash
    {configured-migration-list-command}
    ```

4. **For data/document migrations**:
    - Often code-based migrations run by the configured migration executor (see backend-patterns-reference.md under the reference-docs root, default docs/project-reference, overridable via docsRoots.projectReference.path in docs/project-config.json)
    - Location: the repository's configured migration folder — discover from `backend-patterns-reference.md` under that same reference-docs root (`docsRoots.projectReference.path` in `docs/project-config.json`)
    - Migrations run automatically on application startup
    - To create: Generate new migration class following existing patterns

5. **Safety checks**:
    - Warn before applying migrations to production
    - Show what changes will be applied
    - Recommend backup before destructive operations

6. **Migration Safety Review (MANDATORY for non-local environments)**:
    - Before applying to staging/production, spawn `database-admin` sub-agent (`subagent_type: "database-admin"`) for safety review
    - Review criteria: locking behavior on large tables, index creation impact under concurrent writes, rollback strategy, zero-downtime feasibility
    - Present findings and get explicit user approval before running the configured migration apply command on non-local environments

## Sub-Agent Type Override

> **MANDATORY for non-local migration apply:** Spawn `database-admin` sub-agent (`subagent_type: "database-admin"`) for safety review BEFORE applying to staging or production.
> **Rationale:** `database-admin` specializes in query plans, index impact analysis, locking behavior, backup/restore, and replication — context the main agent lacks for production-safe migration decisions.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `sub-agent-selection` — Pick the sub-agent type from the routing guide; choosing which sub-agent to spawn → .claude/skills/shared/protocols/sub-agent-selection.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift:** Source change → inspect affected tests; don't test migration code.
- **Sub-Agent Selection:** Route specialized domains to matching specialist agent; NEVER `code-reviewer`.
- **Nested Task Creation:** Expand child phases, link parent when nested, one `in_progress`.
- **Understand Code First:** Search 3+ patterns and read code before any modification.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
