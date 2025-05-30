---
applyTo: '**'
---

# 🤖 AI Agent Coding Guidelines for BravoSUITE

## ⚡ CRITICAL - READ FIRST ⚡

**🚨 AI Agent Success Protocol:**

1. **Always start here** → Use this index to find relevant patterns
2. **Evidence-based approach** → Use `grep_search()` and `semantic_search()` to verify assumptions
3. **Service boundary discovery** → Find ports/endpoints before assuming service responsibilities
4. **Never assume** → Always verify implementation patterns with actual code
5. **Follow platform patterns** → Use established templates and avoid custom solutions

## 🎯 AI Agent Investigation Workflow

```text
CRITICAL: When given a task →
1. Read requirement → Extract domain concepts
2. semantic_search() → Understand business context
3. grep_search() → Find implementation patterns
4. Service discovery → Verify boundaries via ports/endpoints
5. Evidence assessment → Primary (80%+) vs Secondary (optional) (20%) services
6. Platform patterns → Use templates below, don't invent new patterns
```

### 🔍 Real-World Investigation Examples

#### Example 1: "Add email notification when leave request is approved"

```text
✅ CORRECT Investigation Flow:
1. semantic_search("leave request approval email notification")
   → Understand existing notification patterns
2. grep_search("LeaveRequest.*approved|approved.*LeaveRequest")
   → Find approval logic and handlers
3. grep_search("email.*notification|notification.*email")
   → Discover email service patterns
4. Service discovery: Check if bravoGROWTH handles notifications or uses NotificationMessage service
5. Evidence assessment: Find EntityEventHandler for LeaveRequest status changes
6. Implementation: Use existing platform email patterns, don't create custom email logic

❌ WRONG approach: Assume bravoGROWTH handles all HR notifications without verification
```

#### Example 2: "Stop sending emails to resigned recruiters"

```text
✅ CORRECT Investigation Flow:
1. semantic_search("resigned recruiter email")
   → Understand recruiter management context
2. grep_search("resigned|recruitment.*email|recruiter.*email")
   → Find email sending patterns for recruiters
3. Service discovery: Verify if bravoTALENTS or bravoGROWTH manages recruiter status
4. grep_search("EmailService|SendEmail")
   → Find actual email sending implementations
5. Evidence assessment: Determine primary service (likely bravoTALENTS for recruiters)
6. Implementation: Add resignation check in email service or use entity events to sync status

❌ WRONG approach: Modify email logic without understanding where recruiter status is managed
```

#### Example 3: "Add performance review module"

```text
✅ CORRECT Investigation Flow:
1. semantic_search("performance review")
   → Check for existing performance review features
2. grep_search("performance|review|appraisal")
   → Find related entities and patterns
3. Service discovery: Determine if bravoGROWTH or new service should handle this
4. grep_search("Employee.*evaluation|goal.*management")
   → Find related domain concepts
5. Evidence assessment: Check existing employee management patterns in bravoGROWTH
6. Implementation: Follow CQRS patterns, entity events, and existing HR module structure

❌ WRONG approach: Create isolated performance review service without checking existing HR patterns
```

## 🚨 Critical AI Agent Mistakes to Avoid

### ❌ Investigation Mistakes

-   **Assuming service responsibilities** without grep_search evidence
-   **Targeting wrong service** based on naming/architectural assumptions
-   **Missing primary background job infrastructure** in service discovery
-   **Not checking actual implementation patterns** before planning changes

### ❌ Implementation Mistakes

-   **Direct cross-service database access** (use Entity Event Bus instead)
-   **Custom repository interfaces** (use platform repository + extensions)
-   **Manual validation logic** (use PlatformValidationResult fluent API)
-   **Ignoring platform patterns** (always check templates first)

### ✅ Success Patterns

-   **Evidence-based service targeting** using grep_search results
-   **Platform-first approach** using established templates
-   **Cross-service sync via events** never direct dependencies
-   **Repository extensions** instead of custom interfaces

# Quick Reference Index 🔍

## 🚀 Critical Patterns for AI Agents (Use These First!)

### Backend Core Patterns

