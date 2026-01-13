---
name: feature-implementation
description: Use when implementing new features, enhancements, or adding functionality. Triggers on keywords like implement, add feature, build, create new, develop, enhancement.
---

# Feature Implementation

Expert full-stack .NET/Angular developer implementing new features for EasyPlatform.

**IMPORTANT**: Always use external memory at `.ai/workspace/analysis/[feature-name].md` for structured implementation planning.

## Workflow Phases

### Phase 1: Understanding

1. Parse feature requirements
2. Identify affected services:
    - TextSnippet (Example)
    - TextSnippet (Example)
    - TextSnippet (Example)
    - TextSnippet (Example)
3. Search for similar implementations
4. Identify reusable components

### Phase 2: Design

Plan the implementation:

- **Backend**: Domain entities, Commands/Queries, Event handlers
- **Frontend**: Components, Stores, API services
- **Database**: Migrations if needed

File locations:

```
Backend:
- src/PlatformExampleApp/{Service}/{Service}.Domain/Entities/
- src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseCommands/
- src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseQueries/
- src/PlatformExampleApp/{Service}/{Service}.Application/UseCaseEvents/

Frontend (WebV2):
- src/PlatformExampleAppWeb/apps/{app}/src/app/features/
- src/PlatformExampleAppWeb/libs/apps-domains/src/{domain}/
```

### Phase 3: Create Implementation Plan

Present detailed plan with:

- List of files to create/modify
- Order of implementation
- Dependencies between components
- Test strategy

### Phase 4: Approval Gate

**CRITICAL**: Wait for explicit user approval before writing any code.

### Phase 5: Implementation

After approval:

1. Create entities/DTOs
2. Create Commands/Queries with handlers
3. Create event handlers for side effects
4. Create frontend components
5. Add tests

## Key Patterns

### Backend Command (ONE FILE)

```csharp
public sealed class SaveFeatureCommand : PlatformCqrsCommand<SaveFeatureCommandResult>
{
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required");
    }
}

public sealed class SaveFeatureCommandResult : PlatformCqrsCommandResult
{
    public FeatureDto Entity { get; set; } = null!;
}

internal sealed class SaveFeatureCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveFeatureCommand, SaveFeatureCommandResult>
{
    protected override async Task<SaveFeatureCommandResult> HandleAsync(
        SaveFeatureCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity()
            : await repository.GetByIdAsync(req.Id, ct).EnsureFound();

        var saved = await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveFeatureCommandResult { Entity = new FeatureDto(saved) };
    }
}
```

### Frontend Component

```typescript
@Component({
    selector: 'app-feature',
    providers: [FeatureStore]
})
export class FeatureComponent extends AppBaseVmStoreComponent<FeatureState, FeatureStore> {
    constructor(store: FeatureStore) {
        super(store);
    }

    ngOnInit(): void {
        this.store.loadData();
    }
}
```

## Anti-Patterns to AVOID

- Never call side effects in command handlers
- Never create separate files for Command/Handler/Result
- Never use generic repositories when service-specific exists
- Never use direct HttpClient in Angular components

---

## See Also

- `.github/instructions/backend-dotnet.instructions.md` - Backend patterns
- `.github/instructions/frontend-angular.instructions.md` - Frontend patterns
- `.github/instructions/clean-code.instructions.md` - Clean code rules
- `.ai/prompts/context.md` - Platform patterns and context
