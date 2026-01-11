<!-- AI-Agent Context Document Template v1.0 -->
<!-- Companion to: README.{FeatureName}.md (26-section comprehensive doc) -->
<!-- Target audience: AI agents (Claude Code, GitHub Copilot, etc.) -->
<!-- Purpose: Provide concise context for feature implementation/modification -->

# {FeatureName} - AI Context

**Module**: {Module} | **Feature**: {FeatureName} | **Updated**: {Date}

---

## 1. Context

| Aspect | Value |
|--------|-------|
| **Purpose** | {One sentence describing what this feature does} |
| **Key Entities** | {Entity1}, {Entity2}, {Entity3} |
| **Service** | {Module}.Service |
| **Database** | {MongoDB / SQL Server / PostgreSQL} |
| **Status** | {Development / Released / Beta} |

### Scope
- **Users**: {Who uses this feature}
- **Operations**: {CRUD / Read-only / Workflow}
- **Integration**: {Standalone / Cross-service}

---

## 2. File Locations

### Backend

| Layer | Path |
|-------|------|
| **Entity** | `src/Services/{Module}/{Module}.Domain/Entities/{Entity}.cs` |
| **Enums** | `src/Services/{Module}/{Module}.Domain/Enums/{Enum}.cs` |
| **Command** | `src/Services/{Module}/{Module}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs` |
| **Query** | `src/Services/{Module}/{Module}.Application/UseCaseQueries/{Feature}/Get{Entity}ListQuery.cs` |
| **Controller** | `src/Services/{Module}/{Module}.Service/Controllers/{Entity}Controller.cs` |
| **Events** | `src/Services/{Module}/{Module}.Application/UseCaseEvents/{Feature}/` |
| **Jobs** | `src/Services/{Module}/{Module}.Application/UseCaseJobs/{Feature}/` |
| **Repository Ext** | `src/Services/{Module}/{Module}.Application/Repositories/{Entity}RepositoryExtensions.cs` |

### Frontend

| Component | Path |
|-----------|------|
| **Page** | `src/{App}Web/apps/{app}/src/app/pages/{feature}/{feature}.component.ts` |
| **Store** | `src/{App}Web/apps/{app}/src/app/pages/{feature}/{feature}.store.ts` |
| **API Service** | `src/{App}Web/libs/apps-domains/{domain}/services/{feature}.api.service.ts` |
| **Models** | `src/{App}Web/libs/apps-domains/{domain}/models/{entity}.model.ts` |

---

## 3. Domain Model

### {Entity}

| Property | Type | Constraints | Notes |
|----------|------|-------------|-------|
| Id | string | ULID, Required | Primary key |
| CompanyId | string | Required | Tenant scope |
| Name | string | Required, MaxLength(256) | Display name |
| Status | {Status}Enum | Required | State tracking |
| {Property} | {Type} | {Constraints} | {Notes} |

### Key Static Expressions

```csharp
// Filter by company
public static Expression<Func<{Entity}, bool>> OfCompanyExpr(string companyId)
    => e => e.CompanyId == companyId;

// Filter by status
public static Expression<Func<{Entity}, bool>> FilterExpr(List<{Status}> statuses)
    => e => statuses.Contains(e.Status);

// Search columns
public static Expression<Func<{Entity}, object?>>[] SearchColumns()
    => [e => e.Name, e => e.Code];

// Unique constraint
public static Expression<Func<{Entity}, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;
```

### Enumerations

| Enum | Values | Usage |
|------|--------|-------|
| {Status}Enum | Draft=0, Active=1, Archived=2 | State tracking |

### Navigation Properties

| Property | Type | FK Property | Direction |
|----------|------|-------------|-----------|
| Parent | {Entity}? | ParentId | Forward |
| Children | List<{Entity}>? | ParentId (reverse) | Reverse |

---

## 4. API Contracts

### Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | `/api/{Entity}` | Get{Entity}ListQuery | Manager+ |
| GET | `/api/{Entity}/{id}` | Get{Entity}ByIdQuery | Manager+ |
| POST | `/api/{Entity}` | Save{Entity}Command | Admin |
| DELETE | `/api/{Entity}/{id}` | Delete{Entity}Command | Admin |

### Save{Entity}Command

```typescript
// Request
interface Save{Entity}Command {
  id?: string;           // null = create, string = update
  name: string;          // Required
  companyId: string;     // Required
  // ... other properties
}

// Response
interface Save{Entity}CommandResult {
  entity: {Entity}Dto;
}
```

### Get{Entity}ListQuery

```typescript
// Request
interface Get{Entity}ListQuery {
  companyId: string;
  statuses?: {Status}[];
  searchText?: string;
  skip?: number;
  take?: number;
}

// Response
interface Get{Entity}ListQueryResult {
  items: {Entity}Dto[];
  totalCount: number;
}
```

---

## 5. Business Rules

### Validation Rules

| ID | Rule | Condition | Action | Evidence |
|----|------|-----------|--------|----------|
| BR-01 | Name required | Name.IsNullOrEmpty() | Validation error | `Save{Entity}Command.cs:L{N}` |
| BR-02 | Unique code | Duplicate code in company | Validation error | `{Entity}.UniqueExpr()` |
| BR-03 | {Rule} | {Condition} | {Action} | `{File}:{Line}` |

### State Transitions

| From | Event | To | Conditions |
|------|-------|----|------------|
| Draft | Activate | Active | All required fields populated |
| Active | Archive | Archived | No active dependencies |
| Active | Suspend | Suspended | Admin action |

### Async Validation

```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct)
            .ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync({Entity}.UniqueExpr(r.CompanyId, r.Code), ct),
            "Code already exists");
```

---

## 6. Patterns

### Required ✅

| Pattern | Implementation |
|---------|----------------|
| Repository | `IPlatformQueryableRootRepository<{Entity}, string>` |
| Validation | `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) |
| Side Effects | Entity Event Handlers in `UseCaseEvents/` only |
| DTO Mapping | DTO owns mapping via `MapToEntity()` / `MapToNewEntity()` |
| CQRS Files | Command + Result + Handler in ONE file |
| Navigation | `[PlatformNavigationProperty]` for related entities |

### Anti-Patterns ❌

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Direct cross-service DB access | Use message bus events |
| Side effects in command handler | Move to Entity Event Handler |
| Mapping in handler | DTO owns via `MapToEntity()` |
| Throwing ValidationException | Return `PlatformValidationResult` |
| Generic `IPlatformRootRepository` | Use specific `IPlatformQueryableRootRepository<T, TKey>` |

---

## 7. Integration

### Message Bus Events

| Event | Direction | Consumer | Purpose |
|-------|-----------|----------|---------|
| {Entity}EntityEventBusMessage | Outbound | {Other}.Service | Sync entity data |
| {Other}EventBusMessage | Inbound | This service | Receive updates |

### Producer

```csharp
public class {Entity}EventProducer :
    PlatformCqrsEntityEventBusMessageProducer<{Entity}EventBusMessage, {Entity}, string> { }
```

### Consumer

```csharp
internal sealed class {Entity}Consumer : PlatformApplicationMessageBusConsumer<{Entity}EventBusMessage>
{
    public override async Task HandleLogicAsync({Entity}EventBusMessage msg, string routingKey)
    {
        // Wait for dependencies
        await Util.TaskRunner.TryWaitUntilAsync(() =>
            companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId),
            maxWaitSeconds: 300);

