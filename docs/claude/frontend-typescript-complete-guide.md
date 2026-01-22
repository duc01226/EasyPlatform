# Frontend TypeScript Complete Guide

> Angular 19 + Easy.Platform Framework | EasyPlatform Development Framework

## Quick Reference Summary

| Category          | Pattern                                         | Location                    |
| ----------------- | ----------------------------------------------- | --------------------------- |
| Simple Component  | `extends AppBaseComponent`                      | Feature folder              |
| Complex State     | `extends AppBaseVmStoreComponent<State, Store>` | Feature folder              |
| Forms             | `extends AppBaseFormComponent<FormVm>`          | Feature folder              |
| State Management  | `extends PlatformVmStore<Vm>`                   | `*.store.ts`                |
| API Service       | `extends PlatformApiService`                    | `*-api.service.ts`          |
| Subscriptions     | `.pipe(this.untilDestroyed())`                  | All observables             |
| Loading State     | `this.observerLoadingErrorState('key')`         | API calls                   |
| Template Elements | BEM classes (`block__element --modifier`)       | All HTML                    |
| SCSS Structure    | `:host { } .main-wrapper { }`                   | All SCSS                    |
| Reusable Logic    | Entity/Model layer                              | Place in LOWEST layer       |
| Form Validation   | `initialFormConfig()`                           | Built-in + async validators |
| Change Detection  | `@Watch` decorator                              | Property change callbacks   |

---

## Table of Contents

