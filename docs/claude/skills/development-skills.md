# Development Skills

> Backend and frontend development skills for BravoSUITE

## Overview

Development skills provide domain-specific knowledge for implementing features in the BravoSUITE monorepo.

## Backend Skills

### `easyplatform-backend`

**Triggers:** CQRS, commands, entities, migrations, Easy.Platform

The primary skill for BravoSUITE backend development.

#### Key Patterns

**Entity Definition:**
```csharp
public class Employee : RootAuditedEntity<Employee, string, string>
{
    public string CompanyId { get; set; } = "";
    public string FullName { get; set; } = "";

    [ComputedEntityProperty]
    public string DisplayName { get => $"{FullName} ({Email})"; set { } }

    // Static expression for queries
    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;
}
```

**CQRS Command (single file):**
```csharp
// Command + Result + Handler in ONE file
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEmployeeCommandResult : PlatformCqrsCommandResult
{
    public EmployeeDto Entity { get; set; } = null!;
}

internal sealed class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req, CancellationToken ct)
    {
        // Implementation
    }
}
```

**Repository Pattern:**
```csharp
// Always use service-specific repository
IGrowthRootRepository<Employee> repository  // bravoGROWTH
ICandidatePlatformRootRepository<Candidate> repository  // bravoTALENTS

// Repository extensions
public static async Task<Employee> GetByEmailAsync(
    this IGrowthRootRepository<Employee> repo,
    string email,
    CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();
```

**Validation:**
```csharp
// Fluent validation (NEVER throw exceptions)
return base.Validate()
    .And(_ => Name.IsNotNullOrEmpty(), "Name required")
    .And(_ => FromDate <= ToDate, "Invalid range")
    .AndAsync(r => repo.AnyAsync(e => e.Id == r.Id, ct), "Entity not found");
```

#### Source

Location: `.claude/skills/easyplatform-backend/`

---

### `api-design`

**Triggers:** REST, controller, route, HTTP, endpoint, request, response

API design patterns for RESTful endpoints.

#### Key Patterns

**Controller Structure:**
```csharp
[ApiController]
[Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] GetEmployeeListQuery query)
        => Ok(await Cqrs.SendAsync(query));

    [HttpPost]
    [PlatformAuthorize(PlatformRoles.Admin)]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd)
        => Ok(await Cqrs.SendAsync(cmd));
}
```

#### Source

Location: `.claude/skills/api-design/`

---

### `databases`

**Triggers:** MongoDB, PostgreSQL, SQL, queries, database

Database operations for MongoDB and PostgreSQL.

#### MongoDB Patterns

```csharp
// Query builder
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == companyId)
    .OrderByDescending(e => e.CreatedDate));

// Projection
await repo.FirstOrDefaultAsync(q => q
    .Where(expr)
    .Select(e => e.Id), ct);
```

#### PostgreSQL Patterns

```csharp
// EF Core migration
public partial class AddEmployeeFields : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<string>("Department", "Employees");
    }
}
```

#### Source

Location: `.claude/skills/databases/`

---

### `database-optimization`

**Triggers:** slow query, N+1, index, query optimization, eager loading

Query performance optimization.

#### N+1 Prevention

```csharp
// Load related entities
var employees = await repo.GetAllAsync(expr, ct,
    loadRelatedEntities: e => e.Department!, e => e.Company!);

// Batch loading
await employees.LoadNavigationAsync(e => e.Department, resolver, ct);
```

#### Index Strategy

- Add indexes for frequently queried columns
- Use compound indexes for multi-column queries
- Avoid over-indexing (impacts write performance)

#### Source

Location: `.claude/skills/database-optimization/`

---

### `better-auth`

**Triggers:** authentication, OAuth, JWT, 2FA, login, password

Authentication and authorization patterns.

#### Authorization

```csharp
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)

// In handler
RequestContext.CurrentCompanyId()
RequestContext.UserId()
RequestContext.HasRequestAdminRoleInCompany()
```

#### Source

Location: `.claude/skills/better-auth/`

---

## Frontend Skills

### `frontend-angular`

**Triggers:** Angular, WebV2, component, form, store, API service

Angular component patterns for BravoSUITE.

#### Component Hierarchy

```
PlatformComponent
  └── PlatformVmComponent
        └── PlatformFormComponent
  └── PlatformVmStoreComponent

AppBaseComponent (extends Platform*)
  └── AppBaseVmComponent
        └── AppBaseFormComponent
  └── AppBaseVmStoreComponent
```

#### Component Template

```typescript
@Component({
    selector: 'app-employee-list',
    template: `
        <div class="employee-list">
            <app-loading [target]="this">
                @if (vm(); as vm) {
                    @for (employee of vm.employees; track employee.id) {
                        <div class="employee-list__item">
                            <span class="employee-list__name">{{ employee.name }}</span>
                        </div>
                    }
                }
            </app-loading>
        </div>
    `,
    providers: [EmployeeListStore]
})
export class EmployeeListComponent extends AppBaseVmStoreComponent<EmployeeListVm, EmployeeListStore> {
    constructor(store: EmployeeListStore) {
        super(store);
    }

    ngOnInit() {
        this.store.loadEmployees();
    }
}
```

