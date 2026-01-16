---
applyTo: '**'
---

# EasyPlatform - Claude Code Instructions

> **.NET 9 + Angular 19 Development Platform Framework**

This file provides essential context and navigation for AI agents working on EasyPlatform. Detailed patterns and protocols are in `docs/claude/`.

---

## CRITICAL: Always Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Enter Plan Mode First** - Use `EnterPlanMode` tool automatically
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with specific files and approach
4. **Get User Approval** - Wait for confirmation before any code changes
5. **Only Then Implement** - Execute the approved plan

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

> **Full protocol:** See [docs/claude/architecture.md#planning-protocol](docs/claude/architecture.md#planning-protocol)

---

## CRITICAL: Todo Enforcement (Runtime Enforced)

Implementation skills are **blocked** unless you have active todos. This is enforced by hooks.

### Allowed Without Todos (Research/Planning)

- `/scout`, `/scout:ext`, `/investigate`, `/research`, `/explore`
- `/plan`, `/plan:fast`, `/plan:hard`, `/plan:validate`
- `/watzup`, `/checkpoint`, `/kanban`

### Blocked Without Todos (Implementation)

- `/cook`, `/fix`, `/code`, `/feature`, `/implement`
- `/test`, `/debug`, `/code-review`, `/commit`
- All other skills not listed above

### Bypass

Use `quick:` prefix to bypass enforcement (not recommended):
```
/cook quick: add a button
```

### Context Preservation

- Todos automatically saved to checkpoints during context compaction
- Todos auto-restored on session resume (if checkpoint < 24h old)
- Subagents inherit parent todo state for context continuity
- **External Memory Swap**: Large tool outputs (>threshold) externalized to disk for post-compaction recovery

### External Memory Swap

Large tool outputs are automatically externalized to disk files with semantic summaries. After context compaction, exact content can be recovered without re-executing tools.

| Tool | Threshold | Summary Type |
|------|-----------|--------------|
| Read | 8KB | Code signatures (class/function/interface) |
| Grep | 4KB | Match count + preview |
| Glob | 2KB | File count + extensions |
| Bash | 6KB | Truncated output |

**How it works:**
1. PostToolUse hook detects large outputs
2. Content saved to `{temp}/ck/swap/{sessionId}/`
3. Markdown pointer injected with summary
4. On session resume: inventory table shows recoverable content
5. Use `Read: {path}` to retrieve exact content

> **Note:** Does NOT reduce active session tokens - value is post-compaction recovery only.

See: [claude-kit-setup.md#external-memory-swap-system](docs/claude/claude-kit-setup.md#external-memory-swap-system)

---

## Documentation Index

### Rule Files (docs/claude/)

| File                                                                         | Purpose                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| [README.md](docs/claude/README.md)                                           | Documentation index & navigation guide           |
| [claude-kit-setup.md](docs/claude/claude-kit-setup.md)                       | Claude Kit (ACE, hooks, skills, agents, workflows, swap) |
| [architecture.md](docs/claude/architecture.md)                               | System architecture & planning protocol          |
| [troubleshooting.md](docs/claude/troubleshooting.md)                         | Investigation protocol & common issues           |
| [backend-patterns.md](docs/claude/backend-patterns.md)                       | Backend patterns (CQRS, Repository, etc.)        |
| [backend-csharp-complete-guide.md](docs/claude/backend-csharp-complete-guide.md) | Comprehensive C# backend reference           |
| [frontend-patterns.md](docs/claude/frontend-patterns.md)                     | Angular/platform-core patterns                   |
| [frontend-typescript-complete-guide.md](docs/claude/frontend-typescript-complete-guide.md) | Comprehensive Angular/TS frontend reference |
| [scss-styling-guide.md](docs/claude/scss-styling-guide.md)                   | SCSS/CSS styling rules, BEM methodology          |
| [authorization-patterns.md](docs/claude/authorization-patterns.md)           | Security and migration patterns                  |
| [decision-trees.md](docs/claude/decision-trees.md)                           | Quick decision guides and templates              |
| [advanced-patterns.md](docs/claude/advanced-patterns.md)                     | Advanced techniques and anti-patterns            |
| [clean-code-rules.md](docs/claude/clean-code-rules.md)                       | Universal coding standards                       |

### Other Documentation

| File                                                                 | Purpose                         |
| -------------------------------------------------------------------- | ------------------------------- |
| [README.md](README.md)                                               | Platform overview & quick start |
| [Architecture Overview](docs/architecture-overview.md)               | System architecture & diagrams  |
| [.github/AI-DEBUGGING-PROTOCOL.md](.github/AI-DEBUGGING-PROTOCOL.md) | Mandatory debugging protocol    |
| [.ai/prompts/common.md](.ai/prompts/common.md)                           | AI agent prompt library         |
| [.claude/hooks/tests/](.claude/hooks/tests/)                         | Claude hooks test infrastructure |

> **Claude Hooks Development:** Before adding new test cases or test scripts for Claude hooks, check existing tests in `.claude/hooks/tests/` folder. Use the existing test utilities (`test-utils.cjs`, `hook-runner.cjs`) and follow established patterns in `suites/` directory.

---

## Architecture Overview

### System Architecture

- **Backend:** .NET 9 with Clean Architecture (Domain, Application, Persistence, Service)
- **Frontend:** Angular 19 Nx workspace with component-based architecture
- **Platform Foundation:** Easy.Platform framework providing base infrastructure
- **Communication:** RabbitMQ message bus for cross-service communication
- **Data Storage:** Multi-database support (MongoDB, SQL Server, PostgreSQL)

### Example Application

- **Backend:** `src/PlatformExampleApp/` - TextSnippet service demonstrating all patterns
- **Frontend:** `src/PlatformExampleAppWeb/apps/playground-text-snippet/` - Angular example

---

## Project Structure

### Backend

```
src/Platform/                    # Easy.Platform framework
├── Easy.Platform/               # Core (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/    # ASP.NET Core integration
├── Easy.Platform.MongoDB/       # MongoDB patterns
├── Easy.Platform.RabbitMQ/      # Message bus
└── Easy.Platform.*/             # Other modules

src/PlatformExampleApp/          # Example microservice
├── *.Api/                       # Web API layer
├── *.Application/               # CQRS handlers, jobs, events
├── *.Domain/                    # Entities, domain events
├── *.Persistence*/              # Database implementations
└── *.Shared/                    # Cross-service utilities
```

### Frontend

```
src/PlatformExampleAppWeb/       # Angular 19 Nx workspace
├── apps/
│   └── playground-text-snippet/ # Example app
└── libs/
    ├── platform-core/           # Base classes, utilities
    ├── apps-domains/            # Business domain code
    ├── share-styles/            # SCSS themes
    └── share-assets/            # Static assets
```

---

## Key Principles

### Backend Principles

1. **Use Platform Repositories:** `IPlatformQueryableRootRepository<TEntity, TKey>`
2. **Use Platform Validation:** `PlatformValidationResult` fluent API
3. **Event-Driven Side Effects:** Never call side effects in command handlers
4. **CQRS File Organization:** Command + Result + Handler in ONE file
5. **DTO Mapping Responsibility:** DTOs own mapping via `MapToObject()` / `MapToEntity()`
6. **Message Bus for Cross-Service:** Never direct database access

### Frontend Principles

1. **Component Hierarchy:** `PlatformComponent` → `AppBaseComponent` → Feature
2. **State Management:** `PlatformVmStore` for complex state
3. **API Services:** Extend `PlatformApiService`
4. **Subscription Cleanup:** Always use `untilDestroyed()`
5. **Form Validation:** Use `PlatformFormComponent` with `initialFormConfig`
6. **BEM CSS Naming:** ALL UI elements must have BEM classes (`block__element --modifier`)

### BEM Naming Convention (MANDATORY)

Every UI element MUST have a BEM class, even without special styling. This makes HTML self-documenting like OOP class hierarchy. Use space-separated modifiers:

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
        <div class="user-list__item">
            <span class="user-list__item-name">{{ user.name }}</span>
            <button class="user-list__btn --primary --small">Edit</button>
        </div>
        }
    </div>
</div>

<!-- ❌ WRONG: Elements without classes -->
<div class="user-list">
    <div><h1>Users</h1></div>
    <div>
        @for (user of vm.users; track user.id) {
        <div><span>{{ user.name }}</span></div>
        }
    </div>
</div>
```

**BEM Naming**: Block (`user-list`) → Element (`user-list__header`) → Modifier (separate `--` class: `user-list__btn --primary --small`)

```scss
.user-list {
    &__header { /* ... */ }
    &__title { /* ... */ }
    &__btn {
        &.--primary { background: $primary-color; }
        &.--small { padding: 0.25rem 0.5rem; }
    }
}
```

> **Detailed patterns:** See [backend-patterns.md](docs/claude/backend-patterns.md) and [frontend-patterns.md](docs/claude/frontend-patterns.md)

### Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Contains                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options |
| **Service**      | API calls, command factories, data transformation                                         |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                              |

**Anti-Pattern**: Logic in component/handler that should be in entity → leads to duplicated code.

```typescript
// ❌ WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...];

// ✅ CORRECT: Logic in entity/model
export class JobProvider {
  static readonly dropdownOptions = [{ value: 1, label: 'ITViec' }, ...];
  static getDisplayLabel(value: number): string { return this.dropdownOptions.find(x => x.value === value)?.label ?? ''; }
}

// Component just uses entity
readonly providerTypes = JobProvider.dropdownOptions;
```

---

## Quick Decision Trees

### Backend Task

```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Task

```
Need frontend feature?
├── Simple component → PlatformComponent
├── Complex state → PlatformVmStoreComponent + Store
├── Forms → PlatformFormComponent
├── API calls → PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

> **More decision guides:** See [decision-trees.md](docs/claude/decision-trees.md)

---

## Investigation Workflow

When given any task:

1. **Context Discovery** - Extract domain concepts, search for related code
2. **Service Boundary** - Identify which microservice owns the concept
3. **Platform Patterns** - Check established patterns before custom solutions
4. **Evidence-Based** - Verify with code evidence, never assume

### Quick Verification Checklist

Before removing/changing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced dependencies?
- [ ] Declared confidence level?

> **Full protocol:** See [troubleshooting.md#investigation-protocol](docs/claude/troubleshooting.md#investigation-protocol)

---

## Development Commands

### Backend

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
dotnet test [Project].csproj
```

### Frontend

```bash
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
nx build playground-text-snippet
nx test platform-core
```

### Infrastructure

```bash
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Database Connections (Dev)

| Service    | Host:Port       | Credentials         |
| ---------- | --------------- | ------------------- |
| SQL Server | localhost,14330 | sa / 123456Abc      |
| MongoDB    | localhost:27017 | root / rootPassXXX  |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis      | localhost:6379  | -                   |
| RabbitMQ   | localhost:15672 | guest / guest       |

### Recommended VS Code Extensions

```json
{
    "recommendations": [
        "angular.ng-template",
        "esbenp.prettier-vscode",
        "ms-dotnettools.csharp",
        "ms-dotnettools.csdevkit",
        "nrwl.angular-console",
        "dbaeumer.vscode-eslint",
        "firsttris.vscode-jest-runner",
        "sonarsource.sonarlint-vscode",
        "eamodio.gitlens",
        "streetsidesoftware.code-spell-checker"
    ]
}
```

---

## Cross-Platform Shell Commands (CRITICAL)

**Always use portable shell commands** - This codebase runs on Windows with Git Bash, where Windows commands fail.

### Command Translation Table

| Windows | Portable | Notes |
|---------|----------|-------|
| `> nul` | `> /dev/null` | **CRITICAL: Creates "nul" file in Git Bash!** |
| `2>nul` | `2>/dev/null` | Suppress stderr |
| `dir /b /s path` | `find "path" -type f` | Recursive file list |
| `dir /b path` | `ls -1 "path"` | Simple list |
| `dir path` | `ls -la "path"` | Detailed list |
| `type file` | `cat file` | Read file |
| `copy src dst` | `cp src dst` | Copy file |
| `move src dst` | `mv src dst` | Move file |
| `del file` | `rm file` | Delete file |
| `md path` | `mkdir -p "path"` | Create directory |
| `rd /s path` | `rm -rf path` | Remove directory |
| `cls` | `clear` | Clear screen |

### Path Format

```bash
# ❌ WRONG - Backslashes fail in Git Bash
dir /b /s D:\GitSources\Project\.claude\patterns

# ✅ CORRECT - Forward slashes work everywhere
find "D:/GitSources/Project/.claude/patterns" -type f
ls -la "D:/GitSources/Project/.claude/patterns"
```

### Why This Matters

Git Bash interprets `dir /b` as: "run `dir` (Unix alias for `ls`) with `/b` as a file path argument" - hence the error `dir: cannot access '/b': No such file or directory`.

> **Hook:** `cross-platform-bash.cjs` validates commands and warns about compatibility issues.

---

## Code Quality Checklist

### Architecture

- [ ] Follows Clean Architecture layers
- [ ] No direct cross-service dependencies
- [ ] Uses message bus for cross-service communication
- [ ] Uses platform framework components

### Code

- [ ] Uses platform validation patterns
- [ ] Uses platform repositories
- [ ] Follows step-by-step code flow
- [ ] Single Responsibility per method
- [ ] Consistent abstraction levels

### Security

- [ ] Proper authorization checks
- [ ] Input validation
- [ ] No secrets in code

> **Coding standards:** See [clean-code-rules.md](docs/claude/clean-code-rules.md)

---

## Critical Anti-Patterns

### Backend - NEVER DO

```csharp
// Direct cross-service DB access
var data = await otherDbContext.Entities.ToListAsync();

// Side effects in command handlers
await notificationService.SendAsync(entity);

// Mapping in handlers (should be in DTO)
var config = new Config { Name = req.Dto.Name };
```

### Frontend - NEVER DO

```typescript
// Direct HttpClient
constructor(private http: HttpClient) {}

// Missing subscription cleanup
this.data$.subscribe(...);

// Manual state management
employees = signal([]);
```

> **Full anti-patterns:** See [advanced-patterns.md](docs/claude/advanced-patterns.md)

---

## Changelog & Release Notes

### When to Use changelog-update vs release-notes

The workspace has two complementary tools for changelog management:

| Aspect | changelog-update (Manual) | release-notes (Automated) |
|--------|--------------------------|---------------------------|
| **Purpose** | Manual CHANGELOG.md updates | Automated release notes |
| **Input** | Manual file review | Conventional commits |
| **Output** | `CHANGELOG.md` [Unreleased] | `docs/release-notes/*.md` |
| **Audience** | Business + Technical | Technical (commit-based) |
| **When** | During development (PR/feature) | Release time (v1.x.x) |
| **Automation** | Semi-manual with temp notes | Fully automated |
| **Invocation** | `/changelog-update` | `/release-notes` |

### Use changelog-update When

- **During development**: Document feature/fix for users before PR/merge
- **PR preparation**: Add business-focused entry to CHANGELOG.md
- **Manual documentation**: When commits don't capture full business impact
- **User-facing changes**: Need to explain business value, not just technical changes

**Command**: `/changelog-update`

**Output**: Updates `CHANGELOG.md` [Unreleased] section with business descriptions

### Use release-notes When

- **At release time**: Creating official release documentation
- **Automated release**: Generating technical changelog from conventional commits
- **Version announcements**: Publishing versioned release notes
- **Commit-based tracking**: Auto-categorizing feat, fix, perf, docs changes

**Command**: `/release-notes v1.0.0 HEAD --version v1.1.0`

**Output**: Creates `docs/release-notes/YYMMDD-v1.1.0.md` with commit-based entries

### Complementary Usage Pattern

```
Development Phase:
├─ Work on feature/fix
├─ Commit with conventional commits (feat:, fix:, etc.)
└─ Before PR: Use /changelog-update → Updates CHANGELOG.md [Unreleased]
                                       (manual, business-focused)

Release Phase:
├─ Use /release-notes → Generates docs/release-notes/v1.x.x.md
│                       (automated, commit-based, technical)
├─ Move CHANGELOG.md [Unreleased] → Versioned section
└─ Both documents coexist: CHANGELOG.md (business) + release-notes/*.md (technical)
```

### Templates & References

- Changelog template: [`docs/templates/changelog-entry-template.md`](docs/templates/changelog-entry-template.md)
- Keep a Changelog format: [`.claude/skills/changelog-update/references/keep-a-changelog-format.md`](.claude/skills/changelog-update/references/keep-a-changelog-format.md)
- Changelog skill: [`.claude/skills/changelog-update/SKILL.md`](.claude/skills/changelog-update/SKILL.md)
- Release notes skill: [`.claude/skills/release-notes/SKILL.md`](.claude/skills/release-notes/SKILL.md)

---

## AI Agent Guidelines

### Success Factors

1. **Evidence-Based:** Verify patterns with grep/search before implementing
2. **Platform-First:** Use Easy.Platform patterns over custom solutions
3. **Service Boundaries:** Verify through code analysis, never assume
4. **Check Base Classes:** Use IntelliSense to verify available methods

### Workflow

```
Task → Investigate → Plan → Get Approval → Implement
```

### Key Rules

- Always use TodoWrite to track tasks
- Always plan before implementing non-trivial changes
- Always verify code exists before assuming removal is safe
- Declare confidence level when uncertain (if <90%, ask user before proceeding)

---

## Automatic Workflow Detection (MUST FOLLOW)

Before responding to any task request, analyze the user's prompt to detect intent and follow the appropriate workflow.

### Intent Detection Rules

| Intent                     | Trigger Keywords                                    | Workflow Sequence                                                                                           |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Feature Implementation** | implement, add, create, build, develop, new feature | `/plan` → `/plan:review` → `/cook` → `/code-simplifier` → `/review/codebase` → `/test` → `/docs-update` → `/watzup` |
| **Bug Fix**                | bug, fix, error, broken, issue, crash, not working  | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan:review` → `/fix` → `/code-simplifier` → `/review/codebase` → `/test` |
| **Documentation**          | docs, document, readme, update docs                 | `/scout` → `/investigate` → `/docs-update` → `/watzup`                                                      |
| **Refactoring**            | refactor, restructure, clean up, improve code       | `/plan` → `/plan:review` → `/code` → `/code-simplifier` → `/review/codebase` → `/test`                    |
| **Code Review**            | review, check, audit code, PR review                | `/code-review` → `/watzup`                                                                                  |
| **Investigation**          | how does, where is, explain, understand, find       | `/scout` → `/investigate`                                                                                   |

### Workflow Execution Protocol

1. **DETECT:** Analyze user prompt for intent keywords
2. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
3. **CREATE TODO LIST (MANDATORY):** Use TodoWrite to create tasks for each workflow step:
   ```
   Example for Bug Fix workflow:
   - [ ] Execute /scout - Find relevant files
   - [ ] Execute /investigate - Build knowledge graph
   - [ ] Execute /debug - Root cause analysis
   - [ ] Execute /plan - Create fix plan
   - [ ] Execute /plan:review - Self-review plan
   - [ ] Execute /fix - Implement fix
   - [ ] Execute /code-simplifier - Simplify code
   - [ ] Execute /code-review - Review changes
   - [ ] Execute /test - Verify fix
   ```
4. **CONFIRM (for features/refactors):** Ask: `"Proceed with this workflow? (yes/no/quick)"`
5. **EXECUTE:** Follow each step in sequence, marking todos as completed after each step

### Override

- **Skip detection:** Prefix message with `quick:` (e.g., `quick: add a button`)
- **Explicit command:** Start with `/` (e.g., `/fix the login bug`)

### Path-Based Skill Activation (MANDATORY)

Before creating/modifying files in these paths, ALWAYS invoke the corresponding skill first:

| Path Pattern | Skill | Pre-Read |
|--------------|-------|----------|
| `docs/business-features/**` | `/business-feature-docs` | `docs/templates/detailed-feature-docs-template.md` |
| `docs/features/**` | `/feature-docs` | Existing sibling docs in same folder |
| `src/**/*Command*.cs` | `/easyplatform-backend` | CQRS patterns in this file |
| `src/**/*.component.ts` | `/frontend-angular-component` | Base component patterns |
| `src/**/*.store.ts` | `/frontend-angular-store` | Store patterns |

**Business Feature Documentation Requirements:**
- All 26 sections required (see `business-feature-docs` skill)
- Quick Navigation table with Audience column
- Test cases in TC-{MOD}-XXX format with GIVEN/WHEN/THEN

### Example

**User:** "Add a dark mode toggle to the settings page"

**Response:**

> Detected: **Feature Implementation**. Following workflow: `/plan` → `/plan:review` → `/cook` → `/code-simplifier` → `/review/codebase` → `/test` → `/docs-update` → `/watzup`
>
> Proceed with this workflow? (yes/no/quick)

---

## Universal Clean Code Rules

- **No code duplication** - Search and reuse existing implementations
- **SOLID principles** - Single responsibility, dependency inversion
- **Naming conventions:**
  - Classes: PascalCase (`UserService`)
  - Methods: PascalCase (C#), camelCase (TS)
  - Variables: camelCase (`userName`)
  - Constants: UPPER_SNAKE_CASE
  - Booleans: `is`, `has`, `can`, `should` prefix
  - Collections: Plural (`users`, `items`)
- **Code flow:** Input → Process → Output with early validation
- **90% Logic Rule:** If logic belongs 90% to class A, put it in class A

> **Detailed rules:** See [clean-code-rules.md](docs/claude/clean-code-rules.md)

---

## Getting Help

1. **Study Examples:** `src/PlatformExampleApp` for backend, `playground-text-snippet` for frontend
2. **Search Codebase:** Use grep/glob to find existing patterns
3. **Check Rule Files:** `docs/claude/` for detailed guidance
4. **Read Base Classes:** Check platform-core source for available APIs

---

_For detailed patterns and complete code examples, see the rule files in `docs/claude/`_

---

# Code Patterns Reference

## Backend Patterns

### 1. Clean Architecture

```csharp
// Domain Layer
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public static Expression<Func<Employee, bool>> IsActiveExpr() => e => e.Status == Status.Active;
}