1. [Code Principles](#1-code-principles)
    - [SOLID Principles](#solid-principles)
    - [DRY - Don't Repeat Yourself](#dry---dont-repeat-yourself)
    - [KISS - Keep It Simple](#kiss---keep-it-simple)
    - [YAGNI - You Aren't Gonna Need It](#yagni---you-arent-gonna-need-it)
2. [Code Responsibility Hierarchy](#2-code-responsibility-hierarchy)
3. [Component Hierarchy & Selection](#3-component-hierarchy--selection)
4. [BEM HTML Template Standards](#4-bem-html-template-standards)
5. [Platform Component APIs](#5-platform-component-apis)
6. [Store Pattern](#6-store-pattern)
7. [Form Pattern](#7-form-pattern)
8. [API Service Pattern](#8-api-service-pattern)
9. [Watch Decorator & RxJS Operators](#9-watch-decorator--rxjs-operators)
10. [Platform-Core Library](#10-platform-core-library)
11. [Utility Functions](#11-utility-functions)
12. [Authorization Patterns](#12-authorization-patterns)
13. [File Organization & Naming](#13-file-organization--naming)
14. [Anti-Patterns](#14-anti-patterns)
15. [Component Templates](#15-component-templates)

---

## 1. Code Principles

### SOLID Principles

#### Single Responsibility Principle (SRP)

Each class/function should have ONE reason to change.

```typescript
// ❌ WRONG: Multiple responsibilities
export class UserComponent {
    validateEmail(email: string): boolean {
        /* validation logic */
    }
    formatUserName(user: User): string {
        /* formatting logic */
    }
    saveUser(user: User): Observable<User> {
        /* API call */
    }
    calculateAge(birthDate: Date): number {
        /* calculation */
    }
}

// ✅ CORRECT: Separated responsibilities
export class UserValidator {
    validateEmail(email: string): boolean {
        /* validation logic */
    }
}

export class UserFormatter {
    formatUserName(user: User): string {
        /* formatting logic */
    }
}

export class UserApiService extends PlatformApiService {
    saveUser(user: User): Observable<User> {
        /* API call */
    }
}

export class User {
    static calculateAge(birthDate: Date): number {
        /* calculation */
    }
}
```

#### Open/Closed Principle (OCP)

Open for extension, closed for modification.

```typescript
// ❌ WRONG: Modifying existing code for new types
export class NotificationService {
    send(type: string, message: string) {
        if (type === 'email') {
            /* email logic */
        } else if (type === 'sms') {
            /* sms logic */
        } else if (type === 'push') {
            /* push logic - added later */
        }
    }
}

// ✅ CORRECT: Extend through abstraction
interface NotificationSender {
    send(message: string): Observable<void>;
}

export class EmailSender implements NotificationSender {
    send(message: string): Observable<void> {
        /* email logic */
    }
}

export class SmsSender implements NotificationSender {
    send(message: string): Observable<void> {
        /* sms logic */
    }
}

// New sender added without modifying existing code
export class PushSender implements NotificationSender {
    send(message: string): Observable<void> {
        /* push logic */
    }
}
```

#### Liskov Substitution Principle (LSP)

Derived classes must be substitutable for their base classes.

```typescript
// ✅ CORRECT: Proper inheritance
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    // Properly extends base form behavior
    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required])
        }
    });

    // Can be used anywhere AppBaseFormComponent is expected
    onSubmit() {
        if (this.validateForm()) {
            this.save();
        }
    }
}
```

#### Interface Segregation Principle (ISP)

Clients should not depend on interfaces they don't use.

```typescript
// ❌ WRONG: Fat interface
interface UserOperations {
    getUser(id: string): Observable<User>;
    createUser(user: User): Observable<User>;
    updateUser(user: User): Observable<User>;
    deleteUser(id: string): Observable<void>;
    exportUsers(): Observable<Blob>;
    importUsers(file: File): Observable<void>;
}

// ✅ CORRECT: Segregated interfaces
interface UserReader {
    getUser(id: string): Observable<User>;
}

interface UserWriter {
    createUser(user: User): Observable<User>;
    updateUser(user: User): Observable<User>;
    deleteUser(id: string): Observable<void>;
}

interface UserImportExport {
    exportUsers(): Observable<Blob>;
    importUsers(file: File): Observable<void>;
}
```

#### Dependency Inversion Principle (DIP)

Depend on abstractions, not concretions.

```typescript
// ❌ WRONG: Direct dependency on concrete class
export class UserComponent {
    constructor(private userService: UserService) {}
}

// ✅ CORRECT: Depend on abstraction (Angular DI handles this)
export class UserComponent extends AppBaseVmStoreComponent<UserVm, UserStore> {
    constructor(store: UserStore) {
        super(store);
    }
}

// Store depends on abstract API service
@Injectable()
export class UserStore extends PlatformVmStore<UserVm> {
    constructor(private api: UserApiService) {
        super();
    }
}
```

### DRY - Don't Repeat Yourself

Extract common logic to appropriate layer.

```typescript
// ❌ WRONG: Duplicated logic across components
// Component A
readonly statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

// Component B
readonly statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

// ✅ CORRECT: Centralized in model
export class EmployeeStatus {
  static readonly dropdownOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  static getLabel(value: string): string {
    return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
  }
}

// Components use the model
readonly statusOptions = EmployeeStatus.dropdownOptions;
```

### KISS - Keep It Simple

Avoid over-engineering and unnecessary complexity.

```typescript
// ❌ WRONG: Over-engineered
export class DataTransformationPipelineFactory {
    createPipeline<T, R>(transformers: Array<Transformer<any, any>>, validators: Array<Validator<any>>, decorators: Array<Decorator<any>>): Pipeline<T, R> {
        // Complex pipeline creation...
    }
}

// ✅ CORRECT: Simple and direct
export class UserMapper {
    static toDisplayName(user: User): string {
        return `${user.firstName} ${user.lastName}`.trim();
    }

    static toDto(user: User): UserDto {
        return { id: user.id, name: this.toDisplayName(user) };
    }
}
```

### YAGNI - You Aren't Gonna Need It

Don't add functionality until needed.

```typescript
// ❌ WRONG: Premature abstraction for hypothetical future
export class AbstractBaseEntityFactory<T extends Entity> {
    // Never used factory pattern...
}

export class UserFactoryRegistry {
    // Never needed registry...
}

// ✅ CORRECT: Just what's needed now
export class User {
    static create(data: Partial<User>): User {
        return new User(data);
    }
}
```

---

## 2. Code Responsibility Hierarchy

**CRITICAL: Place logic in the LOWEST appropriate layer to enable reuse.**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Contains                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options |
| **Service**      | API calls, command factories, data transformation                                         |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                              |

### Examples

```typescript
// ❌ WRONG: Logic in component that should be in model
@Component({...})
export class JobProviderComponent {
  // This belongs in the model!
  readonly providerTypes = [
    { value: 1, label: 'ITViec' },
    { value: 2, label: 'VietnamWorks' },
    { value: 3, label: 'LinkedIn' }
  ];

  getProviderLabel(value: number): string {
    return this.providerTypes.find(x => x.value === value)?.label ?? '';
  }
}

// ✅ CORRECT: Logic in model, component just uses it
export class JobProvider {
  static readonly dropdownOptions = [
    { value: 1, label: 'ITViec' },
    { value: 2, label: 'VietnamWorks' },
    { value: 3, label: 'LinkedIn' }
  ];

  static getDisplayLabel(value: number): string {
    return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
  }

  static isExternalProvider(value: number): boolean {
    return [1, 2].includes(value);
  }
}

// Component just uses the model
@Component({...})
export class JobProviderComponent {
  readonly providerTypes = JobProvider.dropdownOptions;

  onProviderSelected(value: number) {
    if (JobProvider.isExternalProvider(value)) {
      this.showExternalConfig();
    }
  }
}
```

### 90% Logic Rule

If logic belongs 90% to class A, put it in class A.

```typescript
// ❌ WRONG: Employee formatting in component
formatEmployeeDisplay(emp: Employee): string {
  return `${emp.firstName} ${emp.lastName} (${emp.department})`;
}

// ✅ CORRECT: In Employee model
export class Employee {
  get displayName(): string {
    return `${this.firstName} ${this.lastName} (${this.department})`;
  }
}
```

---

## 3. Component Hierarchy & Selection

### Hierarchy

```
PlatformComponent
├── PlatformVmComponent → PlatformFormComponent
└── PlatformVmStoreComponent

AppBaseComponent (adds auth context)
├── AppBaseVmComponent → AppBaseFormComponent
└── AppBaseVmStoreComponent
```

### Selection Guide

| Scenario                 | Base Class                | Example             |
| ------------------------ | ------------------------- | ------------------- |
| Simple display, no state | `AppBaseComponent`        | Static info display |
| Complex state management | `AppBaseVmStoreComponent` | Lists, dashboards   |
| Forms with validation    | `AppBaseFormComponent`    | Create/Edit forms   |
| Dialog with form         | `AppBaseFormComponent`    | Modal dialogs       |

### Decision Tree

```
Does it have a form?
├── Yes → AppBaseFormComponent
└── No → Does it have complex state?
    ├── Yes → AppBaseVmStoreComponent
    └── No → AppBaseComponent
```

---

## 4. BEM HTML Template Standards

**MANDATORY: ALL UI elements in component templates MUST have BEM classes.**

This makes HTML self-documenting like OOP class hierarchy.

### BEM Structure

- **Block**: Independent component (`user-list`)
- **Element**: Part of block (`user-list__header`)
- **Modifier**: Variation (separate `--` class: `user-list__btn --primary`)

### Correct vs Incorrect

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
        <button class="user-list__btn --primary">Add</button>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
        <div class="user-list__item">
            <span class="user-list__item-name">{{ user.name }}</span>
            <span class="user-list__item-email">{{ user.email }}</span>
        </div>
        }
    </div>
    <div class="user-list__footer">
        <button class="user-list__btn --secondary" (click)="loadMore()">Load More</button>
    </div>
</div>

<!-- ❌ WRONG: Elements without BEM classes -->
<div class="user-list">
    <div>
        <h1>Users</h1>
        <button>Add</button>
    </div>
    <div>
        @for (user of vm.users; track user.id) {
        <div>
            <span>{{ user.name }}</span>
            <span>{{ user.email }}</span>
        </div>
        }
    </div>
</div>
```

### BEM SCSS Pattern

```scss
.user-card {
    display: flex;
    flex-direction: column;

    &__header {
        padding: 1rem;
    }

    &__title {
        font-size: 1.5rem;
    }

    &__btn {
        padding: 0.5rem 1rem;

        &.--primary {
            background: var(--primary-color);
            color: white;
        }

        &.--secondary {
            background: transparent;
            border: 1px solid var(--primary-color);
        }

        &.--large {
            padding: 1rem 2rem;
        }
    }

    &__item {
        border-bottom: 1px solid var(--border-color);

        &.--selected {
            background: var(--selected-bg);
        }
    }
}
```

### Multiple Modifiers

```html
<!-- Modifiers are separate classes with -- prefix -->
<button class="user-list__btn --primary --large --disabled">Submit</button>
```

---

## 5. Platform Component APIs

### PlatformComponent (Base)

```typescript
export abstract class PlatformComponent {
    // State management
    status$: WritableSignal<ComponentStateStatus>;

    // Loading/error handling
    observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
    isLoading$(requestKey?: string): Signal<boolean | null>;
    getAllErrorMsgs$(requestKeys: string[]): Signal<string[]>;
    loadingRequestsCount(): Signal<number>;
    reloadingRequestsCount(): Signal<number>;

    // Subscription management (CRITICAL!)
    untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
    storeSubscription(key: string, subscription: Subscription): void;
    cancelStoredSubscription(key: string): void;

    // Response handling
    tapResponse<T>(nextFn?, errorFn?): OperatorFunction<T, T>;

    // Track by functions
    trackByItem = this.ngForTrackByItemProp<User>('id');
    trackByList = this.ngForTrackByImmutableList(this.users);
}
```

### PlatformVmComponent

```typescript
export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
    vm: WritableSignal<TViewModel | undefined>;

    // Get current view model (throws if undefined)
    currentVm(): TViewModel;

    // Partial update
    updateVm(partial: Partial<TViewModel>): TViewModel;

    // Must implement: Initialize or reload view model
    protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}
```

### PlatformVmStoreComponent

```typescript
export abstract class PlatformVmStoreComponent<TViewModel, TStore extends PlatformVmStore<TViewModel>> extends PlatformComponent {
    constructor(public store: TStore) {}

    // View model from store
    vm: Signal<TViewModel | undefined>;

    // Reload store data
    reload(): void;
}
```

### PlatformFormComponent

```typescript
export abstract class PlatformFormComponent<TViewModel> extends PlatformVmComponent<TViewModel> {
    form: FormGroup<PlatformFormGroupControls<TViewModel>>;
    mode: PlatformFormMode;

    // Mode checks
    isViewMode(): boolean;
    isCreateMode(): boolean;
    isUpdateMode(): boolean;

    // Validation
    validateForm(): boolean;

    // Must implement: Form configuration
    protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}
```

### Usage Examples

```typescript
// Simple component with loading state
export class UserListComponent extends AppBaseComponent {
  users: User[] = [];

  loadUsers() {
    this.userService.getUsers()
      .pipe(
        this.observerLoadingErrorState('loadUsers'),
        this.tapResponse(users => this.users = users),
        this.untilDestroyed()  // ALWAYS include!
      )
      .subscribe();
  }
}

// Component with store
export class EmployeeListComponent extends AppBaseVmStoreComponent<EmployeeListVm, EmployeeListStore> {
  constructor(store: EmployeeListStore) {
    super(store);
  }

  ngOnInit() {
    this.store.loadEmployees();
  }

  onRefresh() {
    this.reload();
  }
}

// Template usage
@Component({
  template: `
    <app-loading [target]="this" requestKey="loadUsers">
      @if (vm(); as vm) {
        @for (user of vm.users; track user.id) {
          <div class="user-list__item">{{ user.name }}</div>
        }
      }
    </app-loading>
  `
})
```

---

## 6. Store Pattern

### PlatformVmStore

```typescript
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    // Caching configuration
    protected get enableCaching() {
        return true;
    }
    protected cachedStateKeyName = () => 'EmployeeStore';
    protected vmConstructor = (data?: Partial<EmployeeState>) => new EmployeeState(data);

    // Initialize before VM
    protected beforeInitVm = () => this.loadInitialData();

    // Effects (side effects that update state)
    loadEmployees = this.effectSimple(
        () =>
            this.api.getEmployees().pipe(
                this.observerLoadingErrorState('load'),
                this.tapResponse(employees => this.updateState({ employees }))
            ),
        'loadEmployees' // Effect key for deduplication
    );

    deleteEmployee = this.effect<string>(id$ =>
        id$.pipe(
            switchMap(id =>
                this.api.deleteEmployee(id).pipe(
                    this.tapResponse(() => {
                        this.updateState({
                            employees: this.state().employees.filter(e => e.id !== id)
                        });
                    })
                )
            )
        )
    );

    // Selectors (derived state)
    readonly employees$ = this.select(state => state.employees);
    readonly activeEmployees$ = this.select(state => state.employees.filter(e => e.isActive));
    readonly employeeCount$ = this.select(state => state.employees.length);

    // Combined selectors
    readonly summary$ = this.select(this.employees$, this.activeEmployees$, (all, active) => ({ total: all.length, active: active.length }));

    // Loading states
    readonly loading$ = this.isLoading$('load');
    readonly deleting$ = this.isLoading$('delete');
}
```

### State Class Pattern

```typescript
export class EmployeeState {
    employees: Employee[] = [];
    selectedId: string | null = null;
    filters: EmployeeFilters = new EmployeeFilters();

    constructor(data?: Partial<EmployeeState>) {
        if (data) Object.assign(this, data);
    }

    get selectedEmployee(): Employee | undefined {
        return this.employees.find(e => e.id === this.selectedId);
    }
}

export class EmployeeFilters {
    status: string[] = [];
    department: string | null = null;
    searchText: string = '';
}
```

### Store with Complex Operations

```typescript
@Injectable()
export class OrderStore extends PlatformVmStore<OrderState> {
    // Paged loading
    loadOrders = this.effect<PagedQuery>(query$ =>
        query$.pipe(
            switchMap(query =>
                this.api.getOrders(query).pipe(
                    this.observerLoadingErrorState('load'),
                    this.tapResponse(result =>
                        this.updateState({
                            orders: query.page === 1 ? result.items : [...this.state().orders, ...result.items],
                            totalCount: result.totalCount,
                            currentPage: query.page
                        })
                    )
                )
            )
        )
    );

    // Optimistic update
    toggleFavorite = this.effect<string>(id$ =>
        id$.pipe(
            tap(id => {
                // Optimistic update
                const orders = this.state().orders.map(o => (o.id === id ? { ...o, isFavorite: !o.isFavorite } : o));
                this.updateState({ orders });
            }),
            switchMap(id =>
                this.api.toggleFavorite(id).pipe(
                    catchError(err => {
                        // Revert on error
                        this.reload();
                        return throwError(() => err);
                    })
                )
            )
        )
    );
}
```

---

## 7. Form Pattern

### Basic Form Component

```typescript
@Component({
    selector: 'app-employee-form',
    template: `
        <form [formGroup]="form" class="employee-form">
            <div class="employee-form__field">
                <label class="employee-form__label">Name</label>
                <input formControlName="name" class="employee-form__input" />
                @if (form.controls.name.errors?.['required']) {
                    <span class="employee-form__error">Name is required</span>
                }
            </div>

            <div class="employee-form__field">
                <label class="employee-form__label">Email</label>
                <input formControlName="email" class="employee-form__input" />
            </div>

            <div class="employee-form__actions">
                <button class="employee-form__btn --primary" (click)="onSubmit()">Save</button>
                <button class="employee-form__btn --secondary" (click)="onCancel()">Cancel</button>
            </div>
        </form>
    `
})
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required, Validators.minLength(2)]),
            email: new FormControl(
                this.currentVm().email,
                [Validators.required, Validators.email],
                [
                    // Async validator
                    ifAsyncValidator(() => !this.isViewMode(), checkEmailUniqueValidator(this.employeeApi, this.currentVm().id))
                ]
            )
        },
        // Revalidate email when name changes
        dependentValidations: {
            email: ['name']
        }
    });

    onSubmit() {
        if (this.validateForm()) {
            const data = this.form.getRawValue();
            this.employeeApi
                .save(data)
                .pipe(this.untilDestroyed())
                .subscribe(() => this.close());
        }
    }
}
```

### Form with FormArray

```typescript
@Component({...})
export class OrderFormComponent extends AppBaseFormComponent<OrderFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      orderNumber: new FormControl(this.currentVm().orderNumber, [Validators.required]),
      items: {
        modelItems: () => this.currentVm().items,
        itemControl: (item: OrderItem, index: number) => new FormGroup({
          productId: new FormControl(item.productId, [Validators.required]),
          quantity: new FormControl(item.quantity, [
            Validators.required,
            Validators.min(1)
          ]),
          price: new FormControl(item.price, [Validators.required])
        })
      }
    }
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem() {
    const newItem = new OrderItem();
    this.itemsArray.push(this.createItemControl(newItem, this.itemsArray.length));
  }

  removeItem(index: number) {
    this.itemsArray.removeAt(index);
  }
}
```

### Custom Validators

```typescript
// Sync validator
export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value && control.value.trim().length === 0) {
        return { whitespace: true };
    }
    return null;
}

// Range validator
export function startEndValidator(errorKey: string, startValueFn: (ctrl: AbstractControl) => any, endValueFn: (ctrl: AbstractControl) => any): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const start = startValueFn(control);
        const end = endValueFn(control);
        if (start && end && start > end) {
            return { [errorKey]: true };
        }
        return null;
    };
}

// Conditional async validator
export function ifAsyncValidator(condition: (control: AbstractControl) => boolean, validator: AsyncValidatorFn): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!condition(control)) {
            return of(null);
        }
        return validator(control);
    };
}

// Email unique validator
export function checkEmailUniqueValidator(api: EmployeeApiService, excludeId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value) return of(null);

        return api.checkEmailUnique(control.value, excludeId).pipe(
            map(isUnique => (isUnique ? null : { emailTaken: true })),
            catchError(() => of(null))
        );
    };
}

