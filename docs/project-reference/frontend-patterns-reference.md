<!-- Last scanned: 2026-03-07 -->

# Frontend Patterns Reference

> Angular 17+ / Nx Workspace | Standalone Components | NgRx ComponentStore | RxJS | Angular Material

---

## Component Base Classes

The platform provides a layered component hierarchy. Applications create thin `AppBase*` wrappers that extend the platform classes, allowing app-wide customizations without modifying feature components.

### Hierarchy

```
PlatformComponent                        (platform-core)
  +-- PlatformVmComponent<TViewModel>    (self-managed VM)
  |     +-- PlatformFormComponent<TVm>   (reactive forms)
  +-- PlatformVmStoreComponent<TVm,TStore> (external store)
```

**App-level wrappers** (in `apps/playground-text-snippet/src/app/shared/base/`):

| App Base Class                 | Extends                         | When to Use                                    |
| ------------------------------ | ------------------------------- | ---------------------------------------------- |
| `AppBaseComponent`             | `PlatformComponent`             | Simple components with no view model           |
| `AppBaseVmComponent<T>`        | `PlatformVmComponent<T>`        | Components managing own VM (no external store) |
| `AppBaseFormComponent<T>`      | `PlatformFormComponent<T>`      | Form components with validation                |
| `AppBaseVmStoreComponent<T,S>` | `PlatformVmStoreComponent<T,S>` | Components with external PlatformVmStore       |

**Source:** `apps/playground-text-snippet/src/app/shared/base/app-base.component.ts:21`

```typescript
// app-base.component.ts
@Directive()
export abstract class AppBaseComponent extends PlatformComponent {
    // App-wide customizations: toast overrides, analytics, error handling
}
```

**Source:** `apps/playground-text-snippet/src/app/shared/base/app-base-vm-store.component.ts:23`

```typescript
// app-base-vm-store.component.ts
@Directive()
export abstract class AppBaseVmStoreComponent<TViewModel extends PlatformVm, TStore extends PlatformVmStore<TViewModel>> extends PlatformVmStoreComponent<
    TViewModel,
    TStore
> {
    // App-wide store component customizations
}
```

### PlatformComponent Core Features

**Source:** `libs/platform-core/src/lib/components/abstracts/platform.component.ts:250`

Provides out of the box:

- **Reactive lifecycle**: `initiated$`, `viewInitiated$`, `destroyed$` signals
- **Operation state tracking**: `status$`, `loadingMap$`, `errorMsgMap$` with multi-request support
- **Subscription cleanup**: `untilDestroyed()` operator, automatic on destroy
- **Services**: `ToastrService`, `PlatformCachingService`, `PlatformTranslateService`, `ChangeDetectorRef` pre-injected
- **Request-specific state**: `isLoading$(key)`, `errorMsg$(key)`, `getErrorMsg$(key)` for granular loading/error per operation
- **Throttled change detection**: built-in throttling for performance

---

## State Management

### PlatformVmStore

**Source:** `libs/platform-core/src/lib/view-models/view-model.store.ts:204`

Built on NgRx `ComponentStore`. Every store:

1. Extends `PlatformVmStore<TViewModel>` where `TViewModel extends PlatformVm`
2. Passes default state to `super()` constructor
3. Implements `initOrReloadVm(isReload: boolean)` for data initialization
4. Defines effects using `effectSimple()` for API calls

### PlatformVm

**Source:** `libs/platform-core/src/lib/view-models/generic.view-model.ts:66`

Base view model with built-in state tracking:

```typescript
export interface IPlatformVm {
    status?: StateStatus; // 'Pending' | 'Loading' | 'Success' | 'Error' | 'Reloading'
    error?: string | null;
}
```

The `PlatformVm` class adds multi-request loading/error tracking, with properties like `isStateLoading`, `isStateSuccess`, `isStateError`, `isStateReloading`.

### Store Example

**Source:** `apps/playground-text-snippet/src/app/app.store.ts:87-137`