public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }

// Application Layer - CQRS Handler
public class SaveEmployeeCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
    {
        var employee = await repository.GetByIdAsync(req.Id, ct);
        employee.Name = req.Name;
        var saved = await repository.CreateOrUpdateAsync(employee, ct);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - Controller
[ApiController, Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}
```

### 2. Repository Pattern

```csharp
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// Extension pattern
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Entity.CodeExpr(code), ct).EnsureFound();

    public static async Task<List<Entity>> GetByIdsValidatedAsync(this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

    public static async Task<string> GetIdByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();
}
```

### 3. Repository API

```csharp
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);
```

### 4. Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");

// Async validation
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(p => r.Ids.Contains(p.Id) && p.IsExternal, ct), "Externals not allowed");

// Chained with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid range")
        .Of<IPlatformCqrsRequest>();

// Ensure pattern
var entity = await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

### 5. Cross-Service Communication

```csharp
public class EmployeeEventProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }

public class EmployeeEventConsumer : PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEventBusMessage msg) { /* sync logic */ }
}
```

### 6. Full-Text Search

```csharp
var queryBuilder = repository.GetQueryBuilder(q => q
    .Where(t => t.IsActive)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns(), fullTextAccurateMatch: true)));

var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct)
);

// Entity search columns
public static Expression<Func<Entity, object>>[] SearchColumns() => [e => e.Name, e => e.Code];
```

### 7. CQRS Command Pattern (Command + Result + Handler in ONE file)

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { public EntityDto Entity { get; set; } = null!; }

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEntityCommand> v, CancellationToken ct)
        => await v.AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct).ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repo.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));
        await entity.ValidateAsync(repo, ct).EnsureValidAsync();
        var saved = await repo.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

### 8. Query Pattern

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler : PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        var qb = repo.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repo.CountAsync((uow, q) => qb(uow, q), ct),
            repo.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct, e => e.Related)
        );
        return new GetEntityListQueryResult(items, total, req);
    }
}
```