// Usage
new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('startDate')?.value,
            ctrl => ctrl.value
        )
    ],
    [ifAsyncValidator(ctrl => ctrl.valid, checkEmailUniqueValidator(this.api, this.currentVm().id))]
);
```

---

## 8. API Service Pattern

### Service Structure

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

    // GET requests
    getEmployees(query?: EmployeeQuery): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }

    getEmployeeById(id: string): Observable<Employee> {
        return this.get<Employee>(`/${id}`);
    }

    // POST requests
    saveEmployee(command: SaveEmployeeCommand): Observable<SaveEmployeeResult> {
        return this.post<SaveEmployeeResult>('', command);
    }

    // Search with caching
    searchEmployees(criteria: SearchCriteria): Observable<Employee[]> {
        return this.post<Employee[]>('/search', criteria, { enableCache: true });
    }

    // DELETE requests
    deleteEmployee(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    // File upload
    uploadAvatar(id: string, file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);
        return this.post<string>(`/${id}/avatar`, formData);
    }

    // Async validation
    checkEmailUnique(email: string, excludeId?: string): Observable<boolean> {
        return this.get<boolean>('/check-email', { email, excludeId });
    }
}
```

### Fetch Data Functions for Select Components

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
  // For platform-select component
  fetchEmployeesForSelect = (searchText?: string): Observable<SelectOption[]> => {
    return this.get<Employee[]>('/dropdown', { searchText }).pipe(
      map(employees => employees.map(e => ({
        value: e.id,
        label: e.displayName,
        data: e
      })))
    );
  };

  fetchDepartmentsForSelect = (): Observable<SelectOption[]> => {
    return this.get<Department[]>('/departments').pipe(
      map(depts => depts.map(d => ({
        value: d.id,
        label: d.name
      })))
    );
  };
}