```typescript
@Injectable()
export class AppStore extends PlatformVmStore<AppVm> {
    // Derived observable with deduplication
    public query$ = this.select(p => p.currentSearchTextSnippetQuery()).pipe(distinctUntilObjectValuesChanged());

    public constructor(private snippetTextApi: TextSnippetApi) {
        super(new AppVm()); // Default state
    }

    // Required: factory to reconstruct VM (used by caching)
    public vmConstructor = (data?: Partial<AppVm>) => new AppVm(data);

    // Optional: cache key for state persistence
    protected cachedStateKeyName = () => 'AppStore';

    // Called before VM init (subscribe to observables here)
    protected beforeInitVm = () => {
        this.loadSnippetTextItems(this.query$);
    };

    // Required: initialize or reload data
    public override initOrReloadVm = (isReload: boolean): Observable<unknown> => {
        this.loadSnippetTextItems(this.currentState().currentSearchTextSnippetQuery(), isReload);
        return of(null);
    };

    // Effect: API call with automatic loading/error state tracking
    public loadSnippetTextItems = this.effectSimple((query: SearchTextSnippetQuery, isReloading?: boolean) => {
        return this.snippetTextApi
            .search(
                new SearchTextSnippetQuery({
                    maxResultCount: this.currentState().textSnippetItemsPageSize(),
                    skipCount: this.currentState().currentTextSnippetItemsSkipCount(),
                    searchText: this.currentState().searchText
                })
            )
            .pipe(
                this.tapResponse(data => {
                    this.updateState({
                        textSnippetItems: data.items.map(x => new AppVm_TextSnippetItem({ data: x })),
                        totalTextSnippetItems: data.totalCount
                    });
                })
            );
    }, 'loadSnippetTextItems');
}
```

### effectSimple() Pattern

**Source:** `libs/platform-core/src/lib/view-models/view-model.store.ts:1577`

`effectSimple()` is the primary way to define side effects (API calls, state updates). It wraps NgRx `ComponentStore.effect()` with:

- Automatic loading/error state tracking per `requestKey`
- `switchMap` semantics (cancels previous in-flight request)
- Support for observable or value inputs
- Optional `notAutoObserveErrorLoadingState` to disable auto-tracking

```typescript
// Parameterless effect
public loadData = this.effectSimple(() => {
    return this.api.getData().pipe(
        this.tapResponse(data => { this.updateState({ data }); })
    );
});

// Typed effect with request key for granular state tracking
public deleteItem = this.effectSimple((id: string) => {
    return this.api.delete(id).pipe(
        this.tapResponse(() => {
            this.updateState(state => {
                state.items = state.items.filter(i => i.id !== id);
            });
        })
    );
}, 'deleteItem');
// Check state: this.isLoading$('deleteItem'), this.getErrorMsg$('deleteItem')
```

### View Model Pattern

**Source:** `apps/playground-text-snippet/src/app/app.store.ts:6-77`

VMs extend `PlatformVm` and own their business logic (following Code Responsibility Hierarchy):

```typescript
export class AppVm extends PlatformVm {
    public static readonly textSnippetItemsPageSize = 10;

    public constructor(data?: Partial<AppVm>) {
        super();
        this.searchText = data?.searchText ?? '';
        this.textSnippetItems = data?.textSnippetItems ? data.textSnippetItems.map(x => new AppVm_TextSnippetItem(x)) : undefined;
        this.totalTextSnippetItems = data?.totalTextSnippetItems ?? 0;
        this.currentTextSnippetItemsPageNumber = data?.currentTextSnippetItemsPageNumber ?? 0;
    }

    // Business logic in VM, not component
    public currentSearchTextSnippetQuery() {
        return new SearchTextSnippetQuery({
            maxResultCount: this.textSnippetItemsPageSize(),
            skipCount: this.currentTextSnippetItemsSkipCount(),
            searchText: this.searchText
        });
    }
}
```

### Component + Store Wiring

**Source:** `apps/playground-text-snippet/src/app/app.component.ts:59-81`

