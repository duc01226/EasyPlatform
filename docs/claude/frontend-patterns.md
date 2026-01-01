# Frontend Development Patterns

> Components, Forms, Stores, API Services, Platform-Core Library

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

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/src/lib/components/abstracts/`

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

**Location**: `src/PlatformExampleAppWeb/apps/playground-text-snippet/`

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

## Platform-Core Library Reference

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/`

### Foundation Classes

```typescript
// Extend PlatformComponent/BaseDirective (lifecycle, detectChanges(), untilDestroy())
export class MyComponent extends PlatformComponent {}
export class MyDirective extends BaseDirective {}
```

### Components

```typescript
// Platform components - alerts, tables, icons
<platform-select
  formControlName="ids"
  [fetchDataFn]="fetchFn"
  [multiple]="true"
  [searchable]="true" />
```

### Directives

```typescript
// AppPopover, TextEllipsis, Autofocus
<div appTextEllipsis [maxTextEllipsisLines]="2">...</div>
```

### Pipes

```typescript
// LocalizedDate, Pluralize, SafePipe
{{ date | localizedDate:'shortDate' }}
{{ 'item' | pluralize:count }}
```

### Services

```typescript
// TranslateService, ThemeService
constructor(
  private translateSvc: TranslateService,
  private themeSvc: ThemeService
) { }
```

### Utilities

```typescript
// Platform utility functions
import { list_groupBy, date_format, string_isEmpty } from '@libs/platform-core';
list_groupBy(items, x => x.id);
date_format(new Date(), 'DD/MM/YYYY');
string_isEmpty(value);
```

### Module Import

```typescript
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })
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
├── Cross-domain logic? → Add to apps-domains shared components
├── Domain-specific? → Add to apps-domains/{domain}/ module
└── Cross-app reusable? → Add to platform-core components
```
