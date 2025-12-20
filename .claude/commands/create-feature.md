---
description: Scaffold a new feature with backend and frontend components
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, Task
---

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

4. **Use Platform Patterns**
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
