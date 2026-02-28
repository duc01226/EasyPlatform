# Frontend Development Patterns — Project Reference

> **Companion doc for generic skills.** Contains project-specific Angular component hierarchy, state management, shared library, design system paths, and WebV2 directory structure. Generic skills reference this file via "MUST READ `frontend-patterns-reference.md`".

> Components, Forms, Stores, API Services, BravoCommon Library

## BravoSUITE Component Base Classes

```
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error
```

- Source: `src/WebV2/libs/platform-core/src/lib/components/abstracts/`
- All components MUST extend one of these base classes

## BravoSUITE State Management

- Use `PlatformVmStore` for state management (NEVER manual signals)
- Use `effectSimple()` for side effects
- Use `.pipe(this.untilDestroyed())` for all subscriptions

## BravoSUITE Shared Component Library (bravo-common)

- Location: `src/WebV2/libs/bravo-common/`
- Components: BravoAlert, BravoIcon, BravoTable, Attachment, BravoSelect
- Directives: AppPopover, TextEllipsis, BravoButton, Autofocus
- Pipes: LocalizedDate, Pluralize, BravoSafe, TranslateComma
- Import: `import { BravoCommonModule } from '@libs/bravo-common'`

## BravoSUITE WebV2 Directory Structure

```
src/WebV2/
├── apps/
│   ├── growth-for-company/     # HR management (port 4206)
│   ├── employee/               # Employee self-service (port 4205)
│   └── ...
├── libs/
│   ├── platform-core/          # Base components, stores, API service
│   ├── bravo-common/           # Shared UI components
│   ├── bravo-domain/           # Business domain (APIs, models)
│   └── apps-domains/           # Cross-app shared logic
└── ...
```

## BravoSUITE Design System Paths

- Design tokens: `docs/design-system/`
- SCSS guide: `docs/claude/scss-styling-guide.md`
- Per-app themes: `docs/design-system/{app}-style-guide.md`

## Component HTML Template Standard (BEM Classes)

**All UI elements in component templates MUST have BEM classes, even without styling needs.** This makes HTML self-documenting like OOP class hierarchy.

```html
<!-- ✅ CORRECT: All elements have BEM classes for structure clarity -->
<div class="employee-form">
    <div class="employee-form__header">
        <h2 class="employee-form__title">Employee Details</h2>
    </div>
    <div class="employee-form__body">
        <div class="employee-form__field">
            <label class="employee-form__label">Name</label>
            <input class="employee-form__input" formControlName="name" />
        </div>
        <div class="employee-form__field">
            <label class="employee-form__label">Email</label>
            <input class="employee-form__input" formControlName="email" />
        </div>
    </div>
    <div class="employee-form__footer">
        <button class="employee-form__btn --cancel">Cancel</button>
        <button class="employee-form__btn --submit">Save</button>
    </div>
</div>

<!-- ❌ WRONG: Elements without classes - structure unclear -->
<div class="employee-form">
    <div>
        <h2>Employee Details</h2>
    </div>
    <div>
        <div>
            <label>Name</label>
            <input formControlName="name" />
        </div>
        <div>
            <label>Email</label>
            <input formControlName="email" />
        </div>
    </div>
    <div>
        <button>Cancel</button>
        <button>Save</button>
    </div>
</div>
```

**BEM Naming Convention:**

- **Block**: Component name (e.g., `employee-form`)
- **Element**: Child using `block__element` (e.g., `employee-form__header`)
- **Modifier**: Separate class with `--` prefix (e.g., `employee-form__btn --submit --large`)

## Component Hierarchy

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

## Platform Component API Reference

**Location**: `src/WebV2/libs/platform-core/src/lib/components/abstracts/`

### PlatformComponent - Foundation

```typescript
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
```

### PlatformVmComponent - ViewModel Management

```typescript
export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
    public get vm(): WritableSignal<TViewModel | undefined>;
    public currentVm(): TViewModel;
    protected updateVm(partialOrUpdaterFn, onVmChanged?, options?): TViewModel;
    @Input('vm') vmInput;
    @Output('vmChange') vmChangeEvent;
    protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}
```

### PlatformVmStoreComponent - ComponentStore Integration

```typescript
export abstract class PlatformVmStoreComponent<TViewModel, TStore> extends PlatformComponent {
    constructor(public store: TStore) {}
    public get vm(): Signal<TViewModel | undefined>;
    public currentVm(): TViewModel;
    public updateVm(partialOrUpdaterFn, options?): void;
    public reload(): void; // Reloads all stores
}
```

### PlatformFormComponent - Reactive Forms

```typescript
export abstract class PlatformFormComponent<TViewModel> extends PlatformVmComponent<TViewModel> {
  public get form(): FormGroup<PlatformFormGroupControls<TViewModel>>;
  public formStatus$: WritableSignal<FormControlStatus>;
  public get mode(): PlatformFormMode;  // 'create'|'update'|'view'
  public isViewMode/isCreateMode/isUpdateMode(): boolean;
  public validateForm(): boolean;
  public formControls(key: keyof TViewModel): FormControl;
  protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}
```

