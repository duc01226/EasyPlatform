<!-- Last scanned: 2026-04-03 -->
<!-- CRITICAL: Extend AppBase* not Platform* directly. Use effectSimple() in stores. .pipe(this.untilDestroyed()) on ALL subscriptions. BEM on ALL template elements. -->

# Frontend Patterns Reference

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

Built on NgRx `ComponentStore`. Each store manages a `PlatformVm` view model with built-in loading/error/caching.

```typescript
// task-list.store.ts:119-158 — Store pattern
@Injectable()
export class TaskListStore extends PlatformVmStore<TaskListVm> {
    public constructor(private taskApi: TaskItemApi) {
        super(new TaskListVm());
    }

    public vmConstructor = (data?: Partial<TaskListVm>) => new TaskListVm(data);
    protected cachedStateKeyName = () => 'TaskListStore';

    protected beforeInitVm = () => {
        this.loadTasks(this.query$);
    };

    public loadTasks = this.effectSimple((query: GetTaskListQuery, isReloading?: boolean) => {
        return this.taskApi.getList(query).pipe(
            this.tapResponse(result => {
                this.updateState({ tasks: result.items, totalTasks: result.totalCount });
            })
        );
    }, 'loadTasks');
}
```

| Store API                  | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `effectSimple(fn, key)`    | Define side effect with loading state tracking |
| `tapResponse(onSuccess)`   | Handle API response in effect pipe             |
| `updateState(partial)`     | Immutable state update                         |
| `currentState()`           | Get current state snapshot                     |
| `select(projector)`        | Derive observable from state                   |
| `cachedStateKeyName()`     | Enable state persistence across navigation     |
| `beforeInitVm()`           | Run effects on store initialization            |
| `initOrReloadVm(isReload)` | Initial data load / reload                     |

**MUST** use `effectSimple()` for async operations, NEVER manual `subscribe()` in stores.
**MUST** provide store in component `@Component({ providers: [MyStore] })`.

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

Extend `PlatformApiService`. Define `apiUrl` getter. Use `get/post/put/delete` methods with typed responses.

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

**Path:** `libs/apps-domains/text-snippet-domain/src/lib/apis/`

**MUST** extend `PlatformApiService`. **NEVER** use `HttpClient` directly.
**MUST** use `PlatformCommandDto` for commands, `PlatformPagedQueryDto` for queries, `PlatformResultDto` for results.

## DTO Patterns

| Base DTO                    | Usage                                                |
| --------------------------- | ---------------------------------------------------- |
| `PlatformCommandDto`        | Write operations (save, delete)                      |
| `PlatformPagedQueryDto`     | Paginated queries with `maxResultCount`, `skipCount` |
| `PlatformResultDto`         | Command results                                      |
| `PlatformPagedResultDto<T>` | Paginated query results with `items`, `totalCount`   |

DTOs use constructor-based initialization with `Partial<T>` pattern for immutability.

## Subscription Cleanup

`PlatformComponent` provides `untilDestroyed<T>()` operator that auto-unsubscribes on component destroy.

```typescript
// task-detail.component.ts:206 — cleanup pattern
someObservable$.pipe(this.untilDestroyed()).subscribe(...);
```

**MUST** use `.pipe(this.untilDestroyed())` on ALL manual subscriptions.

## Routing

Simple route config in `app.routes.ts` with `Routes` array. Uses `provideRouter(appRoutes, withComponentInputBinding())` in `app.config.ts`.

## Directory Structure Conventions

| Directory                                          | Contents                                                  |
| -------------------------------------------------- | --------------------------------------------------------- |
| `apps/{app}/src/app/shared/base/`                  | App-level base component classes                          |
| `apps/{app}/src/app/shared/components/`            | Feature components with store + VM                        |
| `apps/{app}/src/styles/`                           | App SCSS (variables, mixins, themes, component overrides) |
| `libs/platform-core/src/lib/components/abstracts/` | Platform base component classes                           |
| `libs/platform-core/src/lib/view-models/`          | `PlatformVmStore`, `PlatformVm`                           |
| `libs/platform-core/src/lib/api-services/`         | `PlatformApiService` base                                 |
| `libs/platform-core/src/lib/directives/`           | Reusable directives                                       |
| `libs/platform-core/src/lib/pipes/`                | Reusable pipes                                            |
| `libs/platform-core/src/styles/`                   | Design token SCSS variables and mixins                    |
| `libs/apps-domains/{domain}/`                      | Domain API services and data models                       |

## Styling Conventions

Component-scoped SCSS with BEM naming. Import variables and mixins via `@use`. See `docs/project-reference/scss-styling-guide.md` for full guide.

**MUST** extend `AppBase*` classes. **MUST** use `effectSimple()` + `tapResponse()`. **MUST** use `.pipe(this.untilDestroyed())`.
**MUST** put logic in VM (lowest layer). **NEVER** use `HttpClient` directly. **MUST** apply BEM on all template elements.
