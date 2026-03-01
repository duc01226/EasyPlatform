# Development Skills

> Backend and frontend development skills for BravoSUITE

## Overview

Development skills provide domain-specific knowledge for implementing features in the BravoSUITE monorepo.

## Backend Skills

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

### ~~`frontend-angular`~~ *(Removed)*

> **Deleted.** Frontend patterns are now handled generically via `docs/frontend-patterns-reference.md` (auto-injected by `frontend-typescript-context.cjs` hook). No tech-stack-specific skill needed.

#### Component Hierarchy (reference: `docs/frontend-patterns-reference.md`)

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

Location: *(deleted — see `docs/frontend-patterns-reference.md`)*

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

React component library skill for shadcn/ui + Tailwind CSS. For React/Next.js projects only -- NOT for Angular (see `docs/frontend-patterns-reference.md`).

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