// Usage in template
<platform-select
  formControlName="employeeId"
  [fetchDataFn]="employeeApi.fetchEmployeesForSelect"
  [searchable]="true"
/>
```

---

## 9. Watch Decorator & RxJS Operators

### @Watch Decorator

React to property changes without manual change detection.

```typescript
export class EmployeeListComponent extends AppBaseComponent {
    // Triggers onPagedResultChanged when value changes
    @Watch('onPagedResultChanged')
    pagedResult?: PagedResult<Employee>;

    // Only triggers when values are different (deep comparison)
    @WatchWhenValuesDiff('onFiltersChanged')
    filters: EmployeeFilters = new EmployeeFilters();

    private onPagedResultChanged(value: PagedResult<Employee>, change: SimpleChange<PagedResult<Employee>>) {
        if (!change.isFirstTimeSet) {
            this.updatePagination();
        }
    }

    private onFiltersChanged(value: EmployeeFilters) {
        this.loadEmployees();
    }
}
```

### Custom RxJS Operators

```typescript
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

// Skip duplicate emissions within time window
this.search$
    .pipe(
        skipDuplicates(500), // 500ms window
        this.untilDestroyed()
    )
    .subscribe();

// Conditionally apply operator
this.data$.pipe(applyIf(this.isEnabled$, debounceTime(300)), this.untilDestroyed()).subscribe();

