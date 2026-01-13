---
description: "Angular 19 patterns with PlatformVmStore and BEM naming"
---

# EasyPlatform Frontend Development

Angular 19 development patterns for EasyPlatform framework.

## Component Hierarchy

```
PlatformComponent (Base)
├─ PlatformVmComponent (Simple state)
├─ PlatformFormComponent (Forms)
└─ PlatformVmStoreComponent (Complex state)

AppBaseComponent (App-specific base)
├─ AppBaseVmComponent
├─ AppBaseFormComponent
└─ AppBaseVmStoreComponent

Feature Components (Your components)
└─ Extend appropriate base class
```

## Critical Rules

1. **Component Base:** Always extend appropriate base class
2. **State Management:** Use `PlatformVmStore` for complex state
3. **API Services:** Extend `PlatformApiService`
4. **Subscriptions:** Always use `.pipe(this.untilDestroyed())`
5. **Forms:** Use `PlatformFormComponent` with `initialFormConfig`
6. **BEM Naming:** ALL UI elements must have BEM classes

## 1. Component Patterns

### PlatformComponent (Simple)

**Use for:** Simple components with minimal state

```typescript
@Component({
  selector: 'app-employee-list',
  template: `
    <app-loading [target]="this">
      @if (employees().length) {
        @for (emp of employees(); track emp.id) {
          <div class="employee-list__item">{{ emp.name }}</div>
        }
      }
    </app-loading>
  `
})
export class EmployeeListComponent extends PlatformComponent {
  employees = signal<Employee[]>([]);

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.apiService.getEmployees()
      .pipe(
        this.observerLoadingErrorState('load'),
        this.tapResponse(data => this.employees.set(data)),
        this.untilDestroyed()
      )
      .subscribe();
  }
}
```

### PlatformVmStoreComponent (Complex State)

**Use for:** Complex state, multiple data sources, reactive updates

```typescript
// Store
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
  // Effects
  load = this.effectSimple(() =>
    this.apiService.getEmployees().pipe(
      this.observerLoadingErrorState('load'),
      this.tapResponse(data => this.updateState({ employees: data }))
    )
  );

  filter = this.effect((searchText$: Observable<string>) =>
    searchText$.pipe(
      debounceTime(300),
      switchMap(text => this.apiService.search(text)),
      this.tapResponse(data => this.updateState({ filtered: data }))
    )
  );

  // Selectors
  readonly employees$ = this.select(s => s.employees);
  readonly filtered$ = this.select(s => s.filtered);
  readonly hasEmployees$ = this.select(s => s.employees.length > 0);
}

// Component
@Component({
  selector: 'app-employee-dashboard',
  providers: [EmployeeStore]
})
export class EmployeeDashboardComponent
  extends PlatformVmStoreComponent<EmployeeState, EmployeeStore> {

  constructor(public store: EmployeeStore) {
    super(store);
  }

  ngOnInit() {
    this.store.load();
  }

  onSearch(text: string) {
    this.store.filter(text);
  }

  refresh() {
    this.reload();  // Built-in reload from base class
  }
}
```

### PlatformFormComponent

**Use for:** Forms with validation

```typescript
@Component({
  selector: 'app-employee-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="employee-form">
      <div class="employee-form__field">
        <label class="employee-form__label">Name</label>
        <input formControlName="name" class="employee-form__input" />
        @if (form.get('name')?.errors?.['required']) {
          <span class="employee-form__error">Name required</span>
        }
      </div>

      <button type="submit" class="employee-form__btn --primary">
        {{ isCreateMode ? 'Create' : 'Update' }}
      </button>
    </form>
  `
})
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {

  protected initialFormConfig = () => ({
    controls: {
      name: new FormControl(this.currentVm().name, [Validators.required]),
      email: new FormControl(this.currentVm().email,
        [Validators.required, Validators.email],
        [ifAsyncValidator(() => !this.isViewMode, uniqueEmailValidator)]
      ),
      departmentId: new FormControl(this.currentVm().departmentId)
    },
    dependentValidations: {
      email: ['name']  // Re-validate email when name changes
    }
  });

  submit() {
    if (!this.validateForm()) return;

    const command = this.isCreateMode
      ? this.form.value as CreateEmployeeCommand
      : this.form.value as UpdateEmployeeCommand;

    this.apiService.save(command)
      .pipe(
        this.observerLoadingErrorState('save'),
        this.tapResponse(result => this.router.navigate(['/employees', result.id])),
        this.untilDestroyed()
      )
      .subscribe();
  }
}
```

## 2. API Service Pattern

**All API services extend `PlatformApiService`**

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
  protected get apiUrl() {
    return environment.apiUrl + '/api/Employee';
  }

  // GET requests
  getAll(query?: GetEmployeesQuery): Observable<EmployeeDto[]> {
    return this.get('', query);
  }

  getById(id: string): Observable<EmployeeDto> {
    return this.get(`/${id}`);
  }

  // POST requests
  save(command: SaveEmployeeCommand): Observable<SaveEmployeeResult> {
    return this.post('', command);
  }

  // With caching
  search(criteria: SearchCriteria): Observable<EmployeeDto[]> {
    return this.post('/search', criteria, { enableCache: true });
  }

  // DELETE requests
  delete(id: string): Observable<void> {
    return this.delete(`/${id}`);
  }
}
```

