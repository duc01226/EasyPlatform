---
applyTo: "src/PlatformExampleAppWeb/**/*.ts,src/PlatformExampleAppWeb/**/*.html"
description: "Angular frontend development patterns for EasyPlatform"
---

# Frontend Angular Development Patterns

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

## Component Selection

| Need                 | Base Class                              |
| -------------------- | --------------------------------------- |
| Simple UI display    | `AppBaseComponent`                      |
| Complex state        | `AppBaseVmStoreComponent<State, Store>` |
| Form with validation | `AppBaseFormComponent<FormVm>`          |

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
export class TextSnippetStore extends PlatformVmStore<TextSnippetState> {
  private snippetApi = inject(TextSnippetApiService);

  // Cache configuration (optional)
  protected get enableCaching() {
    return true;
  }
  protected cachedStateKeyName = () => "TextSnippetStore";
  protected vmConstructor = (data?: Partial<TextSnippetState>) =>
    new TextSnippetState(data);
  protected beforeInitVm = () => this.loadInitialData();

  // Effects for async operations
  public loadSnippets = this.effectSimple(() =>
    this.snippetApi.getList().pipe(
      this.observerLoadingErrorState("loadSnippets"),
      this.tapResponse((snippets) => this.updateState({ snippets })),
    ),
  );

  // State selectors
  public readonly snippets$ = this.select((state) => state.snippets);
  public readonly loading$ = this.isLoading$("loadSnippets");
}
```

## Component with Store

```typescript
@Component({
  selector: "app-text-snippet-list",
  template: `
    <app-loading-and-error-indicator [target]="this">
      @if (vm(); as vm) {
        @for (item of vm.snippets; track item.id) {
          <div>{{ item.snippetText }}</div>
        }
      }
    </app-loading-and-error-indicator>
  `,
  providers: [TextSnippetStore],
})
export class TextSnippetListComponent extends AppBaseVmStoreComponent<
  TextSnippetState,
  TextSnippetStore
> {
  constructor(store: TextSnippetStore) {
    super(store);
  }

  ngOnInit() {
    this.store.loadSnippets();
  }

  onRefresh() {
    this.reload(); // Reloads all stores
  }
}
```

## Form Pattern

```typescript
export class TextSnippetFormComponent extends AppBaseFormComponent<TextSnippetFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      snippetText: new FormControl(
        this.currentVm().snippetText,
        [Validators.required, Validators.maxLength(1000)],
        [
          ifAsyncValidator(
            () => !this.isViewMode,
            checkCodeUniqueValidator(this.snippetApi),
          ),
        ],
      ),
    },
    dependentValidations: { snippetText: ["fullTextSearchCode"] },
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
protected initialFormConfig = () => ({
  controls: {
    // FormArray for dynamic list of items
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
@Injectable({ providedIn: "root" })
export class TextSnippetApiService extends PlatformApiService {
  protected get apiUrl() {
    return environment.apiUrl + "/api/TextSnippet";
  }

  getList(query?: Query): Observable<TextSnippetDto[]> {
    return this.get<TextSnippetDto[]>("", query);
  }

  save(cmd: SaveCommand): Observable<Result> {
    return this.post<Result>("", cmd);
  }

  search(criteria: SearchCriteria): Observable<TextSnippetDto[]> {
    return this.post("/search", criteria, { enableCache: true });
  }
}
```

## @Watch Decorator Patterns

```typescript
import { Watch, WatchWhenValuesDiff, SimpleChange } from "@libs/platform-core";

export class MyComponent {
  // Watch for any property change
  @Watch("onPageResultChanged")
  public pagedResult?: PagedResult<Item>;

  // Only trigger on actual value change (not reference)
  @WatchWhenValuesDiff("performSearch")
  public searchTerm: string = "";

  private onPageResultChanged(
    value: PagedResult<Item> | undefined,
    change: SimpleChange<PagedResult<Item>>,
  ) {
    if (!change.isFirstTimeSet) this.updateUI();
  }

  private performSearch(term: string) {
    this.apiService
      .search(term)
      .pipe(this.untilDestroyed())
      .subscribe((results) => (this.results = results));
  }
}
```

## Custom RxJS Operators

```typescript
import {
  skipDuplicates,
  applyIf,
  onCancel,
  tapOnce,
  distinctUntilObjectValuesChanged,
} from "@libs/platform-core";

this.search$
  .pipe(
    skipDuplicates(500), // Skip duplicates within 500ms
    applyIf(this.isEnabled$, debounceTime(300)), // Conditional operator
    onCancel(() => this.cleanup()), // Handle cancellation
    tapOnce({ next: (v) => this.initOnce(v) }), // Execute only on first emission
    distinctUntilObjectValuesChanged(), // Deep object comparison
    this.untilDestroyed(),
  )
  .subscribe();
```

## Advanced Form Validators

```typescript
import {
  ifAsyncValidator,
  startEndValidator,
  noWhitespaceValidator,
  validator,
} from "@libs/platform-core";

new FormControl(
  "",
  [
    Validators.required,
    noWhitespaceValidator,
    startEndValidator(
      "invalidRange",
      (ctrl) => ctrl.parent?.get("start")?.value,
      (ctrl) => ctrl.value,
      { allowEqual: false },
    ),
  ],
  [
    ifAsyncValidator((ctrl) => ctrl.valid, emailUniqueValidator), // Only run if sync valid
  ],
);
```

## Platform Directives

```html
<div platformSwipeToScroll><!-- Horizontal scroll with drag --></div>
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
  task_debounce,
} from "@libs/platform-core";
```

## Key Helpers

```typescript
// Subscription management
this.data$.pipe(this.untilDestroyed()).subscribe();

// Loading/error state
this.apiCall$.pipe(this.observerLoadingErrorState('key')).subscribe();
this.isLoading$('key');
this.getErrorMsg$('key');

// Track-by for performance
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);

// Named subscription management
protected storeSubscription('dataLoad', this.data$.subscribe(...));
protected cancelStoredSubscription('dataLoad');

// Multiple request state
isLoading$('request1'); isLoading$('request2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
```

## Platform-Core Library Reference

**Location**: `src/PlatformExampleAppWeb/libs/platform-core/`

```typescript
// Foundation: Extend PlatformComponent base classes
export class MyComponent extends PlatformComponent { }
export class MyVmComponent extends PlatformVmComponent<MyViewModel> { }
export class MyStoreComponent extends PlatformVmStoreComponent<MyViewModel, MyStore> { }

// State Management: PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyViewModel> {
  public loadData = this.effectSimple(() =>
    this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))));
}

