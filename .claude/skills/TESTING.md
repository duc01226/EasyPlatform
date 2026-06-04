# Skill Testing Scenarios

Test prompts to verify skills activate correctly. Each section contains prompts that should trigger the corresponding skill.

## Testing Instructions

1. **Direct Invocation**: Test with `/skill-name` to verify the skill loads
2. **Inference Testing**: Test with natural prompts
3. **Verify Output**: Check that the skill's workflow and patterns are applied

---

## Interactive Skills

### debug-investigate

Direct invocation:

```
/debug-investigate
```

Inference test prompts:

```
"I'm getting a NullReferenceException in SaveOrderCommandHandler"
"This feature stopped working after the last deployment"
"Fix the error: Cannot read property 'name' of undefined"
"Debug why the order list is showing duplicate records"
"The API returns 500 error when saving a new return request"
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
"Analyze the code quality of OrderService.cs"
"Look for code smells in this frontend component"
"Refactor this method to improve readability"
```

Expected behavior:

- Creates analysis notes file
- Checks architecture compliance
- Identifies SOLID violations
- Proposes improvements with examples

---

### workflow-feature

Direct invocation:

```
/start-workflow workflow-feature
```

Inference test prompts:

```
"Implement a new order export feature"
"Add a notification system for return approvals"
"Build a dashboard widget for team metrics"
"Create a bulk import feature for order data"
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
"Rename getRawData to getOrderDetails across the codebase"
"Decompose this large command handler"
"Inline this helper method that's only used once"
```

Expected behavior:

- Identifies refactoring type
- Maps all usages before changing
- Creates step-by-step plan
- Verifies no behavior change

---

### database-optimization

Direct invocation:

```
/database-optimization
```

Inference test prompts:

```
"This query is taking 30 seconds to execute"
"I think there's an N+1 problem in GetOrderList"
"Add an index to improve search performance"
"Optimize the order list query with filtering"
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
"Create a SaveReturnCommand"
"Add a DeleteOrderCommand with soft delete"
"Implement bulk update for order status"
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
"Create GetOrderListQuery with search and pagination"
"Add a query to get order by reference"
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
"Create an entity for ReturnRequest"
"Add static expressions to Order entity"
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
"Send notification when return is approved"
"Sync order data to external system on create"
"Update search index when order is modified"
```

Expected: Side effects in event handler, not command handler

---

## Frontend Skills

_(framework-specific frontend skill removed — frontend patterns handled by `docs/project-reference/frontend-patterns-reference.md` + auto-injected by frontend context)_

---

## Architecture Skills

### performance-review

Direct invocation:

```
/performance-review
```

Test prompts:

```
"Analyze performance bottlenecks in the dashboard"
"Optimize the order search feature"
"Review API response times"
"Review this service design for performance at architecture altitude"
```

Expected: Profiling, caching strategies, query optimization, architecture-altitude layer review

---

### security-review

Direct invocation:

```
/security-review
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
- [ ] Project patterns are applied
- [ ] Anti-patterns are avoided
- [ ] Output matches expected format