### 9. Event-Driven Side Effects

```csharp
// ❌ WRONG - direct side effect
await repo.CreateAsync(entity, ct);
await notificationService.SendAsync(entity);

// ✅ CORRECT - just save, platform auto-raises event
await repo.CreateAsync(entity, ct);

// Event handler (UseCaseEvents/[Feature]/)
internal sealed class SendNotificationOnCreateHandler : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => !e.RequestContext.IsSeedingTestingData() && e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

### 10. Entity Pattern

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent] public string Name { get; set; } = "";
    public string? ParentId { get; set; }

    // Navigation properties - two collection patterns supported
    // Pattern 1: Forward navigation (FK on this entity)
    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ParentId))]
    public Entity? Parent { get; set; }

    // Pattern 2: Reverse navigation (child has FK pointing to parent)
    // Supports .Where() filtering: e => e.Children.Where(c => c.IsActive)
    [JsonIgnore]
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(ParentId))]
    public List<Entity>? Children { get; set; }

    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code) => e => e.CompanyId == companyId && e.Code == code;
    public static Expression<Func<Entity, bool>> FilterExpr(List<Status> s) => e => s.ToHashSet().Contains(e.Status!.Value);
    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId) => OfCompanyExpr(companyId).AndAlsoIf(true, () => e => e.IsActive);
    public static Expression<Func<Entity, object?>>[] SearchColumns() => [e => e.Name, e => e.Code];

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    // Computed property (MUST have empty set for serialization)
    [ComputedEntityProperty] public bool IsRoot { get => Id == RootId; set { } }
    [ComputedEntityProperty] public string FullName { get => $"{First} {Last}".Trim(); set { } }

    public static List<string> ValidateEntity(Entity? e) => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
}

// Loading navigation properties
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Parent);                    // Forward
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Children!);                 // Reverse
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Children!.Where(c => c.IsActive)); // Reverse + filter
```

