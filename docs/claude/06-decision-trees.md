# Decision Trees & Quick Guides

## Backend Task Decision

```
Need to add backend feature?
├── New API endpoint? → PlatformBaseController + CQRS Command
├── Business logic? → Command Handler in Application layer
├── Data access? → Extend microservice-specific repository
├── Cross-service sync? → Entity Event Consumer
├── Scheduled task? → PlatformApplicationBackgroundJob
├── MongoDB migration? → PlatformMongoMigrationExecutor
└── SQL migration? → EF Core migrations
```

## Frontend Task Decision

```
Need to add frontend feature?
├── Simple component? → Extend PlatformComponent
├── Complex state? → PlatformVmStoreComponent + PlatformVmStore
├── Forms? → Extend PlatformFormComponent with validation
├── API calls? → Create service extending PlatformApiService
├── Cross-domain logic? → Add to apps-domains shared library
├── Domain-specific? → Add to apps-domains/{domain}/
└── Cross-app reusable? → Add to platform-core library
```

## Repository Pattern Decision

```
Repository needs?
├── Primary choice? → IPlatformQueryableRootRepository<TEntity, TKey>
├── Complex queries? → Create RepositoryExtensions with static expressions
├── When queryable not needed? → IPlatformRootRepository<TEntity, TKey>
└── Cross-service data? → Use message bus instead
```

---

# Helper vs Util Decision Guide

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

## Helper Pattern

```csharp
public class TextSnippetHelper
{
    private readonly IPlatformQueryableRootRepository<TextSnippetText, string> repository;

    public async Task<TextSnippetText> GetOrCreateSnippetAsync(string code, CancellationToken ct)
    {
        return await repository.FirstOrDefaultAsync(t => t.FullTextSearchCode == code, ct)
            ?? await CreateSnippetAsync(code, ct);
    }

    // Static methods for pure logic are OK in helpers
    public static bool IsActiveSnippet(TextSnippetText snippet)
        => snippet.IsActive && snippet.CreatedDate.HasValue;
}
```

## Util Pattern

```csharp
public static class EmployeeUtil
{
    public static string GetFullName(Employee e) => $"{e.FirstName} {e.LastName}".Trim();
    public static bool IsActive(Employee e) => e.Status == EmploymentStatus.Active;
    public static List<Employee> FilterByDepartment(List<Employee> employees, string deptId)
        => employees.Where(e => e.Departments?.Any(d => d.Id == deptId) == true).ToList();
}
```

---

# Code Templates

## Backend Command Template

```csharp
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Name), "Name is required");
    }
}

public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command request, CancellationToken cancellationToken)
    {
        // 1. Get or create
        var entity = request.Id.IsNullOrEmpty()
            ? request.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(request.Id, cancellationToken)
                .Then(e => request.UpdateEntity(e));

        // 2. Validate
        await entity.ValidateAsync(repository, cancellationToken).EnsureValidAsync();

        // 3. Save
        var saved = await repository.CreateOrUpdateAsync(entity, cancellationToken);

        // 4. Return
        return new Save{Entity}CommandResult { Entity = new {Entity}Dto(saved) };
    }
}
```

## Frontend Component Template

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
    constructor(store: {Entity}Store) {
        super(store);
    }

    ngOnInit() {
        this.store.load{Entity}s();
    }
}
```

## Frontend Store Template

```typescript
interface {Entity}ListVm {
    items: {Entity}Dto[];
    loading: boolean;
}

@Injectable()
export class {Entity}Store extends PlatformVmStore<{Entity}ListVm> {
    protected vmConstructor = () => ({ items: [], loading: false });

    public load{Entity}s = this.effectSimple(() =>
        this.api.get{Entity}s().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(items => this.updateState({ items }))
        ));

    public readonly items$ = this.select(state => state.items);
}
```
