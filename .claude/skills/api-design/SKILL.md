---
name: api-design
version: 2.1.0
description: '[Architecture] Use when designing or modifying REST API endpoints, controller structure, route patterns, request/response DTOs. Triggers on keywords like "API endpoint", "REST", "controller", "route", "HTTP", "request body", "response".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
- **MANDATORY IMPORTANT MUST ATTENTION** READ `docs/project-reference/backend-patterns-reference.md` before starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