// Cleanup on cancellation
this.longRunningTask$
    .pipe(
        onCancel(() => this.cleanup()),
        this.untilDestroyed()
    )
    .subscribe();

// Execute only on first emission
this.init$.pipe(tapOnce({ next: value => this.initialize(value) }), this.untilDestroyed()).subscribe();

// Deep object comparison
this.filters$.pipe(distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// Combined usage
this.searchInput$
    .pipe(
        skipDuplicates(300),
        applyIf(
            this.autoSearch$,
            switchMap(term => this.search(term))
        ),
        tapOnce({ next: () => this.trackFirstSearch() }),
        onCancel(() => this.cancelPendingSearch()),
        distinctUntilObjectValuesChanged(),
        this.untilDestroyed()
    )
    .subscribe();
```

---

## 10. Platform-Core Library

### Base Classes

```typescript
// For components
export class MyComponent extends PlatformComponent {
    // Inherits common functionality
}

// For directives
export class MyDirective extends BaseDirective {
    // Inherits common functionality
}
```

### UI Components

```typescript
// Select component
<platform-select
  formControlName="departmentIds"
  [fetchDataFn]="fetchDepartments"
  [multiple]="true"
  [searchable]="true"
  [clearable]="true"
  placeholder="Select departments"
/>

// Text ellipsis directive
<div appTextEllipsis [maxTextEllipsisLines]="2">
  Long text that will be truncated with ellipsis after 2 lines...
</div>

// Loading component
<app-loading [target]="this" requestKey="loadData">
  <div class="content">Content shown when loaded</div>
</app-loading>
```

### Pipes

```typescript
// Date formatting
{{ date | localizedDate:'shortDate' }}
{{ date | localizedDate:'longDateTime' }}

// Pluralization
{{ 'item' | pluralize:count }}  // "1 item" or "5 items"
{{ 'child' | pluralize:count:'children' }}  // Custom plural

// Currency
{{ amount | currency:'VND' }}
```

### Utility Classes

```typescript
import { list_groupBy, date_format, string_isEmpty } from '@libs/platform-core';

// List utilities
const grouped = list_groupBy(items, x => x.category);
const unique = list_distinctBy(items, x => x.email);

// Date utilities
const formatted = date_format(new Date(), 'DD/MM/YYYY');

// String utilities
const isEmpty = string_isEmpty(value);
```

---

## 11. Utility Functions

### Platform Core Utilities

```typescript
import {
    // Date utilities
    date_addDays,
    date_addMonths,
    date_format,
    date_parse,
    date_timeDiff,
    date_startOfDay,
    date_endOfDay,

    // List utilities
    list_groupBy,
    list_distinctBy,
    list_sortBy,
    list_chunk,
    list_flatten,

    // String utilities
    string_isEmpty,
    string_isNotEmpty,
    string_truncate,
    string_toTitleCase,

    // Dictionary utilities
    dictionary_map,
    dictionary_filter,
    dictionary_keys,
    dictionary_values,

    // Object utilities
    immutableUpdate,
    deepClone,
    removeNullProps,

    // Other utilities
    guid_generate,
    task_delay,
    task_debounce
} from '@libs/platform-core';

// Date examples
const tomorrow = date_addDays(new Date(), 1);
const formatted = date_format(date, 'YYYY-MM-DD');
const diff = date_timeDiff(startDate, endDate, 'days');

// List examples
const grouped = list_groupBy(employees, e => e.department);
const unique = list_distinctBy(items, i => i.id);
const sorted = list_sortBy(users, u => u.name);
const chunks = list_chunk(items, 10);

// String examples
if (string_isEmpty(value)) {
    /* handle empty */
}
const short = string_truncate(longText, 50, '...');

// Object examples
const updated = immutableUpdate(state, { loading: true });
const copy = deepClone(complexObject);
const clean = removeNullProps(formData);

// Async examples
await task_delay(1000);
const debouncedSearch = task_debounce(this.search, 300);
```

### List Extensions

```typescript
// Check empty
if (items.isNullOrEmpty()) { /* handle empty */ }
if (items.isNotNullOrEmpty()) { /* process items */ }

// Remove with output
items.removeWhere(x => x.isDeleted, out removedItems);

// Upsert by key
items.upsertBy(x => x.id, newItems, (existing, newItem) => ({
  ...existing,
  ...newItem,
  updatedAt: new Date()
}));

// Replace by key
items.replaceBy(x => x.id, newItems, (existing, newItem) => ({
  ...existing,
  name: newItem.name
}));

// Select to list
const ids = items.selectList(x => x.id);  // Same as items.map(x => x.id)

// Add if not exists
items.addDistinct(newItem, x => x.id);

// Async operations
await items.forEachAsync(item => processItem(item), { maxConcurrent: 5 });
```

---

## 12. Authorization Patterns

### Component-Level Authorization

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    // Check roles
    get canEdit(): boolean {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager);
    }

    get canDelete(): boolean {
        return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany();
    }

    // Check company context
    isOwnCompany(): boolean {
        return this.currentVm().companyId === this.authContext.currentCompanyId;
    }
}
```

### Template Authorization

```html
<div class="employee-actions">
    @if (hasRole(PlatformRoles.Admin)) {
    <button class="employee-actions__btn --danger" (click)="delete()">Delete</button>
    } @if (hasRole(PlatformRoles.Admin, PlatformRoles.Manager)) {
    <button class="employee-actions__btn --primary" (click)="edit()">Edit</button>
    } @if (canApprove) {
    <button class="employee-actions__btn --success" (click)="approve()">Approve</button>
    }
</div>
```

### Route Guards

```typescript
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(): Observable<boolean> {
        return this.authService.hasRole$(PlatformRoles.Admin).pipe(
            tap(hasRole => {
                if (!hasRole) {
                    this.router.navigate(['/unauthorized']);
                }
            })
        );
    }
}

// Route configuration
const routes: Routes = [
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AdminGuard]
    }
];
```

---

## 13. File Organization & Naming

### File Naming Conventions

| Type       | Convention                | Example                       |
| ---------- | ------------------------- | ----------------------------- |
| Components | `kebab-case.component.ts` | `employee-list.component.ts`  |
| Services   | `kebab-case.service.ts`   | `employee-api.service.ts`     |
| Stores     | `kebab-case.store.ts`     | `employee-list.store.ts`      |
| Models     | `kebab-case.model.ts`     | `employee.model.ts`           |
| Interfaces | `kebab-case.interface.ts` | `employee-query.interface.ts` |
| Pipes      | `kebab-case.pipe.ts`      | `localized-date.pipe.ts`      |
| Directives | `kebab-case.directive.ts` | `text-ellipsis.directive.ts`  |
| Guards     | `kebab-case.guard.ts`     | `admin.guard.ts`              |

### Folder Structure

```
feature/
├── components/
│   ├── employee-list/
│   │   ├── employee-list.component.ts
│   │   ├── employee-list.component.html
│   │   ├── employee-list.component.scss
│   │   └── employee-list.store.ts
│   └── employee-form/
│       ├── employee-form.component.ts
│       └── employee-form.component.scss
├── models/
│   ├── employee.model.ts
│   └── employee-query.model.ts
├── services/
│   └── employee-api.service.ts
└── index.ts
```

### File Size Guidelines

- **Target**: Under 200 lines per file
- **Maximum**: 500 lines (consider refactoring)
- **Split when**: Logic can be clearly separated into cohesive units

```typescript
// ❌ WRONG: Monolithic file
// employee.component.ts - 800 lines with list, form, dialog logic

// ✅ CORRECT: Separated concerns
// employee-list.component.ts - List display and pagination
// employee-form.component.ts - Create/edit form
// employee-dialog.component.ts - Confirmation dialogs
// employee.store.ts - State management
// employee-api.service.ts - API calls
```

---

## 14. Anti-Patterns

### Direct HttpClient Usage

```typescript
// ❌ WRONG: Direct HttpClient
export class EmployeeService {
    constructor(private http: HttpClient) {}

    getEmployees(): Observable<Employee[]> {
        return this.http.get<Employee[]>('/api/employees');
    }
}

// ✅ CORRECT: Extend PlatformApiService
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

    getEmployees(): Observable<Employee[]> {
        return this.get<Employee[]>('');
    }
}
```

### Missing untilDestroyed()

```typescript
// ❌ WRONG: Memory leak - subscription never cleaned up
this.dataService.getData()
  .subscribe(data => this.data = data);

// ❌ WRONG: Manual unsubscribe (error-prone)
private subscription: Subscription;
ngOnDestroy() {
  this.subscription.unsubscribe();
}

// ✅ CORRECT: Auto-cleanup with untilDestroyed()
this.dataService.getData()
  .pipe(this.untilDestroyed())
  .subscribe(data => this.data = data);
```

### Manual State Management

```typescript
// ❌ WRONG: Manual signals without store pattern
export class EmployeeComponent {
    employees = signal<Employee[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    loadEmployees() {
        this.loading.set(true);
        this.employeeService.getEmployees().subscribe({
            next: data => {
                this.employees.set(data);
                this.loading.set(false);
            },
            error: err => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }
}

// ✅ CORRECT: Use PlatformVmStore
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    loadEmployees = this.effectSimple(() =>
        this.api.getEmployees().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(employees => this.updateState({ employees }))
        )
    );
}
```

### Logic in Components

```typescript
// ❌ WRONG: Business logic in component
export class EmployeeComponent {
    calculateBonus(employee: Employee): number {
        const yearsOfService = this.getYearsOfService(employee.hireDate);
        const performanceMultiplier = this.getPerformanceMultiplier(employee.rating);
        return employee.baseSalary * 0.1 * yearsOfService * performanceMultiplier;
    }
}

// ✅ CORRECT: Logic in model
export class Employee {
    static calculateBonus(employee: Employee): number {
        const yearsOfService = Employee.getYearsOfService(employee.hireDate);
        const performanceMultiplier = Employee.getPerformanceMultiplier(employee.rating);
        return employee.baseSalary * 0.1 * yearsOfService * performanceMultiplier;
    }

    private static getYearsOfService(hireDate: Date): number {
        return date_timeDiff(hireDate, new Date(), 'years');
    }

    private static getPerformanceMultiplier(rating: number): number {
        return rating >= 4 ? 1.5 : rating >= 3 ? 1.0 : 0.5;
    }
}
```

### HTML Without BEM Classes

```html
<!-- ❌ WRONG: No BEM classes -->
<div>
    <div>
        <h1>Title</h1>
    </div>
    <div>
        <span>Content</span>
    </div>
</div>

<!-- ✅ CORRECT: Full BEM classes -->
<div class="employee-card">
    <div class="employee-card__header">
        <h1 class="employee-card__title">Title</h1>
    </div>
    <div class="employee-card__content">
        <span class="employee-card__text">Content</span>
    </div>
</div>
```

### Assuming Base Class Methods

```typescript
// ❌ WRONG: Assuming method exists without checking
export class MyComponent extends SomeBaseClass {
    ngOnInit() {
        this.someMethod(); // Does SomeBaseClass have this?
    }
}

// ✅ CORRECT: Verify in base class documentation/source
export class MyComponent extends AppBaseVmStoreComponent<MyState, MyStore> {
    ngOnInit() {
        // Verified: reload() exists in PlatformVmStoreComponent
        this.reload();
        // Verified: hasRole() exists in AppBaseComponent
        if (this.hasRole(PlatformRoles.Admin)) {
        }
    }
}
```

### Skipping Form Validation

```typescript
// ❌ WRONG: Submit without validation
onSubmit() {
  this.api.save(this.form.value).subscribe();
}

// ✅ CORRECT: Always validate first
onSubmit() {
  if (this.validateForm()) {
    this.api.save(this.form.getRawValue())
      .pipe(this.untilDestroyed())
      .subscribe();
  }
}
```

### Extending Platform* Classes Directly

```typescript
// ❌ WRONG: Extending Platform* directly bypasses app-level customization
export class MyComponent extends PlatformComponent {}
export class MyList extends PlatformVmStoreComponent<Vm, Store> {}
export class MyForm extends PlatformFormComponent<FormVm> {}

// ✅ CORRECT: Extend AppBase* classes for app-specific behavior
export class MyComponent extends AppBaseComponent {}
export class MyList extends AppBaseVmStoreComponent<Vm, Store> {}
export class MyForm extends AppBaseFormComponent<FormVm> {}
```

**Why AppBase* classes exist:**

1. **Centralized Customization** - Toast styling, analytics, error handling
2. **Future-Proofing** - Add app-wide behavior without changing feature components
3. **Consistency** - Enforce patterns across all components
4. **Testing** - Mock app-wide concerns in one place

**Location:** `src/Frontend/apps/{app}/src/app/shared/base/`

**Rule:** Feature components MUST extend AppBase* classes, NOT Platform* directly.

---

## 15. Component Templates

### List Component Template

```typescript
@Component({
    selector: 'app-employee-list',
    template: `
        <div class="employee-list">
            <div class="employee-list__header">
                <h1 class="employee-list__title">Employees</h1>
                <div class="employee-list__actions">
                    <input class="employee-list__search" placeholder="Search..." (input)="onSearch($event)" />
                    @if (hasRole(PlatformRoles.Admin)) {
                        <button class="employee-list__btn --primary" (click)="onCreate()">Add Employee</button>
                    }
                </div>
            </div>

            <app-loading [target]="this" requestKey="load">
                @if (vm(); as vm) {
                    <div class="employee-list__content">
                        @for (employee of vm.employees; track employee.id) {
                            <div class="employee-list__item" (click)="onSelect(employee)">
                                <div class="employee-list__item-avatar">
                                    <img [src]="employee.avatarUrl" [alt]="employee.name" />
                                </div>
                                <div class="employee-list__item-info">
                                    <span class="employee-list__item-name">{{ employee.name }}</span>
                                    <span class="employee-list__item-email">{{ employee.email }}</span>
                                </div>
                                <div class="employee-list__item-actions">
                                    <button class="employee-list__item-btn --edit" (click)="onEdit(employee); $event.stopPropagation()">Edit</button>
                                </div>
                            </div>
                        } @empty {
                            <div class="employee-list__empty">
                                <span class="employee-list__empty-text">No employees found</span>
                            </div>
                        }
                    </div>

                    @if (vm.totalCount > vm.employees.length) {
                        <div class="employee-list__footer">
                            <button class="employee-list__btn --secondary" (click)="onLoadMore()">Load More</button>
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

    onSearch(event: Event) {
        const searchText = (event.target as HTMLInputElement).value;
        this.store.setFilter({ searchText });
    }

    onCreate() {
        // Open create dialog
    }

    onSelect(employee: Employee) {
        this.store.select(employee.id);
    }

    onEdit(employee: Employee) {
        // Open edit dialog
    }

    onLoadMore() {
        this.store.loadNextPage();
    }
}
```

### Form Component Template

```typescript
@Component({
    selector: 'app-employee-form',
    template: `
        <div class="employee-form">
            <div class="employee-form__header">
                <h2 class="employee-form__title">
                    {{ isCreateMode() ? 'New Employee' : 'Edit Employee' }}
                </h2>
            </div>

            <form [formGroup]="form" class="employee-form__body">
                <div class="employee-form__section">
                    <h3 class="employee-form__section-title">Basic Information</h3>

                    <div class="employee-form__field">
                        <label class="employee-form__label">Full Name *</label>
                        <input formControlName="name" class="employee-form__input" [class.--error]="form.controls.name.invalid && form.controls.name.touched" />
                        @if (form.controls.name.errors?.['required'] && form.controls.name.touched) {
                            <span class="employee-form__error">Name is required</span>
                        }
                    </div>

                    <div class="employee-form__field">
                        <label class="employee-form__label">Email *</label>
                        <input formControlName="email" type="email" class="employee-form__input" />
                        @if (form.controls.email.errors?.['email']) {
                            <span class="employee-form__error">Invalid email format</span>
                        }
                        @if (form.controls.email.errors?.['emailTaken']) {
                            <span class="employee-form__error">Email already exists</span>
                        }
                    </div>

                    <div class="employee-form__field">
                        <label class="employee-form__label">Department</label>
                        <platform-select
                            formControlName="departmentId"
                            [fetchDataFn]="departmentApi.fetchForSelect"
                            [searchable]="true"
                            placeholder="Select department"
                        />
                    </div>
                </div>

                <div class="employee-form__section">
                    <h3 class="employee-form__section-title">Employment Details</h3>

                    <div class="employee-form__row">
                        <div class="employee-form__field --half">
                            <label class="employee-form__label">Start Date</label>
                            <input formControlName="startDate" type="date" class="employee-form__input" />
                        </div>

                        <div class="employee-form__field --half">
                            <label class="employee-form__label">Status</label>
                            <platform-select formControlName="status" [options]="EmployeeStatus.dropdownOptions" />
                        </div>
                    </div>
                </div>
            </form>

            <div class="employee-form__footer">
                <button class="employee-form__btn --secondary" (click)="onCancel()">Cancel</button>
                <button class="employee-form__btn --primary" (click)="onSubmit()" [disabled]="form.invalid || isLoading$('save')()">
                    @if (isLoading$('save')()) {
                        <span class="employee-form__spinner"></span>
                    }
                    Save
                </button>
            </div>
        </div>
    `
})
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    readonly EmployeeStatus = EmployeeStatus;

    constructor(
        private employeeApi: EmployeeApiService,
        public departmentApi: DepartmentApiService
    ) {
        super();
    }

    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required, Validators.minLength(2)]),
            email: new FormControl(
                this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode(), checkEmailUniqueValidator(this.employeeApi, this.currentVm().id))]
            ),
            departmentId: new FormControl(this.currentVm().departmentId),
            startDate: new FormControl(this.currentVm().startDate),
            status: new FormControl(this.currentVm().status, [Validators.required])
        }
    });

    onSubmit() {
        if (this.validateForm()) {
            const command = this.buildSaveCommand();
            this.employeeApi
                .save(command)
                .pipe(
                    this.observerLoadingErrorState('save'),
                    this.tapResponse(() => this.close()),
                    this.untilDestroyed()
                )
                .subscribe();
        }
    }

    onCancel() {
        this.close();
    }

    private buildSaveCommand(): SaveEmployeeCommand {
        const formValue = this.form.getRawValue();
        return {
            id: this.currentVm().id,
            ...formValue
        };
    }
}
```

### Store Template

```typescript
export class EmployeeListState {
    employees: Employee[] = [];
    totalCount: number = 0;
    currentPage: number = 1;
    pageSize: number = 20;
    filters: EmployeeFilters = new EmployeeFilters();
    selectedId: string | null = null;

