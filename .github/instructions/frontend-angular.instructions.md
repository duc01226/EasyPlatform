---
applyTo: "src/PlatformExampleAppWeb/**/*.ts,src/PlatformExampleAppWeb/**/*.html,src/PlatformExampleAppWeb/**/*.scss"
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

## Component Selection Guide

| Need                 | Base Class                              |
| -------------------- | --------------------------------------- |
| Simple UI display    | `AppBaseComponent`                      |
| Complex state        | `AppBaseVmStoreComponent<State, Store>` |
| Form with validation | `AppBaseFormComponent<FormVm>`          |

## Store Pattern (Complex State Management)

```typescript
@Injectable()
export class TextSnippetStore extends PlatformVmStore<TextSnippetState> {
    private snippetApi = inject(TextSnippetApiService);

    // Cache configuration (optional)
    protected get enableCaching() {
        return true;
    }
    protected cachedStateKeyName = () => 'TextSnippetStore';
    protected vmConstructor = (data?: Partial<TextSnippetState>) => new TextSnippetState(data);
    protected beforeInitVm = () => this.loadInitialData();

    // Effects for async operations
    public loadSnippets = this.effectSimple(() =>
        this.snippetApi.getList().pipe(
            this.observerLoadingErrorState('loadSnippets'),
            this.tapResponse(snippets => this.updateState({ snippets }))
        )
    );

    public saveSnippet = this.effectSimple<SaveCommand>((cmd$) =>
        cmd$.pipe(
            switchMap(cmd => this.snippetApi.save(cmd).pipe(
                this.observerLoadingErrorState('saveSnippet'),
                this.tapResponse(
                    result => {
                        this.updateState(state => ({
                            snippets: [...state.snippets, result.data]
                        }));
                        this.showSuccessMessage('Saved successfully');
                    }
                )
            ))
        )
    );

    // State selectors
    public readonly snippets$ = this.select(state => state.snippets);
    public readonly loading$ = this.isLoading$('loadSnippets');
    public readonly saving$ = this.isLoading$('saveSnippet');
}

// Component using store
@Component({
    selector: 'app-text-snippet-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.snippets; track item.id) {
                    <div class="snippet-list__item">{{ item.snippetText }}</div>
                }
            }
        </app-loading-and-error-indicator>
    `,
    providers: [TextSnippetStore]
})
export class TextSnippetListComponent extends AppBaseVmStoreComponent<TextSnippetState, TextSnippetStore> {
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

## Form Pattern with Validation

```typescript
export class TextSnippetFormComponent extends AppBaseFormComponent<TextSnippetFormVm> {
    private snippetApi = inject(TextSnippetApiService);

    protected initialFormConfig = () => ({
        controls: {
            snippetText: new FormControl(
                this.currentVm().snippetText,
                [Validators.required, Validators.maxLength(1000)],
                [ifAsyncValidator(() => !this.isViewMode, this.checkUniqueCode.bind(this))]
            ),
            category: new FormControl(
                this.currentVm().category,
                [Validators.required]
            ),
            tags: {
                modelItems: () => this.currentVm().tags,
                itemControl: (tag, index) => new FormGroup({
                    name: new FormControl(tag.name, [Validators.required]),
                    value: new FormControl(tag.value)
                })
            }
        },
        dependentValidations: {
            snippetText: ['category'],  // When snippetText changes, revalidate category
            category: ['tags']
        }
    });

    private checkUniqueCode(control: AbstractControl): Observable<ValidationErrors | null> {
        return this.snippetApi.checkCodeExists(control.value).pipe(
            map(exists => exists ? { codeExists: true } : null),
            catchError(() => of(null))
        );
    }

    onSubmit() {
        if (this.validateForm()) {
            const command = {
                id: this.currentVm().id,
                snippetText: this.currentVm().snippetText,
                category: this.currentVm().category,
                tags: this.currentVm().tags
            };

            this.snippetApi.save(command)
                .pipe(
                    this.observerLoadingErrorState('save'),
                    this.tapResponse(() => {
                        this.showSuccessMessage('Saved successfully');
                        this.router.navigate(['../'], { relativeTo: this.route });
                    }),
                    this.untilDestroyed()
                )
                .subscribe();
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

    getList(query?: Query): Observable<TextSnippetDto[]> {
        return this.get<TextSnippetDto[]>('', query);
    }

    getById(id: string): Observable<TextSnippetDto> {
        return this.get<TextSnippetDto>(`/${id}`);
    }

    save(cmd: SaveCommand): Observable<SaveResult> {
        return this.post<SaveResult>('', cmd);
    }

    delete(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    search(criteria: SearchCriteria): Observable<TextSnippetDto[]> {
        return this.post('/search', criteria, {
            enableCache: true,  // Cache GET-like POST requests
            cacheTimeInSeconds: 300
        });
    }

    checkCodeExists(code: string): Observable<boolean> {
        return this.get<boolean>(`/check-code/${code}`);
    }
}
```

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

| Layer            | Responsibility                                                                        |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Entity/Model** | Display helpers, static factory methods, default values, dropdown options, validation |
| **Service**      | API calls, command factories, data transformation                                     |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                          |

```typescript
// ❌ WRONG: Logic in component (leads to duplication)
export class ConfigFormComponent {
    readonly authTypes = [
        { value: 1, label: 'OAuth2' },
        { value: 2, label: 'SAML' },
        { value: 3, label: 'API Key' }
    ];

    getStatusClass(config: Config) {
        return config.isEnabled ? 'status-active' : 'status-disabled';
    }

    getStatusText(config: Config) {
        return config.isEnabled ? 'Active' : 'Disabled';
    }
}

// ✅ CORRECT: Logic in entity/model (90% belongs to entity)
export class AuthConfigurationDisplay {
    // Static dropdown options
    static readonly authTypes = [
        { value: 1, label: 'OAuth2' },
        { value: 2, label: 'SAML' },
        { value: 3, label: 'API Key' }
    ];

    static getAuthTypeLabel(value: number): string {
        return this.authTypes.find(t => t.value === value)?.label ?? 'Unknown';
    }

    // Instance display methods
    getStatusCssClass(): string {
        return this.isEnabled ? 'status-active' : 'status-disabled';
    }

    getStatusText(): string {
        return this.isEnabled ? 'Active' : 'Disabled';
    }

    getDisplayName(): string {
        return `${this.name} (${AuthConfigurationDisplay.getAuthTypeLabel(this.authType)})`;
    }
}

// Component now just uses entity
export class ConfigFormComponent {
    readonly authTypes = AuthConfigurationDisplay.authTypes;

    // Delegates to entity
    getStatusClass(config: AuthConfigurationDisplay) {
        return config.getStatusCssClass();
    }
}
```

## BEM Naming Convention (MANDATORY)

**CRITICAL:** Every UI element MUST have a BEM class, even without special styling. Treat CSS classes as OOP structure.

### BEM Structure

```
block              → Component wrapper (e.g., .user-card)
block__element     → Child element (e.g., .user-card__title)
block__element --modifier → State/variant (e.g., .user-card__btn --primary --large)
```

### Modifier Convention: Space-Separated `--modifier`

```html
<!-- ✅ CORRECT: Space-separated modifiers -->
<button class="user-card__btn --primary --large">Save</button>
<div class="entity-list__item --selected --highlighted">Item</div>

<!-- ❌ WRONG: Suffix-style modifiers -->
<button class="user-card__btn--primary user-card__btn--large">Save</button>
```

### Template Example

```html
<!-- ✅ CORRECT: Every element has a BEM class -->
<div class="user-card">
    <div class="user-card__header">
        <img class="user-card__avatar" [src]="user.avatar" />
        <h2 class="user-card__title">{{ user.name }}</h2>
        <span class="user-card__badge --premium">Premium</span>
    </div>
    <div class="user-card__content">
        <p class="user-card__description">{{ user.bio }}</p>
    </div>
    <div class="user-card__footer">
        <button class="user-card__btn --secondary" (click)="onCancel()">Cancel</button>
        <button class="user-card__btn --primary" (click)="onSave()">Save</button>
    </div>
</div>

<!-- ❌ WRONG: Elements without BEM classes -->
<div class="user-card">
    <div><!-- Missing class! -->
        <img [src]="user.avatar" /><!-- Missing class! -->
        <h2>{{ user.name }}</h2><!-- Missing class! -->
    </div>
</div>
```

### SCSS with Modifiers

```scss
@import '~assets/scss/variables';

// Host element - makes Angular element a proper block container
my-user-card {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.user-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    border: 1px solid $border-color;
    border-radius: 8px;

    &__header {
        padding: 1rem;
        border-bottom: 1px solid $border-color;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }

    &__title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
    }

    &__badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;

        &.--premium {
            background: $premium-color;
            color: white;
        }

        &.--trial {
            background: $trial-color;
            color: $text-color;
        }
    }

    &__btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &.--primary {
            background: $primary-color;
            color: white;
        }

        &.--secondary {
            background: transparent;
            border: 1px solid $border-color;
        }

        &.--large {
            padding: 1rem 2rem;
            font-size: 1.125rem;
        }
    }
}
```

## RxJS Operators and Utilities

```typescript
import {
    skipDuplicates,
    applyIf,
    onCancel,
    tapOnce,
    distinctUntilObjectValuesChanged
} from '@libs/platform-core';

// Custom operators
this.search$
    .pipe(
        skipDuplicates(500), // Skip duplicates within 500ms
        applyIf(this.isEnabled$, debounceTime(300)), // Conditional operator
        onCancel(() => this.cleanup()), // Handle cancellation
        tapOnce({ next: v => this.initOnce(v) }), // Execute only on first emission
        distinctUntilObjectValuesChanged(), // Deep object comparison
        this.untilDestroyed()
    )
    .subscribe();
```

## Watch Decorator Patterns

```typescript
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
    // Watch for any property change
    @Watch('onPageResultChanged')
    public pagedResult?: PagedResult<Item>;

    // Only trigger on actual value change (not reference)
    @WatchWhenValuesDiff('performSearch')
    public searchTerm: string = '';

    private onPageResultChanged(
        value: PagedResult<Item> | undefined,
        change: SimpleChange<PagedResult<Item>>
    ) {
        if (!change.isFirstTimeSet) {
            this.updateUI();
        }
    }

    private performSearch(term: string) {
        this.apiService
            .search(term)
            .pipe(this.untilDestroyed())
            .subscribe(results => (this.results = results));
    }
}
```

## Form Validators

```typescript
import {
    ifAsyncValidator,
    startEndValidator,
    noWhitespaceValidator,
    validator
} from '@libs/platform-core';

// Sync validators
new FormControl('', [
    Validators.required,
    noWhitespaceValidator,
    Validators.email,
    Validators.minLength(3),
    Validators.maxLength(200)
]);

// Range validator (start/end dates)
startDate: new FormControl('', [Validators.required]),
endDate: new FormControl('', [
    Validators.required,
    startEndValidator(
        'invalidRange',
        ctrl => ctrl.parent?.get('startDate')?.value,
        ctrl => ctrl.value,
        { allowEqual: false }
    )
]);

// Async validators (only run if sync valid)
email: new FormControl('', [Validators.required, Validators.email], [
    ifAsyncValidator(ctrl => ctrl.valid, this.checkEmailUnique.bind(this))
]);
```

## Utility Functions

```typescript
import {
    // Date utilities
    date_addDays,
    date_format,
    date_timeDiff,
    date_isWeekend,
    date_startOfDay,
    date_endOfDay,

    // List utilities
    list_groupBy,
    list_distinctBy,
    list_sortBy,
    list_findMax,
    list_findMin,

    // String utilities
    string_isEmpty,
    string_truncate,
    string_toCamelCase,
    string_toKebabCase,
    string_capitalize,

    // Dictionary utilities
    dictionary_map,
    dictionary_filter,
    dictionary_values,
    dictionary_keys,

    // Object utilities
    immutableUpdate,
    deepClone,
    removeNullProps,
    objectEqual,

    // Task utilities
    task_delay,
    task_debounce,
    task_retry,

    // GUID utilities
    guid_generate,
    guid_isValid
} from '@libs/platform-core';

// Usage examples
const formatted = date_format(new Date(), 'yyyy-MM-dd');
const grouped = list_groupBy(items, item => item.category);
const truncated = string_truncate(longText, 100);
const updated = immutableUpdate(state, { count: state.count + 1 });
```

## Platform Component APIs

```typescript
export class MyComponent extends PlatformComponent {
    // Track-by for performance
    trackByItem = this.ngForTrackByItemProp<User>('id');
    trackByList = this.ngForTrackByImmutableList(this.users);

    // Named subscription management
    protected storeSubscription('dataLoad', this.data$.subscribe(...));
    protected cancelStoredSubscription('dataLoad');

    // Multiple request state tracking
    isLoading$('request1');
    isLoading$('request2');
    getAllErrorMsgs$(['req1', 'req2']);
    loadingRequestsCount();
    reloadingRequestsCount();

    // Dev-mode state validation
    protected get devModeCheckLoadingStateElement() {
        return '.spinner';
    }
    protected get devModeCheckErrorStateElement() {
        return '.error';
    }
}
```

## Authorization in Components

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    // Role checks
    get canEdit() {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany();
    }