```typescript
@Component({
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
    // ...imports
})
export class AppComponent extends AppBaseVmStoreComponent<AppVm, AppStore> {
    public constructor(store: AppStore) {
        super(store);
    }

    // Components ONLY handle UI events, delegate to store
    public onSearchTextChange(newValue: string): void {
        this.store.changeSearchText(newValue);
    }

    public onTextSnippetGridChangePage(e: PageEvent) {
        this.store.changePage(e.pageIndex);
    }
}
```

Key conventions:

- `vm()` -- signal returning current VM (use in templates)
- `currentVm()` -- synchronous snapshot of current VM
- `updateVm({...})` -- partial update on VM
- `store.updateState({...})` -- partial update from store
- `store.currentState()` -- synchronous snapshot from store

---

## Forms

### PlatformFormComponent

**Source:** `libs/platform-core/src/lib/components/abstracts/platform.form-component.ts:249`

Base class for reactive forms. Required implementations:

1. `initOrReloadVm(isReload)` -- return Observable of the form VM
2. `initialFormConfig()` -- return `PlatformFormConfig<TVm>` with controls and validators

### Form Example

**Source:** `apps/playground-text-snippet/src/app/shared/components/task-detail/task-detail.component.ts:108-211`

```typescript
@Component({
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
    // ...imports
})
export class TaskDetailComponent extends AppBaseFormComponent<TaskDetailFormVm> implements OnInit {
    @Input() public set task(value: TaskItemDataModel | null | undefined) {
        const newVm = value ? TaskDetailFormVm.fromTask(value) : TaskDetailFormVm.createNew();
        this.internalSetVm(newVm);
        if (this.initiated()) this.initForm(true);
    }

    @Output() public taskSaved = new EventEmitter<TaskItemDataModel>();

    protected override initOrReloadVm = (isReload: boolean): Observable<TaskDetailFormVm | undefined> => {
        return of(this._vm);
    };

    protected initialFormConfig = (): PlatformFormConfig<TaskDetailFormVm> => {
        const vm = this.currentVm();
        return {
            controls: {
                title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
                description: new FormControl(vm.description, [Validators.maxLength(2000)]),
                taskStatus: new FormControl(vm.taskStatus, [Validators.required]),
                priority: new FormControl(vm.priority, [Validators.required]),
                startDate: new FormControl(vm.startDate),
                dueDate: new FormControl(vm.dueDate, [
                    startEndValidator(
                        'dateRangeInvalid',
                        ctrl => ctrl.parent?.get('startDate')?.value,
                        ctrl => ctrl.value,
                        { allowEqual: true }
                    )
                ]),
                tags: new FormControl(vm.tags),
                subTasks: {
                    // FormArray support
                    modelItems: () => vm.subTasks,
                    itemControl: (item, index) => this.createSubTaskFormControls(item, index)
                }
            },
            dependentValidations: {
                dueDate: ['startDate'] // Revalidate dueDate when startDate changes
            },
            afterInit: () => {
                this.form.valueChanges
                    .pipe(
                        debounceTime(500),
                        tap(() => this.saveDraft()),
                        this.untilDestroyed()
                    )
                    .subscribe();
            }
        };
    };
}
```

Key form utilities:

- `formControls(key)` -- get FormControl by VM property name
- `formControlsError(controlKey, errorKey)` -- get validation error
- `isFormValid()` / `validateForm()` -- validation
- `PlatformFormConfig.dependentValidations` -- cross-field revalidation
- `startEndValidator()` -- built-in date range validator from platform-core

---

## API Services

### PlatformApiService

**Source:** `libs/platform-core/src/lib/api-services/abstracts/platform.api-service.ts:147`

Extends `PlatformHttpService`. Provides:

- Smart caching with TTL (`get()` caches by default, `{ enableCache: false }` to disable)
- Standardized error responses via `PlatformApiServiceErrorResponse`
- Automatic null property removal from payloads
- Event-driven error handling (`PlatformApiErrorEvent`)
- File upload support (`postFileMultiPartForm`)

