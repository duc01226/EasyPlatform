<!-- Last scanned: 2026-06-12 -->
<!-- CRITICAL: Extend AppBase* not Platform* directly. Use effectSimple() in stores. .pipe(this.untilDestroyed()) on ALL subscriptions. BEM on ALL template elements. -->

# Frontend Patterns Reference

**Final Purpose:** Make every Angular change in this repo follow the established platform conventions (AppBase\* classes, `PlatformVmStore` state, `PlatformApiService`, base-class subscription cleanup, reactive forms, BEM) so generated frontend code is correct, leak-free, and review-ready.

**Framework:** Angular 19 + Nx monorepo + NgRx ComponentStore + Angular Material 3 + RxJS.
**MUST** extend `AppBase*` component classes, NEVER `Platform*` directly.
**MUST** use `.pipe(this.untilDestroyed())` on ALL observable subscriptions.
**MUST** use `effectSimple()` for store effects, `tapResponse()` for API result handling.
**MUST** apply BEM classes to every template element.

## Component Base Classes

| Base Class                             | Extends                    | When to Use                       | Required Overrides                        |
| -------------------------------------- | -------------------------- | --------------------------------- | ----------------------------------------- |
| `AppBaseComponent`                     | `PlatformComponent`        | Simple components, no VM          | None                                      |
| `AppBaseVmComponent<TViewModel>`       | `PlatformVmComponent`      | Components with local view model  | `initOrReloadVm()`                        |
| `AppBaseFormComponent<TFormVm>`        | `PlatformFormComponent`    | Form components with validation   | `initOrReloadVm()`, `initialFormConfig()` |
| `AppBaseVmStoreComponent<TVm, TStore>` | `PlatformVmStoreComponent` | Complex state with external store | Constructor with store injection          |

**Path:** `apps/playground-text-snippet/src/app/shared/base/`

```typescript
// app-base-vm-store.component.ts:22-31 — Store component pattern
@Directive()
export abstract class AppBaseVmStoreComponent<TViewModel extends PlatformVm, TStore extends PlatformVmStore<TViewModel>> extends PlatformVmStoreComponent<
    TViewModel,
    TStore
> {
    // App-wide store component customizations
}
```

**BAD:** `export class MyComponent extends PlatformComponent` -- skips app layer
**GOOD:** `export class MyComponent extends AppBaseComponent` -- extends app base

## State Management (PlatformVmStore)

Built on NgRx `ComponentStore`. Base: `PlatformVmStore<TViewModel extends PlatformVm>` (`libs/platform-core/src/lib/view-models/view-model.store.ts:204`). Each store manages a `PlatformVm` view model with built-in loading/error/caching.

```typescript
// task-list.store.ts:119-150 — Store pattern (store now ~338 lines, 7 effects)
@Injectable()
export class TaskListStore extends PlatformVmStore<TaskListVm> {
    // query$ derives from VM, deduped so identical queries don't refire
    public query$ = this.select(vm => vm.buildQuery()).pipe(distinctUntilObjectValuesChanged()); // :121
    public constructor(private taskApi: TaskItemApi) {
        super(new TaskListVm());
    }

    public vmConstructor = (data?: Partial<TaskListVm>) => new TaskListVm(data);
    protected cachedStateKeyName = () => 'TaskListStore';

    // Feed an Observable into an effect → auto-refires on every filter/query change
    protected beforeInitVm = () => {
        this.loadTasks(this.query$);
    }; // :131

    // Override: compose parallel effects, return Observable<unknown>
    public override initOrReloadVm = (isReload: boolean): Observable<unknown> =>
        of(combineLatest([this.loadTasks(this.currentState().buildQuery(), isReload), this.loadStatistics(undefined, isReload)])); // :136

    public loadTasks = this.effectSimple((query: GetTaskListQuery, isReloading?: boolean) => {
        return this.taskApi.getList(query).pipe(
            this.tapResponse(result => {
                this.updateState({ tasks: result.items, totalTasks: result.totalCount });
            })
        );
    }, 'loadTasks'); // :147
}
```

