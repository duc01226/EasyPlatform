# Development Guidelines — Common Rules

> Generic coding rules, principles, and workflows applicable to any project in this workspace.
> For project-specific rules (architecture, file locations, tech stack), see `workspace.copilot-instructions.md`.

> **MANDATORY — Confirm Before Execute:** If the user prompt could be complex or vague, you **MUST** first confirm your understanding of the request and clarify the user's intent before executing any task. Restate what you understood, ask clarifying questions if ambiguous, and only proceed after the user confirms. During confirmation, check if the task matches any workflow from the Workflow Catalog. If AI judges the task is non-trivial, auto-activate the detected workflow immediately. If AI judges the task is simple, AI MUST ask the user whether to skip workflow. This applies to ALL AI tools (Claude Code, GitHub Copilot, etc.).

---

**Sections:** [First Principles](#first-principles) | [Code Responsibility Hierarchy](#code-responsibility-hierarchy) | [Search First](#mandatory-search-existing-code-first) | [Naming](#naming-conventions) | [Clean Architecture](#clean-architecture-layers) | [Performance](#performance-rules) | [Security](#security-rules) | [Code Review](#code-review-rules) | [Evidence-Based Reasoning](#evidence-based-reasoning-protocol) | [Workflows](#workflow-catalog) | [Task Planning](#task-planning--lessons-learned)

---

## First Principles

1. **Understanding > Output** — Never ship code you can't explain
2. **Design Before Mechanics** — Document WHY before WHAT
3. **Own Your Abstractions** — Every dependency is YOUR responsibility
4. **Operational Awareness** — Code that can't be debugged is technical debt
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants

---

## Code Responsibility Hierarchy

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication.** If logic belongs 90% to class A, put it in class A.

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer                 | Contains                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Entity/Model**      | Business logic, validation, display helpers, static factory methods, default values, dropdown options, constants |
| **Service**           | API calls, command factories, data transformation                                                                |
| **Component/Handler** | UI events ONLY — delegates all logic to lower layers                                                             |

```typescript
// [MUST NOT] Logic in component
readonly statusOptions = [{ value: 1, label: 'Active' }, ...];

// CORRECT: Logic in entity/model
export class UserStatus {
  static readonly dropdownOptions = [{ value: 1, label: 'Active' }, ...];
  static getDisplayLabel(value: number): string {
    return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
  }
}

// Component just uses entity
readonly statusOptions = UserStatus.dropdownOptions;
```

---

## MANDATORY: Search Existing Code FIRST

**Before writing ANY code:**

1. **Grep/Glob search** for similar patterns in the codebase (find 3+ examples)
2. **Follow codebase pattern**, NOT generic framework docs
3. **Provide evidence** in plan (file:line references)

**Why:** Projects have project-specific conventions that differ from framework defaults.

---

## Naming Conventions

| Type               | Convention                  | Example                                                 |
| ------------------ | --------------------------- | ------------------------------------------------------- |
| Classes/Interfaces | PascalCase                  | `UserService`, `IRepository`                            |
| Methods (C#)       | PascalCase                  | `GetUserById()`                                         |
| Methods (TS)       | camelCase                   | `getUserById()`                                         |
| Variables          | camelCase                   | `userName`, `isActive`                                  |
| Constants          | UPPER_SNAKE_CASE            | `MAX_RETRY_COUNT`                                       |
| Booleans           | Prefix with verb            | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections        | Plural                      | `users`, `items`, `employees`                           |
| BEM CSS            | block\_\_element --modifier | All frontend template elements must have BEM classes    |
| Commands           | `[Verb][Entity]Command`     | `SaveLeaveRequestCommand`, `ApproveOrderCommand`        |
| Queries            | `Get[Entity][Query]`        | `GetActiveUsersQuery`, `GetOrdersByStatusQuery`         |
| Handlers           | `[CommandName]Handler`      | `SaveLeaveRequestCommandHandler`                        |
| Validation         | `Validate[Context]Valid`    | `ValidateLeaveRequestValid()`                           |
| Ensure             | `Ensure[Context]Valid`      | `EnsureCanApprove()` (returns object or throws)         |

---

## Clean Architecture Layers

| Layer              | Contains                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| **Domain**         | Entity, Repository, ValueObject, DomainService, Exceptions, Helpers, Constants |
| **Application**    | ApplicationService, DTOs, CQRS Commands/Queries, BackgroundJobs, MessageBus    |
| **Infrastructure** | External service implementations, data access, file storage, messaging         |
| **Presentation**   | Controllers, API endpoints, middleware, authentication                         |

---

## Performance Rules

### Backend Performance

```csharp
// [MUST NOT] O(n) LINQ inside loops
foreach (var item in items)
    var match = allMatches.FirstOrDefault(m => m.Id == item.Id);  // O(n) each

// CORRECT: Dictionary lookup O(1)
var matchDict = allMatches.ToDictionary(m => m.Id);
foreach (var item in items)
    var match = matchDict.GetValueOrDefault(item.Id);

// [MUST NOT] Await inside loops (N+1 queries)
foreach (var id in ids)
    var item = await repo.GetByIdAsync(id, ct);

// CORRECT: Batch load
var items = await repo.GetByIdsAsync(ids, ct);

// Always paginate collections
var items = await repo.GetAllAsync(q => q.Where(expr).PageBy(skip, take), ct);
```

### Frontend Performance

```typescript
// Use trackBy for ngFor
trackByItem = this.ngForTrackByItemProp<User>('id');

// Use platform caching where supported
return this.post('/search', criteria, { enableCache: true });
```

---

## Security Rules

### Core Security Rules

- Never commit secrets (.env, API keys, credentials)
- Always validate user input at boundaries
- Use parameterized queries (Entity Framework handles this)
- Don't expose sensitive data in DTOs
- Use encryption for sensitive fields

### Operational Readiness (service-layer/API changes)

**Observability:**

- External API calls log errors with context (request ID, user, parameters)
- Operations >100ms tracked with duration metrics
- Cross-service calls include correlation IDs

**Reliability:**

- Transient failures use retry policy (3 attempts, exponential backoff)
- HTTP clients configured with timeout (default: 30s)
- Critical paths define degraded-mode behavior

---

## Code Review Rules

### Core Principles

- **YAGNI** — Don't implement features until needed
- **KISS** — Simplest solution that works
- **DRY** — Extract shared logic, no duplication

### Backend Review Checklist

- [ ] Independent awaits use parallel execution?
- [ ] Validation logic in entity, not handler?
- [ ] Using fluent validation style?
- [ ] Delete by ID, not fetch-then-delete?
- [ ] Queries paginated and projected?
- [ ] Service-specific repositories used?
- [ ] DTO owns mapping responsibility?
- [ ] Side effects in Entity Event Handlers?
- [ ] No direct cross-service DB access?
- [ ] Proper authorization checks?
- [ ] Entity expressions have corresponding database indexes?

### Frontend Review Checklist

- [ ] Components extend platform base classes?
- [ ] No `ngOnChanges` usage?
- [ ] All subscriptions have cleanup (`untilDestroyed()`)?
- [ ] Services extend API service base class?
- [ ] All HTML elements have BEM classes?
- [ ] Using platform store pattern?
- [ ] No manual destroy Subject?
- [ ] Explicit type annotations on functions?
- [ ] Semicolons used consistently?

### Architecture Review Checklist

- [ ] Logic in lowest appropriate layer?
- [ ] No duplicated logic across changes?
- [ ] New files in correct architectural layers?
- [ ] Service boundaries respected?
- [ ] Clean Architecture followed?
- [ ] Constants/columns in Model, not Component?

### Code Flow (Step-by-Step Pattern)

```csharp
public async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // Step 1: Validate input
    req.Validate().EnsureValid();

    // Step 2: Load dependencies (parallel)
    var (entity, company) = await Util.TaskRunner.WhenAll(
        repository.GetByIdAsync(req.Id, ct),
        companyRepo.GetByIdAsync(req.CompanyId, ct)
    );

    // Step 3: Apply business logic
    entity.UpdateFrom(req).EnsureValid();

    // Step 4: Persist changes
    await repository.UpdateAsync(entity, ct);

    // Step 5: Return result
    return new Result { Entity = new EntityDto(entity) };
}
```

### Ownership Protocol (for 3+ file changes)

```
Confidence: 8/10 (main path verified, edge cases for concurrent access untested)
Ownership: I will fix bugs for 14 days post-merge
Debug Entry: EmployeeService.cs:145 (query construction is the riskiest change)
```

---

## Anti-Patterns Catalog

### Backend Anti-Patterns

| Anti-Pattern                      | Correct Pattern                       |
| --------------------------------- | ------------------------------------- |
| Direct cross-service DB access    | Message bus communication             |
| Custom repository interfaces      | Platform repositories with extensions |
| Manual validation with exceptions | Fluent validation result API          |
| Side effects in command handler   | Entity Event Handlers                 |
| DTO mapping in handler            | DTO owns mapping via `MapToObject()`  |
| Logic in controllers              | CQRS Command Handlers                 |
| Fetch-then-delete                 | `DeleteByIdAsync(id)`                 |
| Sequential independent awaits     | Parallel execution utility            |

### Frontend Anti-Patterns

| Anti-Pattern                   | Correct Pattern               |
| ------------------------------ | ----------------------------- |
| Direct `HttpClient`            | API service base class        |
| Manual signals for state       | Platform store pattern        |
| Manual destroy Subject         | `this.untilDestroyed()`       |
| `ngOnChanges`                  | `@Watch` decorator            |
| `implements OnInit, OnDestroy` | Extend platform base class    |
| Elements without BEM classes   | All elements have BEM classes |
| Missing `untilDestroyed()`     | All subscriptions use it      |

### Architecture Anti-Patterns

| Anti-Pattern              | Correct Pattern                           |
| ------------------------- | ----------------------------------------- |
| Skip planning             | Always plan for non-trivial tasks         |
| Assume service boundaries | Verify through code analysis              |
| Create custom solutions   | Use established framework patterns        |
| Create without searching  | Search for existing implementations first |
| Logic in component        | Logic in lowest layer (entity/model)      |

---

## Architecture Rules

### Microservices Principles

| Rule                   | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| Service Independence   | Each service is a distinct subdomain                                  |
| No Direct Dependencies | Services CANNOT reference each other's domain/application layers      |
| Message Bus Only       | Cross-service communication MUST use message bus                      |
| Shared Components      | Only framework and shared libraries can be referenced across services |
| Data Duplication       | Each service maintains own data; sync via message bus events          |

### Component Reuse vs New Component

| Scenario                                           | Action         |
| -------------------------------------------------- | -------------- |
| Can enhance existing with generic, optional inputs | Reuse existing |
| Can compose thin wrapper around existing           | Create wrapper |
| Existing cannot fulfill requirement                | Create new     |
| New behavior would complicate existing             | Create new     |

### Decision Trees

**Repository Pattern:**

```
Simple CRUD? → Standard queryable repository
Complex queries? → Repository extensions with static expressions
Cross-service? → Message bus (NEVER direct DB)
```

**Validation Pattern:**

```
Simple property? → Command.Validate()
Async (DB check)? → Handler.ValidateRequestAsync()
Business rule? → Entity.ValidateForXXX()
Cross-field? → Platform validators
```

**Event Pattern:**

```
Same service + Entity changed? → EntityEventApplicationHandler
Same service + Command completed? → CommandEventApplicationHandler
Cross-service + Data sync? → EntityEventBusMessageProducer/Consumer
Cross-service + Background? → Background job
```

---

## Evidence-Based Reasoning Protocol

Speculation is FORBIDDEN. Every claim must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs
2. **Confidence declaration required** — Every recommendation must state confidence level
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence
4. **Cross-service validation** — Check ALL services before recommending architectural changes

### Confidence Levels

| Level       | Meaning                              | Action                 |
| ----------- | ------------------------------------ | ---------------------- |
| **95-100%** | Full trace, all services checked     | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases | Recommend with caveats |
| **60-79%**  | Implementation found, partial trace  | Recommend cautiously   |
| **<60%**    | Insufficient evidence                | **DO NOT RECOMMEND**   |

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                    |
| ---------- | ------------------------------------------------------------- | ------------------------------------ |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + all services      |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + tests + all services   |
| **LOW**    | Renaming, formatting, comments                                | Code review only                     |

---

## Workflow Catalog

### Quick Keyword Lookup

| If prompt contains...                      | Workflow            |
| ------------------------------------------ | ------------------- |
| fix, bug, error, crash, broken, debug      | **Bug Fix**         |
| implement, add, create, build, new feature | **Feature**         |
| refactor, restructure, clean up, tech debt | **Refactor**        |
| how does, where is, explain, understand    | **Investigation**   |
| docs, documentation, readme                | **Documentation**   |
| review code, PR review, audit code         | **Code Review**     |
| review changes, uncommitted, staged        | **Review Changes**  |
| verify, validate, confirm, ensure, check   | **Verification**    |
| test, run tests, coverage                  | **Testing**         |
| deploy, CI/CD, Docker, K8s                 | **Deployment**      |
| migration, schema, EF migration            | **Migration**       |
| security, vulnerability, OWASP             | **Security Audit**  |
| idea, feature request, backlog, PBI        | **Idea to PBI**     |
| sprint, planning, grooming                 | **Sprint Planning** |
| release, ready to deploy, ship             | **Release Prep**    |
| bulk, batch, rename all, replace across    | **Batch Operation** |
| quality, audit, best practices, flaws      | **Quality Audit**   |
| business feature doc                       | **Feature Docs**    |
| pre-dev, ready to start, prerequisites     | **Pre-Development** |
| test spec, test cases from PBI             | **PBI to Tests**    |
| design spec, mockup, wireframe             | **Design Workflow** |
| status report, sprint update               | **PM Reporting**    |
| full lifecycle, idea to release            | **Full Lifecycle**  |

### Workflow Execution Protocol

1. **DETECT:** Match prompt against keyword table above
2. **JUDGE:** Is the task simple? If yes — ask user whether to skip workflow
3. **ACTIVATE (non-trivial):** Auto-activate the workflow, announce to user
4. **CREATE TASKS:** Use task tracking for ALL workflow steps BEFORE starting
5. **EXECUTE:** Follow each step in sequence, updating status as you progress

**Override:** Prefix prompt with `quick:` to bypass workflow detection.

### Role Handoff Workflows

| Handoff      | Workflow             |
| ------------ | -------------------- |
| PO → BA      | `po-ba-handoff`      |
| BA → Dev     | `ba-dev-handoff`     |
| Dev → QA     | `dev-qa-handoff`     |
| QA → PO      | `qa-po-acceptance`   |
| Design → Dev | `design-dev-handoff` |
| Sprint End   | `sprint-retro`       |

---

---

## Task Planning & Lessons Learned

**MUST** break work into small todo tasks BEFORE starting any non-trivial work.

**MUST** schedule a **final todo task** at the end of every task list: **"Analyze AI mistakes & lessons learned"** — Review the session for AI errors (wrong assumptions, missed patterns, hallucinated APIs, over-engineering, missed reuse opportunities). For each mistake found, document: what happened, root cause, and lesson. If any lesson is found, ask the user: *"Found [N] lesson(s) learned. Save to project docs for future sessions?"* — wait for user confirmation before persisting.

---

> **Remember:** Technical correctness over social comfort. Verify before implementing. Ask before assuming. Evidence before claims.
