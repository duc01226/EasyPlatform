# Implement Feature: $ARGUMENTS

Implement a new feature following EasyPlatform development workflow.

## Phase 1: Understanding

1. **Parse feature requirements** from: $ARGUMENTS
2. **Identify affected services:**
   - TextSnippet (Example)
   - TextSnippet (Example)
   - TextSnippet (Example)
   - TextSnippet (Example)

3. **Search for similar implementations:**
   - Find existing patterns in the codebase
   - Identify reusable components

## Phase 2: Design

1. **Plan the implementation:**
   - Backend: Domain entities, Commands/Queries, Event handlers
   - Frontend: Components, Stores, API services
   - Database: Migrations if needed

2. **Identify file locations:**
   ```
   Backend:
   - src/PlatformExampleApp/{Service}/{Service}.Domain/Entities/
   - src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseCommands/
   - src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseQueries/
   - src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseEvents/

   Frontend (WebV2):
   - src/PlatformExampleAppWeb/apps/{app}/src/app/features/
   - src/PlatformExampleAppWeb/libs/apps-domains/src/{domain}/
   ```

## Phase 3: Create Implementation Plan

Present a detailed plan with:
- List of files to create/modify
- Order of implementation
- Dependencies between components
- Test strategy

## Phase 4: Wait for Approval

**CRITICAL:** Wait for explicit user approval before writing any code.

## Phase 5: Implementation

After approval:
1. Create entities/DTOs
2. Create Commands/Queries with handlers
3. Create event handlers for side effects
4. Create frontend components
5. Add tests

Use appropriate skills:
- `backend-cqrs-command` for commands
- `backend-cqrs-query` for queries
- `frontend-angular-component` for UI