-   **[CQRS Commands](#backend-templates)** → `SaveLeaveRequestCommand` with validation pipeline
-   **[Repository Extensions](#repository-extensions-pattern)** → `ICandidatePlatformRootRepository<Employee>` over generic repos
-   **[Entity Events](#2-domain-entity-change-tracking)** → `[TrackFieldUpdatedDomainEvent]` auto-tracking
-   **[Message Bus](#cross-service-data-synchronization-patterns)** → Cross-service sync via events
-   **[Data Migration](#8-platform-data-migration-advanced-pagination)** → MongoDB migrations with pagination

### Frontend Core Patterns

-   **[Component Store](#2-state-management-with-stores)** → `PlatformVmStore<State>` with effects
-   **[API Services](#3-api-services)** → `extends PlatformApiService` pattern
-   **[Form Components](#4-form-components)** → `AppBaseFormComponent<T>` validation
-   **[Loading States](#component-with-advanced-state-management)** → Automatic loading/error handling

## 🎯 AI Agent Decision Trees

### When Creating Backend Features

```text
Need new feature?
├── CRUD operations? → [Repository Extensions](#repository-extensions-pattern)
├── Business logic? → [CQRS Command Handler](#new-cqrs-command-template)
├── Cross-service sync? → [Entity Event Consumer](#new-entity-event-consumer-template)
├── Scheduled tasks? → [Background Jobs](#6-background-jobs-with-pagination)
└── Data changes? → [MongoDB Migration](#mongodb-persistence-guidance)
```

### When Creating Frontend Features

```text
Need new UI?
├── Simple display? → [PlatformComponent](#new-component-with-store-template)
├── Data management? → [PlatformVmStore](#new-component-with-store-template)
├── Forms? → [AppBaseFormComponent](#new-form-component-template)
├── API calls? → [PlatformApiService](#domain-api-service-implementation)
└── Complex state? → [ComponentStore patterns](#platform-core-usage-patterns-in-project-apps)
```

## 📍 Quick Navigation by Task

### Backend Development

-   **[Module Setup](#1-platform-module-system)** → `PlatformApplicationModule` configuration
-   **[Validation](#validation-standards)** → `PlatformValidationResult` fluent API
-   **[Request Context](#3-request-context-extensions-with-lazy-loading)** → Lazy-loaded user context
-   **[Performance & Monitoring](#performance-and-monitoring-patterns)** → Profiling, caching, and optimization
-   **[Environment Deployment](#environment-specific-configuration)** → Dev, UAT, Production configs
-   **[Background Jobs](#6-background-jobs-with-pagination)** → `PlatformApplicationBackgroundJobExecutor`
-   **[Data Seeding](#9-platform-data-seeder-patterns)** → `PlatformApplicationDataSeeder`

### Frontend Development

-   **[State Management](#frontend-code-patterns-webv2)** → Store patterns and effects
-   **[Authorization](#5-authorization--navigation)** → Role-based guards and display
-   **[Error Handling](#6-loading-and-error-handling)** → Platform error patterns
-   **[File Uploads](#form-component-with-platform-integration)** → Multipart form handling

### Cross-Cutting Concerns

-   **[Anti-Patterns](#-anti-patterns--common-mistakes)** → What NOT to do
-   **[Troubleshooting](#-troubleshooting-guide)** → Common issues & solutions
-   **[Code Templates](#-quick-code-templates)** → Copy-paste starting points

## 🏷️ Search Tags by Category

### Backend Tags

`#cqrs-command` `#repository-pattern` `#entity-event` `#message-bus` `#background-job` `#data-migration` `#mongodb` `#validation` `#request-context` `#platform-module` `#domain-service`

### Frontend Tags

`#component-store` `#api-service` `#form-validation` `#platform-component` `#loading-state` `#error-handling` `#authorization` `#angular19` `#nx-workspace`

### Architecture Tags

`#microservices` `#clean-architecture` `#cqrs` `#event-driven` `#cross-service-sync` `#anti-patterns` `#file-structure` `#naming-conventions`

### Feature Tags

`#file-upload` `#pagination` `#caching` `#authentication` `#permissions` `#real-time` `#notifications` `#testing` `#performance`

## 🤖 Common AI Agent Tasks & Solutions

### "Create a new feature"

1. **Backend**: Start with [CQRS Command Template](#new-cqrs-command-template)
2. **Frontend**: Use [Component + Store Template](#new-component-with-store-template)
3. **API**: Follow [PlatformApiService pattern](#domain-api-service-implementation)

### "Add validation"

-   **Command**: Override `Validate()` method ([Validation Standards](#validation-standards))
-   **Form**: Use `AppBaseFormComponent` ([Form Validation](#new-form-component-template))
-   **Entity**: Use `PlatformValidationResult` fluent API

### "Sync data between services"

-   **Never**: Direct database access between services ❌
-   **Always**: Use [Entity Event Bus Consumers](#cross-service-data-synchronization-patterns)
-   **Pattern**: Producer → RabbitMQ → Consumer

### "Handle file uploads"

-   **Backend**: `postFileMultiPartForm` in API service
-   **Frontend**: Use `IFormFile` in commands ([File Upload Handling](#form-component-with-platform-integration))

### "Create background jobs"

-   Use [PlatformApplicationBackgroundJobExecutor](#6-background-jobs-with-pagination)
-   Add `[PlatformRecurringJob]` attribute for scheduled tasks

### "Migrate database"

-   **MongoDB**: Use [PlatformMongoMigrationExecutor](#mongodb-persistence-guidance)
-   **Large data**: Use [ExecuteInjectScopedPagingAsync](#8-platform-data-migration-advanced-pagination)

## 🎁 Quick Code Templates (Copy & Modify)

-   **[Backend Command](#new-cqrs-command-template)** → Complete CQRS implementation
-   **[Entity Event Consumer](#new-entity-event-consumer-template)** → Cross-service sync
-   **[Frontend Component](#new-component-with-store-template)** → Component + Store + API
-   **[Form Component](#new-form-component-template)** → Validation + submission

---

# BravoSUITE Context Guide

## Introduction

This is a product of bravo company, which include many applications, including:

-   BravoTalents\*\*, a product which help to do recruiment easily, including:

-   [BravoTalents for Company HR](https://recruiter-systemtest.bravosuite.io/): Application is used by HR of a company to create/publish jobs, see applied candidates, process interviews, see candidate profile information, etc ...
-   Source Code Client: **src/Web/bravoTALENTSClient**
-   Source Code Api: **src/Services/bravoTALENTS**
-   [BravoTalents for Individual Candidate](https://profile-talents-systemtest.bravosuite.io/): Application is used by candidates, who want to find and apply jobs, to create profile, upload CV, find and apply jobs, etc ...
-   Source Code Client: **src/Web/CandidateAppClient**
-   Source Code Api: **src/Services/bravoTALENTS**; **src/Services/CandidateApp**
-   [Portal](https://jobs-systemtest.bravosuite.io/): Web is used by candidates to find and apply jobs.
-   Source Code Client: **src/Web/JobPortalClient**
-   Source Code Api: **src/Services/bravoTALENTS**

-   BravoGrowth\*\*, a product which help companies to do employee management. Some features is like Employee Record, TimeSheet Management, Leave Request, PayRoll, etc ..., including:

-   [BravoGrowth for Company](https://growth-systemtest.bravosuite.io/): Application is used by HR, BOD of a company.
-   Source Code Client: **src/Web/bravoTALENTSClient**; **src/WebV2/apps/growth-for-company**
-   Source Code Api: **src/Services/bravoTALENTS**; **src/Services/bravoGROWTH**
-   [BravoGrowth for Employee](https://profile-growth-systemtest.bravosuite.io/): Application is used by employees.
-   Source Code Client: **src/Web/CandidateAppClient**; **src/WebV2/apps/employee**
-   Source Code Api: **src/Services/bravoTALENTS**; **src/Services/CandidateApp**; **src/Services/bravoGROWTH**

-   [BravoSurveys](https://surveycreator-systemtest.bravosuite.io/ 'BravoSurveys')\*\*, a product which help to create surveys, publish them and collect responses, including:

-   Source Code Client: **src/Web/bravoSURVEYSClient**
-   Source Code Api: **src/Services/bravoSURVEYS**

-   [BravoInsights](https://insights-systemtest.bravosuite.io/ 'BravoInsights')\*\*, a product which help to collect data from other apps like _BravoSurveys_, _BravoTalents_ to aggregate data, create charts and dashboards:

-   Source Code Client: **src/Web/bravoINSIGHTSClient**
-   Source Code Api: **src/Services/bravoINSIGHTS**

-   Others Common Apps\*\*:
-   [Account Management](https://accountmanagement-systemtest.bravosuite.io/ 'Account Management'): Used by Admin to manage all user accounts, organizations, subscriptions in the system.
-   Source Code Client: **src/Web/AccountsManagementClient**
-   Source Code Api: **src/Services/Accounts**; **src/Services/PermissonProvider**

---

# Source Code Structure

The `src` folder contains all the source code organized into several main categories:

## Backend Services (`src/Services/`)

### Core Business Microservices

-   `bravoTALENTS/`\*\* - Talent management and recruitment system
-   Micro-service architecture with separate domains (Candidate, Job, Employee, Email, Setting, Talent)
-   Each service follows Clean Architecture: Domain → Application → Infrastructure → Persistence → Service
-   `bravoGROWTH/`\*\* - Employee management, timesheet, leave management
-   Clean Architecture layers: Domain → Application → Persistence → Service
-   `bravoSURVEYS/`\*\* - Survey creation, publishing, and response collection
-   `bravoINSIGHTS/`\*\* - Data analytics, reporting, and dashboard services

### Supporting Services

-   `Accounts/`\*\* - User account management, authentication, authorization
-   `PermissonProvider/`\*\* - Permission and role management system
-   `CandidateApp/`\*\* - Dedicated service for candidate-specific operations
-   `CandidateHub/`\*\* - Real-time communication hub for candidates
-   `NotificationMessage/`\*\* - Centralized notification service
-   `ParserApi/`\*\* - Document and data parsing services

### Shared Components

-   `_SharedCommon/Bravo.Shared/`\*\* - Common utilities, constants, and shared business logic used across all services

## Frontend Applications

### Legacy Angular Applications (`src/Web/`) - Angular version 8

-   `bravoTALENTSClient/`\*\* - Angular app for HR recruitment management
-   `bravoSURVEYSClient/`\*\* - Angular app for survey creation and management
-   `bravoINSIGHTSClient/`\*\* - Angular app for data analytics and insights
-   `CandidateAppClient/`\*\* - Angular app for job seekers and candidates
-   `AccountsManagementClient/`\*\* - Angular app for system administration
-   `JobPortalClient/`\*\* - Public job portal for job listings
-   `CompanyWebsite/`\*\* - Company marketing website
-   `BravoComponents/`\*\* - Shared UI component library

### Modern Angular Applications (`src/WebV2/`) - Angular version 19

Built with modern Angular and Nx monorepo structure:

-   `apps/growth-for-company/`\*\* - Modern Growth app for companies
-   `apps/employee/`\*\* - Modern Growth app for employees
-   `libs/`\*\* - Shared libraries and common functionality

## Platform Foundation (`src/Platform/`)

### Core Platform Framework

-   `Easy.Platform/`\*\* - Core platform framework with Clean Architecture base classes
-   `Easy.Platform.AspNetCore/`\*\* - ASP.NET Core integration and web framework extensions

### Infrastructure Implementations

-   `Easy.Platform.EfCore/`\*\* - Entity Framework Core data access implementation
-   `Easy.Platform.MongoDB/`\*\* - MongoDB data access implementation
-   `Easy.Platform.RabbitMQ/`\*\* - RabbitMQ message bus implementation
-   `Easy.Platform.HangfireBackgroundJob/`\*\* - Background job processing with Hangfire
-   `Easy.Platform.RedisCache/`\*\* - Redis distributed caching implementation
-   `Easy.Platform.AzureFileStorage/`\*\* - Azure Blob Storage file management
-   `Easy.Platform.FireBasePushNotification/`\*\* - Firebase push notification service

### Development & Testing Tools

-   `Easy.Platform.AutomationTest/`\*\* - Automated testing framework and utilities
-   `Easy.Platform.Benchmark/`\*\* - Performance benchmarking tools
-   `Easy.Platform.CustomAnalyzers/`\*\* - Custom Roslyn code analyzers

## Example Applications (`src/PlatformExampleApp/`)

-   `PlatformExampleApp/`\*\* - Comprehensive example demonstrating all platform features
-   `PlatformExampleAppWeb/`\*\* - Web frontend for the example application

## Additional Components

-   `Analyzer/`\*\* - Code analysis and quality tools
-   `AutomationTest/`\*\* - System-wide automation testing framework
-   `AzureFunctions/`\*\* - Serverless Azure Functions for specific use cases
-   `Mobile/`\*\* - Mobile application source code

## Architecture Patterns

Each microservice in `src/Services/` follows **Clean Architecture** principles:

```
Service/
├── Domain/           # Core business entities and domain logic
├── Application/      # Use cases, CQRS handlers, application services
├── Infrastructure/   # External service implementations
├── Persistence/      # Data access implementations
└── Service/          # API controllers and web layer
```

The platform enables:

-   Technology Agnostic\*\*: Switch between SQL Server, MongoDB, PostgreSQL
-   Microservices Communication\*\*: Event-driven architecture with RabbitMQ
-   Scalable Frontend\*\*: Both legacy (Web - Angular 8) and modern (WebV2 - Angular 19) Angular applications
-   Shared Components\*\*: Common business logic and UI components reused across apps

---

## General Clean Code Rules

### Architecture & Design Principles

**Team Communication & Concepts:**

-   All team members must understand current project concepts (What, Why, Responsibility)
-   CONFIRM WITH TEAM\*\* before creating NEW CONCEPTS to maintain consistency
-   Allow SOLID principles and Clean Architecture patterns

**Microservices Architecture Rules:**

-   Service Independence\*\*: Each microservice (bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS, Accounts, etc.) is a distinct feature subdomain
-   No Direct Dependencies\*\*: Services CANNOT directly depend on each other's assemblies or reference each other's domain/application layers
-   Message Bus Communication\*\*: Cross-service communication MUST use message bus patterns only
-   Shared Components\*\*: Only shared infrastructure components (Easy.Platform, Bravo.Shared) can be referenced across services
-   Data Duplication\*\*: Each service maintains its own data models - data synchronization happens via message bus events
-   Domain Boundaries\*\*: Each service owns its domain concepts and business logic - no cross-service domain logic

**Backend Layer Structure:**

-   Domain Layer\*\*: Entity, Repository, ValueObject, DomainService, Exceptions, Helpers, Constants
-   Application Layer\*\*: ApplicationService, InfrastructureService, DTOs, CQRS Commands/Queries, BackgroundJobs, CachingService, MessageBus, DataSeeder, RequestContext
-   Infrastructure Layer\*\*: External service implementations, data access, file storage, messaging
-   Presentation Layer\*\*: Controllers, API endpoints, middleware, authentication

**Repository Pattern Priority:**

-   **CRITICAL: Always prioritize microservice-specific repository interfaces** over generic platform interfaces
-   **AI Agent Guidance**: When working in a microservice, search for repository interfaces in the `{ServiceName}.Domain` project that inherit from `IPlatformQueryableRepository` or `IPlatformQueryableRootRepository`
-   **Microservice Repository Discovery Pattern**:
-   **bravoTALENTS/Candidate**: Use `ICandidatePlatformRootRepository<TEntity>` (inherits from `IPlatformQueryableRootRepository<TEntity, string>`)
-   **CandidateApp**: Use `ICandidateAppPlatformRootRepository<TEntity>` (inherits from `IPlatformQueryableRootRepository<TEntity, string>`)
-   **bravoGROWTH**: Use service-specific repository interfaces that inherit from platform interfaces
-   **General Pattern**: Look for `I{ServiceName}PlatformRootRepository<TEntity>` in `{ServiceName}.Domain` project
-   **Search Strategy for AI Agents**:
-   First: Search `{ServiceName}.Domain` for interfaces inheriting from `IPlatformQueryableRootRepository`
-   Second: Search for service-specific repository patterns like `I{ServiceName}PlatformRootRepository`
-   Last resort: Use generic `IPlatformQueryableRootRepository<TEntity, TKey>` if no service-specific interface exists
-   **Method Call Patterns**:
-   Use `GetAllAsync()` for returning lists (not `GetAsync()`)
-   Use explicit parameter names: `cancellationToken: cancellationToken`
-   Use `CreateOrUpdateAsync(entity, cancellationToken: cancellationToken)` for upserts
-   Use `DeleteAsync(entityId, cancellationToken: cancellationToken)` for deletions by ID
-   Legacy code migration\*\*: When working with existing legacy repositories, gradually migrate to microservice-specific platform repositories
-   Dependency injection\*\*: Inject microservice-specific repository interfaces in services instead of generic platform interfaces
-   Example\*\*: In bravoTALENTS/Candidate service, use `ICandidatePlatformRootRepository<Employee>` instead of `IPlatformQueryableRootRepository<Employee, string>`

**Repository Extensions Pattern:**

-   Extend functionality\*\* by creating repository extension methods instead of custom repository interfaces
-   Naming Convention\*\*: `{Entity}RepositoryExtensions` (e.g., `EmployeeRepositoryExtensions`, `UserRepositoryExtensions`)
-   Expression-based queries\*\*: Use static expressions for reusable query logic
-   Example Pattern\*\*:

    ```csharp
    public static class EmployeeRepositoryExtensions
    {
        public static async Task<List<Employee>> GetActiveEmployeesAsync(
            this ICandidatePlatformRootRepository<Employee> repository,
            CancellationToken cancellationToken = default)
        {
            return await repository.GetAllAsync(Employee.IsActiveExpr(), cancellationToken: cancellationToken);
        }
    }
    ```

**MongoDB Persistence Guidance:**

-   Preferred Database\*\*: Most bravoTALENTS services use MongoDB, prefer MongoDB over EF Core/SQL Server for new features
-   Data Migration\*\*: Use `PlatformMongoMigrationExecutor<TDbContext>` for MongoDB data migrations instead of EF Core migrations
-   Index Creation\*\*: Create MongoDB indexes in migration files using `CreateIndexModel<TEntity>` pattern
-   Collection Access\*\*: Access MongoDB collections through the `DbContext.{Entity}Collection` properties
-   Migration Naming\*\*: Use timestamp-based naming: `YYYYMMDDHHMM_DescriptiveName.cs`
-   Example MongoDB Migration\*\*:

    ```csharp
    internal sealed class EnsureUserIndexes : PlatformMongoMigrationExecutor<TalentDbContext>
    {
        public override string Name => "20250131000001_EnsureUserIndexes";
        public override DateTime? OnlyForDbInitBeforeDate => new(2025, 02, 15);

        public override async Task Execute(TalentDbContext dbContext)
        {
            await dbContext.EnsureUserCollectionIndexesAsync(true);
        }
    }
    ```

-   Index Implementation in DbContext\*\*:

    ```csharp
    public async Task EnsureUserCollectionIndexesAsync(bool recreate = false)
    {
        if (recreate) await UserCollection.Indexes.DropAllAsync();

        await UserCollection.Indexes.CreateManyAsync([
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys
                    .Ascending(u => u.IsActive)
                    .Ascending(u => u.IsResigned),
                new CreateIndexOptions { Name = "IX_User_ActiveResigned", Background = true })
        ]);
    }
    ```

**Data Seeder Pattern:**

-   Main Application Data Seeder\*\*: Each microservice application should include one main application data seeder with name equal to the project microservice name
-   Centralized Seeding\*\*: This main seeder should seed all entity data needed in that project domain
-   Naming Convention\*\*: `{ServiceName}ApplicationDataSeeder` (e.g., `GrowthApplicationDataSeeder`, `CandidateApplicationDataSeeder`)
-   Follow Growth Example\*\*: Reference `GrowthApplicationDataSeeder` as the standard implementation pattern
-   Consolidation\*\*: Avoid multiple small seeders - consolidate all domain seeding into the main seeder for better maintainability

### Universal Clean Code Principles

**1. Naming Conventions**

-   e **meaningful, descriptive names** that explain intent
-   Classes/Interfaces\*\*: PascalCase (`UserService`, `IRepository`)
-   Methods/Functions\*\*: PascalCase (C#), camelCase (TypeScript) (`GetUserById`, `getUserById`)
-   Variables/Fields\*\*: camelCase (`userName`, `isActive`)
-   Constants\*\*: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
-   Boolean variables\*\*: Use `is`, `has`, `can`, `should` prefixes (`isVisible`, `hasPermission`)

**2. Method Design**

-   Single Responsibility\*\*: One method = one purpose
-   Pure functions\*\*: Avoid side effects when possible
-   Early returns\*\*: Reduce nesting with guard clauses
-   Consistent abstraction level\*\*: Don't mix high-level and low-level operations

**3. Code Organization**

-   Group related functionality\*\* together
-   Separate concerns\*\* (business logic, data access, presentation)
-   Use meaningful file/folder structure\*\*
-   Keep dependencies flowing inward\*\* (Dependency Inversion)

### Platform-Specific Rules (BravoSUITE)

**1. Validation Patterns**

```csharp
// ✅ Good: Use PlatformValidationResult fluent API
return request
    .Validate(r => !string.IsNullOrEmpty(r.Name), "Name is required")
    .And(r => r.Age >= 0, "Age must be non-negative")
    .AndAsync(async r => await IsEmailUniqueAsync(r.Email), "Email already exists");
```

**2. Code Flow (Step-by-Step Pattern)**

```csharp
// ✅ Good: Clear step-by-step flow with spacing
public async Task<SaveUserResult> SaveUserAsync(SaveUserCommand command)
{
    // Step 1: Get and validate inputs
    var existingUser = await userRepository.GetByIdAsync(command.Id);
    var validatedCommand = command.EnsureValid();

    // Step 2: Apply business logic
    var updatedUser = existingUser
        .With(u => u.Name = validatedCommand.Name)
        .With(u => u.Email = validatedCommand.Email)
        .EnsureBusinessRulesValid();

    // Step 3: Persist changes
    var savedUser = await userRepository.SaveAsync(updatedUser);

    // Step 4: Return result
    return new SaveUserResult { UserId = savedUser.Id };
}
```

**3. Responsibility Placement**

```csharp
// ✅ Good: Logic belongs to the entity
public class User : Entity<User, string>
{
    public static Expression<Func<User, bool>> IsPremiumExpression()
        => u => u.SubscriptionType == "Premium" && u.IsActive;

    public ValidationResult ValidateForUpdate()
    {
        return this
            .Validate(u => !string.IsNullOrEmpty(u.Email), "Email is required")
            .And(u => u.Age >= 18, "User must be 18 or older");
    }
}

// ✅ Good: Use entity logic in services
var premiumUsers = await userRepository.GetUsersAsync(User.IsPremiumExpression());
var validUser = user.ValidateForUpdate().EnsureValid();
```

## Backend Code Review Checklist

### Validation Standards

**Use PlatformValidationResult Pattern:**

```csharp
// ✅ Good: Fluent validation chain
return command
    .Validate(c => !string.IsNullOrEmpty(c.Name), "Name is required")
    .And(c => c.Age >= 0, "Age must be non-negative")
    .AndNot(c => c.Email.Contains("temp"), "Temporary emails not allowed")
    .AndAsync(async c => await IsEmailUniqueAsync(c.Email), "Email already exists");
```

**Naming Conventions:**

-   Validation Methods\*\*: `Validate[Context]Valid`, `Has[Property]`, `Is[State]`, `Not[Condition]`
-   Ensure Methods\*\*: `Ensure[Context]Valid` (returns object or throws)
-   Collections\*\*: Always use plural names (`users`, `orders`, `items`)
-   Context-Specific Names\*\*: Avoid generic names, use domain context

### Code Flow Principles

**Step-by-Step Functional Flow:**

-   Clear separation\*\* between steps with blank lines
-   Group parallel operations\*\* (no dependencies) together
-   Input → Process → Output\*\* pattern
-   Early validation\*\* and guard clauses

```csharp
// ✅ Good Example:
public async Task<ProcessOrderResult> ProcessOrderAsync(ProcessOrderCommand command)
{
    // Step 1: Validate and get dependencies (parallel operations)
    var validatedCommand = command.EnsureValid();
    var customer = await customerRepository.GetByIdAsync(command.CustomerId);
    var inventory = await inventoryService.CheckAvailabilityAsync(command.Items);

    // Step 2: Apply business rules
    var order = Order.CreateNew(validatedCommand, customer)
        .ValidateAgainstInventory(inventory)
        .ApplyDiscounts()
        .EnsureBusinessRulesValid();

    // Step 3: Persist and notify
    var savedOrder = await orderRepository.SaveAsync(order);
    await eventBus.PublishAsync(new OrderCreatedEvent(savedOrder));

    // Step 4: Return result
    return new ProcessOrderResult { OrderId = savedOrder.Id, TotalAmount = savedOrder.Total };
}
```

### Responsibility & Logic Placement

**Entity Responsibility:**

```csharp
// ✅ Good: Business logic belongs to domain entities
public class Order : Entity<Order, string>
{
    // Static expressions for queries
    public static Expression<Func<Order, bool>> IsPendingExpression()
        => o => o.Status == OrderStatus.Pending && o.CreatedDate > DateTime.UtcNow.AddDays(-30);

    // Instance validation
    public ValidationResult ValidateForShipping()
    {
        return this
            .Validate(o => o.Items.Any(), "Order must have items")
            .And(o => o.ShippingAddress != null, "Shipping address required")
            .And(o => o.Status == OrderStatus.Confirmed, "Order must be confirmed");
    }

    // Business operations
    public Order ApplyDiscount(DiscountRule rule)
    {
        var discount = rule.CalculateDiscount(this.Total);
        return this.With(o => o.DiscountAmount = discount);
    }
}

// ✅ Good: DTO creation belongs to DTO
public class OrderDto
{
    public static OrderDto Create(Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            CustomerName = order.Customer.FullName,
            Total = order.Total,
            FormattedTotal = order.Total.ToString("C"),
            StatusDisplay = order.Status.GetDisplayName()
        };
    }
}
```

### Commands/Queries Best Practices

**Base Classes:**

-   mmands: `PlatformCqrsCommand<TResult>`
-   eries: `PlatformCqrsQuery<TResult>`, `PlatformCqrsPagedQuery<TResult>`
-   sults: `PlatformCqrsCommandResult`, `PlatformCqrsQueryResult`, `PlatformCqrsQueryPagedResult<T>`
-   ndlers: `PlatformCqrsCommandApplicationHandler`, `PlatformCqrsQueryApplicationHandler`

**Naming Convention:**

-   mmands: `[Verb][Entity][Command]` → `SaveLeaveRequestCommand`, `ApproveOrderCommand`
-   eries: `Get[Entity][Query]` → `GetActiveUsersQuery`, `GetOrdersByStatusQuery`
-   ndlers: `[CommandName]Handler` → `SaveLeaveRequestCommandHandler`

**Validation Patterns:**

```csharp
// ✅ Good: Self-validation in command
public class CreateUserCommand : PlatformCqrsCommand<CreateUserCommandResult>
{
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public int Age { get; set; }

    // Self-validation
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Email), "Email is required")
            .And(_ => Email.Contains("@"), "Valid email format required")
            .And(_ => !string.IsNullOrEmpty(FirstName), "First name is required")
            .And(_ => Age >= 18, "User must be 18 or older");
    }
}

// ✅ Good: Extended validation in handler
public class CreateUserCommandHandler : PlatformCqrsCommandApplicationHandler<CreateUserCommand, CreateUserCommandResult>
{
    protected override async Task<PlatformValidationResult<CreateUserCommand>> ValidateRequestAsync(
        PlatformValidationResult<CreateUserCommand> requestSelfValidation,
        CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            .AndAsync(async cmd => !(await userRepository.ExistsWithEmailAsync(cmd.Email)),
                     "Email already exists")
            .AndAsync(async cmd => await permissionService.CanCreateUserAsync(RequestContext.UserId()),
                     "Insufficient permissions");
    }
}
```

### Platform Components Usage

**Domain Layer:**

-   ootEntity<T, TKey>`,`AuditedEntity<T, TKey>` for entities
-   qrsEntityEvent`,`CqrsDomainEvent` for events
-   epository<T>` interfaces
-   main services for complex business logic

**Application Layer:**

-   latformApplicationBackgroundJob` for recurring/one-time jobs
-   PlatformCacheRepositoryProvider` for caching
-   equestContext` extensions for user/tenant context
-   essageBus` for cross-service communication
-   ntityDto<T>` for data transfer objects

**Event Handling:**

```csharp
// ✅ Good: Event handler naming and implementation
public class SendWelcomeEmailOnUserCreatedEventHandler : PlatformCqrsEntityEventApplicationHandler<User>
{
    protected override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<User> entityEvent)
    {
        return entityEvent.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<User> entityEvent, CancellationToken cancellationToken)
    {
        var user = entityEvent.EntityData;
        await emailService.SendWelcomeEmailAsync(user.Email, user.FirstName);
    }
}
```

**Infrastructure Layer:**

-   le storage implementations
-   ternal API integrations
-   ssage bus implementations
-   sh notification services

### Additional Best Practices

**Performance Considerations:**

-   e `ConfigureAwait(false)` in library code
-   efer `IAsyncEnumerable<T>` for streaming data
-   e `ValueTask<T>` for frequently called async methods
-   plement proper caching strategies

**Security Guidelines:**

-   ways validate user input
-   e parameterized queries (Entity Framework handles this)
-   plement proper authorization checks
-   g security-relevant events

**Testing Patterns:**

-   it tests for business logic (entities, domain services)
-   tegration tests for repositories and API endpoints
-   e `TestFixture` and `Theory` attributes appropriately
-   ck external dependencies

### Commands/Queries

-   Base Classes\*\*:
-   -   atformCqrsCommand<>**, **PlatformCqrsQuery<>**,**PlatformCqrsPagedQuery<>\*\* for "paging data query"
-   -   atformCqrsCommandResult**, **PlatformCqrsQueryResult**,**PlatformCqrsQueryPagedResult<>\*\* for "paging data result"
-   -   atformCqrsCommandApplicationHandler**,**PlatformCqrsQueryApplicationHandler\*\*
-   Naming Convention\*\*: _Verb + [XXX] + [Command|CommandResult|CommandHandler]_
-   E ple: See **SaveLeaveRequestCommand**
-   Command/Query Validation\*\*:
-   -   lf-validation**for Command/Query by **override Validate() function on Command/Query** class. Code is:**public override PlatformValidationResult<IPlatformCqrsRequest> Validate()\*\*
-   Exa e: See **SaveLeaveRequestCommand**
-   -   tended Validation**for Command/Query by command-handler, usually async by get domain data to check it, using **protected override async Task<PlatformValidationResult<[The-Command-Class]>> ValidateRequestAsync** in**PlatformCqrsCommandApplicationHandler\*\*

### Know when/what/how to use which components in platform to solve which cases

-   Common\*\*:
-   U
-   E nsions
-   E ption
-   V dations
-   C
-   D
-   V eObjects
-   Domain\*\*:
-   E ties (RootEntity, AuditedEntity)
-   E ts (CqrsEntityEvent, CqrsDomainEvent)
-   E ptions
-   R sitories
-   S ices
-   U OfWork, UnitOfWorkManager
-   Application\*\*:
-   B groundJob (Infrastructures)
-   C ing (Infrastructures)
-   C ext
-   M ageBus (Infrastructures) (Consumers, Producers)
-   P istence
-   D , EntityDtos (PlatformEntityDto)
-   C .Events (CommandEventApplicationHandler, DomainEventApplicationHandler, EntityEventApplicationHandler)
-   **N ng**: Do XXX + **On** + XXX + EventHandler
-   Infrastructures\*\*:
-   B groundJob
-   C ing
-   F Storage
-   M ageBus
-   P Notification
-   Persistence\*\*:
-   D Migration
-   S ices
-   R sitories (Implement from Domain)
-   U OfWork, UnitOfWorkManager (Implement from Domain)

---

## ❌ Anti-Patterns & Common Mistakes

### Backend Anti-Patterns

**❌ DON'T: Cross-Service Direct Dependencies**

```csharp
// WRONG: Direct dependency between services
public class GrowthService
{
    private readonly TalentsDbContext talentsDb; // ❌ Cross-service database access
    private readonly ITalentsEmployeeRepository talentsRepo; // ❌ Direct service dependency
}
```

**✅ DO: Use Message Bus Communication**

```csharp
// CORRECT: Message bus for cross-service communication
public class GrowthService
{
    private readonly IGrowthDbContext growthDb; // ✅ Own service database
    private readonly IPlatformApplicationBusMessageProducer messageBus; // ✅ Message bus

    public async Task HandleEmployeeUpdate(Employee employee)
    {
        await messageBus.PublishAsync(new EmployeeUpdatedEventBusMessage(employee));
    }
}
```

**❌ DON'T: Custom Repositories Instead of Platform Repositories**

```csharp
// WRONG: Custom repository interface
public interface ICustomEmployeeRepository
{
    Task<Employee> GetByIdAsync(string id);
    Task<List<Employee>> GetActiveEmployeesAsync();
}
```

**✅ DO: Platform Repository with Extensions**

```csharp
// CORRECT: Platform repository with extensions
public static class EmployeeRepositoryExtensions
{
    public static async Task<List<Employee>> GetActiveEmployeesAsync(
        this IPlatformQueryableRootRepository<Employee, string> repository)
    {
        return await repository.GetAsync(Employee.IsActiveExpr());
    }
}
```

**❌ DON'T: Manual Validation Logic**

```csharp
// WRONG: Manual validation
public async Task<SaveUserResult> SaveUser(SaveUserCommand command)
{
    if (string.IsNullOrEmpty(command.Name))
        throw new ValidationException("Name is required");
    if (command.Age < 0)
        throw new ValidationException("Age must be positive");
}
```

**✅ DO: Platform Validation Fluent API**

```csharp
// CORRECT: Platform validation pattern
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 0, "Age must be non-negative");
}
```

### Frontend Anti-Patterns

**❌ DON'T: Direct HTTP Client Usage**

```typescript
// WRONG: Direct HttpClient usage
export class ComponentExample {
    constructor(private http: HttpClient) {}

    loadData() {
        this.http.get('/api/employees').subscribe(/*...*/); // ❌ No error handling, caching
    }
}
```

**✅ DO: Platform API Service**

```typescript
// CORRECT: Platform API service
export class EmployeeApiService extends PlatformApiService {
    getEmployees(): Observable<Employee[]> {
        return this.get<Employee[]>('/employees'); // ✅ Built-in error handling, caching
    }
}
```

**❌ DON'T: Manual State Management**

```typescript
// WRONG: Manual state management
export class ComponentExample {
    employees: Employee[] = [];
    loading = false;
    errorMsg = '';

    ngOnInit() {
        this.loading = true;
        this.api.getEmployees().subscribe({
            next: data => {
                this.employees = data;
                this.loading = false;
            },
            error: err => {
                this.errorMsg = err.message;
                this.loading = false;
            }
        });
    }
}
```

**✅ DO: Platform Store Pattern**

```typescript
// CORRECT: Platform store with automatic state management
export class EmployeeVmStore extends PlatformVmStore<EmployeeState> {
    public loadEmployees = this.effectSimple(() => {
        return this.api.getEmployees().pipe(this.tapResponse(employees => this.updateState({ employees }))); // ✅ Automatic loading/error state management
    });
}
```

### Architecture Anti-Patterns

**❌ DON'T: Logic in Controllers**

```csharp
// WRONG: Business logic in controller
[ApiController]
public class EmployeeController : ControllerBase
{
    public async Task<IActionResult> UpdateEmployee(UpdateEmployeeRequest request)
    {
        // ❌ Business logic in controller
        var employee = await repository.GetByIdAsync(request.Id);
        if (employee.Status == EmployeeStatus.Resigned)
            return BadRequest("Cannot update resigned employee");

        employee.Name = request.Name;
        await repository.UpdateAsync(employee);
        return Ok();
    }
}
```

**✅ DO: CQRS with Command Handlers**

```csharp
// CORRECT: Controller delegates to CQRS
[ApiController]
public class EmployeeController : PlatformBaseController
{
    public async Task<IActionResult> UpdateEmployee(UpdateEmployeeCommand command)
    {
        var result = await Cqrs.SendCommand(command); // ✅ Delegate to command handler
        return Ok(result);
    }
}
```

**❌ DON'T: Mixing Abstraction Levels**

```csharp
// WRONG: Mixed abstraction levels
public async Task ProcessOrder(ProcessOrderCommand command)
{
    // ❌ High-level business logic mixed with low-level database operations
    var customer = await dbContext.Customers.FirstOrDefaultAsync(c => c.Id == command.CustomerId);
    var order = new Order { CustomerId = command.CustomerId };

    if (customer.IsVip)
        order.ApplyVipDiscount();

    dbContext.Orders.Add(order);
    await dbContext.SaveChangesAsync();
}
```

**✅ DO: Consistent Abstraction Levels**

```csharp
// CORRECT: Consistent abstraction levels
public async Task<ProcessOrderResult> ProcessOrderAsync(ProcessOrderCommand command)
{
    // Step 1: Get dependencies
    var customer = await customerRepository.GetByIdAsync(command.CustomerId);

    // Step 2: Apply business logic
    var order = Order.CreateNew(command, customer)
        .ApplyBusinessRules()
        .EnsureValid();

    // Step 3: Persist
    var savedOrder = await orderRepository.SaveAsync(order);

    return new ProcessOrderResult { OrderId = savedOrder.Id };
}
```

---

## 🌳 Decision Trees for Common Tasks

### When to Use Which Repository Pattern?

```
Need to query data?
├── Simple CRUD operations? → Use IPlatformQueryableRootRepository<TEntity, TKey>
├── Complex queries needed? → Create RepositoryExtensions with static expressions
├── Legacy custom repository exists? → Gradually migrate to platform repository
└── Cross-service data access? → ❌ Use message bus instead
```

### When to Use Which Validation Pattern?

```
Need validation?
├── Simple property validation? → Command.Validate() method
├── Async validation (DB check)? → Handler.ValidateRequestAsync()
├── Business rule validation? → Entity.ValidateForXXX() method
└── Cross-field validation? → PlatformValidators.dateRange(), etc.
```

### When to Use Which Event Pattern?

```
Need to react to changes?
├── Within same service?
│   ├── Entity changed? → EntityEventApplicationHandler
│   ├── Command completed? → CommandEventApplicationHandler
│   └── Domain event? → DomainEventApplicationHandler
└── Cross-service communication?
    ├── Data sync needed? → EntityEventBusMessageProducer/Consumer
    ├── Notification needed? → ApplicationBusMessageProducer
    └── Background processing? → PlatformApplicationBackgroundJob
```

### When to Use Which Frontend Pattern?

```
Building frontend feature?
├── Simple component? → Extend PlatformComponent
├── Form component? → Extend AppBaseFormComponent<T>
├── List with pagination? → Use PlatformVmStore + effectSimple()
├── Complex state management? → Extend PlatformVmStore<T>
└── API communication? → Create ApiService extends PlatformApiService
```

### When to Use Which Data Migration Pattern?

```
Need data migration?
├── New indexes only? → PlatformMongoMigrationExecutor
├── Large data migration? → Use ExecuteInjectScopedPagingAsync()
├── Continuous scrolling? → Use ExecuteInjectScopedScrollingPagingAsync()
├── Cross-database sync? → Cross-database context (ForCrossDbMigrationOnly = true)
└── One-time seeding? → PlatformApplicationDataSeeder
```

---

# BravoSUITE Development Guide

This is an enterprise microservices platform with a **.NET 8 backend** and **Angular 19 (WebV2) + Angular 8 (legacy) frontend** applications. This guide provides a comprehensive overview of the architecture, file structure, development patterns, and workflows.

---

## Architecture Overview

BravoSUITE follows **Clean Architecture** with these key principles:

-   Backend\*\*: .NET 8 microservices using CQRS (MediatR), Event-Driven Architecture (RabbitMQ), and Clean Architecture layers.
-   Frontend\*\*: Angular 19 (WebV2) + Angular 8 (legacy) with an MVVM pattern using NgRx ComponentStore.
-   Platform Framework\*\*: `Easy.Platform` provides base infrastructure components across all layers.
-   Cross-Service Communication\*\*: RabbitMQ serves as the message bus, with domain events and background jobs for asynchronous processing.

### Core Business Applications

-   bravoTALENTS\*\* (`src/Services/bravoTALENTS/`) - Recruitment management
-   bravoGROWTH\*\* (`src/Services/bravoGROWTH/`) - Employee management, timesheets, leave requests
-   bravoSURVEYS\*\* (`src/Services/bravoSURVEYS/`) - Survey creation and response collection
-   bravoINSIGHTS\*\* (`src/Services/bravoINSIGHTS/`) - Data analytics and reporting

### Supporting Services

-   Accounts\*\* (`src/Services/Accounts/`) - User account management, authentication
-   PermissionProvider\*\* (`src/Services/PermissonProvider/`) - Role and permission management
-   CandidateApp\*\* (`src/Services/CandidateApp/`) - Candidate-specific operations
-   NotificationMessage\*\* (`src/Services/NotificationMessage/`) - Centralized notifications

---

## Quick Start & Environment Setup

### Prerequisites

-   ET 8 SDK
-   de.js 20+
-   gular CLI 19+
-   cker Desktop
-   L Server (LocalDB or Docker)

### Getting Started

1. Clone the repository: `git clone [repository-url]`
2. Start infrastructure: `docker-compose up -d`
3. Restore .NET packages: `dotnet restore`
4. Install npm packages: `npm install`
5. Run database migrations: `dotnet ef database update`
6. Use the `.cmd` scripts in `Bravo-DevStarts/` to run services and applications.

### Useful Commands

```bash
# Backend
dotnet build                    # Build solution
dotnet test                     # Run tests
dotnet ef migrations add <name> # Add migration

# Frontend (in src/WebV2/)
npm run dev-start:growth        # Start Growth app (port 4206)
npm run dev-start:employee      # Start Employee app (port 4205)
ng test                         # Run tests
ng lint                         # Run linting
```

### Key Files & Training Resources

-   Platform Framework Details\*\*: `EasyPlatform.README.md` and `src/Platform/Easy.Platform/README.md`
-   Shared Backend Utilities\*\*: `src/Services/_SharedCommon/Bravo.Shared/`
-   Shared Frontend Patterns\*\*: `src/WebV2/libs/platform-core/`
-   Architecture Guides\*\*: `docs/architecture/`
-   API Documentation\*\*: Available at the `/swagger` endpoint of each running service.

---

## File Organization and Placement

### Backend Service Structure (`src/Services/[ServiceName]/`)

The backend follows a layered architecture: **Domain → Application → Persistence → Service**.

```
src/Services/[ServiceName]/
├── [ServiceName].Domain/         # Domain entities, value objects, domain events
├── [ServiceName].Application/    # Business logic, CQRS commands/queries, event handlers
├── [ServiceName].Persistence/    # Data access, repositories, EF Core configurations
└── [ServiceName].Service/        # Presentation layer, API controllers
```

### Frontend WebV2 Structure (`src/WebV2/`)

The modern frontend uses an Nx workspace with a feature-based structure.

```
src/WebV2/
├── apps/[app-name]/              # Application-specific code
│   └── src/app/
│       ├── features/             # Feature modules and components
│       └── shared/               # Components, services, and stores shared within the app
└── libs/                         # Shared libraries across applications
    ├── platform-core/            # Base components, services, and view models
    ├── bravo-domain/             # Domain models, DTOs, and API services
    └── bravo-common/             # Common utilities, constants, and types
```

### Component Placement Guidelines

-   **Platform Components** (`libs/platform-core/`): Abstract base classes (`PlatformComponent`, `PlatformVmStore`) and core services.
-   **Domain Components** (`libs/bravo-domain/`): API services (`EmployeeApiService`), DTOs, and domain-specific models.
-   **Common Components** (`libs/bravo-common/`): General-purpose utilities and types.
-   **Feature Components** (`apps/[app]/src/app/features/`): Business feature implementations (e.g., `LeaveRequestComponent`).
-   **Shared App Components** (`apps/[app]/src/app/shared/`): Reusable components within a single application (e.g., `ConfirmDialogComponent`).

#### Bravo-Domain Organization Patterns

```typescript
// libs/bravo-domain/src/ organization by business domain:
libs/bravo-domain/src/
├── account/              // Account & organization management
│   ├── api-services/     // OrganizationUnitManagementApiService
│   ├── components/       // organization-unit-hierarchy.component
│   ├── domain-models/    // AccountOrganizationUnit, AccountUser
│   └── constants/
├── employee/             // Employee-specific models and services
├── growth/               // Growth domain (leave requests, holidays, performance)
│   ├── api-services/     // HolidayApiService, LeaveRequestApiService, FormTemplateApiService
│   ├── components/       // Domain-specific form components
│   ├── domain-models/    // Employee, LeaveRequest, CompanyHolidayPolicy
│   ├── form-validators/  // checkIsHolidayDateRangeOverlappedAsyncValidator
│   └── utils/
├── goal/                 // Goal management
│   ├── api-services/
│   ├── components/       // upsert-goal-form.component
│   ├── domain-models/    // Goal, GoalOverview
│   └── form-validators/  // checkValueRangeValidator
├── check-in/             // Check-in functionality
└── _shared/              // Shared across domains
    ├── api-services/     // BasicInfoEmployeeApiService, EmailApiService
    ├── components/       // app-base.component, app-base.form-component
    ├── constants/        // DataOwnerShipType
    ├── domain-models/    // User, BasicInfoEmployee
    └── enums/

// Placement Decision Tree:
Need to place code?
├── Account/Organization related? → account/
├── Employee/Growth/HR features? → growth/
├── Goal management? → goal/
├── Check-in features? → check-in/
├── Cross-domain shared logic? → _shared/
└── App-specific abstractions? → _shared/components/_abstracts/
```

#### Custom Async Validator Patterns

```typescript
// Standard async validator pattern in libs/bravo-domain/src/[domain]/form-validators/:
export function checkIs[Feature]AsyncValidator(
    errorKey: string,
    check$: (query: Query) => Observable<QueryResult>,
    queryFn: (control: FormControl<Date>) => Query | undefined
): AsyncValidatorFn {
    return asyncValidator(errorKey, control => {
        const query = queryFn(<FormControl<Date>>control);
        if (query == null) return of(null);

        return check$(query).pipe(
            map((result: QueryResult) => {
                return result.isOverlapped
                    ? buildFormValidationErrors(errorKey, 'Error message')
                    : null;
            })
        );
    });
}

// Real examples in growth/form-validators/:
├── checkIsHolidayDateRangeOverlappedAsyncValidator      // Holiday overlap validation
├── checkIsLeaveRequestDateRangeOverlappedAsyncValidator // Leave request overlap
├── checkIsRequestDateRangeConflictCycleAsyncValidator   // Timesheet cycle conflict
├── checkIsActivePerformanceReviewEventOverlappedAsyncValidator // Performance review overlap
├── checkIsValidRequestPolicyNameAsyncValidator          // Unique name validation
└── checkRequestTypeUniqueNameAsyncValidator            // Request type name uniqueness

// Usage in AppBaseFormComponent:
ifAsyncValidator(
    () => !this.isViewMode && !this.tryFormControls('year')?.invalid,
    checkIsHolidayDateRangeOverlappedAsyncValidator(
        'holidayDateRangeOverlapped',
        query => this.companyHolidayApi.checkOverlapCompanyHoliday(query),
        () => ({
            fromDate: this.currentVm().getStartOfDate(this.currentVm().fromDate!),
            toDate: this.currentVm().getEndOfDate(this.currentVm().toDate!),
            CheckForCurrentExistingCompanyHolidayPolicyId: this.currentVm().id,
            companyId: this.selectedCompanyId
        })
    )
)
```

---

# Development Patterns & Code Examples

This section contains code examples and patterns for both backend and frontend development.

## Backend Code Patterns

### 1. Platform Module System

#### PlatformApplicationModule with Lazy-Load Request Context

```csharp
// Application module pattern - inherit and configure dependencies
public class GrowthApplicationModule : PlatformApplicationModule
{
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [p => typeof(GrowthDomainModule)];
    }

    // Request context lazy loading pattern
    protected override Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        LazyLoadRequestContextAccessorRegistersFactory()
    {
        return new()
        {
            { BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey, GetCurrentEmployee }
        };
    }

    // Platform pattern: ExecuteInjectScopedAsync + CacheRequestAsync
    private static async Task<object?> GetCurrentEmployee(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    {
        return await provider.ExecuteInjectScopedAsync<Employee>(async (repository, cacheProvider) =>
            await cacheProvider.Get().CacheRequestAsync(() => repository.FirstOrDefaultAsync(/*...*/), "someCacheKey", tags: ["tag1"]));
    }
}
```

#### PlatformAspNetCoreModule for Web Applications

```csharp
public class GrowthApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public GrowthApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
        serviceProvider, configuration)
    {
    }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return
        [
            p => typeof(GrowthApplicationModule),
            p => typeof(GrowthPersistenceModule),
            p => typeof(GrowthRabbitMqMessageBusModule),
            p => typeof(GrowthHangfireBackgroundJobModule)
        ];
    }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        return configuration.GetSection("AllowCorsOrigins").Get<string[]>();
    }

    protected override DistributedTracingConfig ConfigureDistributedTracing()
    {
        return new DistributedTracingConfig
        {
            Enabled = Configuration.GetSection("DistributedTracingConfig:Enabled").Get<bool>(),
            AddOtlpExporterConfig = opt => { opt.Endpoint = new Uri(Configuration["DistributedTracingConfig:Endpoint"]!); }
        };
    }
}
```

#### PlatformHangfireBackgroundJobModule for Background Jobs

```csharp
public class GrowthHangfireBackgroundJobModule : PlatformHangfireBackgroundJobModule
{
    public GrowthHangfireBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration) :
        base(serviceProvider, configuration)
    {
    }

    protected override PlatformHangfireBackgroundJobStorageType UseBackgroundJobStorage()
    {
        return PlatformHangfireBackgroundJobStorageType.Mongo;
    }

    protected override string StorageOptionsConnectionString()
    {
        return new MongoUrlBuilder(Configuration.GetSection("MongoDB:ConnectionString").Value)
            .With(p => p.MinConnectionPoolSize = PlatformPersistenceModule.RecommendedMinPoolSize)
            .With(p => p.MaxConnectionPoolSize = PlatformPersistenceModule.RecommendedMaxPoolSize)
            .ToString();
    }

    protected override PlatformHangfireUseMongoStorageOptions UseMongoStorageOptions()
    {
        var options = base.UseMongoStorageOptions();
        options.DatabaseName = Configuration.GetSection("MongoDB:Database").Get<string>();
        return options;
    }
}
```

### 2. Domain Entity Change Tracking

#### TrackFieldUpdatedDomainEvent Attribute

```csharp
// Automatic field-level change tracking with TrackFieldUpdatedDomainEvent attribute
[TrackFieldUpdatedDomainEvent]
public sealed class EmployeeEntity : RootEntity<EmployeeEntity, string>
{
    [TrackFieldUpdatedDomainEvent] // Track specific field changes
    public EmploymentStatus? Status { get; set; }

    [TrackFieldUpdatedDomainEvent] // Track profile image changes
    public Attachment ProfileImage { get; set; }

    [TrackFieldUpdatedDomainEvent] // Track hierarchy changes
    public List<Hierarchy> Hierarchies { get; set; } = [];
}
```

#### Entity Event Handler with FindFieldUpdatedEvent

```csharp
// Place in: [ServiceName].Application/UseCaseEvents/
public class SendEmailOnLeaveRequestUpdateEventHandler : PlatformCqrsEntityEventApplicationHandler<LeaveRequest>
{
    // Handle only when a LeaveRequest is updated
    protected override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<LeaveRequest> entityEvent)
    {
        return entityEvent.CrudAction == PlatformCqrsEntityEventCrudAction.Updated;
    }

    // Logic to execute on the event
    protected override async Task HandleAsync(PlatformCqrsEntityEvent<LeaveRequest> entityEvent, CancellationToken cancellationToken)
    {
        // Check if the 'Status' field was changed using FindFieldUpdatedEvent
        var statusChangedEvent = entityEvent.FindFieldUpdatedEvent(lr => lr.Status);
        if (statusChangedEvent != null)
        {
            await SendStatusChangedEmail(entityEvent.EntityData, statusChangedEvent.OriginalValue, statusChangedEvent.NewValue);
        }

        // Check multiple fields with HasAnyFieldUpdatedEvents
        if (entityEvent.HasAnyFieldUpdatedEvents(lr => lr.FromDate, lr => lr.ToDate))
        {
            await HandleDateRangeChange(entityEvent.EntityData);
        }
    }
}
```

### 3. Request Context Extensions with Lazy Loading

#### Request Context Factory in Application Module

```csharp
// Place in: [ServiceName].Application/RequestContext/
public static class ApplicationCustomRequestContextKeys
{
    // Lazy-loaded employee context with caching
    public static Task<Employee> CurrentEmployee(this IPlatformApplicationRequestContext context)
    {
        return context.GetRequestContextValue<Task<Employee>>(BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey);
    }

    public static Task<string> CurrentEmployeeId(this IPlatformApplicationRequestContext context)
    {
        return context.CurrentEmployee<Employee>().Then(p => p.Id);
    }

    // Cache key generation for invalidation
    public static PlatformCacheKey CurrentEmployeeCacheKey(int productScope, string companyId, string userId)
    {
        return new PlatformCacheKey(GrowthApplicationConstants.ApplicationName,
            BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey,
            requestKeyParts: [productScope.ToString(), companyId, userId]);
    }

    // Multi-level cache tag generation
    public static List<string> CurrentEmployeeCacheTags(int? productScope, string? companyId, string? userId, bool getExactTagToDelete = false)
    {
        List<string?> result =
        [
            productScope != null && companyId != null && userId != null
                ? $"{GrowthApplicationConstants.ApplicationName}_{BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey}_{productScope}_{companyId}_{userId}"
                : null,
            userId != null && (!getExactTagToDelete || (productScope == null && companyId == null))
                ? $"{GrowthApplicationConstants.ApplicationName}_{BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey}_{userId}"
                : null
        ];

        return result.Where(p => p != null).Cast<string>().ToList();
    }
}
```

#### Factory Implementation in Application Module

```csharp
public class GrowthApplicationModule : PlatformApplicationModule
{
    protected override Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        LazyLoadRequestContextAccessorRegistersFactory()
    {
        return new Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        {
            {
                BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey,
                GetCurrentEmployee
            }
        };
    }

    private static async Task<object?> GetCurrentEmployee(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    {
        return await provider.ExecuteInjectScopedAsync<Employee>(async (
            IGrowthRootRepository<Employee> repository,
            IPlatformCacheRepositoryProvider cacheRepositoryProvider) =>
        {
            return await cacheRepositoryProvider.Get()
                .CacheRequestAsync(
                    () => repository.FirstOrDefaultAsync(
                        predicate: Employee.UniqueExpr(accessor.Current.ProductScope(), accessor.Current.CurrentCompanyId(), accessor.Current.UserId()),
                        CancellationToken.None,
                        p => p.User,
                        p => p.Departments,
                        p => p.Manager!.User),
                    ApplicationCustomRequestContextKeys.CurrentEmployeeCacheKey(
                        accessor.Current.ProductScope(),
                        accessor.Current.CurrentCompanyId(),
                        accessor.Current.UserId()),
                    (PlatformCacheEntryOptions?)null,
                    tags: ApplicationCustomRequestContextKeys.CurrentEmployeeCacheTags(
                        accessor.Current.ProductScope(),
                        accessor.Current.CurrentCompanyId(),
                        accessor.Current.UserId()));
        });
    }
}
```

### 4. CQRS Implementation

#### Command with File Upload and Validation

```csharp
// Place in: [ServiceName].Application/UseCaseCommands/
public sealed class SaveLeaveRequestCommand : PlatformCqrsCommand<SaveLeaveRequestCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public List<IFormFile> Files { get; set; } = [];

    // Command-level validation
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => FromDate <= ToDate, "To Date must be greater than From Date")
            .And(_ => !string.IsNullOrEmpty(Id), "Leave Request ID is required");
    }
}
```

#### Command Handler with Advanced Validation and Business Logic

```csharp
// Place in: [ServiceName].Application/UseCaseCommands/
internal sealed class SaveLeaveRequestCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveLeaveRequestCommand, SaveLeaveRequestCommandResult>
{
    private readonly ILeaveRequestRepository leaveRequestRepository;
    private readonly IEmployeeRepository employeeRepository;

    // Extended validation with repository queries
    protected override async Task<PlatformValidationResult<SaveLeaveRequestCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveLeaveRequestCommand> requestSelfValidation, CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            .AndAsync(async request => await employeeRepository
                .GetByIdsAsync(request.WatcherIds, cancellationToken)
                .ThenValidateFoundAllAsync(request.WatcherIds, "Not found watcher ids"))
            .AndAsync(async request => await ValidateLeaveBalanceAsync(request, cancellationToken));
    }

    // Main business logic with request context usage
    protected override async Task<SaveLeaveRequestCommandResult> HandleAsync(
        SaveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        // Access current employee through lazy-loaded request context
        var currentEmployee = await RequestContext.CurrentEmployee();
        var toSaveLeaveRequest = request.MapToNewEntity().With(l => l.EmployeeId = currentEmployee.Id);

        // Auto-track field changes for entity events
        toSaveLeaveRequest.AutoAddFieldUpdatedEvent(existingLeaveRequest);

        var savedLeaveRequest = await leaveRequestRepository.CreateOrUpdateAsync(toSaveLeaveRequest, cancellationToken);

        return new SaveLeaveRequestCommandResult
        {
            LeaveRequestId = savedLeaveRequest.Id,
            Status = savedLeaveRequest.Status
        };
    }

    private async Task<bool> ValidateLeaveBalanceAsync(SaveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        var currentEmployee = await RequestContext.CurrentEmployee();
        var remainingBalance = await leaveRequestRepository.GetRemainingLeaveBalance(currentEmployee.Id, request.LeaveType);
        return remainingBalance >= request.RequestedDays;
    }
}
```

### 5. Message Bus Consumers for Inter-Service Communication

```csharp
// Place in: [ServiceName].Application/MessageBus/Consumers/
public class AccountUserSavedEventBusConsumer : PlatformApplicationMessageBusConsumer<AccountUserSavedEventBusMessage>
{
    private readonly IEmployeeRepository employeeRepository;

    // Conditionally process messages only for employees
    protected override async Task<bool> HandleWhen(AccountUserSavedEventBusMessage message)
    {
        return message.UserType == "Employee";
    }

    // Logic to synchronize user data across services
    protected override async Task HandleLogicAsync(AccountUserSavedEventBusMessage message)
    {
        var existingEmployee = await employeeRepository.FindByUserIdAsync(message.UserId);

        if (existingEmployee == null)
        {
            // Create a new employee record and publish a new event
            var newEmployee = new Employee
            {
                UserId = message.UserId,
                Email = message.Email,
                FullName = message.FullName
            };

            await employeeRepository.CreateAsync(newEmployee);

            // Publish domain event for further processing
            newEmployee.AddDomainEvent(new EmployeeCreatedDomainEvent(newEmployee));
        }
        else
        {
            // Update the existing employee record
            existingEmployee.Email = message.Email;
            existingEmployee.FullName = message.FullName;
            await employeeRepository.UpdateAsync(existingEmployee);
        }
    }
}
```

### 6. Background Jobs with Pagination

```csharp
// Place in: [ServiceName].Application/BackgroundJobs/
[PlatformRecurringJob("0 0 * * *")] // Daily at midnight UTC
public class AutoCalculateAccrualJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    private readonly IEmployeeRepository employeeRepository;
    private readonly ILeaveAccrualService leaveAccrualService;

    protected override async Task ProcessAsync()
    {
        Logger.LogInformation("Starting automatic accrual calculation");

        // Use paginated processing for large datasets
        await ExecutePaged(async employees =>
        {
            // Process a page of employees in parallel
            var tasks = employees.Select(ProcessEmployeeAccrual);
            await Task.WhenAll(tasks);
        });

        Logger.LogInformation("Completed automatic accrual calculation");
    }

    private async Task ProcessEmployeeAccrual(Employee employee)
    {
        try
        {
            await leaveAccrualService.CalculateMonthlyAccrual(employee.Id);
            Logger.LogDebug("Processed accrual for employee {EmployeeId}", employee.Id);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to process accrual for employee {EmployeeId}", employee.Id);
        }
    }

    protected override async Task<IQueryable<Employee>> GetItemsQuery()
    {
        return employeeRepository.GetQueryBuilder((uow, query) =>
            query.Where(e => e.IsActive && e.LeaveAccrualEnabled));
    }
}
```

### 7. Authorization & Request Context

#### Backend Authorization Setup

```csharp
// Place in: _SharedCommon/Bravo.Shared/Api/Authorization/
public static class CompanyRolePolicyExtension
{
    public static IServiceCollection AddCompanyRoleAuthorizationPolicy(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(CompanyRoleAuthorizationPolicies.EmployeePolicy,
                policy => policy.AddRequirements(new CompanyRolePolicyRequirement("Employee")));
            options.AddPolicy(CompanyRoleAuthorizationPolicies.HRPolicy,
                policy => policy.AddRequirements(new CompanyRolePolicyRequirement("HR", "HRManager")));
            options.AddPolicy(CompanyRoleAuthorizationPolicies.ManagerPolicy,
                policy => policy.AddRequirements(new CompanyRolePolicyRequirement("Manager", "Leader")));
        });

        services.AddScoped<IAuthorizationHandler, CompanyRolePolicyRequirementHandler>();
        return services;
    }
}
```

#### PlatformBaseController with Request Context

```csharp
// All controllers inherit from this base class for CQRS, caching, and request context access
[ApiController]
[Route("api/[controller]")]
public abstract class PlatformBaseController : ControllerBase
{
    public PlatformBaseController(
        IPlatformCqrs cqrs,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        Cqrs = cqrs;
        RequestContextAccessor = requestContextAccessor;
    }

    public IPlatformCqrs Cqrs { get; }
    public IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }
    public IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;

    // Common authorization helpers
    protected async Task<Employee> GetCurrentEmployeeAsync()
    {
        return await RequestContext.CurrentEmployee();
    }

    protected bool HasRole(string role)
    {
        return RequestContext.AllRoles().Contains(role);
    }
}
```

### 8. Platform Data Migration Advanced Pagination

#### [Verified] ExecuteInjectScopedPagingAsync Pattern

```csharp
// Place in: [ServiceName].Persistence/DataMigrations/
public class SyncFirstTimeInitDataMigration : PlatformDataMigrationExecutor<GrowthEfCoreDbContext>
{
    public const int PageSize = 20;
    private readonly AccountsPlatformDbContext accountsPlatformDbContext;
    private readonly IGrowthRootRepository<User> userRepository;

    public SyncFirstTimeInitDataMigration(
        IPlatformRootServiceProvider rootServiceProvider,
        AccountsPlatformDbContext accountsPlatformDbContext,
        IGrowthRootRepository<User> userRepository) : base(rootServiceProvider)
    {
        this.accountsPlatformDbContext = accountsPlatformDbContext;
        this.userRepository = userRepository;
    }

    public override string Name => "20240823000001_SyncFirstTimeInitDataMigration";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 10, 09);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(GrowthEfCoreDbContext dbContext)
    {
        await SyncUsers();
    }

    private async Task SyncUsers()
    {
        // [Verified] Check if migration is needed by comparing counts
        if (await accountsPlatformDbContext
                .GetQuery<AccountUser>()
                .EfCoreCountAsync() <= await userRepository.CountAsync()) return;

        // [Verified] ExecuteInjectScopedPagingAsync with calculated total count and page size
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await accountsPlatformDbContext
                .GetQuery<AccountUser>()
                .EfCoreCountAsync(),
            pageSize: PageSize,
            SyncUsersPaging);
    }

    // [Verified] Paging method signature pattern
    private static async Task SyncUsersPaging(
        IServiceProvider scopedServiceProvider,
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var accountsPlatformDbContext = scopedServiceProvider.GetRequiredService<AccountsPlatformDbContext>();
        var userRepository = scopedServiceProvider.GetRequiredService<IGrowthRootRepository<User>>();

        // [Verified] Get page of data with Skip/Take pattern
        var accountUsers = await accountsPlatformDbContext
            .GetQuery<AccountUser>()
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // [Verified] Process each item in the page
        foreach (var accountUser in accountUsers)
        {
            var existingUser = await userRepository.FindByAccountUserIdAsync(accountUser.Id);
            if (existingUser == null)
            {
                var newUser = User.CreateFromAccountUser(accountUser);
                await userRepository.CreateAsync(newUser);
            }
        }
    }
}
```

#### [Verified] ExecuteInjectScopedScrollingPagingAsync Pattern

```csharp
// Place in: [ServiceName].Persistence/DataMigrations/
public class MigrateSyncDataForEmployeeEmailAllContext : PlatformDataMigrationExecutor<EmployeeDbContext>
{
    private const int PageSize = 20;
    private readonly IEmployeeRepository<EmployeeEntity> employeeRepository;

    public MigrateSyncDataForEmployeeEmailAllContext(
        IPlatformRootServiceProvider rootServiceProvider,
        IEmployeeRepository<EmployeeEntity> employeeRepository) : base(rootServiceProvider)
    {
        this.employeeRepository = employeeRepository;
    }

    public override string Name => "20230811140800_MigrateSyncDataForEmployeeEmailAllContext";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2023, 08, 11);

    public override async Task Execute(EmployeeDbContext dbContext)
    {
        // [Verified] ExecuteInjectScopedScrollingPagingAsync with execution count calculation
        await RootServiceProvider.ExecuteInjectScopedScrollingPagingAsync<EmployeeEntity>(
            maxExecutionCount: await employeeRepository.CountAsync(FindEmployeeNotHaveEmployeeEmail()).Then(total => total / PageSize),
            SyncEmployeesEmail);
    }

    // [Verified] Filter expression for data selection
    private static Expression<Func<EmployeeEntity, bool>> FindEmployeeNotHaveEmployeeEmail()
    {
        return x => string.IsNullOrEmpty(x.EmployeeEmail) && !x.IsDeleted && ProductScopeConstants.ValidProductScopes.Contains(x.ProductScope);
    }

    // [Verified] Scrolling paging method signature pattern - returns processed items
    private static async Task<List<EmployeeEntity>> SyncEmployeesEmail(IEmployeeRepository<EmployeeEntity> employeeRepository)
    {
        // [Verified] Get batch of items using filter and Take for pagination
        var employees = await employeeRepository.GetAllAsync(query =>
            query.Where(FindEmployeeNotHaveEmployeeEmail()).Take(PageSize));

        // [Verified] Process and update items in batch
        await employeeRepository.UpdateManyAsync(employees.SelectList(employee =>
            employee.With(e => e.EmployeeEmail = e.Email)));

        // [Verified] Return processed items - this enables automatic scrolling pagination
        return employees;
    }
}
```

### 9. Platform Data Seeder Patterns

#### [Verified] Basic PlatformApplicationDataSeeder

```csharp
// Place in: [ServiceName].Application/DataSeeders/
public sealed class JobApplicationDataSeeder : PlatformApplicationDataSeeder
{
    private readonly IPlatformApplicationBusMessageProducer busMessageProducer;
    private readonly IJobDomainRootRepository<OrganizationalUnitEntity> orgRepository;
    private readonly IJobDomainRootRepository<User> userRepository;

    public JobApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        IJobDomainRootRepository<OrganizationalUnitEntity> orgRepository,
        IJobDomainRootRepository<User> userRepository,
        IPlatformApplicationBusMessageProducer busMessageProducer) : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
        this.orgRepository = orgRepository;
        this.userRepository = userRepository;
        this.busMessageProducer = busMessageProducer;
    }

    // [Verified] Override to implement seeding logic
    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        await SyncAdminUserData();
    }

    // [Verified] Pattern for waiting for external data synchronization
    private async Task SyncAdminUserData()
    {
        // Wait for data sync from other services (e.g., Accounts service)
        await Util.TaskRunner.TryWaitUntilAsync(
            () => SeedUserAccountInfo.HasNeededDataForAccountUserAndOrg(
                SeedAdminUserData.Create(Configuration),
                orgName => orgRepository.FirstOrDefaultAsync(queryBuilder: query => query.Where(e => e.Name == orgName).Select(p => p.Id)),
                userAccountInfo => userRepository.AnyAsync(p => p.Email == userAccountInfo.Email)),
            maxWaitSeconds: SeedUserAccountInfo.DefaultMaxWaitFirstTimeDataAutoSyncMessagesBySeconds,
            waitIntervalSeconds: SeedUserAccountInfo.DefaultWaitSyncIntervalSeconds);

        // Sync user and organization data using message bus
        await SeedUserAccountInfo.SyncAccountUserCompanies(
            SeedAdminUserData.Create(Configuration),
            busMessageProducer,
            orgName => orgRepository.FirstOrDefaultAsync(queryBuilder: query => query.Where(e => e.Name == orgName).Select(p => p.Id)),
            userAccountInfo => userRepository.AnyAsync(p => p.Email == userAccountInfo.Email));
    }
}
```

#### [Verified] Entity Data Seeder with Repository Pattern

```csharp
// Place in: [ServiceName].Application/DataSeeders/
public sealed class TextSnippetApplicationDataSeeder : PlatformApplicationDataSeeder
{
    private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

    public TextSnippetApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository,
        ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository) : base(
        unitOfWorkManager,
        serviceProvider,
        configuration,
        loggerFactory,
        rootServiceProvider)
    {
        this.textSnippetRepository = textSnippetRepository;
        this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
    }

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        await SeedTextSnippet();
        await SeedMultiDbDemoEntity();
    }

    // [Verified] Pattern for conditional seeding based on existing data
    private async Task SeedTextSnippet()
    {
        var numberOfItemsGroupSeedTextSnippet = 20;

        // Skip seeding if sufficient data already exists
        if (await textSnippetRepository.CountAsync() >= numberOfItemsGroupSeedTextSnippet)
            return;

        // [Verified] Loop with CreateOrUpdateAsync and custom existence check
        for (var i = 0; i < numberOfItemsGroupSeedTextSnippet; i++)
        {
            await textSnippetRepository.CreateOrUpdateAsync(
                TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: $"Example Abc {i}", fullText: $"This is full text of Example Abc {i} snippet text"),
                customCheckExistingPredicate: p => p.SnippetText == $"Example Abc {i}");

            await textSnippetRepository.CreateOrUpdateAsync(
                TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: $"Example Def {i}", fullText: $"This is full text of Example Def {i} snippet text"),
                customCheckExistingPredicate: p => p.SnippetText == $"Example Def {i}");
        }
    }

    // [Verified] Simple entity creation pattern
    private async Task SeedMultiDbDemoEntity()
    {
        if (await textSnippetRepository.AnyAsync(p => p.SnippetText.StartsWith("Example")))
            return;

        for (var i = 0; i < 20; i++)
        {
            await multiDbDemoEntityRepository.CreateOrUpdateAsync(
                new MultiDbDemoEntity
                {
                    Id = Ulid.NewUlid().ToString(),
                    Name = $"Multi Db Demo Entity {i}"
                });
        }
    }
}
```

#### [Verified] Command-Based Data Seeder with Request Context

```csharp
// Place in: [ServiceName].Application/DataSeeders/
public sealed class DemoSeedDataUseCommandSolutionDataSeeder : PlatformApplicationDataSeeder
{
    public DemoSeedDataUseCommandSolutionDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider) : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
    }

    // [Verified] Background seeding with delay
    public override int DelaySeedingInBackgroundBySeconds => DefaultActiveDelaySeedingInBackgroundBySeconds;

    // [Verified] Seeding order control for multiple seeders
    public override int SeedOrder => 2;

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        // [Verified] ExecuteInjectScopedAsync pattern for dependency injection
        await ServiceProvider.ExecuteInjectScopedAsync(SeedSnippetText, isReplaceNewSeed);
    }

    // [Verified] Use CQRS commands for seeding - tests commands while seeding
    private static async Task SeedSnippetText(
        bool isReplaceNewSeed,
        IPlatformCqrs cqrs,
        IPlatformApplicationRequestContextAccessor userContextAccessor,
        ITextSnippetRepository<TextSnippetEntity> snippetRepository)
    {
        if (await snippetRepository.AnyAsync(p => p.SnippetText == "Dummy Seed SnippetText") && !isReplaceNewSeed)
            return;

        // [Verified] Set up request context for command execution
        userContextAccessor.Current.SetUserId(Ulid.NewUlid().ToString());
        userContextAccessor.Current.SetEmail("SeedUserEmail");

        // [Verified] Use commands for seeding - this tests the command pipeline
        await cqrs.SendCommand(
            new SaveSnippetTextCommand
            {
                Data = new TextSnippetEntityDto
                {
                    Id = Ulid.Parse("01J0P1CE4TW4RY3TKZ9CNX73NR").ToString(),
                    SnippetText = "Dummy Seed SnippetText",
                    FullText = "Dummy Seed FullText"
                },
                AutoCreateIfNotExisting = true
            });
    }
}
```

#### [Verified] Advanced Dummy Data Seeder with Configuration

```csharp
// Place in: [ServiceName].Application/DataSeeders/
public class JobDummyDataApplicationDataSeeder : PlatformApplicationDataSeeder
{
    protected readonly IPlatformApplicationBusMessageProducer BusMessageProducer;
    protected readonly IJobDomainRootRepository<JobEntity> JobRepository;
    protected readonly IJobDomainRootRepository<OrganizationalUnitEntity> OrganizationRepository;
    protected readonly IJobDomainRootRepository<UserEntity> UserRepository;

    public JobDummyDataApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        IJobDomainRootRepository<JobEntity> jobRepository,
        IJobDomainRootRepository<OrganizationalUnitEntity> orgRepository,
        IJobDomainRootRepository<UserEntity> userRepository,
        IPlatformApplicationBusMessageProducer busMessageProducer)
        : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
        JobRepository = jobRepository;
        OrganizationRepository = orgRepository;
        UserRepository = userRepository;
        BusMessageProducer = busMessageProducer;
    }

    // [Verified] Background seeding for large datasets
    public override int DelaySeedingInBackgroundBySeconds => DefaultActiveDelaySeedingInBackgroundBySeconds;

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        // [Verified] Configuration-based conditional seeding
        if (!Configuration.GetSection("SeedDummyData").Get<bool>())
            return;

        await WaitSyncDummyOrgsAndUsers();
        await SeedDummyJobsForUser(SeedAdminUserData.Create(Configuration), ProductScopes.BravoGrowth);
        await SeedDummyJobsForUser(SeedTestUserData.CreateDefaultUser(null), ProductScopes.BravoGrowth);
    }

    // [Verified] Wait and retry pattern with condition checking
    private async Task SeedDummyJobsForUser(SeedUserAccountInfo seedUserAccountInfo, ProductScopes productScope)
    {
        await Util.TaskRunner.WaitUntilToDo(
            condition: async () =>
            {
                var userId = await UserRepository.FirstOrDefaultAsync(
                    queryBuilder: query => query
                        .Where(p => p.Email == seedUserAccountInfo.Email)
                        .Select(p => p.Id));

                var companyId = await OrganizationRepository.FirstOrDefaultAsync(
                    queryBuilder: query => query
                        .Where(p => p.Name == seedUserAccountInfo.Companies.First().Name)
                        .Select(p => p.Id));

                return userId != null && companyId != null;
            },
            async () =>
            {
                // [Verified] WaitRetryDoUntil pattern for concurrent seeding protection
                await Util.TaskRunner.WaitRetryDoUntilAsync(
                    async () =>
                    {
                        var currentJobCount = await JobRepository.CountAsync();

                        if (currentJobCount >= SeedingMinimumDummyItemsCount(Configuration))
                            return;

                        // [Verified] ExecuteInjectScopedAsync with multiple parameters
                        await ServiceProvider.ExecuteInjectScopedAsync(
                            DoSeedDummyJob,
                            seedUserAccountInfo,
                            userId,
                            companyId,
                            productScope,
                            currentJobCount + 1);
                    },
                    until: async () => await JobRepository.CountAsync() >= SeedingMinimumDummyItemsCount(Configuration),
                    maxWaitSeconds: SeedingMinimumDummyItemsCount(Configuration) * 60,
                    waitIntervalSeconds: DefaultDelayRetryCheckSeedDataBySeconds
                );
            });
    }

    // [Verified] Scoped method for seeding with request context setup
    private static async Task DoSeedDummyJob(
        SeedUserAccountInfo seedUserAccountInfo,
        string userId,
        string companyId,
        ProductScopes productScope,
        int counter,
        IPlatformApplicationRequestContextAccessor currentUserAccessor,
        IPlatformCqrs cqrs)
    {
        // [Verified] Populate request context with seeding user info
        await currentUserAccessor.Current.PopulateSeedUserAccountInfo(
            seedUserAccountInfo,
            p => Task.FromResult(userId),
            p => Task.FromResult(companyId),
            productScope);

        // [Verified] Use commands for consistent seeding
        await cqrs.SendCommand(new CreateJobCommand
        {
            Title = $"Dummy Job {counter}",
            Description = $"This is a dummy job created for testing purposes - {counter}",
            Department = "Engineering",
            Location = "Remote"
        });
    }
}
```

### 10. Platform Domain Service Pattern

#### [Verified] PlatformDomainService Base Class

```csharp
// Place in: [ServiceName].Domain/Services/
// Example: AssignWorkingShiftFailedLogService pattern
public class RecruiterEmailService : PlatformDomainService
{
    private readonly ICandidatePlatformRootRepository<Employee> employeeRepository;

    // [Verified] Required constructor pattern for PlatformDomainService
    public RecruiterEmailService(
        IPlatformCqrs cqrs,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ICandidatePlatformRootRepository<Employee> employeeRepository) : base(cqrs, unitOfWorkManager)
    {
        this.employeeRepository = employeeRepository;
    }

    // [Verified] Domain service methods for complex business logic
    public async Task<List<string>> GetActiveRecruiterEmailsAsync(
        List<string> emails,
        CancellationToken cancellationToken = default)
    {
        if (emails == null || !emails.Any())
        {
            return [];
        }

        // Use repository extensions and expression methods for filtering
        var resignedRecruiterEmails = await employeeRepository.GetAllAsync(
            Employee.FindResignedRecruitersByEmailsExpr(emails),
            cancellationToken: cancellationToken);

        // Extract all email addresses from resigned recruiters
        var resignedEmailAddresses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var resignedRecruiter in resignedRecruiterEmails)
        {
            if (!string.IsNullOrEmpty(resignedRecruiter.Email))
                resignedEmailAddresses.Add(resignedRecruiter.Email);

            if (!string.IsNullOrEmpty(resignedRecruiter.EmployeeEmail))
                resignedEmailAddresses.Add(resignedRecruiter.EmployeeEmail);
        }

        // Return only emails that are not associated with resigned recruiters
        return emails.Where(email =>
            !string.IsNullOrEmpty(email) &&
            !resignedEmailAddresses.Contains(email)).ToList();
    }

    // [Verified] Static methods for utility operations (following AssignWorkingShiftService pattern)
    public static async Task<List<Employee>> ProcessEmployeesBatchAsync(
        List<Employee> employees,
        IGrowthRootRepository<Employee> employeeRepo,
        CancellationToken cancellationToken)
    {
        // Validation first
        employees
            .Select(e => e.Validate(
                must: emp => emp.Status != EmploymentStatus.Resigned,
                errorMsg: $"Employee {e.Id} is resigned"))
            .AggregateValidations()
            .Of(employees);

        // Process batch operation
        await employeeRepo.UpdateManyAsync(
            employees.SelectList(e => e.UpdateStatus()),
            cancellationToken: cancellationToken);

        return employees;
    }
}
```

#### [Verified] Domain Service Key Patterns

**✅ Constructor Pattern**: Always requires `IPlatformCqrs cqrs` and `IPlatformUnitOfWorkManager unitOfWorkManager` as first two parameters
**✅ Naming Convention**: `[BusinessConcept]Service` (e.g., `AssignWorkingShiftService`, `RecruiterEmailService`)
**✅ Location**: Place in `[ServiceName].Domain/Services/` or `[ServiceName].Domain/Services/[SubDomain]/`
**✅ Static Methods**: Use for utility operations that don't require instance state (following `AssignWorkingShiftService` pattern)
**✅ Instance Methods**: Use for operations that require injected dependencies
**✅ Validation**: Use `ValidateNot()`, `EnsureDomainValidationValid()`, and `AggregateValidations()` patterns
**✅ Repository Usage**: Inject microservice-specific repository interfaces (e.g., `ICandidatePlatformRootRepository<T>`)

## Performance and Monitoring Patterns

### 1. Performance Optimization Strategies

#### Database Query Optimization

```csharp
// ✅ Use MongoDB indexes for frequent queries
public async Task EnsureEmployeeCollectionIndexesAsync(bool recreate = false)
{
    if (recreate) await EmployeeCollection.Indexes.DropAllAsync();

    await EmployeeCollection.Indexes.CreateManyAsync([
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Ascending(e => e.CompanyId)
                .Ascending(e => e.IsActive)
                .Ascending(e => e.Status),
            new CreateIndexOptions { Name = "IX_Employee_Company_Active_Status", Background = true }),

        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Text(e => e.FullName)
                .Text(e => e.Email),
            new CreateIndexOptions { Name = "IX_Employee_Search", Background = true })
    ]);
}

// ✅ Use pagination for large datasets
public async Task<GetEmployeesQueryResult> GetEmployeesAsync(GetEmployeesQuery query)
{
    var totalCount = await repository.CountAsync(Employee.ActiveByCompanyExpr(query.CompanyId));

    var employees = await repository.GetAllAsync(
        predicate: Employee.ActiveByCompanyExpr(query.CompanyId),
        orderBy: query => query.OrderBy(e => e.FullName),
        skip: (query.PageNumber - 1) * query.PageSize,
        take: query.PageSize
    );

    return new GetEmployeesQueryResult
    {
        Items = employees.Select(EmployeeDto.Create).ToList(),
        TotalCount = totalCount,
        PageNumber = query.PageNumber,
        PageSize = query.PageSize
    };
}
```

#### Caching Patterns

```csharp
// ✅ Request-level caching for expensive operations
public async Task<Employee> GetCurrentEmployeeAsync()
{
    return await cacheProvider.Get().CacheRequestAsync(
        () => repository.FirstOrDefaultAsync(Employee.ByUserIdExpr(RequestContext.UserId())),
        cacheKey: ApplicationCustomRequestContextKeys.CurrentEmployeeCacheKey(
            RequestContext.ProductScope(),
            RequestContext.CurrentCompanyId(),
            RequestContext.UserId()),
        expiration: TimeSpan.FromMinutes(30),
        tags: ApplicationCustomRequestContextKeys.CurrentEmployeeCacheTags(
            RequestContext.ProductScope(),
            RequestContext.CurrentCompanyId(),
            RequestContext.UserId())
    );
}

// ✅ Distributed caching for shared data
public async Task<List<CompanyPolicy>> GetCompanyPoliciesAsync(string companyId)
{
    var cacheKey = new PlatformCacheKey("CompanyPolicies", companyId);

    return await distributedCache.GetOrSetAsync(
        cacheKey,
        async () => await repository.GetAllAsync(
            CompanyPolicy.ByCompanyExpr(companyId),
            orderBy: q => q.OrderBy(p => p.Name)
        ),
        TimeSpan.FromHours(4),
        tags: [$"company_{companyId}", "policies"]
    );
}
```

#### Background Job Performance

```csharp
// ✅ Efficient background job with batching and error handling
[PlatformRecurringJob("0 2 * * *")] // Run at 2 AM daily
public class ProcessMonthlyReportsJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    private const int BatchSize = 50;
    private readonly IEmployeeRepository employeeRepository;
    private readonly IReportService reportService;

    protected override async Task ProcessAsync()
    {
        var processedCount = 0;
        var errorCount = 0;

        await ExecuteInjectScopedPagingAsync(
            maxItemCount: await GetTotalEmployeeCount(),
            pageSize: BatchSize,
            async (employees, cancellationToken) =>
            {
                var tasks = employees.Select(async employee =>
                {
                    try
                    {
                        await reportService.GenerateMonthlyReportAsync(employee.Id);
                        Interlocked.Increment(ref processedCount);
                    }
                    catch (Exception ex)
                    {
                        Interlocked.Increment(ref errorCount);
                        Logger.LogError(ex, "Failed to process report for employee {EmployeeId}", employee.Id);
                    }
                });

                await Task.WhenAll(tasks);
            });

        Logger.LogInformation("Monthly report processing completed. Processed: {ProcessedCount}, Errors: {ErrorCount}",
            processedCount, errorCount);
    }

    private async Task<int> GetTotalEmployeeCount()
    {
        return await employeeRepository.CountAsync(Employee.IsActiveExpr());
    }
}
```

### 2. Monitoring and Observability

#### Application Performance Monitoring

```csharp
// ✅ Custom metrics for business operations
public class LeaveRequestMetrics
{
    private readonly IMetricsLogger metricsLogger;

    public async Task<SaveLeaveRequestCommandResult> HandleAsync(SaveLeaveRequestCommand request)
    {
        using var activity = metricsLogger.StartActivity("LeaveRequest.Save");

        try
        {
            var stopwatch = Stopwatch.StartNew();

            // Business logic here
            var result = await ProcessLeaveRequest(request);

            stopwatch.Stop();

            // Record metrics
            metricsLogger.RecordValue("LeaveRequest.ProcessingTime", stopwatch.ElapsedMilliseconds);
            metricsLogger.IncrementCounter("LeaveRequest.Processed",
                tags: new[] { $"type:{request.Type}", $"status:{result.Status}" });

            return result;
        }
        catch (Exception ex)
        {
            metricsLogger.IncrementCounter("LeaveRequest.Errors",
                tags: new[] { $"error:{ex.GetType().Name}" });
            throw;
        }
    }
}

// ✅ Health checks for dependencies
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IEmployeeRepository repository;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await repository.CountAsync(cancellationToken: cancellationToken);
            return HealthCheckResult.Healthy($"Database accessible. Employee count: {count}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database connection failed", ex);
        }
    }
}
```

#### Structured Logging

```csharp
// ✅ Structured logging with correlation IDs
public class SaveLeaveRequestCommandHandler : PlatformCqrsCommandApplicationHandler<SaveLeaveRequestCommand, SaveLeaveRequestCommandResult>
{
    protected override async Task<SaveLeaveRequestCommandResult> HandleAsync(SaveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        using var scope = Logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = RequestContext.CorrelationId(),
            ["UserId"] = RequestContext.UserId(),
            ["CompanyId"] = RequestContext.CurrentCompanyId(),
            ["Operation"] = "SaveLeaveRequest"
        });

        Logger.LogInformation("Processing leave request for employee {EmployeeId}, type {RequestType}, dates {FromDate} to {ToDate}",
            request.EmployeeId, request.Type, request.FromDate, request.ToDate);

        try
        {
            var result = await ProcessRequest(request, cancellationToken);

            Logger.LogInformation("Successfully processed leave request {LeaveRequestId} with status {Status}",
                result.LeaveRequestId, result.Status);

            return result;
        }
        catch (BusinessValidationException ex)
        {
            Logger.LogWarning("Business validation failed for leave request: {ValidationErrors}",
                string.Join(", ", ex.Errors));
            throw;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Unexpected error processing leave request for employee {EmployeeId}",
                request.EmployeeId);
            throw;
        }
    }
}
```

### 3. Frontend Performance Patterns

#### Efficient State Management

```typescript
// ✅ Optimized store with selective updates and caching
@Injectable()
export class EmployeeListVmStore extends PlatformVmStore<EmployeeListState> {
    private readonly employeeApi = inject(EmployeeApiService);

    // Selectors with memoization
    public readonly filteredEmployees$ = this.select(
        this.select(state => state.employees),
        this.select(state => state.searchFilter),
        this.select(state => state.departmentFilter),
        (employees, search, department) => {
            if (!employees) return [];

            return employees.filter(emp => {
                const matchesSearch =
                    !search || emp.fullName.toLowerCase().includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());

                const matchesDepartment = !department || emp.departmentId === department;

                return matchesSearch && matchesDepartment;
            });
        }
    );

    // Efficient loading with request deduplication
    public loadEmployees = this.effectSimple(() => {
        return this.employeeApi.getEmployees().pipe(
            distinctUntilChanged(),
            shareReplay(1),
            this.tapResponse(employees => this.updateState({ employees, lastLoadTime: Date.now() }))
        );
    });

    // Smart refresh that checks cache age
    public refreshIfStale = this.effectSimple(() => {
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        return this.select(state => state.lastLoadTime).pipe(
            filter(lastLoad => !lastLoad || Date.now() - lastLoad > staleThreshold),
            switchMap(() => this.loadEmployees())
        );
    });
}
```

#### Component Optimization

```typescript
// ✅ Optimized component with OnPush and trackBy
@Component({
    selector: 'app-employee-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="search-controls">
            <input [formControl]="searchControl" placeholder="Search employees..." (input)="onSearchChange($event)" />
        </div>

        <virtual-scroller #scroller [items]="filteredEmployees$ | async" [bufferAmount]="5">
            <div
                *cdkVirtualFor="let employee of filteredEmployees$; trackBy: trackByEmployeeId; index as i"
                class="employee-item"
                [class.selected]="employee.id === selectedEmployeeId"
            >
                <app-employee-card [employee]="employee" (click)="selectEmployee(employee)"></app-employee-card>
            </div>
        </virtual-scroller>
    `
})
export class EmployeeListComponent extends AppBaseVmStoreComponent<EmployeeListState, EmployeeListVmStore> {
    public readonly searchControl = new FormControl('');
    public selectedEmployeeId = signal<string | null>(null);

    // TrackBy function for performance
    public trackByEmployeeId = (index: number, employee: Employee): string => employee.id;

    // Debounced search
    private readonly searchDebounced$ = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged());

    ngOnInit() {
        // Setup search subscription
        this.searchDebounced$.pipe(this.takeUntilDestroyed()).subscribe(searchTerm => {
            this.store.updateSearchFilter(searchTerm);
        });

        // Load data with stale check
        this.store.refreshIfStale();
    }

    public selectEmployee(employee: Employee): void {
        this.selectedEmployeeId.set(employee.id);
    }

    public onSearchChange(event: Event): void {
        // Input handled by searchDebounced$ subscription
    }
}
```

## Environment Specific Configuration

### 1. Environment Detection and Configuration

#### Environment-Aware Service Configuration

```csharp
// ✅ Environment-specific configurations
public class GrowthApiAspNetCoreModule : PlatformAspNetCoreModule
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        // Environment-specific database configuration
        if (Environment.IsDevelopment())
        {
            services.Configure<MongoDbOptions>(options =>
            {
                options.ConnectionString = Configuration.GetConnectionString("MongoDbDev");
                options.DatabaseName = "GrowthDev";
                options.EnableSensitiveDataLogging = true;
            });
        }
        else if (Environment.IsStaging())
        {
            services.Configure<MongoDbOptions>(options =>
            {
                options.ConnectionString = Configuration.GetConnectionString("MongoDbUAT");
                options.DatabaseName = "GrowthUAT";
                options.EnableSensitiveDataLogging = false;
            });
        }
        else // Production
        {
            services.Configure<MongoDbOptions>(options =>
            {
                options.ConnectionString = Configuration.GetConnectionString("MongoDbProd");
                options.DatabaseName = "GrowthProd";
                options.EnableSensitiveDataLogging = false;
                options.EnableDetailedErrors = false;
            });
        }

        // Environment-specific caching
        if (Environment.IsProduction())
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = Configuration.GetConnectionString("Redis");
                options.InstanceName = "BravoSUITE_Growth_Prod";
            });
        }
        else
        {
            services.AddMemoryCache();
        }
    }

    protected override void ConfigureLogging(ILoggingBuilder logging)
    {
        if (Environment.IsProduction())
        {
            // Production: Structured logging to Application Insights
            logging.AddApplicationInsights();
            logging.SetMinimumLevel(LogLevel.Information);
        }
        else if (Environment.IsStaging())
        {
            // UAT: File logging + console
            logging.AddFile("logs/growth-uat-{Date}.log");
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Debug);
        }
        else
        {
            // Development: Console + debug output
            logging.AddConsole();
            logging.AddDebug();
            logging.SetMinimumLevel(LogLevel.Trace);
        }
    }
}
```

### 2. Frontend Environment Configuration

#### Environment-Specific Angular Configuration

```typescript
// environment.prod.ts
export const environment = {
    production: true,
    apiUrl: 'https://api.bravosuite.io',
    growthApiUrl: 'https://api.bravosuite.io/growth',
    talentsApiUrl: 'https://api.bravosuite.io/talents',

    // Feature flags
    enableAdvancedReporting: true,
    enableBetaFeatures: false,

    // Performance settings
    enableServiceWorker: true,
    cacheTimeout: 300000, // 5 minutes

    // Monitoring
    enableAnalytics: true,
    enableErrorReporting: true,
    logLevel: 'warn'
};

// environment.uat.ts
export const environment = {
    production: false,
    apiUrl: 'https://api-uat.bravosuite.io',
    growthApiUrl: 'https://api-uat.bravosuite.io/growth',
    talentsApiUrl: 'https://api-uat.bravosuite.io/talents',

    // Feature flags for testing
    enableAdvancedReporting: true,
    enableBetaFeatures: true,

    // Performance settings
    enableServiceWorker: false,
    cacheTimeout: 60000, // 1 minute for faster testing

    // Monitoring
    enableAnalytics: false,
    enableErrorReporting: true,
    logLevel: 'debug'
};

// ✅ Environment-aware service configuration
@Injectable({ providedIn: 'root' })
export class ConfigurationService {
    private readonly config = environment;

    get isProduction(): boolean {
        return this.config.production;
    }

    get apiBaseUrl(): string {
        return this.config.apiUrl;
    }

    get cacheTimeout(): number {
        return this.config.cacheTimeout;
    }

    get enabledFeatures(): string[] {
        const features: string[] = [];

        if (this.config.enableAdvancedReporting) features.push('advanced-reporting');
        if (this.config.enableBetaFeatures) features.push('beta-features');

        return features;
    }

    public isFeatureEnabled(feature: string): boolean {
        return this.enabledFeatures.includes(feature);
    }
}
```

### 3. Deployment Configuration Management

#### Docker Environment Configuration

```dockerfile
# Dockerfile.growth-api
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Environment-specific settings
ARG ENVIRONMENT=Production
ENV ASPNETCORE_ENVIRONMENT=${ENVIRONMENT}
ENV DOTNET_ENVIRONMENT=${ENVIRONMENT}

# Copy configuration files based on environment
COPY src/Services/bravoGROWTH/Growth.Service/appsettings.json .
COPY src/Services/bravoGROWTH/Growth.Service/appsettings.${ENVIRONMENT}.json .

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/Services/bravoGROWTH/Growth.Service/Growth.Service.csproj"
RUN dotnet build "src/Services/bravoGROWTH/Growth.Service/Growth.Service.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "src/Services/bravoGROWTH/Growth.Service/Growth.Service.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Growth.Service.dll"]
```

#### Kubernetes Configuration

```yaml
# k8s/growth-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: growth-api
    namespace: bravo-suite
spec:
    replicas: 3
    selector:
        matchLabels:
            app: growth-api
    template:
        metadata:
            labels:
                app: growth-api
        spec:
            containers:
                - name: growth-api
                  image: bravosuite/growth-api:latest
                  ports:
                      - containerPort: 80
                  env:
                      - name: ASPNETCORE_ENVIRONMENT
                        value: 'Production'
                      - name: ConnectionStrings__MongoDB
                        valueFrom:
                            secretKeyRef:
                                name: mongodb-secret
                                key: connection-string
                      - name: ConnectionStrings__Redis
                        valueFrom:
                            secretKeyRef:
                                name: redis-secret
                                key: connection-string
                  resources:
                      requests:
                          memory: '256Mi'
                          cpu: '250m'
                      limits:
                          memory: '512Mi'
                          cpu: '500m'
                  livenessProbe:
                      httpGet:
                          path: /health
                          port: 80
                      initialDelaySeconds: 30
                      periodSeconds: 10
                  readinessProbe:
                      httpGet:
                          path: /health/ready
                          port: 80
                      initialDelaySeconds: 5
                      periodSeconds: 5
```

## Frontend Code Patterns (WebV2)

### 📋 WebV2 Component Hierarchy & Usage Guide

#### Component Decision Tree for AI Agents

```
Building WebV2 component?
├── Simple UI display? → Extend `AppBaseComponent`
├── Complex state management? → Extend `AppBaseVmStoreComponent<State, Store>`
├── Form with validation? → Extend `AppBaseFormComponent<FormVm>`
├── Component with store and form? → Extend `AppBaseVmStoreComponent` + inject form service
└── Platform library component? → Extend `PlatformComponent` (rare)
```

#### Component Hierarchy (Platform → AppBase → Implementation)

```typescript
// Platform Core Layer (Platform Framework)
PlatformComponent               // Base: subscription cleanup, signals, platform services
├── PlatformVmComponent         // + ViewModel injection
├── PlatformFormComponent       // + Reactive Forms integration
└── PlatformVmStoreComponent    // + ComponentStore integration

// AppBase Layer (BravoSUITE Application Framework)
AppBaseComponent                // + Auth, roles, company context, authorization helpers
├── AppBaseVmComponent          // + ViewModel + auth context
├── AppBaseFormComponent        // + Forms + auth + validation patterns
└── AppBaseVmStoreComponent     // + Store + auth + loading/error handling

// Implementation Layer (Actual Features)
├── AppHeaderComponent extends AppBaseComponent (growth-for-company)
├── HierarchySelectComponent extends AppBaseComponent (growth-for-company)
├── AppComponent extends AppBaseVmStoreComponent<AppState, EmployeeAppStore> (employee)
├── CompanyHolidayDetailFormComponent extends AppBaseFormComponent<CompanyHolidayDetailFormVm>
├── AttendanceRequestFormComponent extends AppBaseFormComponent<AttendanceRequestDetailFormVm>
└── LeaveRequestDetailFormComponent extends AppBaseFormComponent<LeaveRequestDetailFormVm>
```

#### Real Store Implementation Examples

```typescript
// Concrete PlatformVmStore implementations discovered:
├── UserManagementVmStore extends PlatformVmStore<UserManagementState>
├── CheckInsManagementVmStore extends PlatformVmStore<CheckInsManagementState>
├── GoalManagementVmStore extends PlatformVmStore<GoalManagementState>
├── EmployeeTimesheetVmStore extends PlatformVmStore<EmployeeTimesheetState>
├── CompanyHolidayStore extends PlatformVmStore<CompanyHolidayState>
└── EmployeeAppStore extends PlatformVmStore<AppState>

// Pattern: vmConstructor property for store initialization
```

### 1. Platform Core Components

#### PlatformComponent (Base Class)

```typescript
// Base component with automatic subscription cleanup and state management signals
@Directive()
export abstract class PlatformComponent implements OnDestroy {
    public destroyed$ = new BehaviorSubject<boolean>(false);
    public status$ = signal(ComponentStateStatus.Pending);

    // Injected platform services
    public toast = inject(ToastrService);
    public translateSrv = inject(PlatformTranslateService);
    public authService = inject(AuthService);
    public dialogService = inject(PlatformDialogService);

    ngOnDestroy() {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    }

    // Helper method for takeUntil pattern
    protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
        return takeUntil(this.destroyed$);
    }
}
```

#### PlatformVmStore (Base Store)

```typescript
// Enhanced ComponentStore with caching, lifecycle management, and effect wrappers
@Injectable()
export abstract class PlatformVmStore<TViewModel extends PlatformVm> extends ComponentStore<TViewModel> implements OnDestroy {
    // Abstract properties to be implemented by derived stores
    protected abstract cachedStateKeyName: (() => string) | string;
    public abstract initOrReloadVm: (isReload: boolean) => Observable<any> | void;

    // State selectors
    public readonly loading$ = this.select(state => state.loading);
    public readonly errorMsg$ = this.select(state => state.errorMsg);

    // Effect wrapper for automatic loading/error state management
    protected observerLoadingErrorState<T>(): MonoTypeOperatorFunction<T> {
        return (source: Observable<T>) =>
            source.pipe(
                tap(() => this.setLoading(true)),
                tap({
                    next: () => this.setLoading(false),
                    error: error => {
                        this.setLoading(false);
                        this.setErrorMsg(this.getErrorMessage(error));
                    }
                })
            );
    }

    // Simplified effect method with automatic state management
    protected effectSimple<T>(generator: (origin$?: Observable<T>) => Observable<any>): (origin$?: Observable<T>) => void {
        return this.effect((origin$: Observable<T>) => generator(origin$).pipe(this.observerLoadingErrorState()));
    }

    ngOnDestroy() {
        /* ... cleanup logic ... */
    }
}
```

### 2. State Management with Stores

#### Feature Store with API Integration

```typescript
// Place in: apps/[app-name]/src/app/shared/ui-stores/
@Injectable()
export class LeaveRequestVmStore extends PlatformVmStore<LeaveRequestState> {
    constructor(private leaveRequestApi: LeaveRequestApiService, private authService: AuthService) {
        super(new LeaveRequestState());
    }

    protected cachedStateKeyName = () => 'LeaveRequestVmStore';

    public override initOrReloadVm = (isReload: boolean) => this.loadLeaveRequests();

    // Effect for loading data with automatic state updates
    public loadLeaveRequests = this.effectSimple((query?: GetLeaveRequestListQuery) => {
        return this.leaveRequestApi.getLeaveRequests(query).pipe(this.tapResponse(result => this.updateState({ result })));
    });

    // Effect for creating leave request
    public createLeaveRequest = this.effectSimple((command: CreateLeaveRequestCommand) => {
        return this.leaveRequestApi.createLeaveRequest(command).pipe(
            this.tapResponse(result => {
                this.toast.success('Leave request created successfully');
                this.loadLeaveRequests(); // Reload data
            })
        );
    });

    // Selector for reactive access to state
    public readonly requests$ = this.select(state => state.result?.items ?? []);
    public readonly totalCount$ = this.select(state => state.result?.totalCount ?? 0);
    public readonly canCreateRequest$ = this.authService.currentUser$.pipe(map(user => user?.hasRole('Employee')));
}

interface LeaveRequestState extends PlatformVm {
    result?: GetLeaveRequestListQueryResult;
}
```

### 3. API Services

#### Domain API Service Implementation

```typescript
// Place in: libs/bravo-domain/src/[domain]/api-services/
@Injectable({ providedIn: 'root' })
export class LeaveRequestApiService extends PlatformApiService {
    // API URL is configured via dependency injection
    constructor(@Inject(GROWTH_BASE_URL) protected override apiUrl: string) {
        super();
        this.apiUrl += '/api/LeaveRequest';
    }

    // GET with query parameters and automatic caching
    public getLeaveRequests(params: GetLeaveRequestListQuery): Observable<GetLeaveRequestListQueryResult> {
        return this.get<GetLeaveRequestListQueryResult>('', params);
    }

    // POST with multipart form for file uploads
    public createLeaveRequest(command: CreateLeaveRequestCommand): Observable<CreateLeaveRequestCommandResult> {
        return this.postFileMultiPartForm<CreateLeaveRequestCommandResult>('', command);
    }

    // PUT for updates
    public updateLeaveRequest(id: string, command: UpdateLeaveRequestCommand): Observable<UpdateLeaveRequestCommandResult> {
        return this.put<UpdateLeaveRequestCommandResult>(`/${id}`, command);
    }

    // DELETE with confirmation
    public deleteLeaveRequest(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    // Custom business operation
    public approveLeaveRequest(id: string, comment?: string): Observable<void> {
        return this.post<void>(`/${id}/approve`, { comment });
    }
}
```

### 4. Form Components

#### Form Component with Platform Integration

```typescript
// Place in: apps/[app-name]/src/app/shared/components/forms/
export class LeaveRequestDetailFormComponent extends AppBaseFormComponent<LeaveRequestDetailFormVm> {
    // Platform form configuration pattern
    override initialFormConfig(): FormGroup {
        return this.fb.group({
            requestTypeId: [null, [Validators.required]],
            fromDate: [null, [Validators.required]],
            toDate: [null, [Validators.required]],
            reason: ['', [Validators.required, Validators.maxLength(500)]],
            files: [[] as File[]]
        });
    }

    // Platform async validation pattern
    private setupAsyncValidators() {
        this.formGroup.setAsyncValidators([checkIsLeaveRequestDateRangeOverlappedAsyncValidator(this.leaveRequestApi)]);
    }

    // Business logic validation
    protected override setupCustomValidation() {
        // Date range validation
        this.formGroup
            .get('toDate')
            ?.valueChanges.pipe(this.takeUntilDestroyed())
            .subscribe(() => {
                this.validateDateRange();
            });
    }

    private validateDateRange() {
        const fromDate = this.formGroup.get('fromDate')?.value;
        const toDate = this.formGroup.get('toDate')?.value;

        if (fromDate && toDate && fromDate > toDate) {
            this.formGroup.get('toDate')?.setErrors({ dateRange: true });
        }
    }

    // File upload handling
    onFilesSelected(files: File[]) {
        this.formGroup.get('files')?.setValue(files);
        this.validateFileSize(files);
    }

    private validateFileSize(files: File[]) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const invalidFiles = files.filter(f => f.size > maxSize);

        if (invalidFiles.length > 0) {
            this.toast.error('Some files exceed the 5MB limit');
        }
    }
}
```

### 5. Authorization & Navigation

#### Role-Based Route Guard

```typescript
// Place in: apps/[app-name]/src/app/shared/guards/
@Injectable()
export class CanActivateByHrGuard implements CanActivate {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
        return this.authService.currentUser$.pipe(
            map(user => {
                const hasAccess = user?.hasRole('HR') || user?.hasRole('HRManager');
                if (!hasAccess) {
                    this.router.navigate(['/no-permission']);
                    return false;
                }
                return true;
            })
        );
    }
}
```

#### Prevent Unsaved Changes Guard

```typescript
// Place in: apps/[app-name]/src/app/shared/guards/
@Injectable()
export class PreventUnsavedChangesGuard implements CanDeactivate<any> {
    private dialogService = inject(PlatformDialogService);

    canDeactivate(component: any): Observable<boolean> | boolean {
        if (component.form?.dirty) {
            return this.dialogService
                .confirm({
                    title: 'Unsaved Changes',
                    message: 'You have unsaved changes. Are you sure you want to leave?',
                    confirmText: 'Leave',
                    cancelText: 'Stay'
                })
                .afterClosed()
                .pipe(map(result => !!result));
        }
        return true;
    }
}
```

#### Template with Conditional Display Logic

```html
<!-- Role-based visibility -->
<button *ngIf="canApprove$ | async" (click)="approve()">Approve</button>
<button *ngIf="canEdit$ | async" (click)="edit()">Edit</button>
<button *ngIf="canDelete$ | async" (click)="delete()">Delete</button>

<!-- Loading and error handling -->
<app-loading-and-error-indicator [target]="this"></app-loading-and-error-indicator>

@if (vm(); as vm) {
<div class="component-content">
    <!-- Main content when loaded -->
</div>
}

<!-- Advanced loading with skeleton -->
<app-loading-and-error-indicator [target]="this" [useProgressBarForLoading]="true" [showProgressBarDelayMs]="300" [skeletonLoadingType]="'cards'">
</app-loading-and-error-indicator>
```

```typescript
// In component class
export class LeaveRequestItemComponent extends PlatformComponent {
    @Input() leaveRequest!: LeaveRequest;

    // Permission-based observables
    canApprove$ = this.authService.currentUser$.pipe(map(user => user?.hasRole('Manager') && this.leaveRequest.status === 'Pending'));

    canEdit$ = this.authService.currentUser$.pipe(map(user => user?.employeeId === this.leaveRequest.employeeId && this.leaveRequest.status === 'Draft'));

    canDelete$ = this.authService.currentUser$.pipe(
        map(user => (user?.employeeId === this.leaveRequest.employeeId || user?.hasRole('HR')) && this.leaveRequest.status === 'Draft')
    );
}
```

### 6. Loading and Error Handling

#### Component with Advanced State Management

```typescript
export class LeaveRequestListComponent extends PlatformComponent implements OnInit {
    public store = inject(LeaveRequestVmStore);

    // Reactive data streams
    public requests$ = this.store.requests$;
    public loading$ = this.store.loading$;
    public errorMsg$ = this.store.errorMsg$;

    // Query parameters
    public currentPage = signal(1);
    public pageSize = signal(20);
    public searchText = signal('');

    ngOnInit() {
        // React to query parameter changes
        combineLatest([this.currentPage.asObservable(), this.pageSize.asObservable(), this.searchText.asObservable().pipe(debounceTime(300))])
            .pipe(
                this.takeUntilDestroyed(),
                map(([page, size, search]) => ({ page, size, search }))
            )
            .subscribe(params => {
                this.loadData(params);
            });

        // Initial load
        this.store.initOrReloadVm(false);
    }

    private loadData(params: { page: number; size: number; search: string }) {
        const query: GetLeaveRequestListQuery = {
            pageNumber: params.page,
            pageSize: params.size,
            searchText: params.search
        };
        this.store.loadLeaveRequests(query);
    }

    onSearchTextChange(text: string) {
        this.searchText.set(text);
        this.currentPage.set(1); // Reset to first page
    }

    onPageChange(page: number) {
        this.currentPage.set(page);
    }

    onApprove(request: LeaveRequest) {
        this.store.approveLeaveRequest(request.id);
    }
}
```

## Platform Core Usage Patterns in Project Apps

### 1. AppBase Component Hierarchy Usage

#### Example: Employee Profile Component (apps/employee)

```typescript
// apps/employee/src/app/features/profile/employee-profile.component.ts
export class EmployeeProfileComponent extends AppBaseVmStoreComponent<EmployeeProfileVm, EmployeeProfileVmStore> {
    ngOnInit() {
        // Using platform store pattern
        this.store.initOrReloadVm(false);
    }

    protected canUserEdit(user: any): boolean {
        return user?.id === this.vm()?.employeeId || this.hasRole('HR');
    }
}
```

#### Example: Leave Request Form (apps/growth-for-company)

```typescript
// apps/growth-for-company/src/app/features/leave/leave-request-form.component.ts
export class LeaveRequestFormComponent extends AppBaseFormComponent<LeaveRequestFormVm> {
    protected addManagerSpecificValidators(): void {
        this.formGroup.get('approvalRequired')?.addValidators(Validators.required);
    }

    protected canSubmitForm(): boolean {
        return this.hasRole('Employee') || this.hasRole('Manager');
    }
}
```

### 2. API Service Usage

#### Example: Employee API Service (libs/bravo-domain)

```typescript
// libs/bravo-domain/src/employee/api-services/employee-api.service.ts
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    constructor(@Inject(EMPLOYEE_BASE_URL) protected override apiUrl: string) {
        super();
        this.apiUrl += '/api/Employee';
    }

    getEmployeeProfile(id: string): Observable<EmployeeProfileDto> {
        return this.get<EmployeeProfileDto>(`/${id}`);
    }

    updateEmployeeProfile(command: UpdateEmployeeProfileCommand): Observable<void> {
        return this.putFileMultiPartForm<void>('', command);
    }
}
```

### 3. Store Usage

#### Example: Timesheet Store (apps/employee)

```typescript
// apps/employee/src/app/shared/ui-stores/timesheet-vm.store.ts
@Injectable()
export class TimesheetVmStore extends PlatformVmStore<TimesheetVm> {
    constructor(private timesheetApi: TimesheetApiService) {
        super(new TimesheetVm());
    }

    protected cachedStateKeyName = 'TimesheetVmStore';

    public initOrReloadVm = (isReload: boolean) => this.loadTimesheet();

    public loadTimesheet = this.effectSimple(() => {
        return this.timesheetApi.getCurrentTimesheet().pipe(this.tapResponse(result => this.updateState({ timesheet: result })));
    });
}
```

### 4. Directive Usage in Templates

#### Example: Only Number Input (apps/growth-for-company)

```html
<!-- apps/growth-for-company/src/app/features/employee/salary-form.component.html -->
<input type="text" [formControlName]="'salary'" appOnlyNumber [allowDecimal]="true" placeholder="Enter salary amount" />
```

### 5. Pipe Usage in Templates

#### Example: Employee Count Display (apps/growth-for-company)

```html
<!-- apps/growth-for-company/src/app/features/dashboard/dashboard.component.html -->
<p>{{ employeeCount | pluralize:'employee':'employees' }}</p>
<p>{{ dayOptions | dayOptionsDisplay }}</p>
```

### 6. Module Configuration Usage

#### Example: Employee App Module (apps/employee)

```typescript
// apps/employee/src/app/app.config.ts
export const appConfig: ApplicationConfig = {
    providers: [
        providePlatformHttpClient(),
        provideApiBaseUrls(environment),
        {
            provide: EMPLOYEE_BASE_URL,
            useValue: environment.employeeApiUrl
        }
    ]
};
```

### 7. Platform Service Usage

#### Example: Theme Switching (apps/growth-for-company)

```typescript
// apps/growth-for-company/src/app/shared/components/theme-selector.component.ts
export class ThemeSelectorComponent {
    private themeService = inject(PlatformThemeService);

    currentTheme$ = this.themeService.currentTheme$;
    availableThemes = this.themeService.availableThemes;

    selectTheme(themeId: string): void {
        this.themeService.setTheme(themeId);
    }
}
```

### 8. Validation Usage

#### Example: Leave Request Validation (apps/employee)

```typescript
// apps/employee/src/app/features/leave/leave-request-form.component.ts
export class LeaveRequestFormComponent extends AppBaseFormComponent<LeaveRequestFormVm> {
    override initialFormConfig(): FormGroup {
        return this.fb.group(
            {
                fromDate: [null, Validators.required],
                toDate: [null, Validators.required],
                reason: ['', [Validators.required, Validators.maxLength(500)]]
            },
            {
                validators: [PlatformValidators.dateRange('fromDate', 'toDate')]
            }
        );
    }
}
```

### 9. Constants and Enums Usage

#### Example: Role-Based Access (apps/growth-for-company)

```typescript
// apps/growth-for-company/src/app/features/employee/employee-list.component.ts
export class EmployeeListComponent extends AppBaseComponent {
    canAddEmployee(): boolean {
        return this.hasAnyRole([EmployeeRoles.HR, EmployeeRoles.Admin]);
    }

    canEditEmployee(employee: Employee): boolean {
        return this.hasRole(EmployeeRoles.HR) || this.getCurrentUserId() === employee.userId;
    }
}
```

## Complete Development Workflows

### Creating a New Backend Feature (End-to-End)

1. **Define Domain Entity**: Create or update the entity in `[ServiceName].Domain/Entities/`.
2. **Create CQRS Command/Query**: Define the DTO in `[ServiceName].Application/UseCaseCommands/`.
3. **Implement Command Handler**: Add business logic and validation in the corresponding handler.
4. **Create API Controller**: Expose the endpoint in `[ServiceName].Service/Controllers/`.

### Creating a New Frontend Feature (End-to-End)

1. **Create Domain Models**: Define TypeScript models/DTOs in `libs/bravo-domain/`.
2. **Create API Service Method**: Add a method in the appropriate `ApiService` to call the backend.
3. **Create State Store**: Implement a `PlatformVmStore` to manage the feature's state.
4. **Create Component**: Build the UI component, inject the store, and connect UI events to store actions.

### Service Module Registration Pattern

```csharp
// Complete service registration flow in Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add platform modules in dependency order
builder.Services.AddPlatformModule<GrowthApiAspNetCoreModule>(builder.Configuration);

var app = builder.Build();

// Configure platform middleware
app.UsePlatform();

app.Run();
```

### Cross-Service Event Publishing Pattern

```csharp
// In command handler - publish events for other services
public async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand request, CancellationToken cancellationToken)
{
    var employee = await employeeRepository.CreateOrUpdateAsync(newEmployee, cancellationToken);

    // Publish cross-service event
    await MessageBus.PublishAsync(new EmployeeSavedEventBusMessage
    {
        EmployeeId = employee.Id,
        UserId = employee.UserId,
        CompanyId = employee.CompanyId,
        EventType = "EmployeeSaved"
    }, cancellationToken);

    return new SaveEmployeeCommandResult { EmployeeId = employee.Id };
}
```

### Frontend Feature Module Pattern

```typescript
// Complete feature module setup in apps/[app]/src/app/features/[feature]/
@NgModule({
    declarations: [LeaveRequestListComponent, LeaveRequestDetailComponent, LeaveRequestFormComponent],
    imports: [CommonModule, RouterModule.forChild(ROUTES), ReactiveFormsModule, PlatformCoreModule, BravoDomainModule],
    providers: [
        LeaveRequestVmStore,
        // Feature-specific services
        provideNgxMask(),
        {
            provide: GROWTH_BASE_URL,
            useValue: environment.growthApiUrl
        }
    ]
})
export class LeaveRequestFeatureModule {
    constructor() {
        // Initialize feature-level configuration
    }
}
```

---

## Cross-Service Data Synchronization Patterns

### Entity Event Producers and Consumers for Microservice Communication

**Principle**: Sync data between microservices via entity event producers and consumers, not background jobs. Each microservice has its own database and maintains data consistency through event-driven architecture.

**Consumer Naming Convention**:

-   Producer\*\*: `[Entity]EntityEventBusMessageProducer` (e.g., `EmployeeEntityEventBusMessageProducer`)
-   Consumer\*\*: `UpsertOrDelete[Entity]InfoOn[SourceEntity]EntityEventBusConsumer` (e.g., `UpsertOrDeleteEmployeeInfoOnEmployeeEntityEventBusConsumer`)
-   Message\*\*: `[Entity]EntityEventBusMessage` (e.g., `EmployeeEntityEventBusMessage`)

**Note**: Consumers don't need to sync all properties from the producer. They can define only the subset of properties they need.

### Implementation Patterns

#### 1. Entity Event Producer Pattern

```csharp
// Place in: [SourceService].Application/MessageBus/Producers/
[TrackFieldUpdatedDomainEvent] // Mark entity for automatic change tracking
public sealed class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent] // Track specific field changes
    public EmploymentStatus? Status { get; set; }
    public string UserId { get; set; } = "";
    public List<string> RolesList { get; set; } = [];
}

// Entity event producer - automatically publishes when entities change
public sealed class EmployeeEntityEventBusMessageProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string>
{
    public EmployeeEntityEventBusMessageProducer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer) : base(
        loggerFactory,
        unitOfWorkManager,
        serviceProvider,
        rootServiceProvider,
        applicationBusMessageProducer)
    {
    }

    // Optional: Override to filter specific events
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
    {
        // Filter events based on business criteria
        return @event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
                                  or PlatformCqrsEntityEventCrudAction.Updated
                                  or PlatformCqrsEntityEventCrudAction.Deleted;
    }
}

// Bus message format - uses platform's built-in entity event message structure
public sealed class EmployeeEntityEventBusMessage : PlatformCqrsEntityEventBusMessage<Employee, string>
{
}
```

#### 2. Entity Event Consumer Pattern

```csharp
// Place in: [TargetService].Application/MessageBus/Consumers/
public class UpsertOrDeleteEmployeeInfoOnEmployeeEntityEventBusConsumer : PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    private readonly ITargetRepository<SyncedEntity> repository;

    protected override async Task<bool> HandleWhen(EmployeeEntityEventBusMessage message)
    {
        // Filter messages based on business criteria
        return message.Payload?.EntityData != null;
    }

    protected override async Task HandleLogicAsync(EmployeeEntityEventBusMessage message)
    {
        var entityEvent = message.Payload;
        var employee = entityEvent.EntityData;

        switch (entityEvent.CrudAction)
        {
            case PlatformCqrsEntityEventCrudAction.Created:
            case PlatformCqrsEntityEventCrudAction.Updated:
                await CreateOrUpdateEntity(employee);
                break;
            case PlatformCqrsEntityEventCrudAction.Deleted:
                await DeleteEntity(employee.Id);
                break;
        }
    }

    private async Task CreateOrUpdateEntity(Employee employee)
    {
        // Consumers can sync only the subset of properties they need
        var syncedEntity = new SyncedEntity
        {
            EmployeeId = employee.Id,
            UserId = employee.UserId,
            Email = employee.Email,
            Status = employee.Status
            // Note: Only syncing needed properties
        };

        await repository.CreateOrUpdateAsync(syncedEntity);
    }

    private async Task DeleteEntity(string employeeId)
    {
        var existing = await repository.FirstOrDefaultAsync(e => e.EmployeeId == employeeId);
        if (existing != null)
        {
            await repository.DeleteAsync(existing);
        }
    }
}
```

#### 3. Cross-Database Migration for Initial Data Sync

```csharp
// Place in: [TargetService].Persistence/DataMigrations/
public class InitialSyncDataMigration : PlatformDataMigrationExecutor<TargetDbContext>
{
    private readonly SourceDbContext sourceDbContext; // Cross-database readonly context

    public override string Name => "20250131000001_InitialSyncDataMigration";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 02, 01);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(TargetDbContext dbContext)
    {
        var entityCount = await sourceDbContext.GetQuery<SourceEntity>().CountAsync();

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: entityCount,
            pageSize: 50,
            SyncEntitiesPaging);
    }

    private static async Task SyncEntitiesPaging(IServiceProvider scopedServiceProvider, int pageIndex, int pageSize, CancellationToken cancellationToken)
    {
        // Implementation for syncing entities in batches
    }
}
```

#### 4. Cross-Database Context Setup (ForCrossDbMigrationOnly)

```csharp
// Place in: [TargetService].Persistence/[SourceService]Db/

// For MongoDB source databases
public class SourceServicePlatformMongoPersistenceModule : PlatformMongoDbPersistenceModule<SourceDbContext>
{
    // CRITICAL: This marks the context as read-only for cross-database migration only
    public override bool ForCrossDbMigrationOnly => true;

    protected override void ConfigureMongoOptions(PlatformMongoOptions<SourceDbContext> options)
    {
        options.ConnectionString = new MongoUrlBuilder(Configuration.GetSection("MongoDB:ConnectionString").Value)
            .With(p => p.MinConnectionPoolSize = 0) // Minimal connections for migration only
            .ToString();
        options.Database = Configuration.GetSection("MongoDB:SourceServiceDatabase").Value;
    }
}

// For PostgreSQL/SQL Server source databases
public class SourceServicePlatformEfCorePersistenceModule : PlatformEfCorePersistenceModule<SourceDbContext>
{
    // CRITICAL: This marks the context as read-only for cross-database migration only
    public override bool ForCrossDbMigrationOnly => true;

    protected override void ConfigureEfCoreOptions(PlatformEfCoreOptions<SourceDbContext> options)
    {
        options.ConnectionString = Configuration.GetConnectionString("SourceServiceDatabase");
        options.UsePostgreSql(); // or options.UseSqlServer() for SQL Server
        options.MinPoolSize = 0; // Minimal connections for migration only
        options.MaxPoolSize = 5;
    }
}
```

**Note**: The database type and persistence module depend on the source microservice's database technology:

-   MongoDB\*\*: Use `PlatformMongoDbPersistenceModule<T>`
-   PostgreSQL\*\*: Use `PlatformEfCorePersistenceModule<T>` with `options.UsePostgreSql()`
-   SQL Server\*\*: Use `PlatformEfCorePersistenceModule<T>` with `options.UseSqlServer()`
-   Other EF Core providers\*\*: Use `PlatformEfCorePersistenceModule<T>` with appropriate provider method

### Best Practices and Guidelines

1. **Naming Convention**: Follow `[Entity]EntityEventBusMessageProducer`, `UpsertOrDelete[Entity]InfoOn[SourceEntity]EntityEventBusConsumer`, and `[Entity]EntityEventBusMessage` patterns
2. **Event Filtering**: Use `HandleWhen` to filter relevant events
3. **Initial Sync**: Use cross-database migrations for first-time setup only
4. **Performance**: Use pagination for large data migrations
5. **Security**: Cross-database contexts should be read-only (`ForCrossDbMigrationOnly = true`)
6. **Partial Sync**: Consumers don't need to sync all properties from the producer - they can define only the subset of properties they need

This pattern ensures loose coupling between services while maintaining data consistency through event-driven synchronization.

---

## 🔧 Troubleshooting Guide

### Common Real-World Scenarios

#### 🔍 Scenario: "Employee data not syncing between services"

**Symptoms:**

-   Employee appears in bravoTALENTS but not in bravoGROWTH
-   Leave requests fail with "Employee not found"
-   Inconsistent data across different apps

**Investigation Steps:**

1. Check message bus logs for EmployeeEntityEventBusMessage
2. Verify EmployeeEntityEventBusMessageProducer is registered
3. Confirm UpsertOrDeleteEmployeeInfoOnEmployeeEntityEventBusConsumer is active
4. Check RabbitMQ exchange and queue configuration

**Solution:**

```csharp
// 1. Verify producer is publishing events
public class EmployeeEntityEventBusMessageProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
    {
        // Ensure all employee changes are published
        return @event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
                                  or PlatformCqrsEntityEventCrudAction.Updated
                                  or PlatformCqrsEntityEventCrudAction.Deleted;
    }
}

// 2. Check consumer is processing messages
public class UpsertOrDeleteEmployeeInfoOnEmployeeEntityEventBusConsumer :
    PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    protected override async Task<bool> HandleWhen(EmployeeEntityEventBusMessage message)
    {
        return message.Payload?.EntityData != null; // Verify this condition
    }
}
```

#### 🔍 Scenario: "Performance issues with large datasets"

**Symptoms:**

-   Timeouts on employee list queries
-   Slow leave request processing
-   High CPU usage on background jobs

**Investigation Steps:**

1. Check MongoDB slow query logs
2. Analyze background job execution times
3. Review caching effectiveness
4. Monitor memory usage patterns

**Solution:**

```csharp
// 1. Add proper indexes
public async Task EnsureEmployeeCollectionIndexesAsync()
{
    await EmployeeCollection.Indexes.CreateManyAsync([
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Ascending(e => e.CompanyId)
                .Ascending(e => e.IsActive)
                .Ascending(e => e.Status),
            new CreateIndexOptions { Name = "IX_Employee_Query_Optimization", Background = true }),

        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys.Text(e => e.FullName).Text(e => e.Email),
            new CreateIndexOptions { Name = "IX_Employee_Search", Background = true })
    ]);
}

// 2. Implement pagination
public async Task<GetEmployeesQueryResult> GetEmployeesAsync(GetEmployeesQuery query)
{
    var totalCount = await repository.CountAsync(Employee.ActiveByCompanyExpr(query.CompanyId));

    var employees = await repository.GetAllAsync(
        predicate: Employee.ActiveByCompanyExpr(query.CompanyId),
        orderBy: q => q.OrderBy(e => e.FullName),
        skip: (query.PageNumber - 1) * query.PageSize,
        take: query.PageSize
    );

    return new GetEmployeesQueryResult
    {
        Items = employees.Select(EmployeeDto.Create).ToList(),
        TotalCount = totalCount,
        HasNextPage = (query.PageNumber * query.PageSize) < totalCount
    };
}

// 3. Optimize background jobs with batching
[PlatformRecurringJob("0 1 * * *")]
public class ProcessLeaveAccrualsJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    protected override async Task ProcessAsync()
    {
        await ExecuteInjectScopedPagingAsync(
            maxItemCount: await GetActiveEmployeeCount(),
            pageSize: 50, // Process in batches
            ProcessEmployeeBatch
        );
    }
}
```

#### 🔍 Scenario: "Authentication errors in development environment"

**Symptoms:**

-   "Unauthorized" errors despite valid login
-   Token validation failures
-   CORS issues between frontend and backend

**Investigation Steps:**

1. Check JWT token configuration in appsettings.Development.json
2. Verify CORS origins match frontend URL
3. Confirm authentication middleware order
4. Check browser network tab for actual error responses

**Solution:**

```csharp
// 1. Development-specific authentication setup
public class GrowthApiAspNetCoreModule : PlatformAspNetCoreModule
{
    protected override void ConfigureAuthentication(IServiceCollection services)
    {
        if (Environment.IsDevelopment())
        {
            services.Configure<JwtOptions>(options =>
            {
                options.ValidateIssuer = false; // Allow for dev environment
                options.ValidateAudience = false;
                options.ValidateLifetime = true;
                options.ClockSkew = TimeSpan.FromMinutes(5); // Allow for dev clock skew
            });
        }

        base.ConfigureAuthentication(services);
    }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        if (Environment.IsDevelopment())
        {
            return ["http://localhost:4200", "http://localhost:4201", "http://localhost:4205", "http://localhost:4206"];
        }

        return configuration.GetSection("AllowCorsOrigins").Get<string[]>();
    }
}
```

### Common Backend Issues

#### 🔍 Issue: "Repository not found" or dependency injection errors

**Symptoms:**

```csharp
// Error: No service for type 'IPlatformQueryableRootRepository<Employee, string>' has been registered
```

**Solution:**

1. Ensure module registration in Program.cs:

```csharp
builder.Services.AddPlatformModule<YourServiceAspNetCoreModule>(builder.Configuration);
```

2. Check dependency chain: Domain → Application → Persistence → Service
3. Verify repository registration in PersistenceModule

#### 🔍 Issue: CQRS validation not working

**Symptoms:**

-   Commands pass through without validation
-   ValidateRequestAsync not called

**Solution:**

1. Override Validate() in command:

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate().And(/* your validations */);
}
```

2. Call EnsureValid() in handler:

```csharp
var validatedCommand = request.EnsureValid();

```

#### 🔍 Issue: Entity events not firing

**Symptoms:**

-   EntityEventApplicationHandler not triggered
-   Field change events missing

**Solution:**

1. Add [TrackFieldUpdatedDomainEvent] attribute:

```csharp
[TrackFieldUpdatedDomainEvent]
public class Employee : RootEntity<Employee, string>
{

    [TrackFieldUpdatedDomainEvent]
    public string Status { get; set; }
}
```

2. Call AutoAddFieldUpdatedEvent() before save:

```csharp
entity.AutoAddFieldUpdatedEvent(existingEntity);
```

#### 🔍 Issue: Message bus consumers not receiving messages

**Symptoms:**

-   Consumer HandleLogicAsync not called
-   Cross-service sync failing

**Solution:**

1. Check HandleWhen() filter:

```csharp

protected override async Task<bool> HandleWhen(YourEventBusMessage message)

{
    return message.SomeProperty != null; // Make sure this returns true
}
```

2. Verify message bus module registration
3. Check RabbitMQ connection and exchange configuration

### Common Frontend Issues

#### 🔍 Issue: Store state not updating

**Symptoms:**

-   Component not reacting to store changes
-   Loading states stuck

**Solution:**

1. Ensure proper store injection and initialization:

```typescript
export class Component extends AppBaseVmStoreComponent<State, Store> {
    ngOnInit() {
        this.store.initOrReloadVm(false); // ✅ Initialize store
    }
}
```

2. Check effectSimple() usage:

```typescript

public loadData = this.effectSimple(() => {
    return this.api.getData().pipe(
        this.tapResponse(data => this.updateState({ data })) // ✅ Update state
    );
});
```

#### 🔍 Issue: API calls failing with CORS or 404

**Symptoms:**

-   Network errors in browser console
-   API endpoints not found

**Solution:**

1. Check API base URL configuration:

```typescript
// In app.config.ts or module
{
    provide: YOUR_BASE_URL,

    useValue: environment.yourApiUrl // ✅ Correct environment config

}
```

2. Verify backend CORS configuration:

```csharp
protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
{
    return configuration.GetSection("AllowCorsOrigins").Get<string[]>();

}

```

#### 🔍 Issue: Form validation not working

**Symptoms:**

-   Form submits with invalid data

-   Custom validators ignored

**Solution:**

1. Ensure proper form setup in initialFormConfig():

```typescript
override initialFormConfig(): FormGroup {
    return this.fb.group({
        field: [null, [Validators.required]], // ✅ Add validators
    });
}

```

2. Check async validators setup:

```typescript
this.formGroup.setAsyncValidators([customAsyncValidator()]);
```

### Performance Issues

#### 🔍 Issue: Slow database queries

**Solution:**

1. Add proper MongoDB indexes:

```csharp
await collection.Indexes.CreateManyAsync([
    new CreateIndexModel<Entity>(
        Builders<Entity>.IndexKeys.Ascending(e => e.FrequentlyQueriedField)
    )
]);

```

2. Use pagination for large datasets:

```csharp
await RootServiceProvider.ExecuteInjectScopedPagingAsync(
    maxItemCount: totalCount,
    pageSize: 50,
    ProcessPageMethod
);
```

#### 🔍 Issue: Memory leaks in frontend

**Solution:**

1. Use takeUntilDestroyed() pattern:

```typescript
this.someObservable$
    .pipe(
        this.takeUntilDestroyed() // ✅ Automatic cleanup
    )
    .subscribe();
```

2. Extend PlatformComponent for automatic cleanup:

```typescript
export class Component extends PlatformComponent {
    // Automatic subscription cleanup on destroy
}
```

### Debugging Tips

#### Backend Debugging

1. **Check logs**: Platform provides structured logging
2. **Use breakpoints**: In command handlers and event handlers
3. **Verify module registration**: Ensure all dependencies are registered
4. **Test CQRS flow**: Commands → Handlers → Events → Consumers

#### Frontend Debugging

1. **Check browser console**: For API errors and state issues
2. **Use Angular DevTools**: Monitor component state and store
3. **Verify API calls**: Network tab for request/response details
4. **Test store state**: Console.log in effects and selectors

---

## 📋 Quick Code Templates

### Complete Feature Templates

#### 🎯 Complete Leave Request Feature Template

**1. Domain Entity with Change Tracking**

```csharp
// Place in: [ServiceName].Domain/Entities/
[TrackFieldUpdatedDomainEvent]
public sealed class LeaveRequest : RootEntity<LeaveRequest, string>
{
    public string EmployeeId { get; set; } = string.Empty;
    public string RequestTypeId { get; set; } = string.Empty;

    [TrackFieldUpdatedDomainEvent] // Track status changes for notifications
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Draft;

    [TrackFieldUpdatedDomainEvent] // Track date changes for calendar updates
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public string Reason { get; set; } = string.Empty;
    public List<Attachment> Attachments { get; set; } = [];

    // Static expressions for queries
    public static Expression<Func<LeaveRequest, bool>> ByEmployeeExpr(string employeeId)
        => lr => lr.EmployeeId == employeeId && !lr.IsDeleted;

    public static Expression<Func<LeaveRequest, bool>> PendingApprovalExpr()
        => lr => lr.Status == LeaveRequestStatus.PendingApproval && !lr.IsDeleted;

    // Domain validation
    public ValidationResult ValidateForSubmission()
    {
        return this
            .Validate(lr => lr.FromDate <= lr.ToDate, "End date must be after start date")
            .And(lr => lr.FromDate >= DateTime.Today, "Cannot request leave for past dates")
            .And(lr => !string.IsNullOrEmpty(lr.Reason), "Reason is required");
    }
}
```

**2. CQRS Command with File Upload**

```csharp
// Place in: [ServiceName].Application/UseCaseCommands/
public sealed class SaveLeaveRequestCommand : PlatformCqrsCommand<SaveLeaveRequestCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string RequestTypeId { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<IFormFile> Files { get; set; } = [];

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(EmployeeId), "Employee ID is required")
            .And(_ => !string.IsNullOrEmpty(RequestTypeId), "Request type is required")
            .And(_ => FromDate <= ToDate, "End date must be after start date")
            .And(_ => FromDate >= DateTime.Today, "Cannot request leave for past dates")
            .And(_ => !string.IsNullOrEmpty(Reason), "Reason is required")
            .And(_ => Files.Count <= 5, "Maximum 5 files allowed")
            .And(_ => Files.All(f => f.Length <= 5 * 1024 * 1024), "Files must be under 5MB");
    }
}

public sealed class SaveLeaveRequestCommandResult : PlatformCqrsCommandResult
{
    public string LeaveRequestId { get; set; } = string.Empty;
    public LeaveRequestStatus Status { get; set; }
    public List<string> UploadedFileIds { get; set; } = [];
}

internal sealed class SaveLeaveRequestCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveLeaveRequestCommand, SaveLeaveRequestCommandResult>
{
    private readonly IGrowthRootRepository<LeaveRequest> leaveRequestRepository;
    private readonly IGrowthRootRepository<Employee> employeeRepository;
    private readonly IGrowthRootRepository<LeaveRequestType> requestTypeRepository;
    private readonly IPlatformFileStorageService fileStorageService;

    // Extended validation with business rules
    protected override async Task<PlatformValidationResult<SaveLeaveRequestCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveLeaveRequestCommand> requestSelfValidation, CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            .AndAsync(async cmd => await employeeRepository.AnyAsync(e => e.Id == cmd.EmployeeId, cancellationToken),
                     "Employee not found")
            .AndAsync(async cmd => await requestTypeRepository.AnyAsync(rt => rt.Id == cmd.RequestTypeId, cancellationToken),
                     "Request type not found")
            .AndAsync(async cmd => await ValidateNoOverlapAsync(cmd, cancellationToken),
                     "Leave request dates overlap with existing requests")
            .AndAsync(async cmd => await ValidateLeaveBalanceAsync(cmd, cancellationToken),
                     "Insufficient leave balance");
    }

    protected override async Task<SaveLeaveRequestCommandResult> HandleAsync(
        SaveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Get existing or create new
        var existingLeaveRequest = await leaveRequestRepository.FirstOrDefaultAsync(
            lr => lr.Id == request.Id, cancellationToken);

        var toSaveLeaveRequest = existingLeaveRequest ?? new LeaveRequest { Id = request.Id };

        // Step 2: Apply changes and track field updates
        toSaveLeaveRequest.EmployeeId = request.EmployeeId;
        toSaveLeaveRequest.RequestTypeId = request.RequestTypeId;
        toSaveLeaveRequest.FromDate = request.FromDate;
        toSaveLeaveRequest.ToDate = request.ToDate;
        toSaveLeaveRequest.Reason = request.Reason;
        toSaveLeaveRequest.Status = LeaveRequestStatus.PendingApproval;

        // Auto-track field changes for entity events
        toSaveLeaveRequest.AutoAddFieldUpdatedEvent(existingLeaveRequest);

        // Step 3: Handle file uploads
        var uploadedFileIds = new List<string>();
        if (request.Files.Any())
        {
            foreach (var file in request.Files)
            {
                var fileId = await fileStorageService.SaveFileAsync(
                    file, $"leave-requests/{toSaveLeaveRequest.Id}", cancellationToken);
                uploadedFileIds.Add(fileId);
            }

            toSaveLeaveRequest.Attachments.AddRange(
                uploadedFileIds.Select(id => new Attachment { Id = id, FileName = "uploaded-file" }));
        }

        // Step 4: Domain validation
        toSaveLeaveRequest.ValidateForSubmission().EnsureValid();

        // Step 5: Save
        var savedLeaveRequest = await leaveRequestRepository.CreateOrUpdateAsync(toSaveLeaveRequest, cancellationToken);

        return new SaveLeaveRequestCommandResult
        {
            LeaveRequestId = savedLeaveRequest.Id,
            Status = savedLeaveRequest.Status,
            UploadedFileIds = uploadedFileIds
        };
    }

    private async Task<bool> ValidateNoOverlapAsync(SaveLeaveRequestCommand cmd, CancellationToken cancellationToken)
    {
        var overlapping = await leaveRequestRepository.AnyAsync(
            lr => lr.EmployeeId == cmd.EmployeeId
                  && lr.Id != cmd.Id
                  && lr.Status != LeaveRequestStatus.Rejected
                  && lr.FromDate <= cmd.ToDate
                  && lr.ToDate >= cmd.FromDate,
            cancellationToken);
        return !overlapping;
    }

    private async Task<bool> ValidateLeaveBalanceAsync(SaveLeaveRequestCommand cmd, CancellationToken cancellationToken)
    {
        var requestedDays = (cmd.ToDate - cmd.FromDate).Days + 1;
        // Implement leave balance check logic here
        return true; // Simplified for template
    }
}
```

**3. Entity Event Handler for Notifications**

```csharp
// Place in: [ServiceName].Application/UseCaseEvents/
public class SendNotificationOnLeaveRequestStatusChangeEventHandler :
    PlatformCqrsEntityEventApplicationHandler<LeaveRequest>
{
    private readonly IGrowthRootRepository<Employee> employeeRepository;
    private readonly IPlatformApplicationBusMessageProducer messageBus;

    protected override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<LeaveRequest> entityEvent)
    {
        return entityEvent.CrudAction == PlatformCqrsEntityEventCrudAction.Updated &&
               entityEvent.FindFieldUpdatedEvent(lr => lr.Status) != null;
    }

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<LeaveRequest> entityEvent, CancellationToken cancellationToken)
    {
        var leaveRequest = entityEvent.EntityData;
        var statusChange = entityEvent.FindFieldUpdatedEvent(lr => lr.Status);

        if (statusChange == null) return;

        // Get employee details
        var employee = await employeeRepository.FirstOrDefaultAsync(
            e => e.Id == leaveRequest.EmployeeId, cancellationToken);

        if (employee == null) return;

        // Send notification based on new status
        var notificationMessage = statusChange.NewValue switch
        {
            LeaveRequestStatus.Approved => new LeaveRequestApprovedNotificationMessage
            {
                EmployeeId = employee.Id,
                EmployeeEmail = employee.Email,
                LeaveRequestId = leaveRequest.Id,
                FromDate = leaveRequest.FromDate,
                ToDate = leaveRequest.ToDate
            },
            LeaveRequestStatus.Rejected => new LeaveRequestRejectedNotificationMessage
            {
                EmployeeId = employee.Id,
                EmployeeEmail = employee.Email,
                LeaveRequestId = leaveRequest.Id,
                Reason = leaveRequest.Reason
            },
            _ => null
        };

        if (notificationMessage != null)
        {
            await messageBus.PublishAsync(notificationMessage, cancellationToken);
        }
    }
}
```

**4. API Controller**

```csharp
// Place in: [ServiceName].Service/Controllers/
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
public class LeaveRequestController : PlatformBaseController
{
    public LeaveRequestController(
        IPlatformCqrs cqrs,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
        : base(cqrs, requestContextAccessor)
    {
    }

    [HttpPost]
    public async Task<ActionResult<SaveLeaveRequestCommandResult>> SaveLeaveRequest(
        [FromForm] SaveLeaveRequestCommand command)
    {
        // Ensure employee can only create their own requests
        var currentEmployee = await RequestContext.CurrentEmployee();
        command.EmployeeId = currentEmployee.Id;

        var result = await Cqrs.SendCommand(command);
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<GetLeaveRequestListQueryResult>> GetLeaveRequests(
        [FromQuery] GetLeaveRequestListQuery query)
    {
        var result = await Cqrs.SendQuery(query);
        return Ok(result);
    }

    [HttpPost("{id}/approve")]
    [Authorize(Policy = CompanyRoleAuthorizationPolicies.ManagerPolicy)]
    public async Task<ActionResult> ApproveLeaveRequest(string id, [FromBody] ApproveLeaveRequestCommand command)
    {
        command.LeaveRequestId = id;
        await Cqrs.SendCommand(command);
        return Ok();
    }
}
```

### Backend Templates

#### New CQRS Command Template

```csharp
// 1. Command (Place in: [ServiceName].Application/UseCaseCommands/)
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Name), "Name is required");
    }
}

// 2. Command Result
public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public string Id { get; set; } = string.Empty;
}

// 3. Command Handler
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly I{Service}Repository<{Entity}> repository;

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command request, CancellationToken cancellationToken)
    {
        // Step 1: Get existing or create new
        var entity = await repository.FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
        entity ??= new {Entity} { Id = request.Id };

        // Step 2: Apply changes
        entity.Name = request.Name;

        // Step 3: Save
        var savedEntity = await repository.CreateOrUpdateAsync(entity, cancellationToken);

        return new Save{Entity}CommandResult { Id = savedEntity.Id };
    }
}
```

#### New Entity Event Consumer Template

```csharp
// Place in: [TargetService].Application/MessageBus/Consumers/
public class UpsertOrDelete{Entity}InfoOn{Entity}EntityEventBusConsumer :
    PlatformApplicationMessageBusConsumer<{Entity}EntityEventBusMessage>
{
    private readonly I{TargetService}Repository<{TargetEntity}> repository;

    protected override async Task<bool> HandleWhen({Entity}EntityEventBusMessage message)
    {
        return message.Payload?.EntityData != null;
    }

    protected override async Task HandleLogicAsync({Entity}EntityEventBusMessage message)
    {
        var entityEvent = message.Payload;
        var sourceEntity = entityEvent.EntityData;

        switch (entityEvent.CrudAction)
        {
            case PlatformCqrsEntityEventCrudAction.Created:
            case PlatformCqrsEntityEventCrudAction.Updated:
                await CreateOrUpdate(sourceEntity);
                break;
            case PlatformCqrsEntityEventCrudAction.Deleted:
                await Delete(sourceEntity.Id);
                break;
        }
    }

    private async Task CreateOrUpdate({Entity} sourceEntity)
    {
        var targetEntity = new {TargetEntity}
        {
            {Entity}Id = sourceEntity.Id,
            Name = sourceEntity.Name,
            // Map only needed properties
        };

        await repository.CreateOrUpdateAsync(targetEntity);
    }

    private async Task Delete(string entityId)
    {
        var existing = await repository.FirstOrDefaultAsync(e => e.{Entity}Id == entityId);
        if (existing != null)
            await repository.DeleteAsync(existing);
    }
}
```

### Frontend Templates

#### New Component with Store Template

```typescript
// 1. State Interface
interface {Feature}State extends PlatformVm {
    items: {Entity}[];
    selectedItem: {Entity} | null;
}

// 2. Store (Place in: apps/[app]/src/app/shared/ui-stores/)
@Injectable()
export class {Feature}VmStore extends PlatformVmStore<{Feature}State> {
    constructor(private api: {Entity}ApiService) {
        super(new {Feature}State());
    }

    protected cachedStateKeyName = '{Feature}VmStore';
    public override initOrReloadVm = (isReload: boolean) => this.loadItems();

    // Selectors
    public readonly items$ = this.select(state => state.items);
    public readonly selectedItem$ = this.select(state => state.selectedItem);

    // Effects
    public loadItems = this.effectSimple(() => {
        return this.api.getItems().pipe(
            this.tapResponse(items => this.updateState({ items }))
        );
    });

    public saveItem = this.effectSimple((command: Save{Entity}Command) => {
        return this.api.saveItem(command).pipe(
            this.tapResponse(() => {
                this.toast.success('Item saved successfully');
                this.loadItems();
            })
        );
    });
}

// 3. Component (Place in: apps/[app]/src/app/features/{feature}/)
@Component({
    selector: 'app-{feature}',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                <div class="feature-content">
                    @for (item of vm.items; track item.id) {
                        <div class="item-card">{{ item.name }}</div>
                    }
                </div>
            }
        </app-loading-and-error-indicator>
    `,
    providers: [{Feature}VmStore]
})
export class {Feature}Component extends AppBaseVmStoreComponent<{Feature}State, {Feature}VmStore> {
    ngOnInit() {
        this.store.initOrReloadVm(false);
    }

    onSaveItem(command: Save{Entity}Command) {
        this.store.saveItem(command);
    }
}
```

#### New Form Component Template

```typescript
// Place in: apps/[app]/src/app/shared/components/forms/
@Component({
    selector: 'app-{entity}-form',
    template: `
        <form [formGroup]="formGroup" (ngSubmit)="onSubmit()">
            <mat-form-field>
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" required>
                <mat-error *ngIf="formGroup.get('name')?.hasError('required')">
                    Name is required

                </mat-error>
            </mat-form-field>

            <div class="form-actions">
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="formGroup.invalid || loading()">
                    Save
                </button>

            </div>
        </form>
    `
})
export class {Entity}FormComponent extends AppBaseFormComponent<{Entity}FormVm> {
    override initialFormConfig(): FormGroup {
        return this.fb.group({
            id: [''],

            name: ['', [Validators.required, Validators.maxLength(100)]]
        });
    }

    protected override setupCustomValidation() {
        // Add custom validation logic here
        this.formGroup.get('name')?.valueChanges.pipe(
            this.takeUntilDestroyed()

        ).subscribe(() => {
            // Custom validation logic
        });
    }

    onSubmit() {
        if (this.formGroup.valid) {
            const command = this.formGroup.value as Save{Entity}Command;
            this.save.emit(command);
        }
    }

}
```

---

## 📚 Glossary & Terms

### Platform Terms

-   **PlatformComponent**: Base Angular component with automatic subscription cleanup

-   **PlatformVmStore**: Enhanced ComponentStore with caching and lifecycle management
-   **IPlatformQueryableRootRepository**: Generic repository interface for CRUD operations
-   **PlatformCqrsCommand**: Base class for CQRS commands with validation
-   **PlatformApplicationModule**: Base module for dependency injection configuration
-   **TrackFieldUpdatedDomainEvent**: Attribute for automatic entity change tracking

### Architecture Terms

-   **Clean Architecture**: Layered architecture pattern (Domain → Application → Infrastructure → Presentation)
-   **CQRS**: Command Query Responsibility Segregation pattern
-   **Message Bus**: RabbitMQ-based communication between microservices
-   **Domain Events**: Events fired within the same service boundary
-   **Entity Events**: Events fired when entities are created/updated/deleted
-   **Request Context**: Lazy-loaded context containing user, company, and permission data

### BravoSUITE Specific

-   **bravoTALENTS**: Recruitment and talent management microservice
-   **bravoGROWTH**: Employee management and HR microservice
-   **bravoSURVEYS**: Survey creation and response collection microservice
-   **bravoINSIGHTS**: Data analytics and reporting microservice
-   **Easy.Platform**: Core platform framework providing base infrastructure
-   **Bravo.Shared**: Common utilities and shared logic across services

### Development Terms

-   **Data Seeder**: Component that populates initial/sample data
-   **Data Migration**: Database schema or data transformation scripts
-   **Background Job**: Scheduled or recurring task execution
-   **Cross-Service Sync**: Data synchronization between microservices via events
-   **Repository Extensions**: Static methods to extend repository functionality

---

## 📋 Version History & Changes

### Recent Improvements (2025-02-02)

-   ✅ Added Quick Reference Index for faster navigation
-   ✅ Added searchable tags for pattern discovery
-   ✅ Added Anti-Patterns section with common mistakes
-   ✅ Added Decision Trees for choosing the right pattern
-   ✅ Added Troubleshooting Guide for common issues
-   ✅ Added Quick Code Templates for rapid development
-   ✅ Added Glossary for term clarification
-   ✅ Improved markdown structure and readability

### Core Content Structure

-   **Lines 1-50**: Quick Reference Index and Navigation
-   **Lines 50-200**: Introduction and Product Overview
-   **Lines 200-600**: Source Code Structure and Architecture
-   **Lines 600-850**: Clean Code Rules and Anti-Patterns
-   **Lines 850-920**: Decision Trees and Pattern Selection
-   **Lines 920-1500**: Backend Development Patterns
-   **Lines 1500-2000**: Frontend Development Patterns
-   **Lines 2000-2500**: Cross-Service Communication Patterns
-   **Lines 2500-3000**: Troubleshooting and Code Templates
-   **Lines 3000+**: Glossary and Reference Information

---

## Key Notes

You must act according to the following principles:
– Do not assume, imagine, or fabricate any unverified information.
– If something cannot be confirmed, you must say: "I cannot verify this." or "I do not have access to that information."
– Any part that is unconfirmed must be clearly labeled: [Inference], [Speculation], [Unverified].
– Do not make assumptions if the user has not provided sufficient facts.
– Do not alter or reinterpret the user's question.
– When discussing your own capabilities, always include a label and state that it is based on observation and not 100% accurate.
– If you violate any of the above, you must issue a correction: "I gave an unverified or speculative response. I should have clearly labeled it as such."