    constructor(data?: Partial<EmployeeListState>) {
        if (data) Object.assign(this, data);
    }

    get selectedEmployee(): Employee | undefined {
        return this.employees.find(e => e.id === this.selectedId);
    }
}

@Injectable()
export class EmployeeListStore extends PlatformVmStore<EmployeeListState> {
    protected vmConstructor = (data?: Partial<EmployeeListState>) => new EmployeeListState(data);

    constructor(private api: EmployeeApiService) {
        super();
    }

    // Effects
    loadEmployees = this.effectSimple(() => {
        const state = this.state();
        const query: EmployeeQuery = {
            page: 1,
            pageSize: state.pageSize,
            ...state.filters
        };

        return this.api.getEmployees(query).pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(result =>
                this.updateState({
                    employees: result.items,
                    totalCount: result.totalCount,
                    currentPage: 1
                })
            )
        );
    }, 'loadEmployees');

    loadNextPage = this.effectSimple(() => {
        const state = this.state();
        const query: EmployeeQuery = {
            page: state.currentPage + 1,
            pageSize: state.pageSize,
            ...state.filters
        };

        return this.api.getEmployees(query).pipe(
            this.observerLoadingErrorState('loadMore'),
            this.tapResponse(result =>
                this.updateState({
                    employees: [...state.employees, ...result.items],
                    currentPage: state.currentPage + 1
                })
            )
        );
    }, 'loadNextPage');

    deleteEmployee = this.effect<string>(id$ =>
        id$.pipe(
            switchMap(id =>
                this.api.deleteEmployee(id).pipe(
                    this.observerLoadingErrorState('delete'),
                    this.tapResponse(() => {
                        this.updateState({
                            employees: this.state().employees.filter(e => e.id !== id),
                            totalCount: this.state().totalCount - 1
                        });
                    })
                )
            )
        )
    );

    // Actions
    setFilter(filters: Partial<EmployeeFilters>) {
        this.updateState({
            filters: { ...this.state().filters, ...filters }
        });
        this.loadEmployees();
    }

    select(id: string) {
        this.updateState({ selectedId: id });
    }

    clearSelection() {
        this.updateState({ selectedId: null });
    }

    // Selectors
    readonly employees$ = this.select(state => state.employees);
    readonly selectedEmployee$ = this.select(state => state.selectedEmployee);
    readonly totalCount$ = this.select(state => state.totalCount);
    readonly hasMore$ = this.select(state => state.employees.length < state.totalCount);

    readonly loading$ = this.isLoading$('load');
    readonly loadingMore$ = this.isLoading$('loadMore');
    readonly deleting$ = this.isLoading$('delete');
}
```

---

## 16. SCSS Standards

### File Structure

```scss
// 1. Host element styles (Angular-specific)
:host {
    display: block;
    width: 100%;
}

