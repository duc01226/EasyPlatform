# Frontend Development Patterns — Project Reference

## Document Summary

**What this file covers:** Complete Angular 19 + Nx + Easy.Platform frontend reference — from component base classes through state management (PlatformVmStore), reactive forms, API services, BEM templates, SharedCommon shared library, authorization, advanced decorators (@Watch), RxJS operators, caching, and platform-core utilities.

**Sections:**

| #   | Section                                                                | What You'll Find                                                                                |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | [Component Base Classes](#project-component-base-classes)           | `AppBaseComponent` → `AppBaseVmStoreComponent` / `AppBaseFormComponent` hierarchy               |
| 2   | [State Management](#project-state-management)                       | `PlatformVmStore`, `effectSimple()`, `untilDestroyed()` rules                                   |
| 3   | [Shared Library](#project-shared-component-library-apps-shared-components)    | AppAlert, AppTable, AppSelect, directives, pipes                                          |
| 4   | [Directory Structure](#project-frontend-directory-structure)           | `apps/`, `libs/platform-core/`, `libs/apps-shared-components/`, `libs/apps-domains/`                      |
| 5   | [Design System Paths](#project-design-system-paths)                 | Design tokens, SCSS guide, per-app theme references                                             |
| 6   | [BEM Template Standard](#component-html-template-standard-bem-classes) | [MUST NOT] elements without classes — BEM naming convention                                     |
| 7   | [Component Hierarchy](#component-hierarchy)                            | Platform → App → Feature 3-layer inheritance chain                                              |
| 8   | [Platform Component API](#platform-component-api-reference)            | `PlatformComponent`, `PlatformVmComponent`, `PlatformVmStoreComponent`, `PlatformFormComponent` |
| 9   | [Usage Examples](#usage-examples)                                      | Loading state, store pattern, form component with validation                                    |
| 10  | [API Service](#api-service-pattern)                                    | `PlatformApiService` extension, `get`/`post`, `enableCache`                                     |
| 11  | [Working Examples](#working-examples-reference)                        | Reference files in `playground-text-snippet/` for loading, forms, stores                        |
| 12  | [SharedCommon Library](#sharedcommon-library-reference)                  | Foundation classes, components, directives, pipes, services, utilities                          |
| 13  | [Authorization](#frontend-authorization-patterns)                      | `hasRole()`, template guards, route guards                                                      |
| 14  | [Component Template](#component-template-pattern)                      | Standard `@Component` scaffold with `app-loading-and-error-indicator`                           |
| 15  | [Task Decision Tree](#frontend-task-decision-tree)                     | Feature → base class selection flowchart                                                        |
| 16  | [Advanced Component APIs](#advanced-component-apis)                    | `@Watch`, `skipDuplicates`, `ngForTrackBy*`, `storeSubscription`, `devModeCheck*`               |
| 17  | [Store with Caching](#store-with-caching)                              | `enableCaching`, `cachedStateKeyName`, `vmConstructor`, `beforeInitVm`                          |
| 18  | [Advanced Form Validators](#advanced-form-validators)                  | `noWhitespaceValidator`, `startEndValidator`, `ifValidator` conditional validation              |
| 19  | [Platform Core Utilities](#platform-core-utilities)                    | `date_format`, `list_groupBy`, `immutableUpdate`, `PlatformCoreModule`, platform directives     |
| 20  | [Anti-Patterns](#anti-patterns-critical)                               | 3 [MUST NOT] rules: no direct HttpClient, no manual signals, always `untilDestroyed()`          |

---

## Project Component Base Classes

```
AppBaseComponent                     // + Auth, roles, context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error
```

- Source: `src/Frontend/libs/platform-core/src/lib/components/abstracts/`
- All components MUST extend one of these base classes

## Project State Management

- Use `PlatformVmStore` for state management (NEVER manual signals)
- Use `effectSimple()` for side effects
- Use `.pipe(this.untilDestroyed())` for all subscriptions

## Project Shared Component Library (apps-shared-components)

- Location: `src/Frontend/libs/apps-shared-components/`
- Components: AppAlert, AppIcon, AppTable, Attachment, AppSelect
- Directives: AppPopover, TextEllipsis, AppButton, Autofocus
- Pipes: LocalizedDate, Pluralize, AppSafe, TranslateComma
- Import: `import { AppCommonModule } from '@libs/apps-shared-components'`

## Project Frontend Directory Structure

```
src/Frontend/
├── apps/
│   └── playground-text-snippet/   # Example app (TextSnippet CRUD)
├── libs/
│   ├── platform-core/             # Base components, stores, API service
│   ├── platform-components/       # Reusable platform UI components
│   ├── apps-shared-components/    # Shared UI components across apps
│   ├── apps-domains/              # Business domain (APIs, models)
│   ├── apps-domains-components/   # Cross-domain shared components
└── ...
```

## Project Design System Paths

- Design tokens: `docs/design-system/`
- SCSS guide: `docs/claude/scss-styling-guide.md`
- Per-app themes: `docs/design-system/{app}-style-guide.md`

## Component HTML Template Standard (BEM Classes)

**All UI elements in component templates MUST have BEM classes, even without styling needs.** This makes HTML self-documenting like OOP class hierarchy.

```html
<!-- CORRECT: All elements have BEM classes for structure clarity -->
<div class="text-snippet-form">
    <div class="text-snippet-form__header">
        <h2 class="text-snippet-form__title">Text Snippet Details</h2>
    </div>
    <div class="text-snippet-form__body">
        <div class="text-snippet-form__field">
            <label class="text-snippet-form__label">Title</label>
            <input class="text-snippet-form__input" formControlName="title" />
        </div>
        <div class="text-snippet-form__field">
            <label class="text-snippet-form__label">Content</label>
            <textarea class="text-snippet-form__textarea" formControlName="content"></textarea>
        </div>
    </div>
    <div class="text-snippet-form__footer">
        <button class="text-snippet-form__btn --cancel">Cancel</button>
        <button class="text-snippet-form__btn --submit">Save</button>
    </div>
</div>

<!-- [MUST NOT] Elements without classes - structure unclear -->
<div class="text-snippet-form">
    <div>
        <h2>Text Snippet Details</h2>
    </div>
    <div>
        <div>
            <label>Title</label>
            <input formControlName="title" />
        </div>
        <div>
            <label>Content</label>
            <textarea formControlName="content"></textarea>
        </div>
    </div>
    <div>
        <button>Cancel</button>
        <button>Save</button>
    </div>
</div>
```

**BEM Naming Convention:**

- **Block**: Component name (e.g., `text-snippet-form`)
- **Element**: Child using `block__element` (e.g., `text-snippet-form__header`)
- **Modifier**: Separate class with `--` prefix (e.g., `text-snippet-form__btn --submit --large`)

## Component Hierarchy

```typescript
// Platform foundation layer
PlatformComponent                    // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             // + ViewModel injection
├── PlatformFormComponent           // + Reactive forms integration
└── PlatformVmStoreComponent        // + ComponentStore state management

// Application framework layer
AppBaseComponent                     // + Auth, roles, context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error

// Feature implementation layer
TextSnippetListComponent extends AppBaseVmStoreComponent
TextSnippetDetailComponent extends AppBaseFormComponent
TaskListComponent extends AppBaseComponent
```

## Platform Component API Reference

**Location**: `src/Frontend/libs/platform-core/src/lib/components/abstracts/`

### PlatformComponent - Foundation

```typescript
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
```

### PlatformVmComponent - ViewModel Management

```typescript
export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
    public get vm(): WritableSignal<TViewModel | undefined>;
    public currentVm(): TViewModel;
    protected updateVm(partialOrUpdaterFn, onVmChanged?, options?): TViewModel;
    @Input('vm') vmInput;
    @Output('vmChange') vmChangeEvent;
    protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}
```

### PlatformVmStoreComponent - ComponentStore Integration

```typescript
export abstract class PlatformVmStoreComponent<TViewModel, TStore> extends PlatformComponent {
    constructor(public store: TStore) {}
    public get vm(): Signal<TViewModel | undefined>;
    public currentVm(): TViewModel;
    public updateVm(partialOrUpdaterFn, options?): void;
    public reload(): void; // Reloads all stores
}
```

### PlatformFormComponent - Reactive Forms

```typescript
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

## Usage Examples

### Basic Component with Loading State

```typescript
export class UserListComponent extends PlatformComponent {
    private loadUsers() {
        this.userService
            .getUsers()
            .pipe(
                this.observerLoadingErrorState('loadUsers'),
                this.tapResponse(users => (this.users = users)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}
```

### Store Pattern

```typescript
export class UserListStore extends PlatformVmStore<UserListVm> {
    public loadUsers = this.effectSimple(() => this.userApi.getUsers().pipe(this.tapResponse(users => this.updateState({ users }))));
    public readonly users$ = this.select(state => state.users);
}

export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
    constructor(store: UserListStore) {
        super(store);
    }
    onRefresh() {
        this.reload();
    }
}
```

### Form Component

```typescript
export class TextSnippetFormComponent extends AppBaseFormComponent<TextSnippetFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      snippetText: new FormControl(this.currentVm().snippetText,
        [Validators.required],
        [ifAsyncValidator(() => !this.isViewMode,
          checkIsSnippetTextUniqueAsyncValidator(...))])
    },
    dependentValidations: { snippetText: ['fullText'] }
  });

  onSubmit() {
    if (this.validateForm()) {
      // process this.currentVm()
    }
  }
}
```

## API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class TextSnippetApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/TextSnippet';
    }

    getTextSnippets(query?: Query): Observable<TextSnippet[]> {
        return this.get<TextSnippet[]>('', query);
    }

    saveTextSnippet(cmd: SaveCommand): Observable<Result> {
        return this.post<Result>('', cmd);
    }

    searchTextSnippets(criteria: Search): Observable<TextSnippet[]> {
        return this.post('/search', criteria, { enableCache: true });
    }
}
```

## Working Examples Reference

**Location**: `src/Frontend/apps/playground-text-snippet/src/app/shared/components/`

| Example            | File                                           | Use Case                     |
| ------------------ | ---------------------------------------------- | ---------------------------- |
| Text Snippet CRUD  | `app-text-snippet-detail/`                     | Detail view, state binding   |
| Task List          | `task-list/task-list.component.ts`             | List with store, loading     |
| Task Detail        | `task-detail/task-detail.component.ts`         | Detail form, validation      |
| Nav Loading Test   | `nav-loading-test/nav-loading-test.component.ts` | Navigation loading states |

### FormArray Pattern

```typescript
protected initialFormConfig = () => ({
  controls: {
    specifications: {
      modelItems: () => vm.specifications,
      itemControl: (spec, index) => new FormGroup({
        name: new FormControl(spec.name, [Validators.required]),
        value: new FormControl(spec.value, [Validators.required])
      })
    }
  },
  dependentValidations: { price: ['category'] }
});
```

## SharedCommon Library Reference

**Location**: `src/Frontend/libs/apps-shared-components/`

### Foundation Classes

```typescript
// Extend BaseComponent/BaseDirective (lifecycle, detectChanges(), untilDestroy())
export class MyComponent extends BaseComponent {}
export class MyDirective extends BaseDirective {}
```

### Components

```typescript
// AppAlert, AppIcon, AppTable, Attachment, AppSelect
<app-select
  formControlName="ids"
  [fetchDataFn]="fetchFn"
  [multiple]="true"
  [searchable]="true" />
```

### Directives

```typescript
// AppPopover, TextEllipsis, AppButton, Autofocus
<div appTextEllipsis [maxTextEllipsisLines]="2">...</div>
```

### Pipes

```typescript
// LocalizedDate, Pluralize, AppSafe, TranslateComma
{{ date | localizedDate:'shortDate' }}
{{ 'item' | pluralize:count }}
```

### Services

```typescript
// AppTranslateService, ThemeService, AppScriptService
constructor(
  private translateSvc: AppTranslateService,
  private themeSvc: ThemeService
) { }
```

### Utilities

```typescript
// ArrayUtil, DateUtil, StringUtil
ArrayUtil.toDictionary(items, x => x.id);
DateUtil.format(new Date(), 'DD/MM/YYYY');
StringUtil.isNullOrEmpty(value);
```

### Module Import

```typescript
import { AppCommonModule } from '@libs/apps-shared-components';
import { AppCommonRootModule } from '@libs/apps-shared-components';  // App root only
@NgModule({ imports: [AppCommonModule] })
```

## Frontend Authorization Patterns

```typescript
// Component properties
export class TextSnippetFormComponent extends AppBaseFormComponent<TextSnippetFormVm> {
  get canEdit() {
    return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager)
      && this.isOwnCompany();
  }
  get canDelete() {
    return this.hasRole(PlatformRoles.Admin);
  }
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

## Component Template Pattern

```typescript
@Component({
  selector: 'app-{entity}-list',
  template: `
    <app-loading-and-error-indicator [target]="this">
      @if (vm(); as vm) {
        @for (item of vm.items; track item.id) {
          <div>{{ item.name }}</div>
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

## Frontend Task Decision Tree

```
Need to add frontend feature?
├── Simple component? → Extend AppBaseComponent
├── Complex state? → Use AppBaseVmStoreComponent + PlatformVmStore
├── Forms? → Extend AppBaseFormComponent with validation
├── API calls? → Create service extending PlatformApiService
├── Cross-domain logic? → Add to apps-domains-components
├── Domain-specific? → Add to apps-domains/{domain}/ module
└── Cross-app reusable? → Add to apps-shared-components
```

## Advanced Component APIs

```typescript
// @Watch decorator — triggers callback on property change
@Watch('onChanged') public data?: Data;
@WatchWhenValuesDiff('search') public term = '';
private onChanged(v: Data, c: SimpleChange<Data>) { if (!c.isFirstTimeSet) this.update(); }

// Advanced RxJS operators from platform-core
this.search$.pipe(skipDuplicates(500), applyIf(this.enabled$, debounceTime(300)), tapOnce({ next: v => this.init(v) }), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// PlatformComponent utility APIs
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
isLoading$('req1'); isLoading$('req2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
protected get devModeCheckLoadingStateElement() { return '.spinner'; }
protected get devModeCheckErrorStateElement() { return '.error'; }
```

## Store with Caching

```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (d?: Partial<MyVm>) => new MyVm(d);
  protected beforeInitVm = () => this.loadInitialData();
  loadData = this.effectSimple(() => this.api.get().pipe(this.observerLoadingErrorState('load'), this.tapResponse(d => this.updateState({ data: d }))));
}
```

## Advanced Form Validators

```typescript
// Built-in validators
new FormControl('', [Validators.required, noWhitespaceValidator, startEndValidator('err', c => c.parent?.get('start')?.value, c => c.value)], [ifAsyncValidator(c => c.valid, uniqueValidator)]);

// ifValidator — conditional validation using formControls()
protected initialFormConfig = () => ({
  controls: {
    teamsTenantId: new FormControl('', [
      ifValidator(
        () => this.formControls('teamsIsActive').value === true,
        () => Validators.required
      )
    ])
  }
});
// Pattern: ifValidator(() => condition, () => validator)
```

## Platform Core Utilities

```typescript
// Utility imports from platform-core
import { date_format, date_addDays, date_timeDiff, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty, string_truncate, dictionary_map, dictionary_filter, immutableUpdate, deepClone, removeNullProps, guid_generate, task_delay, task_debounce } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />
```

## Anti-Patterns (CRITICAL)

```typescript
// [MUST NOT] Direct HttpClient → Extend PlatformApiService
// [MUST NOT] Manual signals → Use PlatformVmStore
// [MUST NOT] Missing untilDestroyed() → Always use .pipe(this.untilDestroyed())
```