#### BEM Classes Requirement

**All template elements MUST have BEM classes:**

```html
<!-- ✅ CORRECT -->
<div class="employee-card">
    <div class="employee-card__header">
        <h2 class="employee-card__title">{{ name }}</h2>
    </div>
</div>

<!-- ❌ WRONG -->
<div>
    <div><h2>{{ name }}</h2></div>
</div>
```

#### Form Component

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode,
                    checkEmailUniqueValidator(this.api))]
            )
        },
        dependentValidations: { email: ['firstName'] }
    });

    onSubmit() {
        if (this.validateForm()) {
            // Process form
        }
    }
}
```

#### FormArray Pattern

```typescript
protected initialFormConfig = () => ({
    controls: {
        skills: {
            modelItems: () => this.currentVm().skills,
            itemControl: (skill, idx) => new FormGroup({
                name: new FormControl(skill.name, [Validators.required]),
                level: new FormControl(skill.level)
            })
        }
    }
});
```

#### State Management

```typescript
@Injectable()
export class EmployeeListStore extends PlatformVmStore<EmployeeListVm> {
    protected vmConstructor = (data?: Partial<EmployeeListVm>) =>
        new EmployeeListVm(data);

    loadEmployees = this.effectSimple(() =>
        this.api.getEmployees().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(employees => this.updateState({ employees }))
        ), 'loadEmployees');

    readonly employees$ = this.select(state => state.employees);
    readonly loading$ = this.isLoading$('loadEmployees');
}
```

#### Caching

```typescript
@Injectable()
export class EmployeeListStore extends PlatformVmStore<EmployeeListVm> {
    protected get enableCaching() { return true; }
    protected cachedStateKeyName = () => 'EmployeeListStore';
}
```

#### API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

    getEmployees(query?: EmployeeQuery): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }

    saveEmployee(cmd: SaveEmployeeCommand): Observable<SaveEmployeeResult> {
        return this.post<SaveEmployeeResult>('', cmd);
    }

    searchWithCache(criteria: SearchCriteria): Observable<Employee[]> {
        return this.post('/search', criteria, { enableCache: true });
    }
}
```

#### Source

Location: `.claude/skills/frontend-angular/`

---

---

### `frontend-design`

**Triggers:** UI, design, screenshot, interface, layout

UI implementation and design extraction.

#### Screenshot Analysis

When given a screenshot, this skill:
1. Extracts design guidelines (colors, typography, spacing)
2. Generates implementation code
3. Ensures BEM class naming

#### Source

Location: `.claude/skills/frontend-design/`

---

### `shadcn-tailwind`

**Triggers:** shadcn, Radix UI, Tailwind components, React components

React component library skill for shadcn/ui + Tailwind CSS. For React/Next.js projects only -- NOT for Angular (use `frontend-angular` skill instead).

#### BEM Naming (Angular projects)

```scss
// Block: employee-card
// Element: employee-card__header
// Modifier: --primary, --large (separate class)

.employee-card {
    &__header {
        // Element styles
    }

    &__btn {
        &.--primary {
            background: $primary-color;
        }
        &.--large {
            padding: 1rem 2rem;
        }
    }
}
```

#### Design Tokens

```scss
// Use design tokens from docs/design-system/
@use 'design-tokens' as tokens;

.component {
    color: tokens.$text-primary;
    background: tokens.$bg-surface;
    padding: tokens.$spacing-md;
}
```

#### Source

Location: `.claude/skills/shadcn-tailwind/`

---

## Key Principles

### Code Responsibility Hierarchy

Place logic in the **LOWEST** appropriate layer:

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer | Contains |
|-------|----------|
| Entity/Model | Business logic, display helpers, static factory methods |
| Service | API calls, command factories, data transformation |
| Component | UI event handling ONLY - delegates all logic to lower layers |

**Anti-Pattern:**
```typescript
// ❌ WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...];

// ✅ CORRECT: Logic in entity/model
export class JobProvider {
    static readonly dropdownOptions = [{ value: 1, label: 'ITViec' }, ...];
    static getDisplayLabel(value: number): string {
        return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
    }
}
```

### Always Use untilDestroyed()

```typescript
this.data$.pipe(
    this.observerLoadingErrorState('load'),
    this.tapResponse(data => this.process(data)),
    this.untilDestroyed()  // ALWAYS include
).subscribe();
```

---

## Related Documentation

- [README.md](./README.md) - Skills overview
- [integration-skills.md](./integration-skills.md) - Infrastructure skills
- [README.md](./README.md) - Skills overview
- [../../backend-patterns.md](../backend-patterns.md) - Backend patterns
- [../../frontend-patterns.md](../frontend-patterns.md) - Frontend patterns

---

*Source: `.claude/skills/` | Backend and frontend development skills*