        // Upsert logic
        var existing = await repo.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
        if (existing == null) await repo.CreateAsync(msg.Payload.EntityData.ToEntity());
        else await repo.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing));
    }
}
```

---

## 8. Security

### Authorization Matrix

| Role | View | Create | Edit | Delete | Special |
|------|:----:|:------:|:----:|:------:|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access |
| Manager | ✅ | ✅ | ✅ | ❌ | Company scope |
| User | ✅ | ❌ | ❌ | ❌ | Own data only |

### Controller Authorization

```csharp
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] Save{Entity}Command cmd)
    => Ok(await Cqrs.SendAsync(cmd));
```

### Handler Validation

```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin required")
        .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()),
            "Must be same company");
```

### Data Scope Expression

```csharp
public static Expression<Func<{Entity}, bool>> AccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

---

## 9. Test Scenarios

### Critical Test Cases

| ID | Scenario | Priority |
|----|----------|----------|
| TC-01 | Create with valid data | P0 |
| TC-02 | Create with missing required field | P0 |
| TC-03 | Update existing entity | P0 |
| TC-04 | Delete with dependencies | P1 |
| TC-05 | Unauthorized access | P0 |

### Test Case Format

| TC-01 | Create Valid Entity |
|-------|---------------------|
| **GIVEN** | Valid command with all required fields |
| **WHEN** | POST /api/{Entity} |
| **THEN** | 200 OK with created entity |
| **Evidence** | `{Entity}Tests.cs:L{N}` |

| TC-02 | Create Invalid - Missing Name |
|-------|-------------------------------|
| **GIVEN** | Command with empty name |
| **WHEN** | POST /api/{Entity} |
| **THEN** | 400 with validation error "Name required" |
| **Evidence** | `{Entity}Tests.cs:L{N}` |

---

## 10. Quick Reference

### Common Operations

```csharp
// Get by ID with navigation
var entity = await repo.GetByIdAsync(id, ct, e => e.Parent);

// Query with filters and search
var qb = repo.GetQueryBuilder((uow, q) => q
    .Where({Entity}.OfCompanyExpr(companyId))
    .WhereIf(statuses.Any(), {Entity}.FilterExpr(statuses))
    .PipeIf(search.IsNotNullOrEmpty(), q =>
        searchService.Search(q, search, {Entity}.SearchColumns())));

// Parallel count + items
var (total, items) = await (
    repo.CountAsync((uow, q) => qb(uow, q), ct),
    repo.GetAllAsync((uow, q) => qb(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(skip, take), ct));

// Create or update pattern
var entity = dto.NotHasSubmitId()
    ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
    : await repo.GetByIdAsync(dto.Id, ct).Then(e => dto.UpdateToEntity(e));
await entity.ValidateAsync(repo, ct).EnsureValidAsync();
var saved = await repo.CreateOrUpdateAsync(entity, ct);
```

### Decision Tree

```
New backend work in this feature?
├── New API endpoint → Add to Controller + Create Command/Query
├── New validation → Add to Command.Validate() or ValidateRequestAsync()
├── Side effect (email, notification) → Create Entity Event Handler
├── Scheduled task → Create Background Job in UseCaseJobs/
├── Cross-service sync → Create Message Bus Producer/Consumer
└── New entity field → Add to Entity + DTO + Command

New frontend work?
├── New page → Extend AppBaseVmStoreComponent + Create Store
├── API call → Add method to {Feature}ApiService
├── Form → Extend AppBaseFormComponent + initialFormConfig()
├── State update → Use store.updateState() or store.effect()
└── New model property → Add to {Entity}Model class
```

### Fluent Helpers

```csharp
.With(e => e.Name = x)                    // Modify and return
.WithIf(cond, e => e.Status = Active)     // Conditional modify
.Then(e => e.Process())                   // Chain operations
.EnsureFound("Not found")                 // Throw if null
.EnsureFoundAllBy(x => x.Id, ids)         // Validate all found
.AndAlso(expr)                            // Combine expressions
.OrElse(expr)                             // OR expressions
.PipeIf(cond, q => q.Where(...))          // Conditional query
```

---

_Companion to full documentation: [README.{FeatureName}.md](README.{FeatureName}.md)_