### 11. Entity DTO Pattern

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { Id = e.Id; Name = e.Name ?? u?.Name ?? ""; }

    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public OrgDto? Company { get; set; }

    public EmployeeDto WithCompany(Org c) { Company = new OrgDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee e, MapToEntityModes m) { e.Name = Name; return e; }
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

### 12. Fluent Helpers

```csharp
.With(e => e.Name = x).WithIf(cond, e => e.Status = Active)
.Then(e => e.Process()).ThenAsync(async e => await e.ValidateAsync(ct))
.EnsureFound("Not found").EnsureFoundAllBy(x => x.Id, ids).EnsureValidAsync()
.AndAlso(expr).AndAlsoIf(cond, () => expr).OrElse(expr)
.ThenSelect(e => e.Id).ParallelAsync(async i => await Process(i), maxConcurrent: 10)

var (entity, files) = await (repo.CreateOrUpdateAsync(e, ct), files.ParallelAsync(f => Upload(f, ct)));
```

### 13. Background Jobs

```csharp
// Cron expression examples:
// "0 0 * * *"    = Daily at midnight
// "0 3 * * *"    = Daily at 3 AM
// "*/5 * * * *"  = Every 5 minutes
// "0 0 * * 0"    = Weekly on Sunday at midnight
// "0 0 1 * *"    = Monthly on 1st at midnight

[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class PagedJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? p, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repo.GetAllAsync(q => Query(q).PageBy(skip, take)).Then(items => items.ParallelAsync(Process));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> p) => await repo.CountAsync(Query);
}

[PlatformRecurringJob("0 0 * * *")]  // Daily at midnight
[PlatformRecurringJob("*/5 * * * *", executeOnStartUp: true)]  // Every 5 min + run on startup
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? p, string? k) => q.WhereIf(k != null, e => e.CompanyId == k);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? p, string? k) => EntitiesQueryBuilder(q, p, k).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> e, string k, object? p, IServiceProvider sp) => await e.ParallelAsync(Process);
}

// Scrolling pattern (data affected by processing, always queries from start)
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);

// Job coordination (master schedules child jobs)
await companies.ParallelAsync(async cId => await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
    BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

### 14. Message Bus Consumer

```csharp
internal sealed class EntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage m, string r) => true;
    public override async Task HandleLogicAsync(EntityEventBusMessage m, string r)
    {
        if (m.Payload.CrudAction == Created || (m.Payload.CrudAction == Updated && !m.Payload.EntityData.IsDeleted))
        {
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == m.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == m.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p));
            if (companyMissing || userMissing) return;

            var existing = await repo.FirstOrDefaultAsync(e => e.Id == m.Payload.EntityData.Id);
            if (existing == null) await repo.CreateAsync(m.Payload.EntityData.ToEntity().With(e => e.LastSyncDate = m.CreatedUtcDate));
            else if (existing.LastSyncDate <= m.CreatedUtcDate) await repo.UpdateAsync(m.Payload.EntityData.UpdateEntity(existing).With(e => e.LastSyncDate = m.CreatedUtcDate));
        }
        if (m.Payload.CrudAction == Deleted) await repo.DeleteAsync(m.Payload.EntityData.Id);
    }
}
```

### 15. Data Migration

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext db)
    {
        var qb = repo.GetQueryBuilder(q => q.Where(Filter()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => qb(q)), 200, ExecutePage, qb);
    }

    static async Task<List<Entity>> ExecutePage(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> r, IPlatformUnitOfWorkManager u)
    {
        using var uow = u.Begin();
        var items = await r.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await r.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await uow.CompleteAsync();
        return items;
    }
}
```

