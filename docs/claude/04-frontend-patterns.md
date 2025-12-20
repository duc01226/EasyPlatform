# Frontend Development Patterns

## Component Hierarchy

```typescript
// Platform foundation layer
PlatformComponent                    // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             // + ViewModel injection
├── PlatformFormComponent           // + Reactive forms integration
└── PlatformVmStoreComponent        // + ComponentStore state management

// Application framework layer
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error

// Feature implementation
EmployeeListComponent extends AppBaseVmStoreComponent
LeaveRequestFormComponent extends AppBaseFormComponent
```

## Platform Component API

```typescript
export abstract class PlatformComponent {
  // State signals
  public status$: WritableSignal<ComponentStateStatus>;
  public isStateLoading/isStateError/isStateSuccess(): Signal<boolean>;
  public errorMsg$(): Signal<string | undefined>;

  // Multi-request state tracking
  public observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
  public isLoading$(requestKey?: string): Signal<boolean | null>;
  public getErrorMsg$(requestKey?: string): Signal<string | undefined>;

  // Subscription management
  public untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
  protected tapResponse<T>(nextFn?, errorFn?, completeFn?): OperatorFunction<T, T>;
}

export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
  public get vm(): WritableSignal<TViewModel | undefined>;
  public currentVm(): TViewModel;
  protected updateVm(partialOrUpdaterFn): TViewModel;
  protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}

export abstract class PlatformVmStoreComponent<TViewModel, TStore> extends PlatformComponent {
  constructor(public store: TStore) {}
  public get vm(): Signal<TViewModel | undefined>;
  public currentVm(): TViewModel;
  public updateVm(partialOrUpdaterFn): void;
  public reload(): void;
}

export abstract class PlatformFormComponent<TViewModel> extends PlatformVmComponent<TViewModel> {
  public get form(): FormGroup<PlatformFormGroupControls<TViewModel>>;
  public get mode(): PlatformFormMode;  // 'create'|'update'|'view'
  public validateForm(): boolean;
  public formControls(key: keyof TViewModel): FormControl;
  protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}
```

## PlatformVmStore Pattern

```typescript
@Injectable()
export class UserListStore extends PlatformVmStore<UserListVm> {
    protected vmConstructor = (data?: Partial<UserListVm>) => new UserListVm(data);

    public loadUsers = this.effectSimple(() =>
        this.userApi.getUsers().pipe(
            this.observerLoadingErrorState('loadUsers'),
            this.tapResponse(users => this.updateState({ users }))
        )
    );

    public readonly users$ = this.select(state => state.users);
    public readonly loading$ = this.isLoading$('loadUsers');
}

@Component({
    providers: [UserListStore]
})
export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
    constructor(store: UserListStore) {
        super(store);
    }

    ngOnInit() {
        this.store.loadUsers();
    }
}
```

## API Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

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

## Form Component Pattern

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      email: new FormControl(this.currentVm().email,
        [Validators.required, Validators.email],
        [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueValidator(...))]
      ),
      specifications: {
        modelItems: () => this.currentVm().specifications,
        itemControl: (spec, index) => new FormGroup({
          name: new FormControl(spec.name, [Validators.required]),
          value: new FormControl(spec.value, [Validators.required])
        })
      }
    },
    dependentValidations: { email: ['firstName'] }
  });

  onSubmit() {
    if (this.validateForm()) {
      this.api.save(this.currentVm()).subscribe();
    }
  }
}
```

## Platform-Core Utilities

```typescript
// Import from @libs/platform-core
import {
    date_format,
    date_addDays,
    date_timeDiff,
    list_groupBy,
    list_distinctBy,
    list_sortBy,
    string_isEmpty,
    string_truncate,
    string_toCamelCase,
    immutableUpdate,
    deepClone,
    removeNullProps,
    guid_generate
} from '@libs/platform-core';

// Decorators
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
    @Watch('onResultChanged')
    public pagedResult?: PagedResult<Item>;

    @WatchWhenValuesDiff('performSearch')
    public searchTerm: string = '';

    private onResultChanged(value: PagedResult<Item>, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }
}

// RxJS Operators
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

this.search$.pipe(skipDuplicates(500), applyIf(this.isEnabled$, debounceTime(300)), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();
```

## Form Validators

```typescript
import { ifAsyncValidator, startEndValidator, noWhitespaceValidator } from '@libs/platform-core';

new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('start')?.value,
            ctrl => ctrl.value,
            { allowEqual: false }
        )
    ],
    [ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator)]
);
```

## Component Template Pattern

```typescript
@Component({
    selector: 'app-entity-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.items; track item.id) {
                    <div>{{ item.name }}</div>
                }
            }
        </app-loading-and-error-indicator>
    `,
    providers: [EntityStore]
})
export class EntityComponent extends AppBaseVmStoreComponent<EntityState, EntityStore> {
    // Track-by for performance
    trackByItem = this.ngForTrackByItemProp<Entity>('id');

    ngOnInit() {
        this.store.loadEntities();
    }
}
```

## Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
app-entity-list {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.entity-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        // BEM child elements
    }

    &__content {
        flex: 1;
        overflow-y: auto;
    }

    &__btn {
        // Modifiers use space-separated --modifier classes
        &.--primary {
            background: $primary-color;
        }
        &.--large {
            padding: 1rem 2rem;
        }
    }
}
```

**Why both?**

- **Host element**: Makes the Angular element a real layout element (not an unknown element without display)
- **Main class**: Contains the full styling, matches the wrapper div in HTML

## BEM Naming Convention (MANDATORY)

### Rule: ALL UI Elements Must Have BEM Classes

**CRITICAL:** Every UI element in a component template MUST have a BEM class, even if it doesn't need special styling. This follows OOP principles - treat CSS classes as object-oriented structure for readability and maintainability.

### BEM Structure

```
block              → Component wrapper (e.g., .user-card)
block__element     → Child element (e.g., .user-card__title)
block__element --modifier → State/variant (e.g., .user-card__btn --primary --large)
```

### Modifier Convention

**Use space-separated `--modifier` classes (NOT suffix style):**

```html
<!-- ✅ CORRECT: Space-separated modifiers -->
<button class="user-card__btn --primary --large">Save</button>
<div class="entity-list__item --selected --highlighted">Item</div>

<!-- ❌ WRONG: Suffix-style modifiers -->
<button class="user-card__btn--primary user-card__btn--large">Save</button>
```

### Complete Template Example

```html
<!-- ✅ CORRECT: Every element has a BEM class -->
<div class="user-card">
    <div class="user-card__header">
        <img class="user-card__avatar" [src]="user.avatar" />
        <h2 class="user-card__title">{{ user.name }}</h2>
        <span class="user-card__subtitle">{{ user.role }}</span>
    </div>
    <div class="user-card__body">
        <p class="user-card__description">{{ user.bio }}</p>
        <ul class="user-card__stats">
            @for (stat of user.stats; track stat.id) {
            <li class="user-card__stat-item">
                <span class="user-card__stat-label">{{ stat.label }}</span>
                <span class="user-card__stat-value">{{ stat.value }}</span>
            </li>
            }
        </ul>
    </div>
    <div class="user-card__footer">
        <button class="user-card__btn --secondary" (click)="onCancel()">Cancel</button>
        <button class="user-card__btn --primary" (click)="onSave()">Save</button>
    </div>
</div>

<!-- ❌ WRONG: Elements without BEM classes -->
<div class="user-card">
    <div>
        <!-- Missing class! -->
        <img [src]="user.avatar" />
        <!-- Missing class! -->
        <h2>{{ user.name }}</h2>
        <!-- Missing class! -->
    </div>
    <button (click)="onSave()">Save</button>
    <!-- Missing class! -->
</div>
```

### SCSS with Modifiers

```scss
.user-card {
    &__btn {
        padding: 0.5rem 1rem;
        border: none;
        cursor: pointer;

        // Modifier styles
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
            font-size: 1.2rem;
        }

        &.--disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__item {
        &.--selected {
            background: $selected-bg;
        }

        &.--highlighted {
            border-left: 3px solid $accent-color;
        }
    }
}
```

### Why This Matters

1. **Readability**: Template structure is immediately clear from class names
2. **Maintainability**: Easy to find and update styles for any element
3. **Consistency**: Uniform naming across all components
4. **Debugging**: DevTools show meaningful class names
5. **Refactoring**: Safe to move/copy HTML with self-documenting classes

## Library Locations

```
src/PlatformExampleAppWeb/libs/
├── platform-core/          # Base classes, services, utilities
│   ├── components/         # PlatformComponent, PlatformVmComponent, etc.
│   ├── view-models/        # PlatformVmStore
│   ├── api-services/       # PlatformApiService
│   ├── decorators/         # @Watch, @WatchWhenValuesDiff
│   ├── form-validators/    # Custom validators
│   ├── rxjs/               # Custom operators
│   └── utils/              # Utilities (date, list, string)
├── apps-domains/           # Business domain code
│   └── text-snippet-domain/
└── share-styles/           # SCSS themes
```

## Working Example

**Study Path:** `src/PlatformExampleAppWeb/apps/playground-text-snippet/`

The playground app demonstrates:

- Component hierarchy with PlatformVmStoreComponent
- State management with PlatformVmStore
- API services with PlatformApiService
- Form handling with reactive forms
