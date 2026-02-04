---
applyTo: '**/*.cs,**/*.ts'
---

# Feature Investigation Protocol

> Auto-loads when editing code files. Use this workflow to understand existing features before implementing changes.

## Investigation Workflow

```
1. Domain Concepts    → Understand business terminology
2. Semantic Search    → Find by feature/domain names
3. Grep Search        → Find by code patterns
4. Service Discovery  → Identify which microservice owns it
5. Platform Patterns  → Understand which patterns are used
6. Implementation     → Read actual code logic
```

## EasyPlatform Service Map

| Service         | Domain      | Key Entities                           |
| --------------- | ----------- | -------------------------------------- |
| **TextSnippet** | Example app | TextSnippetEntity, TextSnippetCategory |

## Search Strategy

### Step 1: Find Entry Points

```
Search for: Controller endpoints → [Entity]Controller.cs
Search for: Command/Query files → UseCaseCommands/[Feature]/*.cs
Search for: Frontend components → [feature]-*.component.ts
```

### Step 2: Trace the Stack

```
Backend:  Controller → Command → Handler → Entity → Repository → Events
Frontend: Component → Store → ApiService → Backend API
```

### Step 3: Cross-Service Communication

```
Search for: *EventBusMessageProducer → outgoing messages
Search for: *Consumer.cs → incoming messages
Search for: MessageBus*/ folder → all message definitions
```

## Key Directories

```
src/Services/{Service}.Application/
    UseCaseCommands/{Feature}/    # Commands + Handlers
    UseCaseQueries/{Feature}/     # Queries + Handlers
    UseCaseEvents/{Feature}/      # Event Handlers
    BackgroundJobs/               # Scheduled jobs
    MessageBus/                   # Cross-service consumers/producers

src/Services/{Service}.Domain/
    Entities/                     # Domain entities
    Repositories/                 # Repository extensions

src/WebV2/apps/{app}/src/app/
    pages/{feature}/              # Feature pages
    components/{feature}/         # Feature components

src/Frontend/libs/apps-domains/
    {domain}/                     # Shared API services, models
```

## Platform Pattern Recognition

| Pattern        | Files to Check                                             |
| -------------- | ---------------------------------------------------------- |
| CQRS Command   | `UseCaseCommands/{Feature}/{Verb}{Entity}Command.cs`       |
| CQRS Query     | `UseCaseQueries/{Feature}/Get{Entity}Query.cs`             |
| Entity Events  | `UseCaseEvents/{Feature}/{Action}On{Event}EventHandler.cs` |
| Message Bus    | `MessageBus/{Entity}EventBusMessage*.cs`                   |
| Background Job | `BackgroundJobs/{JobName}BackgroundJob.cs`                 |
| Data Migration | `DataMigrations/{Timestamp}_{Description}.cs`              |
| Store          | `{feature}.store.ts`                                       |
| API Service    | `{domain}-api.service.ts`                                  |

## Investigation Checklist

- [ ] Identified which microservice owns the feature?
- [ ] Found all related Command/Query handlers?
- [ ] Checked for Entity Event Handlers (side effects)?
- [ ] Found cross-service message bus producers/consumers?
- [ ] Identified frontend components and stores?
- [ ] Read existing tests for expected behavior?
- [ ] Checked for background jobs related to the feature?

---

## Architectural Recommendation Protocol

**MANDATORY before recommending removal, refactoring, or architectural changes. See [AI-DEBUGGING-PROTOCOL.md](.ai/docs/AI-DEBUGGING-PROTOCOL.md) for complete 6-phase protocol.**

### Quick Decision Tree

```
Considering code removal?
    ↓
YES → Run `/investigate-removal` skill
    ↓
NO → Proceed with feature investigation
```

### 6-Phase Validation Requirements

**Use when:** Considering removal of classes, registrations, methods, or architectural changes.

| Phase                     | Action                             | Evidence Required                   |
| ------------------------- | ---------------------------------- | ----------------------------------- |
| 1. Static Analysis        | Grep searches for all references   | File paths + line numbers           |
| 2. Dynamic Analysis       | Trace injection → usage → callers  | Complete usage chain                |
| 3. Cross-Module Check     | Search Platform, Backend, Frontend | Per-module usage summary            |
| 4. Test Coverage          | Find affected tests                | Test files that would break         |
| 5. Impact Assessment      | What breaks if removed?            | Dependent code paths with file:line |
| 6. Confidence Calculation | Evidence completeness score        | 90%+ for removal, 80%+ for refactor |

