---
applyTo: 'src/PlatformExampleAppWeb/**/*.ts,src/PlatformExampleAppWeb/**/*.html,src/PlatformExampleAppWeb/**/*.ts'
excludeAgent: ['copilot-code-review']
description: 'Angular frontend development patterns for EasyPlatform'
---

# Frontend Angular Development Patterns

## Required Reading

**For comprehensive TypeScript patterns, you MUST read:**

**`docs/claude/frontend-typescript-complete-guide.md`**

This guide contains complete patterns for components, stores, forms, API services, RxJS operators, and more.

---

## Component Hierarchy

```typescript
// Platform foundation
PlatformComponent                    // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             // + ViewModel injection
├── PlatformFormComponent           // + Reactive forms
└── PlatformVmStoreComponent        // + ComponentStore state

// Application layer
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error
```

## 🎨 Design System Documentation (MANDATORY)

**Before creating any frontend component, read the design system documentation for your target application:**

| Application                       | Design System Location                           |
| --------------------------------- | ------------------------------------------------ |
| **WebV2 Apps**                    | `docs/design-system/`                            |
| **TextSnippetClient**             | `src/PlatformExampleAppWeb/apps/playground-text-snippet/docs/design-system/` |

**Key docs to read:**

- `README.md` - Component overview, base classes, library summary
- `02-component-catalog.md` - Available components and usage examples
- `01-design-tokens.md` - Colors, typography, spacing tokens
- `03-form-patterns.md` - Form validation, modes, error handling patterns
- `07-technical-guide.md` - Implementation checklist, best practices

## Component Selection

| Need                 | Base Class                              |
| -------------------- | --------------------------------------- |
| Simple UI display    | `AppBaseComponent`                      |
| Complex state        | `AppBaseVmStoreComponent<State, Store>` |
| Form with validation | `AppBaseFormComponent<FormVm>`          |

## Component HTML Template Standard (BEM Classes)

**All UI elements in component templates MUST have BEM classes, even without styling needs.** This makes HTML self-documenting like OOP class hierarchy.

```html
<!-- ✅ CORRECT: All elements have BEM classes for structure clarity -->
<div class="employee-list">
    <div class="employee-list__header">
        <h1 class="employee-list__title">Employees</h1>
        <button class="employee-list__btn --refresh">Refresh</button>
    </div>
    <div class="employee-list__content">
        @for (item of vm.items; track item.id) {
        <div class="employee-list__item">
            <span class="employee-list__item-name">{{ item.name }}</span>
            <span class="employee-list__item-role">{{ item.role }}</span>
        </div>
        }
    </div>
    <div class="employee-list__footer">
        <span class="employee-list__count">{{ vm.total }} employees</span>
    </div>
</div>

<!-- ❌ WRONG: Elements without classes - structure unclear -->
<div class="employee-list">
    <div>
        <h1>Employees</h1>
        <button>Refresh</button>
    </div>
    <div>
        @for (item of vm.items; track item.id) {
        <div>
            <span>{{ item.name }}</span>
            <span>{{ item.role }}</span>
        </div>
        }
    </div>
</div>
```

**BEM Naming Convention:**

- **Block**: Component name (e.g., `employee-list`)
- **Element**: Child using `block__element` (e.g., `employee-list__header`)
- **Modifier**: Separate class with `--` prefix (e.g., `employee-list__btn --refresh --small`)

## Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        // BEM child elements...
    }

    &__content {
        flex: 1;
        overflow-y: auto;
    }
}
```

**Why both?**

- **Host element**: Makes the Angular element a real layout element (not an unknown element without display)
- **Main class**: Contains the full styling, matches the wrapper div in HTML

## Platform Component API Reference

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
```

## Store Pattern

```typescript
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    private employeeApi = inject(EmployeeApiService);

    // Enable caching (optional)
    protected get enableCaching() {
        return true;
    }
    protected cachedStateKeyName = () => 'EmployeeStore';
    protected vmConstructor = (data?: Partial<EmployeeState>) => new EmployeeState(data);

    public loadEmployees = this.effectSimple(
        () => this.employeeApi.getEmployees().pipe(this.tapResponse(employees => this.updateState({ employees }))),
        'loadEmployees'
    );

    // State selectors
    public readonly employees$ = this.select(state => state.employees);
    public readonly loading$ = this.isLoading$('loadEmployees');
}
```