| Store API                                 | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `effectSimple(fn, requestKey?, options?)` | Side effect with loading-state tracking; `fn` 2nd arg is `isReloading?` |
| `tapResponse(onSuccess, onError?)`        | Handle API response in effect pipe (try/catch + rethrow), `:1629`       |
| `updateState(partial)`                    | Immutable state update, `:887`                                          |
| `currentState()`                          | Get current state snapshot, `:967`                                      |
| `select(projector, config?)`              | Derive observable from state, `:1243`                                   |
| `cachedStateKeyName()`                    | Enable state persistence across navigation (abstract)                   |
| `beforeInitVm()`                          | Run effects on store initialization (abstract) — can feed `query$`      |
| `initOrReloadVm(isReload)`                | Initial data load / reload; override returns `Observable<unknown>`      |

**Data flow (unidirectional):** component → `store.loadX(arg)` effect → domain API call → `tapResponse(onSuccess)` → `updateState(partial)` → `select()` observables re-emit → template re-renders. Race conditions are prevented by NgRx effect `switchMap` semantics plus `distinctUntilObjectValuesChanged()` on `query$`.

**MUST** use `effectSimple()` for async operations, NEVER manual `subscribe()` in stores.
**MUST** provide store in component `@Component({ providers: [MyStore] })` — stores are per-component-provided (ComponentStore scoping), not module singletons.

## View Model Pattern

View models extend `PlatformVm`. Logic belongs IN the VM (lowest layer), not in store or component.

```typescript
// task-list.store.ts:25-107 — VM with business logic
export class TaskListVm extends PlatformVm {
    public static readonly pageSize = 10;

    public buildQuery(): GetTaskListQuery { ... }
    public hasActiveFilters(): boolean { ... }
    public clearFilters(): TaskListVm { ... }
}
```

**MUST** put computed properties, query builders, and display helpers in the VM class.

## API Services

Extend `PlatformApiService` (`libs/platform-core/src/lib/api-services/abstracts/platform.api-service.ts:147`, itself `extends PlatformHttpService`). Define the `apiUrl` getter. The `get/post/put/delete` methods are `protected` — subclasses wrap them in public domain methods with typed responses.

```typescript
// text-snippet.api.ts:23-50 — API service pattern
@Injectable()
export class TextSnippetApi extends PlatformApiService {
    protected get apiUrl(): string {
        return `${this.domainModuleConfig.textSnippetApiHost}/api/TextSnippet`;
    }

    public search(query: SearchTextSnippetQuery): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
        return this.get<IPlatformPagedResultDto<TextSnippetDataModel>>('/search', query).pipe(
            map(_ => new PlatformPagedResultDto({ data: _, itemInstanceCreator: item => new TextSnippetDataModel(item) }))
        );
    }

    public save(command: SaveTextSnippetCommand): Observable<SaveTextSnippetCommandResult> {
        return this.post<SaveTextSnippetCommandResult>('/save', command, { enableCache: false });
    }
}
```

| API Base                           | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `PlatformApiService`               | REST API calls with caching, error handling, event publishing |
| `PlatformHttpOptionsConfigService` | HTTP headers/interceptor configuration                        |
| `PlatformCoreModuleConfig`         | Base URL and module configuration                             |

**Base class path:** `libs/platform-core/src/lib/api-services/abstracts/`. **Domain API path:** `libs/apps-domains/text-snippet-domain/src/lib/apis/` (e.g. `text-snippet.api.ts`, `task-item.api.ts`).

**MUST** extend `PlatformApiService`. **NEVER** use `HttpClient` directly — domain API services are injected into stores, never called from components.
**MUST** use `PlatformCommandDto` for commands, `PlatformPagedQueryDto` for queries, `PlatformResultDto` for results.

## DTO Patterns