### API Service Example

**Source:** `libs/apps-domains/text-snippet-domain/src/lib/apis/text-snippet.api.ts:23-60`

```typescript
@Injectable()
export class TextSnippetApi extends PlatformApiService {
    public constructor(
        moduleConfig: PlatformCoreModuleConfig,
        http: HttpClient,
        httpOptionsConfigService: PlatformHttpOptionsConfigService,
        eventManager: PlatformEventManager,
        private domainModuleConfig: AppsTextSnippetDomainModuleConfig
    ) {
        super(http, moduleConfig, httpOptionsConfigService, eventManager);
    }

    protected get apiUrl(): string {
        return `${this.domainModuleConfig.textSnippetApiHost}/api/TextSnippet`;
    }

    // GET with caching (default)
    public search(query: SearchTextSnippetQuery): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
        return this.get<IPlatformPagedResultDto<TextSnippetDataModel>>('/search', query).pipe(
            map(_ => {
                _.items = _.items.map(item => new TextSnippetDataModel(item));
                return new PlatformPagedResultDto({
                    data: _,
                    itemInstanceCreator: item => new TextSnippetDataModel(item)
                });
            })
        );
    }

    // POST with cache disabled
    public save(command: SaveTextSnippetCommand): Observable<SaveTextSnippetCommandResult> {
        return this.post<SaveTextSnippetCommandResult>('/save', command, { enableCache: false }).pipe(map(_ => new SaveTextSnippetCommandResult(_)));
    }
}
```

### DTO Pattern

**Source:** `libs/apps-domains/text-snippet-domain/src/lib/apis/text-snippet.api.ts:63-88`

Query and Command DTOs extend platform base classes:

```typescript
// Query DTO extends PlatformPagedQueryDto
export class SearchTextSnippetQuery extends PlatformPagedQueryDto {
    public constructor(data?: Partial<SearchTextSnippetQuery>) {
        super(data);
        this.searchText = data?.searchText;
    }
    public searchText?: string | null;
}

// Command DTO extends PlatformCommandDto
export class SaveTextSnippetCommand extends PlatformCommandDto {
    public constructor(data?: Partial<SaveTextSnippetCommand>) {
        super();
        this.data = data?.data ?? new TextSnippetDataModel();
    }
    public data: TextSnippetDataModel;
}

// Result DTO extends PlatformResultDto
export class SaveTextSnippetCommandResult extends PlatformResultDto {
    public constructor(data?: Partial<SaveTextSnippetCommandResult>) {
        super();
        this.savedData = new TextSnippetDataModel(data?.savedData);
    }
    public savedData: TextSnippetDataModel;
}
```

---

## Subscription Cleanup

### untilDestroyed()

**Source:** `libs/platform-core/src/lib/components/abstracts/platform.component.ts:488`

All components and stores inherit `untilDestroyed()` which returns a `takeUntil` operator tied to the component/store destroy lifecycle.

```typescript
// In components -- always pipe subscriptions through untilDestroyed()
this.form.valueChanges
    .pipe(
        debounceTime(500),
        tap(() => this.saveDraft()),
        this.untilDestroyed() // auto-unsubscribes on destroy
    )
    .subscribe();
```

**Source:** `libs/platform-core/src/lib/view-models/view-model.store.ts:1741`

```typescript
// In stores
public untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
    return takeUntil(this.destroyed$.pipe(filter(destroyed => destroyed == true)));
}
```

### Store subscription management

Stores also provide:

- `storeSubscription(key, subscription)` -- named subscription storage
- `storeAnonymousSubscription(subscription)` -- anonymous subscription storage
- `subscribe(observable)` -- subscribe and auto-store
- `cancelStoredSubscription(key)` -- cancel by name
- All stored subscriptions are cleaned up on store destroy

**DO:**

```typescript
someObservable$.pipe(this.untilDestroyed()).subscribe(value => { ... });
```

**DON'T:**