### 16. Multi-Database Support

```csharp
// Entity Framework Core (SQL Server/PostgreSQL)
public class MyEfCorePersistenceModule : PlatformEfCorePersistenceModule<MyDbContext>
{
    protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider sp)
        => options => options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
}

// MongoDB
public class MyMongoPersistenceModule : PlatformMongoDbPersistenceModule<MyDbContext>
{
    protected override void ConfigureMongoOptions(PlatformMongoOptions<MyDbContext> options)
    {
        options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
        options.Database = Configuration.GetSection("MongoDB:Database").Value;
    }
}
```

---

## Frontend Patterns

### 1. Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

### 2. Platform Component API

```typescript
// PlatformComponent
status$: WritableSignal<'Pending'|'Loading'|'Success'|'Error'>;
observerLoadingErrorState<T>(key?: string): OperatorFunction<T, T>;
isLoading$(key?: string): Signal<boolean | null>;
untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
tapResponse<T>(next?, error?, complete?): OperatorFunction<T, T>;

// PlatformVmComponent
vm: WritableSignal<T | undefined>;
currentVm(): T;
updateVm(partial): T;
abstract initOrReloadVm: (isReload: boolean) => Observable<T | undefined>;

// PlatformVmStoreComponent
constructor(public store: TStore) {}
vm: Signal<T | undefined>;
reload(): void;

// PlatformFormComponent
form: FormGroup<PlatformFormGroupControls<T>>;
mode: 'create'|'update'|'view';
validateForm(): boolean;
abstract initialFormConfig: () => PlatformFormConfig<T>;
```

