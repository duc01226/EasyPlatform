# {FeatureName} Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.{FeatureName}Feature.md](./README.{FeatureName}Feature.md)
> Last synced: {YYYY-MM-DD}

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | {bravoTALENTS/bravoGROWTH/bravoSURVEYS/bravoINSIGHTS/Accounts} |
| Service | {ServiceName}.Service |
| Database | {MongoDB/SQL Server/PostgreSQL} |
| Schema | {SchemaName} (if SQL) |

### File Locations

```
Entities:    src/Services/{Module}/{Service}.Domain/Entities/{Entity}.cs
Commands:    src/Services/{Module}/{Service}.Application/UseCaseCommands/{Feature}/
Queries:     src/Services/{Module}/{Service}.Application/UseCaseQueries/{Feature}/
Controllers: src/Services/{Module}/{Service}.Service/Controllers/{Entity}Controller.cs
Frontend:    src/WebV2/apps/bravo-{module}-*/src/app/{feature}/
```

---

## Domain Model

### Entities

```
{EntityName} : RootEntity<{EntityName}, string>
├── Id: string
├── CompanyId: string
├── {Property1}: {Type}
├── {Property2}: {Type}
├── {Navigation}: {RelatedEntity}?
└── Status: {StatusEnum}
```

### Value Objects

```
{ValueObjectName} {
  {prop1}: {type}
  {prop2}: {type}
}
```

### Enums

```
{EnumName}: {Value1} | {Value2} | {Value3}
{StatusEnum}: Active | Inactive | Deleted
```

### Key Expressions

```csharp
// Uniqueness check
public static Expression<Func<{Entity}, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;

// Company filter
public static Expression<Func<{Entity}, bool>> OfCompanyExpr(string companyId)
    => e => e.CompanyId == companyId;
```

---

## API Contracts

### Commands

```
POST /api/{entity}/save
├── Request:  { id?, {requiredFields} }
├── Response: { entity: {Entity}Dto }
├── Handler:  Save{Entity}CommandHandler.cs
└── Evidence: Save{Entity}Command.cs:42-58

POST /api/{entity}/delete
├── Request:  { id }
├── Response: { success: boolean }
├── Handler:  Delete{Entity}CommandHandler.cs
└── Evidence: Delete{Entity}Command.cs:35-42
```

### Queries

```
GET /api/{entity}/{id}
├── Response: {Entity}Dto
├── Handler:  Get{Entity}QueryHandler.cs
└── Evidence: Get{Entity}Query.cs:28-35

GET /api/{entity}/list
├── Request:  { companyId, skipCount?, maxResultCount?, searchText? }
├── Response: { items: {Entity}Dto[], totalCount: number }
├── Handler:  Get{Entity}ListQueryHandler.cs
└── Evidence: Get{Entity}ListQuery.cs:32-48
```

### DTOs

```
{Entity}Dto : PlatformEntityDto<{Entity}, string>
├── Id: string?
├── {Field1}: {type}
├── {Field2}: {type}
└── MapToEntity(): {Entity}
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-{XX}-001 | {Description of validation rule} | `{File}.cs:{Line}` |
| BR-{XX}-002 | {Description of validation rule} | `{File}.cs:{Line}` |
| BR-{XX}-003 | {Description of validation rule} | `{File}.cs:{Line}` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Code.IsNotNullOrEmpty(), "Code required");

// Async validation in handler
await validation
    .AndAsync(r => repo.GetByIdAsync(r.Id, ct).EnsureFoundAsync())
    .AndNotAsync(r => repo.AnyAsync(Entity.DuplicateExpr(r), ct), "Duplicate");
```

---

## Service Boundaries

### Produces Events

```
{Entity}EntityEventBusMessage → [Employee, Growth, Candidate, Setting]
├── Producer: {Entity}EntityEventBusMessageProducer.cs
├── Triggers: Create, Update, Delete
└── Payload: {Entity}EntityEventBusMessagePayload
```

### Consumes Events

```
{ExternalEntity}EntityEventBusMessage ← {SourceService}
├── Consumer: Upsert{ExternalEntity}Consumer.cs
├── Action: Sync {entity} data
└── Idempotent: Yes (LastMessageSyncDate check)
```

### Cross-Service Data Flow

```
{ThisService} ──publish──▶ [RabbitMQ] ──consume──▶ {OtherService1}
                                      ──consume──▶ {OtherService2}
```

---

## Critical Paths

### Create {Entity}

```
1. Validate input
   ├── BR-{XX}-001: {field} required
   └── BR-{XX}-002: {field} unique per company
2. Check uniqueness → fail: return PlatformValidationResult error
3. Generate ID (if empty) → Ulid.NewUlid()
4. Create entity with audit fields
5. Save via repository.CreateAsync()
6. Publish event → Consumers sync
```

### Update {Entity}

```
1. Load existing → not found: EnsureFound() throws
2. Validate changes
   └── BR-{XX}-003: {constraint}
3. Update entity properties
4. Save via repository.UpdateAsync()
5. Publish event → Consumers sync
```

### Delete {Entity}

```
1. Load existing → not found: 404
2. Validate deletable
   └── BR-{XX}-004: Cannot delete if {condition}
3. Delete via repository.DeleteAsync()
4. Publish event → Consumers remove
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-{XX}-001 | Create with valid data | Entity created, event published |
| TC-{XX}-002 | Create duplicate | Returns validation error |
| TC-{XX}-003 | Update non-existent | Returns 404 |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty required field | Validation error: "{field} required" | `ErrorMessage.cs:{line}` |
| Duplicate code | Validation error: "Already exists" | `ErrorMessage.cs:{line}` |
| Concurrent update | Last write wins / optimistic lock | `Handler.cs:{line}` |

---

## Usage Notes

### When to Use This File

- Implementing new features in this domain
- Fixing bugs related to this feature
- Understanding API contracts quickly
- Code review context

### When to Use Full Documentation

- Understanding business requirements
- Stakeholder communication
- Comprehensive test planning
- Troubleshooting production issues

---

*Generated from comprehensive documentation. For full details, see [README.{FeatureName}Feature.md](./README.{FeatureName}Feature.md)*
