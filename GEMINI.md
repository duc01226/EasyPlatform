---
applyTo: "**"
---

## 🚨 MANDATORY: Always Plan Before Implement

**CRITICAL INSTRUCTION FOR CLAUDE CODE:**

Before implementing ANY task (bug fixes, new features, refactoring, analysis with changes), you MUST:

1. **Enter Plan Mode First** - Use `EnterPlanMode` tool automatically for non-trivial tasks
2. **Investigate & Analyze** - Explore codebase, understand context, identify affected areas
3. **Create Implementation Plan** - Write detailed plan with specific files, changes, and approach
4. **Get User Approval** - Present plan and wait for user confirmation before any code changes
5. **Only Then Implement** - Execute the approved plan

**This applies to:**

- Bug diagnosis and fixes
- New feature implementation
- Code refactoring
- Any task requiring file modifications

**Exceptions (can implement directly):**

- Single-line typo fixes
- User explicitly says "just do it" or "skip planning"
- Pure research/exploration with no code changes

**DO NOT** start writing code without presenting a plan first. Always investigate, plan, then implement.

---

## Table of Contents

- [🤖 GitHub Copilot Instructions for EasyPlatform](#-github-copilot-instructions-for-easyplatform)
  - [🎯 Core Mission \& Architecture](#-core-mission--architecture)
    - [🏗️ High-Level Architecture Understanding](#️-high-level-architecture-understanding)
  - [🔍 Investigation Protocol for AI Agents](#-investigation-protocol-for-ai-agents)
    - [Step 0: Bug Analysis \& Debugging (CRITICAL - READ FIRST)](#step-0-bug-analysis--debugging-critical---read-first)
    - [Step 1: Context Discovery](#step-1-context-discovery)
    - [Step 2: Service Boundary Verification](#step-2-service-boundary-verification)
    - [Step 3: Platform Pattern Recognition](#step-3-platform-pattern-recognition)
  - [📁 Critical File Locations \& Navigation](#-critical-file-locations--navigation)
    - [🎯 Essential Documentation (READ FIRST)](#-essential-documentation-read-first)
    - [🏗️ Backend Architecture](#️-backend-architecture)
    - [🎨 Frontend Architecture (Nx Workspace)](#-frontend-architecture-nx-workspace)
    - [📦 Platform-Core Library Architecture](#-platform-core-library-architecture)
    - [🧪 Testing \& Development](#-testing--development)
  - [🛠️ Development Patterns \& Best Practices](#️-development-patterns--best-practices)
    - [🎯 Backend Development Patterns](#-backend-development-patterns)
      - [1. Clean Architecture Layers](#1-clean-architecture-layers)
      - [2. Repository Pattern Priority (CRITICAL)](#2-repository-pattern-priority-critical)
      - [3. Repository API Complete Reference](#3-repository-api-complete-reference)
      - [4. Validation Patterns](#4-validation-patterns)
      - [5. Cross-Service Communication](#5-cross-service-communication)
      - [6. Full-Text Search Patterns](#6-full-text-search-patterns)
      - [7. CQRS Implementation Patterns](#7-cqrs-implementation-patterns)
      - [8. Entity Development Patterns](#8-entity-development-patterns)
      - [9. Entity DTO Patterns](#9-entity-dto-patterns)
      - [10. Fluent Helper Patterns](#10-fluent-helper-patterns)
      - [11. Background Job Patterns](#11-background-job-patterns)
      - [12. Message Bus Patterns](#12-message-bus-patterns)
      - [13. Data Migration Patterns](#13-data-migration-patterns)
    - [🎨 Frontend Development Patterns](#-frontend-development-patterns)
      - [1. Component Hierarchy](#1-component-hierarchy)
      - [2. Platform Component API Reference](#2-platform-component-api-reference)
      - [3. API Service Pattern](#3-api-service-pattern)
      - [4. Working Examples Reference](#4-working-examples-reference)
    - [🧩 Platform-Core Library Reference](#-platform-core-library-reference)
  - [🔐 Authorization Patterns](#-authorization-patterns)
  - [🔄 Migration Patterns](#-migration-patterns)
  - [🛠️ Helper vs Util Decision Guide](#️-helper-vs-util-decision-guide)
  - [🔥 Advanced Patterns Reference](#-advanced-patterns-reference)
    - [Backend Advanced Patterns](#backend-advanced-patterns)
    - [Frontend Advanced Patterns](#frontend-advanced-patterns)
  - [🚨 Critical Anti-Patterns to Avoid](#-critical-anti-patterns-to-avoid)
    - [❌ Backend Anti-Patterns](#-backend-anti-patterns)
    - [❌ Frontend Anti-Patterns](#-frontend-anti-patterns)
  - [🔧 Development Tools \& Environment](#-development-tools--environment)
    - [📋 Required VS Code Extensions](#-required-vs-code-extensions)
    - [🚀 Development Scripts \& Commands](#-development-scripts--commands)
    - [🗄️ Database Connections (Development)](#️-database-connections-development)
  - [📊 Quick Decision Trees](#-quick-decision-trees)
    - [Backend Task Decision](#backend-task-decision)
    - [Frontend Task Decision](#frontend-task-decision)
    - [Repository Pattern Decision](#repository-pattern-decision)
  - [🏷️ Code Templates \& Scaffolding](#️-code-templates--scaffolding)
    - [Backend Command Template](#backend-command-template)
    - [Frontend Component Template](#frontend-component-template)
  - [🎯 Success Metrics \& Quality Gates](#-success-metrics--quality-gates)
    - [✅ Code Quality Checklist](#-code-quality-checklist)
    - [✅ Architecture Compliance](#-architecture-compliance)
    - [✅ Performance \& Security](#-performance--security)
  - [🆘 Troubleshooting \& Support](#-troubleshooting--support)
    - [Common Issues \& Solutions](#common-issues--solutions)
    - [Getting Help](#getting-help)
  - [🔮 AI Agent Execution Guidelines](#-ai-agent-execution-guidelines)
  - [IMPORTANT UNIVERSAL CLEAN CODE RULES](#important-universal-clean-code-rules)

# 🤖 GitHub Copilot Instructions for EasyPlatform

> **.NET + Angular Development Platform Framework** - .NET 9 Backend + Angular 19 Frontend

## 🎯 Core Mission & Architecture

EasyPlatform is a comprehensive development framework for building enterprise applications with microservices architecture, Clean Architecture, CQRS, and event-driven design.

### 🏗️ High-Level Architecture Understanding

**System Architecture:**

- **Backend:** .NET 9 with Clean Architecture layers (Domain, Application, Persistence, Service)
- **Frontend:** Angular 19 Nx workspace with component-based architecture
- **Platform Foundation:** Easy.Platform framework providing base infrastructure components
- **Communication:** RabbitMQ message bus for cross-service communication
- **Data Storage:** Multi-database support (MongoDB, SQL Server, PostgreSQL)

**Example Application (PlatformExampleApp):**

- **TextSnippet Service:** Complete working example demonstrating all platform patterns
- **playground-text-snippet:** Angular frontend example app

## 🔍 Investigation Protocol for AI Agents

**ALWAYS follow this systematic approach when given any task:**

### Step 0: Bug Analysis & Debugging (CRITICAL - READ FIRST)

**⚠️ MANDATORY: When debugging or analyzing potential code removal, MUST follow [AI Debugging Protocol](.github/AI-DEBUGGING-PROTOCOL.md)**

**Core Principles:**

- ❌ NEVER assume based on first glance
- ✅ ALWAYS verify with multiple search patterns
- ✅ CHECK both static AND dynamic code usage
- ✅ READ actual implementation, not just interfaces
- ✅ TRACE full dependency chains
- ✅ DECLARE confidence level and uncertainties
- ✅ REQUEST user confirmation when confidence < 90%

**Quick Verification Checklist:**

```
Before removing/changing ANY code:
☐ Searched static imports?
☐ Searched string literals in code?
☐ Checked dynamic invocations (attr, prop, runtime)?
☐ Read actual implementations?
☐ Traced who depends on this?
☐ Assessed what breaks if removed?
☐ Documented evidence clearly?
☐ Declared confidence level?

If ANY unchecked → DO MORE INVESTIGATION
If confidence < 90% → REQUEST USER CONFIRMATION
```

**See [.github/AI-DEBUGGING-PROTOCOL.md](.github/AI-DEBUGGING-PROTOCOL.md) for complete protocol.**

### Step 1: Context Discovery

```
1. Extract domain concepts from requirements
2. Do semantic search to find related entities and components
3. Do grep search to validate patterns and find evidence
4. Do list code usages to map complete ecosystems
5. Never assume - always verify with code evidence
```

### Step 2: Service Boundary Verification

```
1. Identify which microservice owns the domain concept
2. Use grep_search("localhost:\\d+|UseUrls.*\\d+", isRegexp=true) to find service ports
3. Verify service responsibilities through actual code analysis
4. Check for existing implementations before creating new ones
```

### Step 3: Platform Pattern Recognition

```
1. Check ai-common-prompt.md for [Solution Planning] guidance
2. Use established platform patterns over custom solutions
3. Follow Easy.Platform framework conventions
4. Verify base class APIs before using component methods
```

## 📁 Critical File Locations & Navigation

### 🎯 Essential Documentation (READ FIRST)

```
📖 README.md                     # Complete platform overview & quick start
📖 docs/architecture-overview.md # System architecture & diagrams
📖 CLEAN-CODE-RULES.md           # Coding standards & anti-patterns
📖 .github/AI-DEBUGGING-PROTOCOL.md  # 🚨 MANDATORY debugging protocol for AI agents
📖 ai-common-prompt.md           # AI agent prompt library & development patterns
```

### 🏗️ Backend Architecture

```
src/Platform/                    # Easy.Platform framework components
├── Easy.Platform/               # Core framework (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/    # ASP.NET Core integration
├── Easy.Platform.MongoDB/       # MongoDB data access patterns
├── Easy.Platform.RabbitMQ/      # Message bus implementation
└── Easy.Platform.*/             # Other infrastructure modules

src/PlatformExampleApp/          # Example microservice implementation
├── PlatformExampleApp.TextSnippet.Api/           # ASP.NET Core Web API
├── PlatformExampleApp.TextSnippet.Application/   # CQRS handlers, jobs, events
├── PlatformExampleApp.TextSnippet.Domain/        # Entities, domain events
├── PlatformExampleApp.TextSnippet.Persistence/   # EF Core (SQL Server)
├── PlatformExampleApp.TextSnippet.Persistence.PostgreSql/  # PostgreSQL
├── PlatformExampleApp.TextSnippet.Persistence.Mongo/       # MongoDB
└── PlatformExampleApp.Shared/   # Cross-service utilities
```

### 🎨 Frontend Architecture (Nx Workspace)

```
src/PlatformExampleAppWeb/       # Angular 19 Nx workspace
├── apps/                        # Applications
│   └── playground-text-snippet/ # Example frontend app demonstrating platform patterns
└── libs/                        # Shared libraries
    ├── platform-core/           # Framework base (PlatformComponent, PlatformVmStore, etc.)
    ├── apps-domains/            # Business domain (APIs, models, validators)
    │   └── text-snippet-domain/ # TextSnippet-specific domain code
    ├── share-styles/            # SCSS themes & variables
    └── share-assets/            # Images, icons, fonts
```

### 📦 Platform-Core Library Architecture

The `platform-core` library (`src/PlatformExampleAppWeb/libs/platform-core/`) provides the foundation for EasyPlatform frontend applications with reusable base classes, services, and utilities.

**Library Structure:**

```
src/PlatformExampleAppWeb/libs/platform-core/src/lib/
├── api-services/       # Base API service classes (PlatformApiService)
├── app-ui-state/       # Application UI state management
├── caching/            # Client-side caching utilities
├── common-types/       # Shared TypeScript interfaces
├── common-values/      # Constants and enums
├── components/         # Base component classes (PlatformComponent, PlatformVmComponent, etc.)
├── decorators/         # TypeScript decorators (@Watch, etc.)
├── directives/         # Angular directives
├── domain/             # Domain model utilities
├── dtos/               # Data transfer objects
├── form-validators/    # Custom form validators
├── helpers/            # Helper functions
├── http-services/      # HTTP client utilities
├── pipes/              # Angular pipes
├── rxjs/               # Custom RxJS operators
├── ui-services/        # UI-related services
├── utils/              # General utilities (date, list, string, etc.)
├── validation/         # Validation utilities
└── view-models/        # ViewModel base classes (PlatformVmStore)
```

**Key Exports:**

- **Component Base Classes:** PlatformComponent, PlatformVmComponent, PlatformFormComponent, PlatformVmStoreComponent
- **State Management:** PlatformVmStore for ComponentStore-based state management
- **API Services:** PlatformApiService base class for HTTP communication
- **Decorators:** @Watch, @WatchWhenValuesDiff for reactive property changes
- **Utilities:** date_format, list_groupBy, string_isEmpty, immutableUpdate, deepClone

### 🧪 Testing & Development

```
src/PlatformExampleApp/         # Complete working example (backend)
src/PlatformExampleAppWeb/      # Complete working example (frontend)
deploy/                         # Docker & deployment configs
```

## 🛠️ Development Patterns & Best Practices

### 🎯 Backend Development Patterns

#### 1. Clean Architecture Layers

```csharp
// Domain Layer - Business entities and rules (non-audited)
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;

    public static Expression<Func<Employee, bool>> IsActiveExpression()
        => e => e.Status == EmployeeStatus.Active;
}

// Domain Layer - Business entities with audit trails
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;

    public static Expression<Func<AuditedEmployee, bool>> IsActiveExpression()
        => e => e.Status == EmployeeStatus.Active;
}

// Application Layer - CQRS handlers
public class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Validate and get dependencies
        var employee = await repository.GetByIdAsync(request.Id, cancellationToken);

        // Step 2: Apply business logic
        employee.FirstName = request.FirstName;
        // Field changes are automatically tracked via [TrackFieldUpdatedDomainEvent] attribute

        // Step 3: Save and return result
        var saved = await repository.CreateOrUpdateAsync(employee, cancellationToken);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - API controllers
[ApiController]
[Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> SaveEmployee([FromBody] SaveEmployeeCommand command)
    {
        var result = await Cqrs.SendAsync(command);
        return Ok(result);
    }
}
```

#### 2. Repository Pattern Priority (CRITICAL)

```csharp
// ✅ Use platform generic repositories
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary repository interface
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// 💡 Best Practice: Create repository extensions for domain-specific queries
public static class TextSnippetRepositoryExtensions
{
    public static async Task<TextSnippetText> GetByFullTextSearchCodeAsync(
        this IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        string code, CancellationToken cancellationToken = default)
    {
        return await repository.GetSingleOrDefaultAsync(
            TextSnippetText.FullTextSearchCodeExactMatchExpr(code), cancellationToken);
    }
}
```

#### 3. Repository API Complete Reference

```csharp
// Common Repository Methods (ALL microservice repositories support these)

// CREATE
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);

// UPDATE
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, cancellationToken);

// CREATE OR UPDATE (Upsert)
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);

// DELETE
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, cancellationToken);

// GET BY ID
var entity = await repository.GetByIdAsync(id, cancellationToken);
// With eager loading
var entity = await repository.GetByIdAsync(id, cancellationToken,
    loadRelatedEntities: p => p.Employee, p => p.Company);

// GET SINGLE
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// GET MULTIPLE
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// QUERY BUILDERS (Reusable Queries)
var query = repository.GetQuery(uow);
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));

// COUNT
var count = await repository.CountAsync(expr, cancellationToken);

// EXISTS CHECK
var exists = await repository.AnyAsync(expr, cancellationToken);
```

**Repository Extension Pattern**:

```csharp
// Location: PlatformExampleApp.TextSnippet.Domain\Repositories\TextSnippetRepositoryExtensions.cs
public static class TextSnippetRepositoryExtensions
{
    // Get by unique expression
    public static async Task<TextSnippetText> GetByCodeAsync(
        this IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        string code,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetText, object?>>[] loadRelatedEntities)
    {
        return await repository
            .FirstOrDefaultAsync(
                TextSnippetText.FullTextSearchCodeExactMatchExpr(code),
                cancellationToken,
                loadRelatedEntities)
            .EnsureFound();  // Throws if null
    }

    // Get with validation
    public static async Task<List<TextSnippetText>> GetByIdsWithValidationAsync(
        this IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        return await repository
            .GetAllAsync(
                p => ids.Contains(p.Id),
                cancellationToken)
            .EnsureFoundAllBy(p => p.Id, ids);  // Validates all found
    }

    // Projected result (performance optimization)
    public static async Task<string> GetIdByCodeAsync(
        this IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        string code,
        CancellationToken cancellationToken = default)
    {
        return await repository
            .FirstOrDefaultAsync(
                queryBuilder: query => query
                    .Where(TextSnippetText.FullTextSearchCodeExactMatchExpr(code))
                    .Select(p => p.Id),  // Projection - only fetch ID
                cancellationToken: cancellationToken)
            .EnsureFound();
    }
}
```

#### 4. Validation Patterns

```csharp
// ✅ Basic Sync Validation - Use PlatformValidationResult fluent API
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 18, "Employee must be 18 or older")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required")
        .And(_ => Util.TimeZoneParser.TryGetTimeZoneById(TimeZone) != null, "TimeZone is invalid");
}

// ✅ Async Validation - Override ValidateRequestAsync
protected override async Task<PlatformValidationResult<SaveLeaveRequestCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveLeaveRequestCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async request => await employeeRepository
            .GetByIdsAsync(request.WatcherIds, cancellationToken)
            .ThenSelect(existingEmployee => existingEmployee.Id)
            .ThenValidateFoundAllAsync(
                request.WatcherIds,
                notFoundIds => $"Not found watcher ids: {PlatformJsonSerializer.Serialize(notFoundIds)}"))
        .AndAsync(async request => await employeeRepository
            .GetByIdsAsync(request.BackupPersonIds, cancellationToken)
            .ThenSelect(existingEmployee => existingEmployee.Id)
            .ThenValidateFoundAllAsync(
                request.BackupPersonIds,
                notFoundIds => $"Not found Backup Person ids: {PlatformJsonSerializer.Serialize(notFoundIds)}"));
}

// ✅ Negative Validation - AndNotAsync
protected override async Task<PlatformValidationResult<SaveGoalCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveGoalCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation.AndNotAsync(
        request => employeeRepository.AnyAsync(
            p => request.Data.OwnerEmployeeIds.Contains(p.Id) && p.IsExternalUser == true,
            cancellationToken),
        "External users can't create a goal"
    );
}

// ✅ Chained Validation with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return this
        .Validate(p => p.CheckInEventId.IsNotNullOrEmpty(), "CheckInEventId is required")
        .And(
            p => p.UpdateType == ActionTypes.SingleCheckIn ||
                 (p.UpdateType == ActionTypes.SeriesAndFollowingCheckIn &&
                  p.FrequencyInfo != null &&
                  p.ToUpdateCheckInDate.Date >= Clock.UtcNow.Date),
            "New CheckIn date must greater than Current date OR Missing FrequencyInfo")
        .Of<IPlatformCqrsRequest>();
}

// ✅ Ensure Pattern - Inline validation that throws
var toSaveCheckInEvent = await checkInEventRepository
    .GetByIdAsync(request.CheckInEventId, cancellationToken)
    .EnsureFound($"CheckIn Event not found, Id : {request.CheckInEventId}")
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());
```

**Validation Method Naming Conventions**:

| Pattern                  | Return Type                   | Behavior                                        |
| ------------------------ | ----------------------------- | ----------------------------------------------- |
| `Validate[Context]()`    | `PlatformValidationResult<T>` | Never throws, returns validation result         |
| `Ensure[Context]Valid()` | `void` or `T`                 | Throws `PlatformValidationException` if invalid |

- Methods that start with `Validate` should return a validation result, not throw
- Methods that start with `Ensure` are allowed to throw exceptions
- At call site: Use `Validate...().EnsureValid()` instead of creating wrapper `Ensure...` methods
- `EnsureFound()` - Throws if null
- `EnsureFoundAllBy()` - Validates collection completeness
- `ThenValidateFoundAllAsync()` - Async validation helper

#### 5. Cross-Service Communication

```csharp
// ✅ Use Entity Event Bus for cross-service sync
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string>
{
    // Automatically publishes when Employee entities change
}

// Consumer in target service
public class UpsertEmployeeInfoOnEmployeeEntityEventBusConsumer :
    PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEntityEventBusMessage message)
    {
        // Sync only needed fields to local service
    }
}
```

#### 6. Full-Text Search Patterns

```csharp
// ✅ Inject IPlatformFullTextSearchPersistenceService in query handlers
public class GetTextSnippetListQueryHandler : PlatformCqrsQueryApplicationHandler<GetTextSnippetListQuery, GetTextSnippetListQueryResult>
{
    private readonly IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService;
    private readonly IPlatformQueryableRootRepository<TextSnippetText, string> repository;

    public GetTextSnippetListQueryHandler(
        IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService,
        IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        // ... other dependencies
    ) : base(/* ... */)
    {
        this.fullTextSearchPersistenceService = fullTextSearchPersistenceService;
        this.repository = repository;
    }

    protected override async Task<GetTextSnippetListQueryResult> HandleAsync(
        GetTextSnippetListQuery request, CancellationToken cancellationToken)
    {
        // ✅ Use .PipeIf() with full-text search for conditional search
        var queryBuilder = repository.GetQueryBuilder(query =>
            query
                .Where(t => t.IsActive)
                .PipeIf(
                    request.SearchText.IsNotNullOrEmpty(),
                    query => fullTextSearchPersistenceService.Search(
                        query,
                        request.SearchText,
                        TextSnippetText.DefaultFullTextSearchColumns(),  // Define searchable properties
                        fullTextAccurateMatch: true,              // true = exact phrase, false = fuzzy
                        includeStartWithProps: TextSnippetText.DefaultFullTextSearchColumns()
                    )
                )
        );

        // Execute count and paged query in parallel
        var (totalCount, pagedItems) = await (
            repository.CountAsync((uow, query) => queryBuilder(uow, query), cancellationToken),
            repository.GetAllAsync(
                (uow, query) => queryBuilder(uow, query)
                    .OrderByDescending(e => e.CreatedDate)
                    .PageBy(request.SkipCount, request.MaxResultCount),
                cancellationToken)
        );

        return new GetTextSnippetListQueryResult(pagedItems, totalCount, request);
    }
}

// ✅ Define searchable columns in entity
public partial class TextSnippetText : RootEntity<TextSnippetText, string>
{
    public static Expression<Func<TextSnippetText, object>>[] DefaultFullTextSearchColumns()
    {
        return new Expression<Func<TextSnippetText, object>>[]
        {
            e => e.SnippetText,
            e => e.FullTextSearchCode,
            e => e.FullTextSearch  // Special property for full-text indexing
        };
    }
}

// ✅ Alternative: Extension method pattern for reusable search
public static class TextSnippetSearchExtensions
{
    public static IQueryable<TextSnippetText> SearchByText(
        this IQueryable<TextSnippetText> query,
        IPlatformFullTextSearchPersistenceService searchService,
        string searchText)
    {
        if (string.IsNullOrWhiteSpace(searchText))
            return query;

        return searchService.Search(
            query,
            searchText,
            new Expression<Func<TextSnippetText, object>>[]
            {
                p => p.SnippetText,
                p => p.FullTextSearchCode
            },
            fullTextAccurateMatch: true,
            includeStartWithProps: new Expression<Func<TextSnippetText, object>>[]
            {
                p => p.SnippetText,
                p => p.FullTextSearchCode
            });
    }
}
```

**Full-Text Search Key Features:**

- **Multi-Term Search**: "john developer" searches for both terms (AND logic within property)
- **Cross-Property Search**: Searches across multiple properties (OR logic between properties)
- **Database-Specific**: Uses PostgreSQL tsvector, MongoDB $text, SQL Server CONTAINS
- **Flexible Matching**: `fullTextAccurateMatch` controls exact vs fuzzy matching
- **Prefix Support**: `includeStartWithProps` enables auto-complete scenarios
- **Performance**: Leverages database full-text indexes for optimal performance

#### 7. CQRS Implementation Patterns

> **CRITICAL FILE ORGANIZATION RULES:**
>
> - **Command/Query + Handler + Result**: ALL in ONE file (e.g., `SaveGoalCommand.cs` contains Command, CommandResult, and CommandHandler classes)
> - **Reusable Entity DTOs**: Placed in separate `EntityDtos/` folder, extend `PlatformEntityDto<TEntity, TKey>`
> - **Command/Query-specific Results**: Keep in the same file as the Command/Query (not in EntityDtos folder)

**Complete Command File Pattern** (Command + Result + Handler in ONE file):

```csharp
// File: SaveEntityCommand.cs
// This single file contains: Command + Result + Handler

#region

using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Commands;

#endregion

namespace YourService.Application.UseCaseCommands.Entity;

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════════════════════════

public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<IFormFile> Files { get; set; } = [];

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required")
            .And(_ => FromDate <= ToDate, "Invalid date range");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND RESULT (specific to this command, not reusable - stays in same file)
// ═══════════════════════════════════════════════════════════════════════════

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    private readonly IServiceRepository<Entity> repository;

    // Async validation
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEntityCommand> validation, CancellationToken ct)
    {
        return await validation
            .AndAsync(req => repository.GetByIdsAsync(req.RelatedIds, ct)
                .ThenValidateFoundAllAsync(req.RelatedIds, ids => $"Not found: {ids}"));
    }

    // Handler
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        // 1. Get or create
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // 2. Validate and save (parallel operations)
        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        var (saved, files) = await (
            repository.CreateOrUpdateAsync(entity, ct),
            req.Files.ParallelAsync(f => fileService.UploadAsync(f, ct))
        );

        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

**Query Pattern with GetQueryBuilder**:

```csharp
// Query
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

// Handler
internal sealed class GetEntityListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    private readonly IServiceRepository<Entity> repository;
    private readonly IPlatformFullTextSearchPersistenceService searchService;

    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        // Parallel tuple queries
        var (total, items, counts) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct, e => e.RelatedEntity),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
        );

        return new GetEntityListQueryResult(items, total, req, counts.ToDictionary(x => x.Status, x => x.Count));
    }
}
```

**Key Patterns**:

- `GetQueryBuilder((uow, q) => ...)` - Reusable query definitions
- `WhereIf(condition, expr)` - Conditional filtering
- `PipeIf(condition, transform)` - Conditional transformations
- `await (q1, q2, q3)` - Parallel tuple queries
- `.PageBy(skip, take)` - Pagination
- `.Then(transform)` - Result transformation

**Event-Driven Side Effects Pattern (CRITICAL)**:

> **⚠️ NEVER call side effects directly in command handlers.** Side effects include:
>
> - Sending notifications (email, Teams, Slack)
> - Calling external APIs
> - Cross-service communication
> - File operations triggered by entity changes

**Instead, use automatic entity events (platform handles this automatically):**

```csharp
// ❌ WRONG: Direct side effect call in command handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // ❌ Direct call - BAD!
    return new Result { Entity = entity };
}

// ✅ CORRECT: Just save - platform AUTOMATICALLY raises PlatformCqrsEntityEvent
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // NO manual AddDomainEvent() needed! Platform does it automatically.
    await repository.CreateAsync(newEntity, ct);  // Entity event raised automatically
    return new Result { Entity = newEntity };
}

// Entity event handler handles the side effect
// Location: YourService.Application/UseCaseEvents/[Feature]/
// Naming: [Action]On[Event][Entity]EntityEventHandler.cs
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>  // Single generic parameter!
{
    private readonly INotificationService notificationService;

    public SendNotificationOnCreateEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
    }

    // Filter: Only handle Created events - NOTE: async Task<bool>, not bool!
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event,
        CancellationToken ct)
    {
        var entity = @event.EntityData;
        await notificationService.SendAsync(entity); // ✅ In event handler - GOOD!
    }
}
```

**Key Points:**

- **NO manual `AddDomainEvent()` needed** - Platform automatically raises `PlatformCqrsEntityEvent` on repository CRUD
- Use `PlatformCqrsEntityEventApplicationHandler<TEntity>` base class (single generic parameter)
- `HandleWhen()` is `public override async Task<bool>` - NOT `protected override bool`
- Place in `UseCaseEvents/` folder, NOT `DomainEventHandlers/`
- Naming convention: `[Action]On[Event][Entity]EntityEventHandler.cs`
- Filter events using `@event.CrudAction` (Created, Updated, Deleted)
- Access entity data via `@event.EntityData`

**Why event-driven?**

- Side effects trigger regardless of how entity is created (command, job, migration)
- Loose coupling between business logic and side effects
- Single Responsibility Principle compliance
- Easier testing and maintenance

#### 8. Entity Development Patterns

```csharp
// Entity with field tracking and static expressions
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    public string CompanyId { get; set; } = "";

    [JsonIgnore]
    public Company? Company { get; set; }

    // Static expression patterns
    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Entity, bool>> FilterByStatusExpr(List<Status> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => e.Status.HasValue && statusSet.Contains(e.Status.Value);
    }

    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
        => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(
        IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    // Search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code, e => e.Email];

    // Computed properties - MUST have empty set { } for EF Core compatibility
    [ComputedEntityProperty]
    public bool IsRoot
    {
        get => Id == RootId;
        set { }  // Required empty setter
    }

    [ComputedEntityProperty]
    public string FullName
    {
        get => $"{FirstName} {LastName}".Trim();
        set { }  // Required empty setter
    }

    [ComputedEntityProperty]
    public EntityStatus ComputedStatus
    {
        get => CalculateStatus();
        set { }  // Required empty setter
    }

    // Instance methods
    public void Reset() { /* ... */ }

    public static List<string> ValidateEntity(Entity? entity)
    {
        var errors = new List<string>();
        if (entity == null) errors.Add("Entity not found");
        if (!entity.IsActive) errors.Add("Entity inactive");
        return errors;
    }
}
```

**Key Patterns**: `[TrackFieldUpdatedDomainEvent]`, `[ComputedEntityProperty]` (MUST have empty `set { }`), static expressions with `.AndAlso()/.OrElse()`, `DefaultFullTextSearchColumns()`, async expressions, instance validation.

#### 9. Entity DTO Patterns

> **CRITICAL DTO RULES:**
>
> - Reusable Entity DTOs MUST extend `PlatformEntityDto<TEntity, TKey>`
> - Use constructor to map core properties from entity
> - Use `With*` fluent methods for optional/related entity loading
> - Override `GetSubmittedId()`, `MapToEntity()`, and `GenerateNewId()`

```csharp
// Location: YourService.Application\EntityDtos\YourEntityDto.cs
public class EmployeeEntityDto : PlatformEntityDto<Employee, string>
{
    // Empty constructor required
    public EmployeeEntityDto() { }

    // Constructor maps from entity + related entities
    public EmployeeEntityDto(Employee entity, User? userEntity) : base(entity)
    {
        Id = entity.Id;
        EmployeeId = entity.Id!;
        FullName = entity.FullName ?? userEntity?.FullName ?? "";
        Email = userEntity?.Email ?? "";
        Position = entity.Position;
        Status = entity.Status;
        // ... map other core properties
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════
    public string? Id { get; set; }
    public string EmployeeId { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Position { get; set; }
    public EmploymentStatus? Status { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTIONAL LOAD PROPERTIES (populated via With* methods)
    // ═══════════════════════════════════════════════════════════════════════════
    public OrganizationEntityDto? AssociatedCompany { get; set; }
    public List<OrganizationEntityDto>? Departments { get; set; }
    public WorkingShiftEntityDto? WorkingShift { get; set; }
    public EmployeeEntityDto? LineManager { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // WITH* FLUENT METHODS FOR OPTIONAL LOADING
    // ═══════════════════════════════════════════════════════════════════════════
    public EmployeeEntityDto WithFullAssociatedCompany(OrganizationalUnit company)
    {
        AssociatedCompany = new OrganizationEntityDto(company);
        return this;
    }

    public EmployeeEntityDto WithAssociatedDepartments(List<OrganizationalUnit> departments)
    {
        Departments = departments.Select(org => new OrganizationEntityDto(org)).ToList();
        return this;
    }

    public EmployeeEntityDto WithLineManager(EmployeeEntityDto lineManager)
    {
        LineManager = lineManager;
        return this;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLATFORM ENTITY DTO OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════════
    protected override object? GetSubmittedId() => Id;

    protected override string GenerateNewId() => Ulid.NewUlid().ToString();

    protected override Employee MapToEntity(Employee entity, MapToEntityModes mode)
    {
        entity.Position = Position;
        entity.Status = Status;
        return entity;
    }
}

// Usage in Query Handler:
var employees = await repository.GetAllAsync(expr, ct, e => e.User, e => e.Departments);
var dtos = employees.SelectList(e => new EmployeeEntityDto(e, e.User)
    .WithAssociatedDepartments(e.Departments?.SelectList(d => d.OrganizationalUnit!) ?? []));
```

**Key Patterns**:

- `PlatformEntityDto<TEntity, TKey>` - Base class for all reusable entity DTOs
- `With*()` methods - Fluent methods for optional loading (return `this`)
- Constructor takes entity + required related entities
- `GetSubmittedId()` - Returns ID for create vs update detection
- `MapToEntity()` - Maps DTO back to entity for save operations

#### 10. Fluent Helper Patterns

```csharp
// Mutation helpers
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .WithIf(condition, e => e.Status = Status.Active);

// Transformation helpers
var dto = await repository.GetByIdAsync(id)
    .Then(e => e.PerformLogic())
    .ThenAsync(async e => await e.ValidateAsync(service, ct));

// Safety helpers
await entity.ValidateAsync(repo, ct).EnsureValidAsync();
var entity = await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");
var items = await repository.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);

// Expression composition
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds));

// Collection helpers
var ids = await repository.GetByIdsAsync(ids, ct).ThenSelect(e => e.Id);
await items.ParallelAsync(async item => await ProcessAsync(item, ct), maxConcurrent: 10);

// Common patterns
var saved = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Entity {id} not found")
    .With(e => e.Name = newName)
    .Then(e => e.Validate().EnsureValid())
    .ThenAsync(async e => await repository.UpdateAsync(e, ct));

var (entity, files) = await (
    repository.CreateOrUpdateAsync(entity, ct),
    files.ParallelAsync(f => fileService.UploadAsync(f, path, ct))
);
```

**Key Helpers**: `.With()/.WithIf()`, `.Then()/.ThenAsync()`, `.EnsureValid()/.EnsureFound()/.EnsureFoundAllBy()`, `.AndAlso()/.AndAlsoIf()/.OrElse()`, `.ThenSelect()/.ParallelAsync()`.

#### 11. Background Job Patterns

```csharp
// Pattern 1: Simple Paged (skip/take pagination)
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }

    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}

// Pattern 2: Batch Scrolling (two-level: batch keys + entities within batch)
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;      // Entities per company

    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey).Select(e => e.CompanyId).Distinct();

    protected override async Task ProcessEntitiesAsync(List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
    {
        await entities.ParallelAsync(async e => await ProcessEntity(e), maxConcurrent: 1);
    }
}

// Pattern 3: Scrolling (always queries from start, data affected by processing)
public override async Task ProcessAsync(Param param)
{
    await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
        ExecutePaged, await repository.CountAsync(q => QueryBuilder(q, param)) / PageSize, param, PageSize);
}

public static async Task<List<Entity>> ExecutePaged(Param param, int? limitPageSize, IRepo<Entity> repo, IRepo<ProcessedLog> logRepo)
{
    var items = await repo.GetAllAsync(q => QueryBuilder(q, param).OrderBy(e => e.Id).PipeIf(limitPageSize != null, q => q.Take(limitPageSize!.Value)));
    if (items.IsEmpty()) return items;
    await logRepo.CreateManyAsync(items.SelectList(e => new ProcessedLog(e)));  // Excludes from next query
    return items;
}

// Cron schedules
[PlatformRecurringJob("0 0 * * *")]              // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + on startup
```

**When to Use**: Paged (simple sequential), Batch Scrolling (multi-tenant, parallel batches), Scrolling (data changes during processing).

#### 12. Message Bus Patterns

```csharp
// Entity Event Consumer
internal sealed class UpsertOrDeleteEntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    private readonly IServiceRepository<Entity> repository;

    public override async Task<bool> HandleWhen(EntityEventBusMessage msg, string routingKey)
        => true;  // Filter logic here

    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        // CREATE/UPDATE
        if (msg.Payload.CrudAction == Created || (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            // Wait for dependencies
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p)
            );

            if (companyMissing || userMissing) return;  // Skip if dependencies missing

            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity().With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }

        // DELETE
        if (msg.Payload.CrudAction == Deleted || (msg.Payload.CrudAction == Updated && msg.Payload.EntityData.IsDeleted))
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

**Key Patterns**: `HandleWhen()` (filter), `TryWaitUntilAsync()` (wait dependencies), `LastMessageSyncDate` (race condition prevention), `IsForceSyncDataRequest()`.

**Message Naming Convention**:

| Type    | Producer Role | Pattern                                           | Example                                            |
| ------- | ------------- | ------------------------------------------------- | -------------------------------------------------- |
| Event   | Leader        | `<ServiceName><Feature><Action>EventBusMessage`   | `CandidateJobBoardApiSyncCompletedEventBusMessage` |
| Request | Follower      | `<ConsumerServiceName><Feature>RequestBusMessage` | `JobCreateNonexistentJobsRequestBusMessage`        |

- **Event messages**: Producer defines the schema (leader). Named with producer's service name prefix.
- **Request messages**: Consumer defines the schema (leader). Named with consumer's service name prefix.
- **Consumer naming**: Consumer class name matches the message it consumes.

#### 13. Data Migration Patterns

```csharp
// Data migration with paging
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<Entity>> ExecutePaging(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> repo, IPlatformUnitOfWorkManager uow)
    {
        using (var unitOfWork = uow.Begin())
        {
            var items = await repo.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
            await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, cancellationToken: default);
            await unitOfWork.CompleteAsync();
            return items;
        }
    }
}
```

**Key Practices**: `OnlyForDbsCreatedBeforeDate` (target DBs), paged processing, `dismissSendEvent: true` (no events), unit of work for transactions.

### 🎨 Frontend Development Patterns

#### 1. Component Hierarchy

```typescript
// Platform foundation layer
PlatformComponent                    // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             // + ViewModel injection
├── PlatformFormComponent           // + Reactive forms integration
└── PlatformVmStoreComponent        // + ComponentStore state management

// Application framework layer
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error

// Feature implementation layer
EmployeeListComponent extends AppBaseVmStoreComponent
LeaveRequestFormComponent extends AppBaseFormComponent
DashboardComponent extends AppBaseComponent
```

#### 2. Platform Component API Reference

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/src/lib/components/abstracts/`

```typescript
// PlatformComponent - Foundation (lifecycle, signals, subscriptions)
export abstract class PlatformComponent {
  // State signals
  public status$: WritableSignal<ComponentStateStatus>;  // 'Pending'|'Loading'|'Reloading'|'Success'|'Error'
  public isStateLoading/isStateError/isStateSuccess(): Signal<boolean>;
  public errorMsg$(): Signal<string | undefined>;

  // Multi-request state tracking
  public observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
  public isLoading$(requestKey?: string): Signal<boolean | null>;
  public getErrorMsg$(requestKey?: string): Signal<string | undefined>;

  // Subscription management
  public untilDestroyed<T>(): MonoTypeOperatorFunction<T>;

  // Response handling
  protected tapResponse<T>(nextFn?, errorFn?, completeFn?): OperatorFunction<T, T>;

  // Effects
  public effectSimple<T, R>(...): ReturnType;
}

// PlatformVmComponent - ViewModel management
export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
  public get vm(): WritableSignal<TViewModel | undefined>;
  public currentVm(): TViewModel;
  protected updateVm(partialOrUpdaterFn, onVmChanged?, options?): TViewModel;
  @Input('vm') vmInput; @Output('vmChange') vmChangeEvent;
  protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}

// PlatformVmStoreComponent - ComponentStore integration
export abstract class PlatformVmStoreComponent<TViewModel, TStore> extends PlatformComponent {
  constructor(public store: TStore) {}
  public get vm(): Signal<TViewModel | undefined>;
  public currentVm(): TViewModel;
  public updateVm(partialOrUpdaterFn, options?): void;
  public reload(): void;  // Reloads all stores
}

// PlatformFormComponent - Reactive forms
export abstract class PlatformFormComponent<TViewModel> extends PlatformVmComponent<TViewModel> {
  public get form(): FormGroup<PlatformFormGroupControls<TViewModel>>;
  public formStatus$: WritableSignal<FormControlStatus>;
  public get mode(): PlatformFormMode;  // 'create'|'update'|'view'
  public isViewMode/isCreateMode/isUpdateMode(): boolean;
  public validateForm(): boolean;
  public formControls(key: keyof TViewModel): FormControl;
  protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}

// Usage examples
export class UserListComponent extends PlatformComponent {
  private loadUsers() {
    this.userService.getUsers()
      .pipe(
        this.observerLoadingErrorState('loadUsers'),
        this.tapResponse(users => this.users = users),
        this.untilDestroyed()
      ).subscribe();
  }
}

export class UserListStore extends PlatformVmStore<UserListVm> {
  public loadUsers = this.effectSimple(() =>
    this.userApi.getUsers().pipe(this.tapResponse(users => this.updateState({ users }))));
  public readonly users$ = this.select(state => state.users);
}

export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
  constructor(store: UserListStore) { super(store); }
  onRefresh() { this.reload(); }
}

export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      email: new FormControl(this.currentVm().email, [Validators.required, Validators.email],
        [ifAsyncValidator(() => !this.isViewMode, checkIsEmployeeEmailUniqueAsyncValidator(...))])
    },
    dependentValidations: { email: ['firstName'] }
  });

  onSubmit() {
    if (this.validateForm()) { /* process this.currentVm() */ }
  }
}
```

#### 3. API Service Pattern

```typescript
@Injectable({ providedIn: "root" })
export class EmployeeApiService extends PlatformApiService {
  protected get apiUrl() {
    return environment.apiUrl + "/api/Employee";
  }
  getEmployees(query?: Query): Observable<Employee[]> {
    return this.get<Employee[]>("", query);
  }
  saveEmployee(cmd: SaveCommand): Observable<Result> {
    return this.post<Result>("", cmd);
  }
  searchEmployees(criteria: Search): Observable<Employee[]> {
    return this.post("/search", criteria, { enableCache: true });
  }
}
```

#### 4. Working Examples Reference

**Working Example Application**: `src/PlatformExampleAppWeb/apps/playground-text-snippet/`

The playground-text-snippet app demonstrates all platform patterns:

- Component hierarchy with PlatformVmStoreComponent
- State management with PlatformVmStore
- API services with PlatformApiService
- Form handling with reactive forms

```typescript
// FormArray pattern example
protected initialFormConfig = () => ({
  controls: {
    specifications: {
      modelItems: () => vm.specifications,
      itemControl: (spec, index) => new FormGroup({
        name: new FormControl(spec.name, [Validators.required]),
        value: new FormControl(spec.value, [Validators.required])
      })
    }
  },
  dependentValidations: { price: ['category'] }
});
```

**Study Path**: Start with `src/PlatformExampleApp/` (backend) → `src/PlatformExampleAppWeb/apps/playground-text-snippet/` (frontend).

### 🧩 Platform-Core Library Reference

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/`

```typescript
// Foundation: Extend PlatformComponent base classes
export class MyComponent extends PlatformComponent { }
export class MyVmComponent extends PlatformVmComponent<MyViewModel> { }
export class MyStoreComponent extends PlatformVmStoreComponent<MyViewModel, MyStore> { }

// State Management: PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyViewModel> {
  public loadData = this.effectSimple(() =>
    this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))));
}

// API Services: Extend PlatformApiService
@Injectable({ providedIn: 'root' })
export class MyApiService extends PlatformApiService {
  protected get apiUrl() { return environment.apiUrl + '/api/my'; }
}

// Utilities: Import from platform-core
import { date_format, list_groupBy, string_isEmpty, immutableUpdate } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })
```

## 🔐 Authorization Patterns

```csharp
// Backend: Controller level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost] public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));

// Backend: Command handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company only");
}

// Backend: Entity-level query filter
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage
var employees = await repository.GetAllAsync(Employee.OfCompanyExpr(companyId).AndAlso(Employee.UserCanAccessExpr(userId, companyId)), ct);
```

```typescript
// Frontend: Component properties
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }
    get canDelete() { return this.hasRole(PlatformRoles.Admin); }
}

// Frontend: Template guards
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Frontend: Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

## 🔄 Migration Patterns

```csharp
// EF Core migration
public partial class AddEmployeeFields : Migration
{
    protected override void Up(MigrationBuilder mb) { mb.AddColumn<string>("Department", "Employees"); }
}
// Commands: dotnet ef migrations add AddEmployeeFields | dotnet ef database update

// MongoDB migration (with pagination)
public class MigrateEmployeeData : PlatformMongoMigrationExecutor
{
    public override string Name => "20240115_MigrateEmployeeData";

    public override async Task Execute()
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(...)),
            pageSize: 200,
            async (skip, take, repo, uow) => {
                var items = await repo.GetAllAsync(q => q.Skip(skip).Take(take));
                await repo.UpdateManyAsync(items, dismissSendEvent: true);
                return items;
            });
    }
}

// Cross-DB migration (first-time setup only, use events for ongoing sync)
public class SyncDataFromSourceToTarget : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);

    public override async Task Execute(TargetDbContext dbContext)
    {
        var sourceEntities = await sourceDbContext.Entities.Where(e => e.CreatedDate < cutoffDate).ToListAsync();
        await targetRepository.CreateManyAsync(sourceEntities.Select(e => e.MapToTargetEntity()));
    }
}
```

## 🛠️ Helper vs Util Decision Guide

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
│   └── Location: YourService.Application\Helpers\YourHelper.cs
│   └── Example: GetOrCreateEntityAsync(id, ct)
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils or YourService.Application.Utils
    └── Example: StringUtil.IsNullOrEmpty(), DateUtil.Format()

Cross-Cutting Logic (used in multiple domains)?
├── YES → Platform Util (Easy.Platform.Application.Utils)
└── NO → Domain Util (YourService.Application.Utils)
```

```csharp
// Helper pattern (with dependencies)
public class TextSnippetHelper
{
    private readonly IPlatformQueryableRootRepository<TextSnippetText, string> repository;

    public async Task<TextSnippetText> GetOrCreateSnippetAsync(string code, CancellationToken ct)
    {
        return await repository.FirstOrDefaultAsync(t => t.FullTextSearchCode == code, ct)
            ?? await CreateSnippetAsync(code, ct);
    }

    public static bool IsActiveSnippet(TextSnippetText snippet)
        => snippet.IsActive && snippet.CreatedDate.HasValue;
}

// Util pattern (pure functions)
public static class EmployeeUtil
{
    public static string GetFullName(Employee e) => $"{e.FirstName} {e.LastName}".Trim();
    public static bool IsActive(Employee e) => e.Status == EmploymentStatus.Active && !e.TerminationDate.HasValue;
    public static List<Employee> FilterByDepartment(List<Employee> employees, string deptId)
        => employees.Where(e => e.Departments?.Any(d => d.Id == deptId) == true).ToList();
}
```

## 🔥 Advanced Patterns Reference

### Backend Advanced Patterns

```csharp
// List Extension Methods (100+ file usages) - Platform.Common.Extensions
.IsNullOrEmpty() / .IsNotNullOrEmpty()
.RemoveWhere(predicate, out removedItems)
.UpsertBy(keySelector, items, updateFn)
.ReplaceBy(keySelector, newItems, updateFn)
.SelectList(selector)  // Like Select().ToList()
.ThenSelect(selector)  // For Task<List<T>>
.ForEachAsync(async action, maxConcurrent)
.AddDistinct(item, keySelector)

// DTO Mapping Pattern (300+ usages)
// In Command: public EntityDto BuildToSaveDto(IPlatformApplicationRequestContext ctx)
// In DTO: public Entity MapToNewEntity() / UpdateToEntity(Entity existing)
var entity = dto.NotHasSubmitId()
    ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
    : await repository.GetByIdAsync(dto.Id, ct).Then(existing => dto.UpdateToEntity(existing));

// Request Context Methods (500+ usages)
RequestContext.CurrentCompanyId() / .UserId() / .ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()

// Task Tuple Await Pattern (Custom GetAwaiter for parallel queries)
var (users, companies, settings) = await (
    userRepository.GetAllAsync(...),
    companyRepository.GetAllAsync(...),
    settingsRepository.GetAllAsync(...)
);

// Helper Class Pattern (IPlatformHelper - inject RequestContextAccessor)
public sealed class EmployeeHelper : IPlatformHelper
{
    private readonly IPlatformApplicationRequestContext requestContext;
    public EmployeeHelper(IPlatformApplicationRequestContextAccessor contextAccessor, ...) {
        requestContext = contextAccessor.Current; // Extract .Current
    }
}

// Domain Service Pattern (Strategy for permissions)
public static class PermissionService {
    private static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<Employee, bool>> GetCanManageEmployeesExpr(IList<string> roles, ...)
        => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr(...)));
}

// Parallel Tuple Queries (count + data + aggregation simultaneously)
var (total, items, statusCounts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct, e => e.Related),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).GroupBy(e => e.Status).Select(g => new { Status = g.Key, Count = g.Count() }), ct)
);

// Object Deep Comparison (change detection)
if (propertyInfo.GetValue(entity).IsValuesDifferent(propertyInfo.GetValue(existingEntity)))
    entity.AddFieldUpdatedEvent(propertyInfo, oldValue, newValue);

// Task Extensions
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repository.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)

// Conditional Actions (.PipeActionIf, .PipeActionAsyncIf)
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .PipeActionIf(condition, e => e.UpdateTimestamp())
    .PipeActionAsyncIf(async () => await externalService.Any(), async e => await e.SyncExternal());

// Background Job Coordination (Master schedules child jobs)
await companies.ParallelAsync(async companyId =>
    await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
        BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = companyId, Date = date })));

// Message Bus Dependency Wait with Timeout
var (companyMissing, userMissing) = await (
    Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == msg.CompanyId), maxWaitSeconds: msg.IsForceSync ? 30 : 300).Then(p => !p),
    Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == msg.UserId), maxWaitSeconds: 300).Then(p => !p)
);
if (companyMissing || userMissing) return; // Skip if dependencies missing

// Negative Validation (.AndNotAsync)
return await validation.AndNotAsync(req => repository.AnyAsync(e => req.Ids.Contains(e.Id) && e.IsExternal, ct), "Externals not allowed");

// Repository Projection (fetch only needed fields)
return await repository.FirstOrDefaultAsync(query => query.Where(Employee.UniqueExpr(userId)).Select(e => e.Id), ct).EnsureFound();

// Advanced Expression Composition
public static Expression<Func<Employee, bool>> CanBeReviewParticipantExpr(int scope, string companyId, int? minMonths, string? eventId)
    => OfficialEmployeeExpr(scope, companyId)
        .AndAlso(e => e.User != null && e.User.IsActive)
        .AndAlsoIf(minMonths != null, () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value))
        .AndAlsoIf(eventId.IsNotNullOrEmpty(), () => e => e.ReviewParticipants.Any(p => p.EventId == eventId));
```

### Frontend Advanced Patterns

```typescript
// @Watch Decorator (property change detection)
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
  @Watch('onPageResultChanged')
  public pagedResult?: PagedResult<Item>;

  @WatchWhenValuesDiff('performSearch')  // Only triggers on actual value change
  public searchTerm: string = '';

  private onPageResultChanged(value: PagedResult<Item> | undefined, change: SimpleChange<PagedResult<Item>>) {
    if (!change.isFirstTimeSet) this.updateUI();
  }

  private performSearch(term: string) {
    this.apiService.search(term).pipe(this.untilDestroyed()).subscribe(results => this.results = results);
  }
}

// Custom RxJS Operators
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

this.search$.pipe(
  skipDuplicates(500),                         // Skip duplicates within 500ms
  applyIf(this.isEnabled$, debounceTime(300)), // Conditional operator
  onCancel(() => this.cleanup()),              // Handle cancellation
  tapOnce({ next: v => this.initOnce(v) }),   // Execute only on first emission
  distinctUntilObjectValuesChanged(),          // Deep object comparison
  this.untilDestroyed()
).subscribe();

// Advanced Form Validators
import { ifAsyncValidator, startEndValidator, noWhitespaceValidator, validator } from '@libs/platform-core';

new FormControl('', [
  Validators.required,
  noWhitespaceValidator,
  startEndValidator('invalidRange', ctrl => ctrl.parent?.get('start')?.value, ctrl => ctrl.value, { allowEqual: false })
], [
  ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator)  // Only run if sync valid
]);

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />

// Utility Functions (complete API)
import {
  date_addDays, date_format, date_timeDiff,
  list_groupBy, list_distinctBy, list_sortBy,
  string_isEmpty, string_truncate, string_toCamelCase,
  dictionary_map, dictionary_filter, dictionary_values,
  immutableUpdate, deepClone, removeNullProps,
  guid_generate, task_delay, task_debounce
} from '@libs/platform-core';

// PlatformComponent Missing APIs
export class MyComponent extends PlatformComponent {
  // Track-by for performance
  trackByItem = this.ngForTrackByItemProp<User>('id');
  trackByList = this.ngForTrackByImmutableList(this.users);

  // Named subscription management
  protected storeSubscription('dataLoad', this.data$.subscribe(...));
  protected cancelStoredSubscription('dataLoad');

  // Multiple request state
  isLoading$('request1'); isLoading$('request2');
  getAllErrorMsgs$(['req1', 'req2']);
  loadingRequestsCount(); reloadingRequestsCount();

  // Dev-mode validation
  protected get devModeCheckLoadingStateElement() { return '.spinner'; }
  protected get devModeCheckErrorStateElement() { return '.error'; }
}

// PlatformVmStore Missing APIs
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);
  protected beforeInitVm = () => this.loadInitialData();

  public loadData = this.effectSimple(() =>
    this.apiService.getData().pipe(
      this.observerLoadingErrorState('loadData'),
      this.tapResponse(data => this.updateState({ data }))
    ));

  // State selectors
  public readonly data$ = this.select(state => state.data);
  public readonly loading$ = this.isLoading$('loadData');
}
```

## 🚨 Critical Anti-Patterns to Avoid

### ❌ Backend Anti-Patterns

```csharp
// ❌ DON'T: Direct cross-service database access
var otherServiceData = await otherDbContext.Entities.ToListAsync();

// ✅ DO: Use message bus communication
await messageBus.PublishAsync(new RequestDataMessage());

// ❌ DON'T: Custom repository interfaces
public interface ICustomEntityRepository : IRepository<Entity>

// ✅ DO: Use platform repositories with extensions
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Entity, string> repository,
        string code)
}

// ❌ DON'T: Manual validation logic
if (string.IsNullOrEmpty(request.Name)) throw new ValidationException();

// ✅ DO: Use Platform validation fluent API
return request.Validate(r => !string.IsNullOrEmpty(r.Name), "Name required");

// ❌ DON'T: Call side effects directly in command handlers
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // ❌ Direct call breaks event-driven architecture!
    return new Result();
}

// ✅ DO: Let platform auto-raise entity events - handle side effects in event handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // NO AddDomainEvent() needed! Platform auto-raises PlatformCqrsEntityEvent on CRUD
    await repository.CreateAsync(newEntity, ct);  // Event handler sends notification
    return new Result();
}

// Event handler filters and processes (in UseCaseEvents/ folder)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>  // Single generic param!
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}

// ❌ DON'T: Map DTO to entity/value object in command/query handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = new AuthConfigurationValue  // ❌ Mapping logic in handler!
    {
        ClientId = req.Dto.ClientId,
        ClientSecret = req.Dto.ClientSecret,
        BaseUrl = req.Dto.BaseUrl
    };
}

// ✅ DO: Use PlatformDto/PlatformEntityDto - let DTO own mapping responsibility
// DTO class extends PlatformDto<TValueObject> or PlatformEntityDto<TEntity, TKey>
public sealed class AuthConfigurationValueDto : PlatformDto<AuthConfigurationValue>
{
    public override AuthConfigurationValue MapToObject() => new AuthConfigurationValue
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret,
        BaseUrl = BaseUrl
    };
}

// Handler uses dto.MapToObject().With() for any post-mapping transformations
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = req.AuthConfiguration.MapToObject()
        .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));  // ✅ DTO maps, handler transforms
}
```

### ❌ Frontend Anti-Patterns

```typescript
// ❌ DON'T: Direct HTTP client usage
constructor(private http: HttpClient) {}

// ✅ DO: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}

// ❌ DON'T: Manual state management
employees = signal([]);
loading = signal(false);

// ✅ DO: Use platform store pattern
constructor(private store: EmployeeStore) {}

// ❌ DON'T: Assume method names without verification
this.someMethod(); // Might not exist on base class

// ✅ DO: Check base class APIs first through IntelliSense
```

## 🔧 Development Tools & Environment

### 📋 Required VS Code Extensions

```json
{
  "recommendations": [
    "angular.ng-template", // Angular language service
    "esbenp.prettier-vscode", // Code formatting
    "ms-dotnettools.csharp", // C# language support
    "nrwl.angular-console", // Nx workspace tools
    "dbaeumer.vscode-eslint", // TypeScript linting
    "firsttris.vscode-jest-runner", // Jest test runner
    "sonarsource.sonarlint-vscode", // Code quality analysis
    "eamodio.gitlens", // Git integration
    "streetsidesoftware.code-spell-checker" // Spell checking
  ]
}
```

### 🚀 Development Scripts & Commands

```bash
# Backend development
dotnet build EasyPlatform.sln                  # Build entire solution
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api  # Run example API

# Frontend development
cd src/PlatformExampleAppWeb
npm install                                    # Install dependencies
nx serve playground-text-snippet               # Start playground app
nx build playground-text-snippet               # Build app
nx test platform-core                          # Test platform-core library

# Docker infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d  # Start services

# Testing
dotnet test [Project].csproj                   # Run unit tests
```

### 🗄️ Database Connections (Development)

```
SQL Server:    localhost,14330     (sa / 123456Abc)
MongoDB:       localhost:27017     (root / rootPassXXX)
PostgreSQL:    localhost:54320     (postgres / postgres)
Redis:         localhost:6379
RabbitMQ:      localhost:15672     (guest / guest)
```

## 📊 Quick Decision Trees

### Backend Task Decision

```
Need to add backend feature?
├── New API endpoint? → Use PlatformBaseController + CQRS Command
├── Business logic? → Create Command Handler in Application layer
├── Data access? → Extend microservice-specific repository
├── Cross-service sync? → Create Entity Event Consumer
├── Scheduled task? → Create PlatformApplicationBackgroundJob
├── MongoDB migration? → Use PlatformMongoMigrationExecutor
└── SQL migration? → Use EF Core migrations
```

### Frontend Task Decision

```
Need to add frontend feature?
├── Simple component? → Extend PlatformComponent
├── Complex state? → Use PlatformVmStoreComponent + PlatformVmStore
├── Forms? → Extend PlatformFormComponent with validation
├── API calls? → Create service extending PlatformApiService
├── Cross-domain logic? → Add to apps-domains shared library
├── Domain-specific? → Add to apps-domains/{domain}/ module
└── Cross-app reusable? → Add to platform-core library
```

### Repository Pattern Decision

```
Repository needs?
├── Primary choice? → Use IPlatformQueryableRootRepository<TEntity, TKey>
├── Complex queries? → Create RepositoryExtensions with static expressions
├── When queryable not needed? → Use IPlatformRootRepository<TEntity, TKey>
└── Cross-service data? → Use message bus instead
```

## 🏷️ Code Templates & Scaffolding

### Backend Command Template

```csharp
// Command
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Name), "Name is required");
    }
}

// Handler
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command request, CancellationToken cancellationToken)
    {
        // Implementation following platform patterns
    }
}
```

### Frontend Component Template

```typescript
@Component({
    selector: 'app-{entity}-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.items; track item.id) {
                    <div>{{ item.name }}</div>
                }
            }
        </app-loading-and-error-indicator>
    `,
    providers: [{Entity}Store]
})
export class {Entity}Component extends AppBaseVmStoreComponent<{Entity}State, {Entity}Store> {
    ngOnInit() {
        this.store.load{Entity}s();
    }
}
```

## 🎯 Success Metrics & Quality Gates

### ✅ Code Quality Checklist

- [ ] Follows Clean Architecture layers correctly
- [ ] Uses platform validation patterns (PlatformValidationResult)
- [ ] Implements proper error handling with platform patterns
- [ ] Uses microservice-specific repositories
- [ ] Follows step-by-step code flow with clear separation
- [ ] Includes unit tests for business logic
- [ ] Uses platform component hierarchy correctly
- [ ] Implements proper state management patterns

### ✅ Architecture Compliance

- [ ] No direct cross-service dependencies
- [ ] Uses message bus for cross-service communication
- [ ] Follows dependency injection patterns
- [ ] Uses platform framework components
- [ ] Maintains consistent abstraction levels
- [ ] Implements proper caching strategies

### ✅ Performance & Security

- [ ] Uses `ConfigureAwait(false)` in library code
- [ ] Implements parameterized queries (automatic with EF)
- [ ] Adds proper authorization checks
- [ ] Uses async/await patterns correctly
- [ ] Implements input validation
- [ ] Follows secure coding practices

## 🆘 Troubleshooting & Support

### Common Issues & Solutions

| Issue                      | Solution                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| Build failures             | Check platform package versions and run `dotnet restore`          |
| Missing repositories       | Search for I{ServiceName}PlatformRootRepository in Domain project |
| Component not found        | Verify inheritance chain and check available base class methods   |
| API calls failing          | Verify service is running and check endpoint routes               |
| Database connection issues | Ensure infrastructure is started with dev-start scripts           |

### Getting Help

1. **Study Platform Example:** `src/PlatformExampleApp` for working patterns
2. **Search Documentation:** Do semantic search and grep search tools
3. **Check Existing Implementations:** Look for similar features in the codebase
4. **Follow Training Materials:** See README.md learning paths section

---

## 🔮 AI Agent Execution Guidelines

**CRITICAL SUCCESS FACTORS:**

1. **Evidence-Based Development:** Always Do grep search and semantic search to verify patterns before implementing
2. **Platform-First Approach:** Use established Easy.Platform patterns over custom solutions
3. **Service Boundary Respect:** Never assume service responsibilities - verify through code analysis
4. **Component Method Verification:** Always check base class APIs through IntelliSense before using methods
5. **Cross-Service Communication:** Use Entity Event Bus patterns, never direct database access
6. **Repository Pattern Priority:** Use IPlatformQueryableRootRepository<TEntity, TKey> for data access

**INVESTIGATION WORKFLOW:** Domain concepts → semantic search → grep search → Service discovery → Evidence assessment → Platform patterns → Implementation

Remember: EasyPlatform is a framework with established patterns. Your role is to extend and enhance using existing architectural foundations, not to reinvent or create custom solutions.

## IMPORTANT UNIVERSAL CLEAN CODE RULES

- Do not repeat code logic or patterns. Reuse code.
- Follow SOLID principles and Clean Architecture patterns
- Method Design: Single Responsibility; Consistent abstraction level: Don't mix high-level and low-level operations; Dont mix infrastructure or technical logic into application, domain layer like QueryHandler/CommandHandler.
- Use meaningful, descriptive names that explain intent
- Classes/Interfaces: PascalCase (UserService, IRepository)
- Methods/Functions: PascalCase (C#), camelCase (TypeScript) (GetUserById, getUserById)
- Variables/Fields: camelCase (userName, isActive)
- Constants: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
- Boolean variables: Use is, has, can, should prefixes (isVisible, hasPermission)
- Code Organization: Group related functionality together; Separate concerns (business logic, data access, presentation); Use meaningful file/folder structure; Keep dependencies flowing inward (Dependency Inversion)
- Code Flow (Step-by-Step Pattern): Clear step-by-step flow with spacing; Group parallel operations (no dependencies) together; Follow Input → Process → Output pattern; Use early validation and guard clauses;
- Responsibility Placement: Business logic belongs to domain entities. Use static expressions for queries in entities. Instance validation methods in entities. DTO creation belongs to DTO classes.
- DTO Mapping Responsibility (CRITICAL): Mapping from DTO to entity/value object is ALWAYS the DTO's responsibility, NOT the command/query handler. For reusable DTOs that represent entities or value objects, always use `PlatformDto<TValueObject>` or `PlatformEntityDto<TEntity, TKey>`. Handler only calls `dto.MapToObject()` and uses `.With()` for post-mapping transformations (e.g., encryption). Internal command/query-specific objects (result DTOs, request-specific models) remain the handler's responsibility.
- 90% Logic Rule: If 90% of the logic belongs to class A, the logic should be placed in class A, not in a third-party class B. Only when logic spans multiple classes (A, B, C) and doesn't fit any as main responsibility, place it in an orchestrator (helper, service, or handler).
- Code Reuse & Duplication Prevention: Before writing new code, search for existing implementations. If similar logic exists, extract and reuse. Never duplicate mapping logic, validation logic, or business rules across handlers.
- Validation Patterns: Use PlatformValidationResult fluent API. Chain validation with .And(), .AndAsync(), .AndNot() methods. Return validation results with meaningful error messages. Validation Methods: Validate[Context]Valid, Has[Property], Is[State], Not[Condition]. Ensure Methods: Ensure[Context]Valid (returns object or throws).
- Collections: Always use plural names (users, orders, items)
