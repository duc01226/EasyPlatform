# EasyPlatform Code Patterns - Frontend

> Referenced by: Claude hooks (auto-injected), Copilot instruction files (linked), Gemini context.
> Do NOT duplicate this content — always reference this file.

## EasyPlatform Frontend Code Patterns

## Frontend Patterns

### 1. Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

### 2. Platform Component API

```typescript
// PlatformComponent
status$: WritableSignal<'Pending'|'Loading'|'Success'|'Error'>;
observerLoadingErrorState<T>(key?: string): OperatorFunction<T, T>;
isLoading$(key?: string): Signal<boolean | null>;
untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
tapResponse<T>(next?, error?, complete?): OperatorFunction<T, T>;

// PlatformVmComponent
vm: WritableSignal<T | undefined>;
currentVm(): T;
updateVm(partial): T;
abstract initOrReloadVm: (isReload: boolean) => Observable<T | undefined>;

// PlatformVmStoreComponent
constructor(public store: TStore) {}
vm: Signal<T | undefined>;
reload(): void;

// PlatformFormComponent
form: FormGroup<PlatformFormGroupControls<T>>;
mode: 'create'|'update'|'view';
validateForm(): boolean;
abstract initialFormConfig: () => PlatformFormConfig<T>;
```

### 3. Component Usage

```typescript
// PlatformComponent
export class ListComponent extends PlatformComponent {
    load() {
        this.api
            .get()
            .pipe(
                this.observerLoadingErrorState('load'),
                this.tapResponse(d => (this.data = d)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}

// PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() => this.api.get().pipe(this.tapResponse(d => this.updateState({ data: d }))));
    readonly data$ = this.select(s => s.data);
}

// PlatformVmStoreComponent
export class ListComponent extends PlatformVmStoreComponent<MyVm, MyStore> {
    constructor(store: MyStore) {
        super(store);
    }
    refresh() {
        this.reload();
    }
}

// PlatformFormComponent
export class FormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: { email: new FormControl(this.currentVm().email, [Validators.required], [ifAsyncValidator(() => !this.isViewMode, uniqueValidator)]) },
        dependentValidations: { email: ['name'] }
    });
    submit() {
        if (this.validateForm()) {
            /* save */
        }
    }
}
```

### 4. API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Entity';
    }
    getAll(q?: Query): Observable<Entity[]> {
        return this.get('', q);
    }
    save(cmd: SaveCmd): Observable<Result> {
        return this.post('', cmd);
    }
    search(c: Search): Observable<Entity[]> {
        return this.post('/search', c, { enableCache: true });
    }
}
```

### 5. FormArray

```typescript
protected initialFormConfig = () => ({
  controls: {
    items: { modelItems: () => vm.items, itemControl: (i, idx) => new FormGroup({ name: new FormControl(i.name, [Validators.required]) }) }
  }
});
```

### 6. Advanced Frontend

```typescript
// @Watch decorator
@Watch('onChanged') public data?: Data;
@WatchWhenValuesDiff('search') public term = '';
private onChanged(v: Data, c: SimpleChange<Data>) { if (!c.isFirstTimeSet) this.update(); }

// RxJS operators
this.search$.pipe(skipDuplicates(500), applyIf(this.enabled$, debounceTime(300)), tapOnce({ next: v => this.init(v) }), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// Form validators
new FormControl('', [Validators.required, noWhitespaceValidator, startEndValidator('err', c => c.parent?.get('start')?.value, c => c.value)], [ifAsyncValidator(c => c.valid, uniqueValidator)]);

// Utilities
import { date_format, date_addDays, date_timeDiff, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty, string_truncate, dictionary_map, dictionary_filter, immutableUpdate, deepClone, removeNullProps, guid_generate, task_delay, task_debounce } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />

// PlatformComponent APIs
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
isLoading$('req1'); isLoading$('req2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
protected get devModeCheckLoadingStateElement() { return '.spinner'; }
protected get devModeCheckErrorStateElement() { return '.error'; }

// Store with caching
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (d?: Partial<MyVm>) => new MyVm(d);
  protected beforeInitVm = () => this.loadInitialData();
  loadData = this.effectSimple(() => this.api.get().pipe(this.observerLoadingErrorState('load'), this.tapResponse(d => this.updateState({ data: d }))));
}
```

---

## Authorization

```typescript
// Component
get canEdit() { return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany(); }

// Template
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

---

## Anti-Patterns

```typescript
// ❌ Direct HttpClient → ✅ Extend PlatformApiService
// ❌ Manual signals → ✅ Use PlatformVmStore
// ❌ Missing untilDestroyed() → ✅ Always use .pipe(this.untilDestroyed())
```

---

## Templates

```typescript
@Component({ selector: 'app-{e}-list', template: `<app-loading [target]="this">@if (vm(); as vm) { @for (i of vm.items; track i.id) { <div>{{i.name}}</div> } }</app-loading>`, providers: [{E}Store] })
export class {E}Component extends AppBaseVmStoreComponent<{E}State, {E}Store> { ngOnInit() { this.store.load(); } }
```