```typescript
// Manual unsubscribe -- error-prone, prefer untilDestroyed()
const sub = someObservable$.subscribe(value => { ... });
this.subscriptions.push(sub);  // manual cleanup
```

---

## Styling Conventions

### BEM CSS

All template elements use BEM naming: `block__element--modifier`. The block name matches the component selector minus prefixes.

**Source:** `apps/playground-text-snippet/src/app/app.component.html:1-37`

```html
<header class="app__header">...</header>
<div class="app__errors">
    <mat-error class="app__errors-content">{{ errorMsg$() }}</mat-error>
</div>
<main class="app__main">
    <div class="app__side-bar">
        <mat-form-field class="app__search-input" appearance="fill">...</mat-form-field>
    </div>
    <div class="app__detail">...</div>
</main>
```

**Source:** `apps/playground-text-snippet/src/app/shared/components/app-text-snippet-detail/app-text-snippet-detail.component.html:2-31`

```html
<form class="text-snippet-detail__main-form">
    <mat-form-field class="text-snippet-detail__snippet-text-form-field">...</mat-form-field>
    <div class="text-snippet-detail__btn-container">
        <button class="text-snippet-detail__main-form-submit-btn">...</button>
        <button class="text-snippet-detail__main-form-reset-btn">...</button>
    </div>
</form>
```

### SCSS Structure

**Source:** `apps/playground-text-snippet/src/app/app.component.scss:1-50`

Components use `ViewEncapsulation.None` with BEM to scope styles. SCSS uses platform variables and mixins:

```scss
@use 'variables' as *;
@use 'mixins' as *;

.app {
    &__errors {
        @include error-banner;
        margin: $space-4;
    }
    &__header {
        display: flex;
        // ...
    }
}
```

### Platform Design Tokens

**Source:** `libs/platform-core/src/styles/_platform-variables.scss:1-50`

Spacing scale: `$space-1` (4px) through `$space-12` (48px).

Color tokens: `$color-primary-*`, `$color-neutral-*`, `$color-success`, `$color-warning`, `$color-error`.

**Source:** `libs/platform-core/src/styles/_platform-mixins.scss:1-47`

Layout mixins: `flex-center`, `flex-start`, `flex-between`, `stack($gap)`, `cluster($gap)`, `card-elevated`.

---

## Directory Structure

### Nx Workspace Layout

```
src/Frontend/
  +-- nx.json                         # Nx workspace config
  +-- package.json                    # Root dependencies
  +-- tsconfig.base.json              # Shared TS config
  +-- apps/
  |   +-- playground-text-snippet/    # Reference implementation app
  |       +-- src/app/
  |           +-- app.component.ts    # Root component
  |           +-- app.store.ts        # Root store + VM
  |           +-- events/             # App-level events
  |           +-- shared/
  |               +-- base/           # AppBase* wrappers
  |               +-- components/     # Feature components
  +-- libs/
      +-- platform-core/             # Framework core library
      |   +-- src/lib/
      |   |   +-- api-services/      # PlatformApiService, error handling
      |   |   +-- caching/           # PlatformCachingService
      |   |   +-- common-types/      # Shared type definitions
      |   |   +-- components/        # Abstract component base classes
      |   |   +-- decorators/        # Property decorators
      |   |   +-- directives/        # Platform directives
      |   |   +-- domain/            # Domain base classes
      |   |   +-- dtos/              # PlatformCommandDto, PlatformPagedQueryDto, etc.
      |   |   +-- events/            # Platform event system
      |   |   +-- form-validators/   # Shared form validators
      |   |   +-- helpers/           # Utility helpers
      |   |   +-- http-services/     # PlatformHttpService base
      |   |   +-- pipes/             # Platform pipes
      |   |   +-- rxjs/              # Custom RxJS operators
      |   |   +-- translations/      # PlatformTranslateService
      |   |   +-- ui-services/       # UI utility services
      |   |   +-- utils/             # Pure utility functions
      |   |   +-- validation/        # Validation utilities
      |   |   +-- view-models/       # PlatformVm, PlatformVmStore
      |   +-- src/styles/
      |       +-- _platform-variables.scss
      |       +-- _platform-mixins.scss
      |       +-- _platform-functions.scss
      |       +-- _platform-placeholders.scss
      +-- apps-domains/              # Domain-specific models + API services
      |   +-- text-snippet-domain/   # TextSnippet + TaskItem APIs, data models
      +-- apps-domains-components/   # Domain-specific reusable components
      +-- apps-shared-components/    # Cross-domain shared components
      +-- platform-components/       # Platform-level reusable components
```