### Confidence Requirements

| Risk Level            | Threshold           | Examples                                                    |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| **HIGH** (removal)    | **90%+** required   | Remove classes, delete registrations, drop database columns |
| **MEDIUM** (refactor) | **80%+** acceptable | Change method signatures, restructure modules               |
| **LOW** (rename)      | **70%+** acceptable | Rename variables, reformat code                             |

**Rule:** <90% confidence for removal → Run `/investigate-removal` skill first

### When NOT to Recommend Changes

- **<90% confidence** — Insufficient evidence, investigate more
- **Interface without usage trace** — Might be used in factory/provider patterns (e.g., `IDbContextFactory`)
- **Dual registration patterns** — Compare with other services first
- **"Seems unused"** — Must prove with evidence, not assumption
- **Cross-module code** — Verify ALL modules (Platform, Backend, Frontend) before recommending

### Comparison Pattern (Service vs Service)

When investigating architectural differences between modules:

1. **Find working reference** — Which module works correctly?
2. **Compare implementations** — Side-by-side file comparison
3. **Identify differences** — What's different between working vs non-working?
4. **Verify each difference** — Understand WHY each difference exists
5. **Recommend based on proven pattern** — Not assumptions

**Example:** TextSnippet uses `AddDbContext` + `AddDbContextFactory` (dual registration) → Verify if other services follow same pattern before recommending changes

### Evidence-Based Confidence Format

Every architectural recommendation MUST include:

```markdown
## Recommendation: [REMOVE/KEEP/REFACTOR/INSUFFICIENT_EVIDENCE]

**Confidence:** X% — [Evidence summary]

### Evidence Checklist

- [x] Phase 1: Static analysis complete (file:line references)
- [x] Phase 2: Dynamic usage traced (injection → usage → callers)
- [x] Phase 3: Cross-module check (Platform ✅, Backend ✅, Frontend ✅)
- [x] Phase 4: Test coverage identified (3 tests would break)
- [x] Phase 5: Impact assessment (what breaks documented)
- [x] Phase 6: Confidence calculated based on evidence completeness

### Impact Assessment

**If removed:**

- ❌ BREAKS: DataProvider.GetCountAsync (DataProvider.cs:45)
- ❌ BREAKS: All COUNT queries (5 handlers affected)
- ❌ BREAKS: 12 unit tests in DataProvider.Tests.cs
```

### EasyPlatform-Specific Investigation Patterns

**Backend Search Commands:**

```bash
# Find entity definitions
grep -r "class.*Entity.*:.*RootEntity" --include="*.cs"

# Find CQRS command handlers
grep -r "PlatformCqrsCommandApplicationHandler" --include="*.cs"

# Find repository usage
grep -r "IPlatformQueryableRootRepository" --include="*.cs"

# Find entity event handlers
grep -r "PlatformApplicationDomainEventHandler" --include="*.cs"

# Find message bus patterns
grep -r "EventBusMessage.*Producer\|.*Consumer" --include="*.cs"
```

**Frontend Search Commands:**

```bash
# Find component hierarchy
grep -r "extends AppBase.*Component" --include="*.ts"

# Find state stores
grep -r "PlatformVmStore" --include="*.ts"

# Find API services
grep -r "extends PlatformApiService" --include="*.ts"

# Find form components
grep -r "extends.*FormComponent" --include="*.ts"
```

### Workflow Integration

When working within active workflows, checkpoints will guide you:

- **Bugfix workflow:** "CHECKPOINT: If considering code removal, run /investigate-removal first"
- **Refactor workflow:** "CHECKPOINT: If removing code, run /investigate-removal first"

These checkpoints are language-agnostic and context-aware, triggering only during relevant operations.

### Quick Reference Card

**Before any architectural change:**

| Task               | Required Action                                       |
| ------------------ | ----------------------------------------------------- |
| Removal            | Complete 6 phases OR run `/investigate-removal`       |
| Refactor           | Usage trace + test verification + 80%+ confidence     |
| Rename             | Code review + 70%+ confidence                         |
| Investigation only | Read-only `/investigate` (no removal recommendations) |

**Evidence standards:**

- All claims backed by file:line references
- Dynamic usage traced (not just static grep)
- Cross-module impact verified
- Test coverage identified