## Component with Store

```typescript
@Component({
    selector: 'app-employee-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.employees; track item.id) {
                    <div>{{ item.name }}</div>
                }
            }
        </app-loading-and-error-indicator>
    `,
    providers: [EmployeeStore]
})
export class EmployeeListComponent extends AppBaseVmStoreComponent<EmployeeState, EmployeeStore> {
    constructor(store: EmployeeStore) {
        super(store);
    }

    ngOnInit() {
        this.store.loadEmployees();
    }

    onRefresh() {
        this.reload(); // Reloads all stores
    }
}
```

## Form Pattern

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(
                this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueValidator(this.employeeApi))]
            )
        },
        dependentValidations: { email: ['firstName'] }
    });

    onSubmit() {
        if (this.validateForm()) {
            // Process this.currentVm()
        }
    }
}
```

## FormArray Pattern

```typescript
// FormArray pattern (from product-form.component.ts)
protected initialFormConfig = () => ({
  controls: {
    specifications: {
      modelItems: () => this.currentVm().specifications,
      itemControl: (spec, index) => new FormGroup({
        name: new FormControl(spec.name, [Validators.required]),
        value: new FormControl(spec.value, [Validators.required])
      })
    }
  },
  dependentValidations: { price: ['category'] }
});
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

## Authorization Patterns

```typescript
// Component properties
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }
  get canDelete() { return this.hasRole(PlatformRoles.Admin); }
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

## PlatformCore Library Reference

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/`

```typescript
// Foundation: Extend BaseComponent/BaseDirective (lifecycle, detectChanges(), untilDestroy())
export class MyComponent extends BaseComponent { }
export class MyDirective extends BaseDirective { }

// Components
<platform-select formControlName="ids" [fetchDataFn]="fetchFn" [multiple]="true" [searchable]="true" />
<platform-alert type="warning" [message]="errorMessage" />
<platform-table [data]="items" [columns]="columns" />

// Directives
<div appTextEllipsis [maxTextEllipsisLines]="2">Long text here...</div>
<button appPopover [popoverContent]="template">Hover me</button>
<input appAutofocus />

// Pipes
{{ date | localizedDate:'shortDate' }}
{{ 'item' | pluralize:count }}
{{ unsafeHtml | platformSafe:'html' }}

// Services
constructor(
  private translateSvc: PlatformTranslateService,
  private themeSvc: ThemeService,
  private scriptSvc: PlatformScriptService
) { }

// Utilities
PlatformArrayUtil.toDictionary(items, x => x.id);
PlatformDateUtil.format(new Date(), 'DD/MM/YYYY');
PlatformStringUtil.isNullOrEmpty(value);

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
import { PlatformCoreRootModule } from '@libs/platform-core';  // App root only
@NgModule({ imports: [PlatformCoreModule] })
```

## Key Helpers

```typescript
// Subscription management
this.data$.pipe(this.untilDestroyed()).subscribe();

// Loading/error state
this.apiCall$.pipe(this.observerLoadingErrorState('key')).subscribe();
this.isLoading$('key');
this.getErrorMsg$('key');
getAllErrorMsgs$(['req1', 'req2']);

// Track-by for performance
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);

// Named subscription management
this.storeSubscription('dataLoad', this.data$.subscribe(...));
this.cancelStoredSubscription('dataLoad');
```

## @Watch Decorator Pattern

```typescript
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
    @Watch('onPageResultChanged')
    public pagedResult?: PagedResult<Item>;

    @WatchWhenValuesDiff('performSearch') // Only triggers on actual value change
    public searchTerm: string = '';

    private onPageResultChanged(value: PagedResult<Item> | undefined, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) {
            this.updateUI();
        }
    }

    private performSearch(term: string) {
        this.apiService
            .search(term)
            .pipe(this.untilDestroyed())
            .subscribe(results => (this.results = results));
    }
}
```

## Custom RxJS Operators

```typescript
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

