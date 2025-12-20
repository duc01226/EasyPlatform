# Frontend Development Patterns

## Component Hierarchy

### Platform Foundation Layer
```typescript
PlatformComponent                    // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             // + ViewModel injection
├── PlatformFormComponent           // + Reactive forms integration
└── PlatformVmStoreComponent        // + ComponentStore state management
```

### Application Framework Layer
```typescript
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error
```

### Feature Implementation
```typescript
EmployeeListComponent extends AppBaseVmStoreComponent
LeaveRequestFormComponent extends AppBaseFormComponent
DashboardComponent extends AppBaseComponent
```

## PlatformComponent API

### State Signals
```typescript
public status$: WritableSignal<ComponentStateStatus>;  // 'Pending'|'Loading'|'Reloading'|'Success'|'Error'
public isStateLoading/isStateError/isStateSuccess(): Signal<boolean>;
public errorMsg$(): Signal<string | undefined>;
```

### Multi-Request State Tracking
```typescript
public observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
public isLoading$(requestKey?: string): Signal<boolean | null>;
public getErrorMsg$(requestKey?: string): Signal<string | undefined>;
```

### Subscription Management
```typescript
public untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
protected storeSubscription('dataLoad', this.data$.subscribe(...));
protected cancelStoredSubscription('dataLoad');
```

## PlatformVmStoreComponent Pattern

### Store Definition
```typescript
@Injectable()
export class UserListStore extends PlatformVmStore<UserListVm> {
    protected vmConstructor = (data?: Partial<UserListVm>) => new UserListVm(data);

    public loadUsers = this.effectSimple(() =>
        this.userApi.getUsers().pipe(
            this.observerLoadingErrorState('loadUsers'),
            this.tapResponse(users => this.updateState({ users }))
        ));

    public readonly users$ = this.select(state => state.users);
}
```

### Component Usage
```typescript
@Component({
    providers: [UserListStore]
})
export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
    constructor(store: UserListStore) { super(store); }
    onRefresh() { this.reload(); }
}
```

## PlatformFormComponent Pattern

### Form Configuration
```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueValidator(...))]
            )
        },
        dependentValidations: { email: ['firstName'] }
    });

    onSubmit() {
        if (this.validateForm()) { /* process this.currentVm() */ }
    }
}
```

### Form Modes
```typescript
public get mode(): PlatformFormMode;  // 'create'|'update'|'view'
public isViewMode/isCreateMode/isUpdateMode(): boolean;
```

## API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Employee'; }

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

## @Watch Decorator

```typescript
@Watch('onPageResultChanged')
public pagedResult?: PagedResult<Item>;

@WatchWhenValuesDiff('performSearch')  // Only on actual value change
public searchTerm: string = '';

private onPageResultChanged(value: PagedResult<Item> | undefined, change: SimpleChange<PagedResult<Item>>) {
    if (!change.isFirstTimeSet) this.updateUI();
}
```

## Custom RxJS Operators

```typescript
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

this.search$.pipe(
    skipDuplicates(500),
    applyIf(this.isEnabled$, debounceTime(300)),
    onCancel(() => this.cleanup()),
    tapOnce({ next: v => this.initOnce(v) }),
    distinctUntilObjectValuesChanged(),
    this.untilDestroyed()
).subscribe();
```

## Utility Functions

```typescript
import {
    date_addDays, date_format, date_timeDiff,
    list_groupBy, list_distinctBy, list_sortBy,
    string_isEmpty, string_truncate, string_toCamelCase,
    immutableUpdate, deepClone, removeNullProps,
    guid_generate, task_delay, task_debounce
} from '@libs/platform-core';
```

## Platform-Core Library Usage

### Foundation
```typescript
import { PlatformComponent } from '@libs/platform-core';
export class MyComponent extends PlatformComponent { }
```

### Directives
```html
<div appTextEllipsis [maxTextEllipsisLines]="2">...</div>
<button appPopover [popoverContent]="'Info'" [popoverTrigger]="'hover'">Hover</button>
```

### Pipes
```html
{{ date | localizedDate:'shortDate' }}
{{ 'item' | pluralize:count }}
```

## Working Examples Location
- `src/PlatformExampleAppWeb/apps/playground-text-snippet/`
- Platform Core: `src/PlatformExampleAppWeb/libs/platform-core/`
- See `CLAUDE.md` for comprehensive patterns reference
