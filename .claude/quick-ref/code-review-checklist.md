# Code Review Quick Checklist

> One-page reference for consistent code reviews

## Review Approach (Report-Driven Two-Phase)

**⛔ MANDATORY FIRST: Create Todo Tasks**
```
[ ] Called TaskCreate with review phase tasks:
    - [Review Phase 1] Create report file
    - [Review Phase 1] Review file-by-file and update report
    - [Review Phase 2] Re-read report for holistic assessment
    - [Review Phase 3] Generate final review findings
[ ] Update todo status as each phase completes
```

**Step 0: Create Report**
```
[ ] Created report file: plans/reports/code-review-{date}-{slug}.md
[ ] Initialized with Scope and Files sections
```

**Phase 1: File-by-File Review (Build Report)**
For EACH file, update report with:
```
[ ] File path
[ ] Change summary (what changed)
[ ] Purpose (why this change)
[ ] Issues found (or "None")
[ ] Naming, typing, magic numbers checked
[ ] Responsibility placement verified
```

**Phase 2: Holistic Review (Review the Report)**
Re-read accumulated report, then assess:
```
[ ] Understood overall technical approach?
[ ] Solution architecture coherent as unified plan?
[ ] New files in correct layers?
[ ] No duplicated logic across changes?
[ ] Responsibility in LOWEST layer?
[ ] Backend: mapping in Command/DTO (not Handler)?
[ ] Frontend: constants/columns in Model (not Component)?
[ ] Service boundaries respected?
[ ] No circular dependencies introduced?
```

**Phase 3: Final Review Result**
Update report with:
```
[ ] Overall Assessment (big picture)
[ ] Critical Issues (must fix)
[ ] High Priority (should fix)
[ ] Architecture Recommendations
[ ] Positive Observations
```

---

## Architecture Compliance

```
[ ] Follows Clean Architecture layers?
[ ] Uses project base classes (not custom)?
[ ] Repository pattern for data access?
[ ] No direct cross-service DB access?
[ ] Message bus for cross-service communication?
```

---

## Backend Checklist

### Commands/Queries

```
[ ] Command + Handler + Result in ONE file?
[ ] Uses project validation fluent API?
[ ] No side effects in handlers (use event handlers)?
[ ] Proper async/await patterns?
[ ] Uses microservice-specific repository?
```

### Entities

```
[ ] Extends correct entity base class?
[ ] Static expressions for queries?
[ ] Domain event tracking on tracked fields?
[ ] Computed properties configured correctly?
[ ] Validation methods return project validation result?
```

### DTOs

```
[ ] Extends project entity DTO base class?
[ ] Constructor maps core properties?
[ ] With* fluent methods for optional loading?
[ ] Overrides GetSubmittedId(), MapToEntity()?
[ ] DTO owns mapping responsibility (not handler)?
```

---

## Frontend Checklist

### Components

```
[ ] Extends project component base classes (not framework directly)?
[ ] Uses store for complex state?
[ ] untilDestroyed() on all subscriptions?
[ ] trackByItem for @for loops?
[ ] No inline styles (use SCSS)?
```

### Forms

```
[ ] Extends project form base class?
[ ] initialFormConfig() properly defined?
[ ] Async validators wrapped with ifAsyncValidator?
[ ] dependentValidations configured?
[ ] Uses validateForm() before submit?
```

### State Management

```
[ ] Store extends project store base class?
[ ] effectSimple() for API calls?
[ ] observerLoadingErrorState() for tracking?
[ ] tapResponse() for side effects?
[ ] Selectors use this.select()?
```

---

## Security Review

```
[ ] Authorization attribute on protected endpoints?
[ ] Input validation at entry points?
[ ] No secrets in code or logs?
[ ] SQL/NoSQL injection prevention?
[ ] XSS protection in frontend?
```

---

## Performance Review

```
[ ] No O(n²) complexity? (use dictionary for lookups)
[ ] No N+1 query patterns? (batch load related entities)
[ ] Project only needed properties? (don't load all then select one)
[ ] Pagination for all list queries? (never get all without paging)
[ ] Parallel queries for independent operations?
[ ] Proper indexing suggested?
[ ] No unnecessary eager loading?
```

---

## Clean Code Quality

```
[ ] No magic numbers/strings? (extract to named constants)
[ ] No hardcoded values? (use config/constants)
[ ] Single Responsibility per method?
[ ] Consistent abstraction levels in methods?
[ ] No code duplication (DRY)?
[ ] Early returns/guard clauses used?
[ ] Type annotations on all functions?
[ ] No implicit any types?
```

---

## Naming Conventions

```
[ ] Names reveal intent? (WHAT not HOW)
[ ] Specific names, not generic? (employeeRecords vs data)
[ ] Domain language used? (candidates vs arr)
[ ] Methods: Verb + Noun? (getEmployee, validateInput)
[ ] Booleans: is/has/can/should prefix? (isActive, hasPermission)
[ ] Collections: plural nouns? (users, employees)
[ ] No cryptic abbreviations? (employeeCount vs empCnt)
[ ] Consistent patterns across codebase?
```

---

## Anti-Patterns to Flag

| Pattern                     | Instead Do                        |
| --------------------------- | --------------------------------- |
| Direct HttpClient           | Use project API service base      |
| Custom repository interface | Use service-specific + extensions |
| Side effects in handler     | Use entity event handlers         |
| Manual state management     | Use project store base class      |
| DTO mapping in handler      | Let DTO own mapping               |
| Magic numbers (e.g., `600`) | Named constant (`ANIMATION_DURATION_MS`) |
| Hardcoded strings           | Constants or i18n keys            |
| Generic names (`data`, `result`) | Specific names (`employeeRecords`, `validationResult`) |
| Cryptic abbreviations (`empCnt`) | Full words (`employeeCount`) |
| Boolean without prefix (`active`) | With prefix (`isActive`, `hasPermission`) |
| O(n²) nested lookups | Dictionary lookup O(1) |
| Load all then `.Select(x.Id)` | Project in query `.Select(e => e.Id)` |
| Get all without pagination | Always use `.PageBy()` |

---

## Approval Criteria

**Approve** if:

- All critical items checked
- No security issues
- Follows platform patterns

**Request Changes** if:

- Architecture violations
- Security vulnerabilities
- Missing validation
- Anti-patterns present
