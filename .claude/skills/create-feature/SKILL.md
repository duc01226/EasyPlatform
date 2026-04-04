---
name: create-feature
version: 1.0.0
description: '[Implementation] Scaffold a new feature with backend and frontend components'
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

## Quick Summary

**Goal:** Scaffold a new full-stack feature with backend (entities, CQRS, controllers) and frontend (Angular components, services).

**Workflow:**

1. **Analyze** — Break down requirements, identify scope (backend/frontend/full-stack)
2. **Identify** — Determine target microservice and Angular app/module
3. **Plan** — Map out entities, commands/queries, endpoints, components, DTOs
4. **Approve** — Present plan, wait for explicit user approval before creating files
5. **Create** — Scaffold files in order: entities → application → DTOs → controllers → frontend

**Key Rules:**

- DO NOT proceed without explicit user approval
- Follow platform patterns from CLAUDE.md and `.github/prompts/` templates
- Build order: Domain → Application → API → Frontend
- Verify with `dotnet build` and `nx build` after creation

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Create a new feature: $ARGUMENTS

## Steps:

1. **Analyze Requirements**
    - Break down the feature requirements
    - Identify the scope (backend only, frontend only, or full-stack)

2. **Identify Service Location**
    - Determine the appropriate microservice for backend
    - Identify the Angular app/module for frontend

3. **Plan Implementation**
    - Domain entities needed
    - CQRS Commands/Queries
    - API endpoints (controllers)
    - Angular components and services
    - DTOs and validation

4. **Use Project Patterns**
    - Reference patterns from CLAUDE.md
    - Use `.github/prompts/` templates for scaffolding:
        - `create-cqrs-command.prompt.md`
        - `create-cqrs-query.prompt.md`
        - `create-entity-event.prompt.md`
        - `create-angular-component.prompt.md`
        - `create-api-service.prompt.md`

5. **Wait for Approval**
    - Present the implementation plan
    - **DO NOT proceed without explicit approval**

6. **Create Files (After Approval)**
   Execute in this order:
    1. Domain entities (`.Domain/Entities/`)
    2. Application layer (`.Application/UseCaseCommands/`, `.Application/UseCaseQueries/`)
    3. Entity DTOs (`.Application/EntityDtos/`)
    4. API controllers (`.Api/Controllers/`)
    5. Frontend components and services

7. **Verify**
    - Build backend: `dotnet build`
    - Build frontend: `nx build <app-name>`

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** validate decisions with user via `AskUserQuestion` — never auto-decide
**MANDATORY IMPORTANT MUST** READ the following files before starting:
    <!-- SYNC:understand-code-first:reminder -->
- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