### 3. Component Usage

```typescript
// PlatformComponent
export class ListComponent extends PlatformComponent {
    load() {
        this.api
            .get()
            .pipe(
                this.observerLoadingErrorState('load'),
                this.tapResponse(d => (this.data = d)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}

// PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() => this.api.get().pipe(this.tapResponse(d => this.updateState({ data: d }))));
    readonly data$ = this.select(s => s.data);
}

// PlatformVmStoreComponent
export class ListComponent extends PlatformVmStoreComponent<MyVm, MyStore> {
    constructor(store: MyStore) {
        super(store);
    }
    refresh() {
        this.reload();
    }
}

// PlatformFormComponent
export class FormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: { email: new FormControl(this.currentVm().email, [Validators.required], [ifAsyncValidator(() => !this.isViewMode, uniqueValidator)]) },
        dependentValidations: { email: ['name'] }
    });
    submit() {
        if (this.validateForm()) {
            /* save */
        }
    }
}
```

### 4. API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Entity';
    }
    getAll(q?: Query): Observable<Entity[]> {
        return this.get('', q);
    }
    save(cmd: SaveCmd): Observable<Result> {
        return this.post('', cmd);
    }
    search(c: Search): Observable<Entity[]> {
        return this.post('/search', c, { enableCache: true });
    }
}
```

### 5. FormArray

```typescript
protected initialFormConfig = () => ({
  controls: {
    items: { modelItems: () => vm.items, itemControl: (i, idx) => new FormGroup({ name: new FormControl(i.name, [Validators.required]) }) }
  }
});
```

### 6. Advanced Frontend

```typescript
// @Watch decorator
@Watch('onChanged') public data?: Data;
@WatchWhenValuesDiff('search') public term = '';
private onChanged(v: Data, c: SimpleChange<Data>) { if (!c.isFirstTimeSet) this.update(); }