// 2. Main wrapper class (matches component selector)
.employee-form {
    padding: 1rem;
    background: var(--surface-color);

    // Element styles with &__
    &__header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    &__field {
        margin-bottom: 1rem;
    }

    &__input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--border-color);

        &:focus {
            border-color: var(--primary-color);
        }
    }

    // Modifier styles with &.--
    &__btn {
        padding: 0.5rem 1rem;

        &.--primary {
            background: var(--primary-color);
            color: white;
        }

        &.--secondary {
            background: transparent;
            border: 1px solid var(--border-color);
        }

        &.--large {
            padding: 0.75rem 1.5rem;
        }
    }
}
```

---

## 17. Platform Directives

```html
<!-- Horizontal scroll with drag -->
<div platformSwipeToScroll>
    <div class="horizontal-list">...</div>
</div>

<!-- Disabled control binding -->
<input [platformDisabledControl]="isDisabled" />
```

---

## 18. Key File Locations

```
src/Frontend/
├── libs/
│   ├── platform-core/           # Framework core (components, stores, utils)
│   ├── apps-domains/            # Business domain (APIs, models)
│   ├── share-styles/            # SCSS themes & variables
│   └── share-assets/            # Static assets
├── apps/
│   └── playground-text-snippet/ # Example app
└── docs/
    └── design-system/           # Design tokens & component specs