// API Services: Extend PlatformApiService
@Injectable({ providedIn: 'root' })
export class MyApiService extends PlatformApiService {
  protected get apiUrl() { return environment.apiUrl + '/api/my'; }
}

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })
```

**Library Structure:**

```
src/PlatformExampleAppWeb/libs/platform-core/src/lib/
├── api-services/       # Base API service classes (PlatformApiService)
├── app-ui-state/       # Application UI state management
├── caching/            # Client-side caching utilities
├── common-types/       # Shared TypeScript interfaces
├── common-values/      # Constants and enums
├── components/         # Base component classes
├── decorators/         # TypeScript decorators (@Watch, etc.)
├── directives/         # Angular directives
├── domain/             # Domain model utilities
├── dtos/               # Data transfer objects
├── form-validators/    # Custom form validators
├── helpers/            # Helper functions
├── http-services/      # HTTP client utilities
├── pipes/              # Angular pipes
├── rxjs/               # Custom RxJS operators
├── ui-services/        # UI-related services
├── utils/              # General utilities (date, list, string, etc.)
├── validation/         # Validation utilities
└── view-models/        # ViewModel base classes (PlatformVmStore)
```

## Authorization Patterns

```typescript
// Component properties
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }
    get canDelete() { return this.hasRole(PlatformRoles.Admin); }
}

// Template guards
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

## Advanced Patterns

```typescript
// PlatformComponent additional APIs
export class MyComponent extends PlatformComponent {
  // Track-by for performance
  trackByItem = this.ngForTrackByItemProp<User>('id');
  trackByList = this.ngForTrackByImmutableList(this.users);

  // Named subscription management
  protected storeSubscription('dataLoad', this.data$.subscribe(...));
  protected cancelStoredSubscription('dataLoad');

  // Multiple request state
  isLoading$('request1'); isLoading$('request2');
  getAllErrorMsgs$(['req1', 'req2']);
  loadingRequestsCount(); reloadingRequestsCount();

  // Dev-mode validation
  protected get devModeCheckLoadingStateElement() { return '.spinner'; }
  protected get devModeCheckErrorStateElement() { return '.error'; }
}

// PlatformVmStore additional APIs
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);
  protected beforeInitVm = () => this.loadInitialData();

  public loadData = this.effectSimple(() =>
    this.apiService.getData().pipe(
      this.observerLoadingErrorState('loadData'),
      this.tapResponse(data => this.updateState({ data }))
    ));

  // State selectors
  public readonly data$ = this.select(state => state.data);
  public readonly loading$ = this.isLoading$('loadData');
}
```

## Anti-Patterns

```typescript
// DON'T: Direct HTTP client usage
constructor(private http: HttpClient) {}
// DO: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}

// DON'T: Manual state management
employees = signal([]);
loading = signal(false);
// DO: Use platform store pattern
constructor(private store: EmployeeStore) {}

// DON'T: Assume base class methods without verification
this.someMethod(); // Might not exist on base class
// DO: Check base class APIs first through IntelliSense

// DON'T: Skip subscription cleanup
this.data$.subscribe(); // Memory leak!
// DO: Always use untilDestroyed()
this.data$.pipe(this.untilDestroyed()).subscribe();

// DON'T: Skip loading/error state handling
this.apiCall$.subscribe();
// DO: Use observerLoadingErrorState
this.apiCall$.pipe(this.observerLoadingErrorState('key')).subscribe();

// DON'T: Create forms without proper config
form = new FormGroup({...});
// DO: Use initialFormConfig with proper validation
protected initialFormConfig = () => ({
  controls: {...},
  dependentValidations: {...}
});
```