// RxJS operators
this.search$.pipe(skipDuplicates(500), applyIf(this.enabled$, debounceTime(300)), tapOnce({ next: v => this.init(v) }), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// Form validators
new FormControl('', [Validators.required, noWhitespaceValidator, startEndValidator('err', c => c.parent?.get('start')?.value, c => c.value)], [ifAsyncValidator(c => c.valid, uniqueValidator)]);

// Utilities
import { date_format, date_addDays, date_timeDiff, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty, string_truncate, dictionary_map, dictionary_filter, immutableUpdate, deepClone, removeNullProps, guid_generate, task_delay, task_debounce } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />

// PlatformComponent APIs
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
isLoading$('req1'); isLoading$('req2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
protected get devModeCheckLoadingStateElement() { return '.spinner'; }
protected get devModeCheckErrorStateElement() { return '.error'; }

// Store with caching
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (d?: Partial<MyVm>) => new MyVm(d);
  protected beforeInitVm = () => this.loadInitialData();
  loadData = this.effectSimple(() => this.api.get().pipe(this.observerLoadingErrorState('load'), this.tapResponse(d => this.updateState({ data: d }))));
}
```

---

## Authorization

```csharp
// Controller
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost] public async Task<IActionResult> Save([FromBody] Cmd c) => Ok(await Cqrs.SendAsync(c));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
              .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity filter