```

---

## 19. Development Commands

```bash
# Start development servers
cd src/Frontend
npm install
nx serve playground-text-snippet

# Build
nx build playground-text-snippet
nx build platform-core

# Test
nx test platform-core
nx test playground-text-snippet

# Lint
nx lint platform-core
nx lint playground-text-snippet
```

---

## Quick Checklist

### Before Creating a Component

- [ ] Determined correct base class (AppBaseComponent/VmStore/Form)
- [ ] Identified state management needs
- [ ] Planned BEM class structure
- [ ] Located reusable logic for Entity/Service layer

### Before Submitting Code

- [ ] All HTML elements have BEM classes
- [ ] All subscriptions use `.pipe(this.untilDestroyed())`
- [ ] Forms use `validateForm()` before submit
- [ ] Logic is in lowest appropriate layer
- [ ] No direct HttpClient usage
- [ ] No manual signal state management
- [ ] File under 200 lines (or justified)

### Code Review Checklist

- [ ] SOLID principles followed
- [ ] DRY - no duplicated logic
- [ ] KISS - no over-engineering
- [ ] YAGNI - no premature abstraction
- [ ] BEM classes complete
- [ ] Platform patterns used correctly
- [ ] Error handling present
- [ ] Loading states handled

---

## Decision Trees

### Frontend Task Selection

```
Need to add frontend feature?
├── Simple component (no complex state)? → extends AppBaseComponent
├── Complex state management? → extends AppBaseVmStoreComponent + PlatformVmStore
├── Forms with validation? → extends AppBaseFormComponent
├── API calls needed? → Create service extending PlatformApiService
├── Cross-domain logic? → Add to apps-domains shared components
├── Domain-specific? → Add to apps-domains/{domain}/ module
└── Cross-app reusable? → Add to platform-core components
```

### Component Template Pattern

```
@Component({
  selector: 'app-{entity}-list',
  template: `
    <app-loading-and-error-indicator [target]="this">
      @if (vm(); as vm) {
        @for (item of vm.items; track item.id) {
          <div class="{entity}-list__item">{{ item.name }}</div>
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
