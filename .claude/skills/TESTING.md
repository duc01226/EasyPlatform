# Skill Testing Scenarios

Test prompts to verify skills activate correctly. Each section contains prompts that should trigger the corresponding skill.

## Testing Instructions

1. **Direct Invocation**: Test with `/skill-name` to verify the skill loads
2. **Inference Testing**: Test with natural prompts (for skills with `infer: true`)
3. **Verify Output**: Check that the skill's workflow and patterns are applied

---

## Interactive Skills (infer: true)

### debug

Direct invocation:

```
/debug
```

Inference test prompts:

```
"I'm getting a NullReferenceException in SaveEmployeeCommandHandler"
"This feature stopped working after the last deployment"
"Fix the error: Cannot read property 'name' of undefined"
"Debug why the employee list is showing duplicate records"
"The API returns 500 error when saving a new leave request"
```

Expected behavior:

- Creates structured analysis notes
- Follows anti-hallucination protocols
- Documents evidence before making claims
- Presents fix proposal before implementing

---

### code-review

Direct invocation:

```
/code-review
```

Inference test prompts:

```
"Review this command handler for anti-patterns"
"Check if this code follows SOLID principles"
"Analyze the code quality of EmployeeService.cs"
"Look for code smells in this Angular component"
"Refactor this method to improve readability"
```

Expected behavior:

- Creates analysis notes file
- Checks architecture compliance
- Identifies SOLID violations
- Proposes improvements with examples

---

### feature-implementation

Direct invocation:

```
/feature-implementation
```

Inference test prompts:

```
"Implement a new employee export feature"
"Add a notification system for leave approvals"
"Build a dashboard widget for team metrics"
"Create a bulk import feature for employee data"
"Develop an integration with external HR system"
```

Expected behavior:

- Creates implementation plan
- Identifies affected services/components
- Follows CQRS patterns
- Waits for approval before implementing

---

### refactoring

Direct invocation:

```
/refactoring
```

Inference test prompts:

```
"Extract this validation logic into a separate method"
"Move the mapping code from handler to DTO"
"Rename getUserData to getEmployeeProfile across the codebase"
"Decompose this large command handler"
"Inline this helper method that's only used once"
```

Expected behavior:

- Identifies refactoring type
- Maps all usages before changing
- Creates step-by-step plan
- Verifies no behavior change

---

### api-design

Direct invocation:

```
/api-design
```

Inference test prompts:

```
"Design a new REST endpoint for employee search"
"Create an API for bulk leave request processing"
"What's the best route pattern for nested resources?"
"Add a file upload endpoint to the document controller"
"Review this controller for REST best practices"
```

Expected behavior:

- Follows REST conventions
- Uses platform controller patterns
- Proper route naming
- Authorization attributes included

---

### database-optimization

Direct invocation:

```
/database-optimization
```

Inference test prompts:

```
"This query is taking 30 seconds to execute"
"I think there's an N+1 problem in GetEmployeeList"
"Add an index to improve search performance"
"Optimize the employee list query with filtering"
"The dashboard is slow because of too many database calls"
```

Expected behavior:

- Identifies performance issues
- Suggests appropriate indexes
- Recommends eager loading
- Uses parallel queries where possible

---

## Backend Skills

### backend-cqrs-command

Direct invocation:

```
/backend-cqrs-command
```

Test prompts:

```
"Create a SaveLeaveRequestCommand"
"Add a DeleteEmployeeCommand with soft delete"
"Implement bulk update for employee status"
```

Expected: Command + Result + Handler in ONE file

---

### backend-cqrs-query

Direct invocation:

```
/backend-cqrs-query
```

Test prompts:

```
"Create GetEmployeeListQuery with search and pagination"
"Add a query to get employee by email"
"Implement a dashboard statistics query"
```

Expected: Uses GetQueryBuilder, parallel queries, full-text search

---

### backend-entity-development

Direct invocation:

```
/backend-entity-development
```

Test prompts:

```
"Create an entity for TimeOffRequest"
"Add static expressions to Employee entity"
"Implement computed properties for FullName"
```

Expected: Static expressions, computed properties with empty setter

---

### backend-entity-event-handler

Direct invocation:

```
/backend-entity-event-handler
```

Test prompts:

```
"Send notification when leave request is approved"
"Sync employee data to external system on create"
"Update search index when employee is modified"
```

Expected: Side effects in event handler, not command handler

---

## Frontend Skills

### frontend-angular

Direct invocation:

```
/frontend-angular
```

Test prompts:

```
"Create an employee list component"
"Add a dashboard widget component"
"Build a profile card component"
"Create a leave request form with validation"
"Add async email validation to employee form"
"Implement FormArray for multiple phone numbers"
"Create a store for employee list with filtering"
"Add pagination state to the store"
"Implement loading states for multiple requests"
"Create an API service with caching"
```

Expected: Correct base class, proper lifecycle management, form base patterns, state management store, loading/error state tracking, side effects, API service patterns

---

## Architecture Skills

### arch-cross-service-integration

Direct invocation:

```
/arch-cross-service-integration
```

Test prompts:

```
"How should Growth service communicate with Accounts?"
"Design event bus messages for employee sync"
"Plan cross-service data consistency"
```

Expected: Message bus patterns, event-driven architecture

---

### arch-performance-optimization

Direct invocation:

```
/arch-performance-optimization
```

Test prompts:

```
"Analyze performance bottlenecks in the dashboard"
"Optimize the employee search feature"
"Review API response times"
```

Expected: Profiling, caching strategies, query optimization

---

### arch-security-review

Direct invocation:

```
/arch-security-review
```

Test prompts:

```
"Review authentication flow security"
"Check for injection vulnerabilities"
"Audit authorization patterns in controllers"
```

Expected: OWASP considerations, authorization checks

---

## Verification Checklist

For each skill test:

- [ ] Direct invocation works (`/skill-name`)
- [ ] Inference activates for relevant prompts
- [ ] Correct workflow phases are followed
- [ ] Platform patterns are applied
- [ ] Anti-patterns are avoided
- [ ] Output matches expected format