public static Expression<Func<E, bool>> AccessExpr(string userId, string companyId) => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

```typescript
// Component
get canEdit() { return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany(); }

// Template
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

---

## Migration

```csharp
// EF Core
public partial class AddField : Migration { protected override void Up(MigrationBuilder m) { m.AddColumn<string>("Dept", "Employees"); } }

// MongoDB
public class MigrateData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_Migrate";
    public override async Task Execute() => await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => q.Where(...)), 200,
        async (skip, take, r, u) => { var items = await r.GetAllAsync(q => q.Skip(skip).Take(take)); await r.UpdateManyAsync(items, dismissSendEvent: true); return items; });
}

// Cross-DB migration (first-time setup, use events for ongoing sync)
public class SyncData : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);
    public override async Task Execute(TargetDbContext db) => await targetRepo.CreateManyAsync(
        (await sourceDbContext.Entities.Where(e => e.CreatedDate < cutoffDate).ToListAsync()).Select(e => e.MapToTargetEntity()));
}
```

---

## Helper vs Util

```csharp
// Helper (with dependencies)
public class EntityHelper { private readonly IRepo<E> repo; public async Task<E> GetOrCreateAsync(string code, CancellationToken ct) => await repo.FirstOrDefaultAsync(t => t.Code == code, ct) ?? await CreateAsync(code, ct); }

// Util (pure functions)
public static class EntityUtil { public static string FullName(E e) => $"{e.First} {e.Last}".Trim(); public static bool IsActive(E e) => e.Status == Active; }
```

---

## Advanced Backend

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty() / .RemoveWhere(pred, out removed) / .UpsertBy(key, items, update) / .SelectList(sel) / .ThenSelect(sel) / .ParallelAsync(fn, max) / .AddDistinct(item, key)

var entity = dto.NotHasSubmitId() ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId()) : await repo.GetByIdAsync(dto.Id, ct).Then(x => dto.UpdateToEntity(x));

RequestContext.CurrentCompanyId() / .UserId() / .ProductScope() / .HasRequestAdminRoleInCompany()

var (a, b, c) = await (repo1.GetAllAsync(...), repo2.GetAllAsync(...), repo3.GetAllAsync(...));

public sealed class Helper : IPlatformHelper { private readonly IPlatformApplicationRequestContext ctx; public Helper(IPlatformApplicationRequestContextAccessor a) { ctx = a.Current; } }

.With(e => e.Name = x).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(async () => await svc.Any(), async e => await e.Sync())

public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m) => BaseExpr(s, c).AndAlso(e => e.User!.IsActive).AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));

// Domain Service Pattern (strategy for permissions)
public static class PermissionService {
    static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<E, bool>> GetCanManageExpr(IList<string> roles) => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Object Deep Comparison
if (prop.GetValue(entity).IsValuesDifferent(prop.GetValue(existing))) entity.AddFieldUpdatedEvent(prop, oldVal, newVal);

// Task Extensions
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

---

## Anti-Patterns

```csharp
// ❌ Direct cross-service DB access → ✅ Use message bus
// ❌ Custom repository interface → ✅ Use platform repo + extensions
// ❌ Manual validation throw → ✅ Use PlatformValidationResult fluent API
// ❌ Side effects in handler → ✅ Use entity event handlers
// ❌ DTO mapping in handler → ✅ DTO owns mapping via MapToObject()/MapToEntity()

// ✅ Correct DTO mapping
public sealed class ConfigDto : PlatformDto<ConfigValue> { public override ConfigValue MapToObject() => new() { ClientId = ClientId }; }
var config = req.Config.MapToObject().With(p => p.Secret = encrypt(p.Secret));
```

```typescript
// ❌ Direct HttpClient → ✅ Extend PlatformApiService
// ❌ Manual signals → ✅ Use PlatformVmStore
// ❌ Missing untilDestroyed() → ✅ Always use .pipe(this.untilDestroyed())
```

---

## Templates

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult> { public string Name { get; set; } = ""; public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required"); }
internal sealed class Save{E}CommandHandler : PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult> { protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command r, CancellationToken ct) { /* impl */ } }
```

```typescript
@Component({ selector: 'app-{e}-list', template: `<app-loading [target]="this">@if (vm(); as vm) { @for (i of vm.items; track i.id) { <div>{{i.name}}</div> } }</app-loading>`, providers: [{E}Store] })
export class {E}Component extends AppBaseVmStoreComponent<{E}State, {E}Store> { ngOnInit() { this.store.load(); } }
```

---

## Commands

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
cd src/PlatformExampleAppWeb && npm install && nx serve playground-text-snippet
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```