## 3. BEM Naming Convention (MANDATORY)

**Every UI element MUST have a BEM class - no exceptions.**

### BEM Structure

```
Block: .user-list
Element: .user-list__item
Modifier: .user-list__btn --primary --small
```

### Template Example

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
<div class="employee-list">
  <div class="employee-list__header">
    <h1 class="employee-list__title">Employees</h1>
    <button class="employee-list__btn --primary">Add New</button>
  </div>

  <div class="employee-list__content">
    @for (emp of employees(); track emp.id) {
      <div class="employee-list__item">
        <span class="employee-list__item-name">{{ emp.name }}</span>
        <span class="employee-list__item-email">{{ emp.email }}</span>
        <button class="employee-list__item-btn --small">Edit</button>
      </div>
    }
  </div>

  @if (isLoading$('load')) {
    <div class="employee-list__loading">Loading...</div>
  }
</div>

<!-- ❌ WRONG: Elements without BEM classes -->
<div class="employee-list">
  <div>  <!-- Missing class -->
    <h1>Employees</h1>  <!-- Missing class -->
    <button>Add New</button>  <!-- Missing class -->
  </div>
</div>
```

### SCSS Example

```scss
.employee-list {
  padding: 1rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  &__btn {
    padding: 0.5rem 1rem;
    border: none;
    cursor: pointer;

    &.--primary {
      background: $primary-color;
      color: white;
    }

    &.--small {
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;

    &-name {
      font-weight: 500;
    }

    &-email {
      color: #666;
    }
  }
}
```

**Why BEM is Mandatory:**
- Makes HTML self-documenting (like OOP class hierarchy)
- Prevents style conflicts
- Enables easy refactoring
- Clear component boundaries
- No need for complex CSS selectors

## 4. State Management

### Simple Signal State

```typescript
export class SimpleComponent extends PlatformComponent {
  data = signal<Data[]>([]);
  filter = signal<string>('');

  filteredData = computed(() => {
    const filterText = this.filter().toLowerCase();
    return this.data().filter(d => d.name.toLowerCase().includes(filterText));
  });

  updateFilter(text: string) {
    this.filter.set(text);
  }
}
```

### Store State (Complex)

```typescript
export interface EmployeeState {
  employees: Employee[];
  departments: Department[];
  selectedId?: string;
  filter: FilterCriteria;
}

@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'EmployeeStore';

  // State initialization
  protected vmConstructor = (data?: Partial<EmployeeState>) => ({
    employees: [],
    departments: [],
    filter: new FilterCriteria(),
    ...data
  });

  // Effects
  loadEmployees = this.effectSimple(() =>
    this.apiService.getEmployees().pipe(
      this.observerLoadingErrorState('load'),
      this.tapResponse(data => this.updateState({ employees: data }))
    )
  );

  selectEmployee = this.effect((id$: Observable<string>) =>
    id$.pipe(
      tap(id => this.updateState({ selectedId: id })),
      switchMap(id => this.apiService.getById(id)),
      this.tapResponse(data => {
        // Update selected employee in list
        const employees = this.state().employees.map(e =>
          e.id === data.id ? data : e
        );
        this.updateState({ employees });
      })
    )
  );

  // Selectors
  readonly employees$ = this.select(s => s.employees);
  readonly selected$ = this.select(s =>
    s.employees.find(e => e.id === s.selectedId)
  );
  readonly filteredEmployees$ = this.select(s =>
    s.employees.filter(e => matchesFilter(e, s.filter))
  );
}
```

## 5. RxJS Operators

### Common Patterns

```typescript
// Debounce user input
this.searchBox.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.apiService.search(term)),
  this.untilDestroyed()
).subscribe();

// Loading state
this.apiService.getData().pipe(
  this.observerLoadingErrorState('load'),
  this.tapResponse(data => this.data.set(data)),
  this.untilDestroyed()
).subscribe();

// Parallel requests
forkJoin({
  employees: this.employeeApi.getAll(),
  departments: this.departmentApi.getAll()
}).pipe(
  this.observerLoadingErrorState('init'),
  this.tapResponse(({ employees, departments }) => {
    this.employees.set(employees);
    this.departments.set(departments);
  }),
  this.untilDestroyed()
).subscribe();