    get canDelete() {
        return this.hasRole(PlatformRoles.Admin);
    }

    get isOwnCompany() {
        return this.currentVm().companyId === this.currentCompanyId();
    }

    // Context access
    get currentUserId() {
        return this.authService.currentUserId();
    }

    get currentCompanyId() {
        return this.authService.currentCompanyId();
    }
}

// Template guards
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="delete()">Delete</button>
}

@if (canEdit) {
    <input [(ngModel)]="vm.name" />
} @else {
    <span>{{ vm.name }}</span>
}
```

## Platform Directives

```html
<!-- Swipe to scroll horizontally -->
<div platformSwipeToScroll>
    <div class="scrollable-content">...</div>
</div>

<!-- Conditional disable -->
<input [platformDisabledControl]="isDisabled" />
```

## Anti-Patterns

```typescript
// ❌ WRONG: Direct HTTP client usage
constructor(private http: HttpClient) {}
this.http.get('/api/employees').subscribe();

// ✅ CORRECT: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}
this.employeeApi.getList().subscribe();

// ❌ WRONG: Manual state management
employees = signal([]);
loading = signal(false);

// ✅ CORRECT: Use platform store pattern
constructor(private store: EmployeeStore) {}

// ❌ WRONG: Missing subscription cleanup
this.data$.subscribe(); // Memory leak!

// ✅ CORRECT: Always use untilDestroyed()
this.data$.pipe(this.untilDestroyed()).subscribe();

// ❌ WRONG: Skip loading/error state handling
this.apiCall$.subscribe();

// ✅ CORRECT: Use observerLoadingErrorState
this.apiCall$.pipe(this.observerLoadingErrorState('key')).subscribe();

// ❌ WRONG: Logic in component (duplication)
readonly statusOptions = [{ value: 1, label: 'Active' }];

// ✅ CORRECT: Logic in entity/model (reusable)
readonly statusOptions = EmployeeStatus.dropdownOptions;

// ❌ WRONG: Elements without BEM classes
<div><span>{{ user.name }}</span></div>

// ✅ CORRECT: ALL elements have BEM classes
<div class="user-card__header">
    <span class="user-card__name">{{ user.name }}</span>
</div>
```