| Base DTO                                                   | Usage                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PlatformCommandDto`                                       | Write operations (save, delete) — `dtos/platform.command-dto.ts:4`                 |
| `PlatformQueryDto`                                         | Base query type                                                                    |
| `PlatformPagedQueryDto extends PlatformQueryDto`           | Paginated queries with `maxResultCount`, `skipCount` — `platform.query-dto.ts:181` |
| `PlatformResultDto`                                        | Command results — `platform.result-dto.ts:6`                                       |
| `PlatformPagedResultDto<TItem extends IPlatformDataModel>` | Paginated query results with `items`, `totalCount` — `platform.result-dto.ts:23`   |

DTOs live in `libs/platform-core/src/lib/dtos/` and use constructor-based initialization with the `Partial<T>` pattern for immutability.

## Forms

Forms are REACTIVE (`FormGroup`/`FormControl`/`FormArray`), driven by `PlatformFormComponent` (`libs/platform-core/src/lib/components/abstracts/platform.form-component.ts`). Validation lives in `initialFormConfig()` (validators attached to controls + group/dependent validations), NOT in templates.

```typescript
// task-detail.component.ts:172-195 — initialFormConfig
protected initialFormConfig = (): PlatformFormConfig<TaskDetailFormVm> => {
    const vm = this.currentVm();
    return {
        controls: {
            title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
            dueDate: new FormControl(vm.dueDate, [startEndValidator('dateRangeInvalid', ...)]),
            subTasks: {                                   // FormArray via modelItems/itemControl
                modelItems: () => vm.subTasks,
                itemControl: (item, index) => this.createSubTaskFormControls(item, index)
            }
        },
        dependentValidations: { /* dueDate revalidates when startDate changes */ }
    };
};
```

| `PlatformFormConfig` field | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `controls`                 | Control map; nested `{ modelItems, itemControl }` = FormArray  |
| `groupValidations`         | Cross-field validation (e.g. `['password','confirmPassword']`) |
| `dependentValidations`     | Revalidate a control when another changes                      |
| `childForms`               | Nested child form groups                                       |
| `afterInit`                | Hook after form built                                          |

Custom validators live in `libs/platform-core/src/lib/form-validators/` (`startEndValidator`, `async-validator`, `if-validator`, `white-space-validator`). Error display uses Angular 19 `@if` control flow + Material `<mat-error>`:

```html
@if (hasError('title', 'required')) { <mat-error>{{ getErrorMessage('title') }}</mat-error> }
```

**MUST** define validators in `initialFormConfig()`, NEVER template-driven.
**BAD (observed `task-detail.component.ts:446-466`):** `hasError()`/`getErrorMessage()` re-implemented per-component with hardcoded message strings. Per the Code Responsibility Hierarchy, error-message text belongs in the VM/model (lowest layer), not the component — promote shared helpers up rather than copy them.

## Subscription Cleanup

`PlatformComponent` provides `untilDestroyed<T>()` operator that auto-unsubscribes on component destroy.

```typescript
// task-detail.component.ts:206 — cleanup pattern
someObservable$.pipe(this.untilDestroyed()).subscribe(...);
```

**MUST** use `.pipe(this.untilDestroyed())` on ALL manual subscriptions.

Cleanup is enforced by the BASE CLASS, not developer discipline: `PlatformComponent` (`platform.component.ts`) defines `untilDestroyed<T>()` (`:488` = `takeUntil(destroyed$...)`), `subscribeUntilDestroyed()` (`:495`), and central subscription maps (`storeSubscription`/`storeAnonymousSubscription`) torn down by `cancelAllStoredSubscriptions()` (`:1135`). Because state flows through `select()` + async pipe, most components have ZERO manual subscriptions — only a few (e.g. `task-detail.component.ts:206`) subscribe directly and use the operator.

## Component Communication

Feature components use CLASSIC decorator-based `@Input`/`@Output` + `EventEmitter` (Angular 19 signal `input()`/`output()` is NOT yet adopted in feature code).

- `@Input() set task(value)` setter that re-inits VM + form (`task-detail.component.ts:110`)
- `@Output() taskSaved/cancelled = new EventEmitter<...>()` (`task-detail.component.ts:118-124`)

**MUST** keep dropdown option arrays and display constants on the enum/model layer, NOT as component fields (observed smell: `task-detail.component.ts:131-144`).

## Routing

The example app is router-less: `app.routes.ts:3` declares `export const appRoutes: Routes = [];` (EMPTY) — it is a single-page composition driven by `app.component.ts`, with NO `canActivate`/`loadComponent`/`loadChildren`/guards/resolvers anywhere. `provideRouter(appRoutes, withComponentInputBinding())` is still wired in `app.config.ts:26`. Cross-cutting concerns (API errors) flow through the platform event-handler mechanism (`appApiErrorEventHandlers`, `app.config.ts:49`), not `Router.events`.

## Directives & Pipes

All platform-core directives extend `PlatformDirective`; all pipes extend `PlatformPipe`. Standalone, kebab-case files, abstract base in `abstracts/`. Cross-cutting reusables are prefixed `platform*`.

| Type      | Class                             | Selector / name             | File                                           |
| --------- | --------------------------------- | --------------------------- | ---------------------------------------------- |
| Directive | `SwipeToScrollDirective`          | `[platformSwipeToScroll]`   | `directives/swipe-to-scroll.directive.ts`      |
| Directive | `DisabledControlDirective`        | `[platformDisabledControl]` | `directives/disabled-control.directive.ts`     |
| Pipe      | `PlatformHighlightSearchTextPipe` | `platformHighlight`         | `pipes/platform-highlight-search-text.pipe.ts` |
| Pipe      | `LogTimesDisplayPipe`             | `logTimesDisplay` (pure)    | `pipes/log-times-display.pipe.ts`              |

## Directory Structure Conventions

| Directory                                            | Contents                                                  |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `apps/{app}/src/app/shared/base/`                    | App-level base component classes                          |
| `apps/{app}/src/app/shared/components/`              | Feature components with store + VM                        |
| `apps/{app}/src/app/events/`                         | App event handlers (e.g. API-error handler)               |
| `apps/{app}/src/styles/`                             | App SCSS (variables, mixins, themes, component overrides) |
| `libs/platform-core/src/lib/components/abstracts/`   | Platform base component classes                           |
| `libs/platform-core/src/lib/view-models/`            | `PlatformVmStore`, `PlatformVm`                           |
| `libs/platform-core/src/lib/api-services/abstracts/` | `PlatformApiService` / `PlatformHttpService` base         |
| `libs/platform-core/src/lib/directives/`             | Reusable directives                                       |
| `libs/platform-core/src/lib/pipes/`                  | Reusable pipes                                            |
| `libs/platform-core/src/lib/form-validators/`        | Reusable reactive-form validators                         |
| `libs/platform-core/src/styles/`                     | Design token SCSS variables and mixins                    |
| `libs/apps-domains/{domain}/`                        | Domain API services, data models, repositories, DTOs      |

**Reserved (README-only placeholders, not yet implemented):** `libs/platform-components/`, `libs/apps-shared-components/`, `libs/apps-domains-components/` document an intended 3-tier component-reuse layering (platform-components = cross-project > apps-shared-components = cross-app > apps-domains-components = cross-domain-app). Only `platform-core` and `apps-domains/text-snippet-domain` are registered Nx libs with tsconfig aliases (`@libs/platform-core`, `@libs/apps-domains/text-snippet-domain`).

## Styling Conventions

Component-scoped SCSS with BEM naming. Import variables and mixins via `@use`. See `docs/project-reference/scss-styling-guide.md` for full guide.

**MUST** extend `AppBase*` classes. **MUST** use `effectSimple()` + `tapResponse()`. **MUST** use `.pipe(this.untilDestroyed())`.
**MUST** put logic in VM (lowest layer). **NEVER** use `HttpClient` directly. **MUST** apply BEM on all template elements.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Final Purpose:** Every Angular change follows platform conventions (AppBase\* classes, `PlatformVmStore`, `PlatformApiService`, base-class cleanup, reactive forms, BEM) — correct, leak-free, review-ready frontend code.
**IMPORTANT MUST ATTENTION** extend `AppBase*`, NEVER `Platform*` directly — why: skips the app-wide extension seam.
**IMPORTANT MUST ATTENTION** put logic in the VM (lowest layer) — query builders, display helpers, dropdown options, and form error-message text belong on the model/enum, NOT the component (anti-pattern: `task-detail.component.ts:454-466`).
**IMPORTANT MUST ATTENTION** use `effectSimple()` + `tapResponse()` for store async; NEVER manual `subscribe()` in a store. Stores are per-component-provided.
**IMPORTANT MUST ATTENTION** call API only through `PlatformApiService` subclasses injected into stores; NEVER `HttpClient` in components.
**IMPORTANT MUST ATTENTION** apply BEM (`block__element--modifier`) on every template element; use `@if`/`@for` control flow + Material 3.