### Component File Conventions

Each component directory contains:

```
task-detail/
  +-- task-detail.component.ts       # Component class
  +-- task-detail.component.html     # Template
  +-- task-detail.component.scss     # Styles (BEM)
  +-- task-detail.view-model.ts      # View model class
  +-- index.ts                       # Public API barrel
```

---

## Directives and Pipes

### Platform Directives

**Source:** `libs/platform-core/src/lib/directives/`

| Directive                          | Selector                    | Purpose                                      |
| ---------------------------------- | --------------------------- | -------------------------------------------- |
| `PlatformDisabledControlDirective` | `[platformDisabledControl]` | Disable form controls without Angular quirks |
| `PlatformSwipeToScrollDirective`   | `[platformSwipeToScroll]`   | Touch swipe to horizontal scroll             |

All directives extend `PlatformDirective` base class from `libs/platform-core/src/lib/directives/abstracts/platform.directive.ts`.

### Platform Pipes

**Source:** `libs/platform-core/src/lib/pipes/`

| Pipe                              | Name                          | Purpose                                   |
| --------------------------------- | ----------------------------- | ----------------------------------------- |
| `PlatformHighlightSearchTextPipe` | `platformHighlightSearchText` | Highlight matching search text in results |
| `LogTimesDisplayPipe`             | `logTimesDisplay`             | Format timestamps for log display         |

---

## Standalone Components

All components use `standalone: true` with explicit `imports` arrays. No NgModules for feature components.

**Source:** `apps/playground-text-snippet/src/app/app.component.ts:27-57`

```typescript
@Component({
    selector: 'platform-example-web-root',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
        PlatformCoreModule,       // Platform utilities module

        // Material modules
        MatTableModule,
        MatInputModule,
        // ...

        // Child standalone components
        AppTextSnippetDetailComponent,
        TaskListComponent,
        TaskDetailComponent,
        NavLoadingTestComponent,

        // Standalone pipes
        PlatformHighlightSearchTextPipe,
    ],
    providers: []
})
export class AppComponent extends AppBaseVmStoreComponent<AppVm, AppStore> { ... }
```

Standard conventions:

- `ChangeDetectionStrategy.OnPush` -- always
- `ViewEncapsulation.None` -- always (BEM scoping via class names)
- Import child components directly in `imports` array
- Import `PlatformCoreModule` for platform utilities

---

## Quick Reference: DO / DON'T

| Pattern             | DO                                         | DON'T                                   |
| ------------------- | ------------------------------------------ | --------------------------------------- |
| State management    | `PlatformVmStore` + `effectSimple()`       | Direct `HttpClient` calls in components |
| Subscriptions       | `.pipe(this.untilDestroyed()).subscribe()` | Manual `unsubscribe()` in `ngOnDestroy` |
| API calls           | Service extending `PlatformApiService`     | Raw `HttpClient` injection              |
| Business logic      | In `PlatformVm` subclass (model layer)     | In component class                      |
| CSS                 | BEM classes on all elements                | Unscoped generic class names            |
| Components          | Extend `AppBase*Component`                 | Extend `PlatformComponent` directly     |
| Change detection    | `OnPush` always                            | Default change detection                |
| View encapsulation  | `None` + BEM                               | `Emulated` or `ShadowDom`               |
| Component structure | `standalone: true` with explicit imports   | NgModule-based components               |