## Usage Examples

### Basic Component with Loading State

```typescript
export class UserListComponent extends PlatformComponent {
    private loadUsers() {
        this.userService
            .getUsers()
            .pipe(
                this.observerLoadingErrorState('loadUsers'),
                this.tapResponse(users => (this.users = users)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}
```

### Store Pattern

```typescript
export class UserListStore extends PlatformVmStore<UserListVm> {
    public loadUsers = this.effectSimple(() => this.userApi.getUsers().pipe(this.tapResponse(users => this.updateState({ users }))));
    public readonly users$ = this.select(state => state.users);
}

export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
    constructor(store: UserListStore) {
        super(store);
    }
    onRefresh() {
        this.reload();
    }
}
```

### Form Component

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      email: new FormControl(this.currentVm().email,
        [Validators.required, Validators.email],
        [ifAsyncValidator(() => !this.isViewMode,
          checkIsEmployeeEmailUniqueAsyncValidator(...))])
    },
    dependentValidations: { email: ['firstName'] }
  });

  onSubmit() {
    if (this.validateForm()) {
      // process this.currentVm()
    }
  }
}
```

## API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

    getEmployees(query?: Query): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }

    saveEmployee(cmd: SaveCommand): Observable<Result> {
        return this.post<Result>('', cmd);
    }

    searchEmployees(criteria: Search): Observable<Employee[]> {
        return this.post('/search', criteria, { enableCache: true });
    }
}
```

## Working Examples Reference

**Location**: `src/Web/BravoComponents/src/components/platform-examples/`

| Example          | File                                            | Use Case                     |
| ---------------- | ----------------------------------------------- | ---------------------------- |
| Loading/Error    | `loading-error-indicator-demo.component.ts`     | Auto state binding           |
| Basic Form       | `user-form.component.ts`                        | Simple forms, validation     |
| Advanced Form    | `product-form.component.ts`                     | FormArrays, async validation |
| Complex Form     | `user-profile-form.component.ts`                | Nested 3+ levels             |
| State Management | `user-list.component.ts` + `user-list.store.ts` | ComponentStore, CRUD         |
| API Service      | `platform-examples-api.service.ts`              | Caching, mock data           |

### FormArray Pattern

```typescript
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

## BravoCommon Library Reference

**Location**: `src/WebV2/libs/bravo-common/`

### Foundation Classes

```typescript
// Extend BaseComponent/BaseDirective (lifecycle, detectChanges(), untilDestroy())
export class MyComponent extends BaseComponent {}
export class MyDirective extends BaseDirective {}
```

### Components

```typescript
// BravoAlert, BravoIcon, BravoTable, Attachment, BravoSelect
<bravo-select
  formControlName="ids"
  [fetchDataFn]="fetchFn"
  [multiple]="true"
  [searchable]="true" />
```

### Directives

```typescript
// AppPopover, TextEllipsis, BravoButton, Autofocus
<div appTextEllipsis [maxTextEllipsisLines]="2">...</div>
```

### Pipes

```typescript
// LocalizedDate, Pluralize, BravoSafe, TranslateComma
{{ date | localizedDate:'shortDate' }}
{{ 'item' | pluralize:count }}
```

### Services

```typescript
// BravoTranslateService, ThemeService, BravoScriptService
constructor(
  private translateSvc: BravoTranslateService,
  private themeSvc: ThemeService
) { }
```

### Utilities

```typescript
// BravoArrayUtil, BravoDateUtil, BravoStringUtil
BravoArrayUtil.toDictionary(items, x => x.id);
BravoDateUtil.format(new Date(), 'DD/MM/YYYY');
BravoStringUtil.isNullOrEmpty(value);
```

### Module Import

```typescript
import { BravoCommonModule } from '@libs/bravo-common';
import { BravoCommonRootModule } from '@libs/bravo-common';  // App root only
@NgModule({ imports: [BravoCommonModule] })
```

## Frontend Authorization Patterns

```typescript
// Component properties
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  get canEdit() {
    return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager)
      && this.isOwnCompany();
  }
  get canDelete() {
    return this.hasRole(PlatformRoles.Admin);
  }
}

// Template guards
@if (hasRole(PlatformRoles.Admin)) {
  <button (click)="delete()">Delete</button>
}

// Route guard
canActivate(): Observable<boolean> {
  return this.authService.hasRole$(PlatformRoles.Admin);
}
```

## Component Template Pattern

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

## Frontend Task Decision Tree

```
Need to add frontend feature?
├── Simple component? → Extend AppBaseComponent
├── Complex state? → Use AppBaseVmStoreComponent + PlatformVmStore
├── Forms? → Extend AppBaseFormComponent with validation
├── API calls? → Create service extending PlatformApiService
├── Cross-domain logic? → Add to bravo-domain shared components
├── Domain-specific? → Add to bravo-domain/{domain}/ module
└── Cross-app reusable? → Add to bravo-common components
```
