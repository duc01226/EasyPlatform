---
name: api-design
version: 2.1.0
description: "[Architecture] Use when designing or modifying REST API endpoints, controller structure, route patterns, request/response DTOs. Triggers on keywords like "API endpoint", "REST", "controller", "route", "HTTP", "request body", "response"."
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Quick Summary

**Goal:** Design or modify REST API endpoints following the project platform patterns and REST best practices.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `backend-patterns-reference.md` — project patterns and structure
> - `docs/project-config.json` → `api` section — API conventions (style: REST/GraphQL, authPattern: jwt/api-key, docsFormat: swagger/openapi)
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Design** — Define routes using RESTful conventions (plural nouns, proper HTTP methods)
2. **Implement** — Create controller + CQRS command/query with validation and authorization
3. **Verify** — Run API design checklist (routes, auth, validation, paging, error handling)

**Key Rules:**

- Follow project base controller + CQRS pattern from CLAUDE.md (see docs/project-reference/backend-patterns-reference.md)
- Use proper route naming: `/api/{resource}` (plural, lowercase, no verbs)
- Validation in Command/Query `Validate()`, NOT in controller
- Always add authorization attributes (see docs/project-reference/backend-patterns-reference.md)
- MUST ATTENTION READ `docs/project-reference/backend-patterns-reference.md` before implementation

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# REST API Design

Expert API design agent for the project following platform patterns and REST best practices.

**Patterns:** Follow CLAUDE.md backend patterns for controller, CQRS command/query, validation, and authorization.

**MUST ATTENTION READ** before implementation:

- `docs/project-reference/backend-patterns-reference.md`

## Route Naming Conventions

| Action          | HTTP Method | Route Pattern                   | Example                            |
| --------------- | ----------- | ------------------------------- | ---------------------------------- |
| List            | GET         | `/api/{resource}`               | `GET /api/employees`               |
| Get by ID       | GET         | `/api/{resource}/{id}`          | `GET /api/employees/123`           |
| Create/Update   | POST        | `/api/{resource}`               | `POST /api/employees`              |
| Delete          | DELETE      | `/api/{resource}/{id}`          | `DELETE /api/employees/123`        |
| Complex Search  | POST        | `/api/{resource}/search`        | `POST /api/employees/search`       |
| Custom Action   | POST        | `/api/{resource}/{id}/{action}` | `POST /api/employees/123/activate` |
| Nested Resource | GET         | `/api/{parent}/{id}/{child}`    | `GET /api/departments/1/employees` |

**⚠️ MUST ATTENTION READ:** CLAUDE.md for CQRS command/query DTOs, validation patterns, and authorization patterns.

## File Upload Endpoints

```csharp
[HttpPost("upload")]
[RequestSizeLimit(50 * 1024 * 1024)]  // 50MB
public async Task<IActionResult> Upload([FromForm] UploadCommand command)
    => Ok(await Cqrs.SendAsync(command));

public sealed class UploadCommand : CqrsCommand<UploadCommandResult> // project CQRS base (see docs/project-reference/backend-patterns-reference.md)
{
    [FromForm]
    public IFormFile File { get; set; } = null!;

    [FromForm]
    public string? Description { get; set; }
}
```

## Error Response Format

```csharp
// Framework handles errors automatically with standard format
{
    "type": "validation",
    "title": "Validation Error",
    "status": 400,
    "errors": {
        "email": ["Email is required", "Invalid email format"],
        "firstName": ["FirstName is required"]
    }
}

// Business errors
{
    "type": "business",
    "title": "Business Rule Violation",
    "status": 422,
    "detail": "Employee is already assigned to this department"
}
```

## API Design Checklist

- [ ] RESTful route naming (plural nouns, lowercase)?
- [ ] Appropriate HTTP methods?
- [ ] Proper authorization attributes?
- [ ] Validation in Command/Query Validate()?
- [ ] Consistent response format?
- [ ] Paging for list endpoints?
- [ ] Error handling follows project patterns?

## Anti-Patterns

- **Verbs in URLs**: Use `/employees/123/activate` not `/activateEmployee`
- **Missing Authorization**: Always add authorization attributes (see docs/project-reference/backend-patterns-reference.md)
- **Validation in Controller**: Move to Command/Query `Validate()`
- **Business Logic in Controller**: Keep controllers thin, logic in handlers
- **Inconsistent Naming**: Follow `{Resource}Controller` pattern

## Related

- `arch-cross-service-integration`

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
    <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** READ `docs/project-reference/backend-patterns-reference.md` before starting