this.search$
    .pipe(
        skipDuplicates(500), // Skip duplicates within 500ms
        applyIf(this.isEnabled$, debounceTime(300)), // Conditional operator
        onCancel(() => this.cleanup()), // Handle cancellation
        tapOnce({ next: v => this.initOnce(v) }), // Execute only on first emission
        distinctUntilObjectValuesChanged(), // Deep object comparison
        this.untilDestroyed()
    )
    .subscribe();
```

## Advanced Form Validators

```typescript
import { ifAsyncValidator, startEndValidator, noWhitespaceValidator, validator } from '@libs/platform-core';

new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('start')?.value,
            ctrl => ctrl.value,
            { allowEqual: false }
        )
    ],
    [
        ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator) // Only run if sync valid
    ]
);
```

## Platform Directives

```typescript
// Horizontal scroll with drag
<div platformSwipeToScroll>/* content */</div>

// Disabled control
<input [platformDisabledControl]="isDisabled" />
```

## Utility Functions

```typescript
import {
    date_addDays,
    date_format,
    date_timeDiff,
    list_groupBy,
    list_distinctBy,
    list_sortBy,
    string_isEmpty,
    string_truncate,
    string_toCamelCase,
    dictionary_map,
    dictionary_filter,
    dictionary_values,
    immutableUpdate,
    deepClone,
    removeNullProps,
    guid_generate,
    task_delay,
    task_debounce
} from '@libs/platform-core';

// Date utilities
const nextWeek = date_addDays(new Date(), 7);
const formatted = date_format(date, 'YYYY-MM-DD');

// List utilities
const grouped = list_groupBy(items, x => x.category);
const unique = list_distinctBy(items, x => x.id);

// Object utilities
const updated = immutableUpdate(state, { loading: true });
const cloned = deepClone(complexObject);
```

## Working Examples Reference

**Location**: `src/PlatformExampleAppWeb/PlatformComponents/src/components/platform-examples/`

| Example          | File                                            | Use Case                                           |
| ---------------- | ----------------------------------------------- | -------------------------------------------------- |
| Loading/Error    | `loading-error-indicator-demo.component.ts`     | Auto state binding, custom templates               |
| Basic Form       | `user-form.component.ts`                        | Simple forms, basic validation                     |
| Advanced Form    | `product-form.component.ts`                     | FormArrays, async validation, dependent validation |
| Complex Form     | `user-profile-form.component.ts`                | Nested 3+ levels, async validators with debouncing |
| State Management | `user-list.component.ts` + `user-list.store.ts` | ComponentStore, CRUD, pagination, search           |
| API Service      | `platform-examples-api.service.ts`              | Caching, mock data, error simulation               |

## Dev Mode Validation

```typescript
export class MyComponent extends PlatformComponent {
    // Dev-mode validation for loading/error state elements
    protected get devModeCheckLoadingStateElement() {
        return '.spinner';
    }
    protected get devModeCheckErrorStateElement() {
        return '.error';
    }
}
```

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

| Layer            | Responsibility                                                                        |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Entity/Model** | Display helpers, static factory methods, default values, dropdown options, validation |
| **Service**      | API calls, command factories, data transformation                                     |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                          |

```typescript
// ❌ WRONG: Logic in component (leads to duplication)
readonly authTypes = [{ value: 1, label: 'OAuth2' }, { value: 3, label: 'API Key' }];
getStatusClass(config) { return config.isEnabled ? 'active' : 'disabled'; }

// ✅ CORRECT: Logic in entity/model
readonly authTypes = AuthConfigurationDisplay.getApiAuthTypeOptions();
getStatusClass(config) { return config.getStatusCssClass(); } // Delegates to entity
```

**Common Mistakes:**

- Dropdown options defined in component → should be static method in entity
- Display logic (CSS class, status text) in component → should be instance method in entity
- Command building in component → should be factory class in service

## Anti-Patterns

- **Never** use `HttpClient` directly (use `PlatformApiService`)
- **Never** manage state manually (use `PlatformVmStore`)
- **Never** assume base class methods (verify via IntelliSense)
- **Never** skip `untilDestroyed()` for subscriptions
- **Never** use direct component state for complex UI (use Store pattern)
- **Never** forget to provide Store in component's `providers` array
- **Never** put reusable logic in component (move to entity/model for reuse)
