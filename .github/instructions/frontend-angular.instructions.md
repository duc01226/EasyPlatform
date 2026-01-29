---
applyTo: "src/WebV2/**/*.ts,src/WebV2/**/*.html,src/Web/**/*.ts,src/Web/**/*.html,libs/**/*.ts"
---

# Angular Frontend Patterns

> Auto-loads when editing Angular TypeScript/HTML files. See `docs/claude/frontend-patterns.md` for full reference.

## Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

**ALWAYS extend platform base classes. NEVER use raw `Component` with `implements OnInit, OnDestroy`.**

## Component Base Class Selection

```
Simple UI display?         → AppBaseComponent
Complex state management?  → AppBaseVmStoreComponent<TState, TStore>
Form with validation?      → AppBaseFormComponent<TFormVm>
```

## Platform Component API

```typescript
export abstract class PlatformComponent {
  status$: WritableSignal<ComponentStateStatus>;
  observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
  isLoading$(requestKey?: string): Signal<boolean | null>;
  untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
  tapResponse<T>(nextFn?, errorFn?): OperatorFunction<T, T>;
  trackByItem = this.ngForTrackByItemProp<User>('id');
  storeSubscription('key', this.data$.subscribe(...));
  cancelStoredSubscription('key');
}
```

## Store Pattern (PlatformVmStore)

```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    protected get enableCaching() { return true; }
    protected cachedStateKeyName = () => 'MyStore';
    protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);

    loadData = this.effectSimple(() =>
        this.api.getData().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(data => this.updateState({ data }))
        ), 'loadData');

    readonly data$ = this.select(state => state.data);
    readonly loading$ = this.isLoading$('loadData');
}
```

## Component with Store

```typescript
@Component({
    selector: 'app-entity-list',
    template: `
        <app-loading [target]="this">
            @if (vm(); as vm) {
                @for (i of vm.items; track i.id) {
                    <div class="entity-list__item">{{i.name}}</div>
                }
            }
        </app-loading>
    `,
    providers: [EntityStore]
})
export class EntityListComponent extends AppBaseVmStoreComponent<EntityState, EntityStore> {
    ngOnInit() { this.store.load(); }
}
```

## Form Component

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      email: new FormControl(this.currentVm().email,
        [Validators.required, Validators.email],
        [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueValidator(...))])
    },
    dependentValidations: { email: ['firstName'] }
  });
  onSubmit() { if (this.validateForm()) { /* process */ } }
}

// FormArray
protected initialFormConfig = () => ({
  controls: {
    specs: {
      modelItems: () => vm.specs,
      itemControl: (spec, idx) => new FormGroup({ name: new FormControl(spec.name, [Validators.required]) })
    }
  }
});
```

## API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Employee'; }
    getEmployees(query?: Query): Observable<Employee[]> { return this.get<Employee[]>('', query); }
    saveEmployee(cmd: SaveCommand): Observable<Result> { return this.post<Result>('', cmd); }
    search(criteria: Search): Observable<Employee[]> { return this.post('/search', criteria, { enableCache: true }); }
}
```

**NEVER use `HttpClient` directly. ALWAYS extend `PlatformApiService`.**

## Watch Decorator & RxJS

```typescript
export class MyComponent {
    @Watch('onChanged') public pagedResult?: PagedResult<Item>;
    @WatchWhenValuesDiff('search') public searchTerm: string = '';

    private onChanged(value: PagedResult<Item>, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }
}

// RxJS utilities
this.search$.pipe(
    skipDuplicates(500),
    applyIf(this.isEnabled$, debounceTime(300)),
    distinctUntilObjectValuesChanged(),
    this.untilDestroyed()
).subscribe();
```

## BEM HTML Template Standard

**ALL HTML elements MUST have BEM classes, even without styling needs.**

```html
<!-- CORRECT: All elements have BEM classes -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
        <div class="user-list__item">
            <span class="user-list__item-name">{{ user.name }}</span>
        </div>
        }
    </div>
</div>
```

BEM Naming: Block (`user-list`) → Element (`user-list__header`) → Modifier (separate `--` class: `user-list__btn --primary --large`)

## Subscription Cleanup (CRITICAL)

```typescript
// WRONG: No cleanup
this.formControl.valueChanges.subscribe(value => { ... });

// WRONG: Manual destroy subject
private destroy$ = new Subject<void>();

// CORRECT: Platform cleanup
this.formControl.valueChanges.pipe(this.untilDestroyed()).subscribe(value => { ... });
```

## Authorization

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }
}
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

## Utilities

```typescript
import {
    date_addDays, date_format, date_timeDiff,
    list_groupBy, list_distinctBy, list_sortBy,
    string_isEmpty, string_truncate,
    immutableUpdate, deepClone, removeNullProps,
    guid_generate, task_delay, task_debounce
} from '@libs/platform-core';
```

## BravoCommon Components

```typescript
<bravo-select formControlName="ids" [fetchDataFn]="fetchFn" [multiple]="true" [searchable]="true" />
<div appTextEllipsis [maxTextEllipsisLines]="2">...</div>
{{ date | localizedDate:'shortDate' }} | {{ 'item' | pluralize:count }}
BravoArrayUtil.toDictionary(items, x => x.id);
BravoDateUtil.format(new Date(), 'DD/MM/YYYY');
```

## Forbidden Patterns

| Forbidden | Why | Correct |
|-----------|-----|---------|
| `ngOnChanges` | Error-prone | `@Watch` decorator |
| `implements OnInit, OnDestroy` | Use base class | Extend platform base |
| Manual `destroy$ = new Subject()` | Memory leaks | `this.untilDestroyed()` |
| `takeUntil(this.destroy$)` | Redundant | `this.untilDestroyed()` |
| Direct `HttpClient` | Missing interceptors | `PlatformApiService` |
| Manual signals for state | Inconsistent | `PlatformVmStore` |

## TypeScript Style

- **Always use semicolons** in TypeScript
- **Explicit type annotations** on all functions
- **Specific names**: `employeeRecords` not `data`
- **Boolean prefixes**: `is/has/can/should` (`isActive`, `hasPermission`)