// Skip duplicates
this.data$.pipe(
  skipDuplicates(500),  // Custom operator
  this.untilDestroyed()
).subscribe();
```

## 6. Form Validation

### Sync Validators

```typescript
protected initialFormConfig = () => ({
  controls: {
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      noWhitespaceValidator
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),
    age: new FormControl(null, [
      Validators.required,
      Validators.min(18),
      Validators.max(100)
    ])
  }
});
```

### Async Validators

```typescript
protected initialFormConfig = () => ({
  controls: {
    email: new FormControl('',
      [Validators.required, Validators.email],
      [ifAsyncValidator(
        () => !this.isViewMode,  // Condition
        uniqueEmailValidator    // Validator
      )]
    )
  }
});

// Custom async validator
const uniqueEmailValidator: AsyncValidatorFn = (control: AbstractControl) => {
  if (!control.value) return of(null);

  return apiService.checkEmail(control.value).pipe(
    map(exists => exists ? { emailTaken: true } : null),
    catchError(() => of(null))
  );
};
```

### Dependent Validation

```typescript
protected initialFormConfig = () => ({
  controls: {
    startDate: new FormControl(null, [Validators.required]),
    endDate: new FormControl(null, [
      Validators.required,
      startEndValidator('Date range invalid',
        c => c.parent?.get('startDate')?.value,
        c => c.value
      )
    ])
  },
  dependentValidations: {
    startDate: ['endDate']  // Re-validate endDate when startDate changes
  }
});
```

### FormArray

```typescript
protected initialFormConfig = () => ({
  controls: {
    items: {
      modelItems: () => this.currentVm().items,
      itemControl: (item, index) => new FormGroup({
        name: new FormControl(item.name, [Validators.required]),
        quantity: new FormControl(item.quantity, [Validators.min(1)])
      })
    }
  }
});
```

## 7. Platform Component APIs

### Loading State

```typescript
// Check loading state
if (this.isLoading$('request1')) {
  // Show spinner
}

// Multiple requests
const isLoading = this.isLoading$(['request1', 'request2']);

// Error messages
const errors = this.getAllErrorMsgs$(['request1', 'request2']);

// Loading count
const count = this.loadingRequestsCount();
```

### Lifecycle & Cleanup

```typescript
export class MyComponent extends PlatformComponent {
  ngOnInit() {
    // All subscriptions auto-cleanup with untilDestroyed()
    this.data$.pipe(
      this.untilDestroyed()
    ).subscribe();

    // Store subscription for manual control
    this.storeSubscription('key', this.obs$.subscribe());
  }

  cancelRequest() {
    this.cancelStoredSubscription('key');
  }
}
```

### Utility Methods

```typescript
// Track by for ngFor
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);

// Usage in template
@for (user of users(); track trackByItem($index, user)) {
  <div>{{ user.name }}</div>
}
```

## 8. Platform Directives

```html
<!-- Swipe to scroll -->
<div platformSwipeToScroll>
  <!-- Horizontal scrollable content -->
</div>

<!-- Disabled control -->
<input [platformDisabledControl]="isDisabled" />
```

## 9. Utilities

```typescript
// Date utilities
import { date_format, date_addDays, date_timeDiff } from '@libs/platform-core';

const formatted = date_format(new Date(), 'yyyy-MM-dd');
const future = date_addDays(new Date(), 7);
const diff = date_timeDiff(start, end, 'hours');

// List utilities
import { list_groupBy, list_distinctBy, list_sortBy } from '@libs/platform-core';

const grouped = list_groupBy(items, 'category');
const unique = list_distinctBy(items, 'id');
const sorted = list_sortBy(items, 'name');

// String utilities
import { string_isEmpty, string_truncate } from '@libs/platform-core';

if (string_isEmpty(value)) { }
const short = string_truncate(text, 50);

// Object utilities
import { immutableUpdate, deepClone, removeNullProps } from '@libs/platform-core';

const updated = immutableUpdate(obj, { prop: value });
const copy = deepClone(obj);
const clean = removeNullProps(obj);
```

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|-------|
| Direct `HttpClient` | Extend `PlatformApiService` |
| Manual signal state | Use `PlatformVmStore` |
| Missing `untilDestroyed()` | Always add `.pipe(this.untilDestroyed())` |
| Elements without BEM | All elements have BEM classes |
| No base class | Extend appropriate `Platform*Component` |
| Manual subscription cleanup | Use `untilDestroyed()` |

## Checklist

Before completing frontend task:

- [ ] Extends appropriate base class
- [ ] All subscriptions have `untilDestroyed()`
- [ ] All UI elements have BEM classes
- [ ] API service extends `PlatformApiService`
- [ ] Forms use `PlatformFormComponent`
- [ ] Complex state uses `PlatformVmStore`
- [ ] Loading states handled
- [ ] Error handling present
- [ ] Tests exist and pass

## Bottom Line

**Core patterns:**
1. Always extend platform base classes
2. BEM naming for ALL elements (mandatory)
3. `PlatformVmStore` for complex state
4. `untilDestroyed()` for all subscriptions
5. `PlatformApiService` for all API calls
6. Proper form validation

**Follow the hierarchy. Use the patterns. Write clean code.**
