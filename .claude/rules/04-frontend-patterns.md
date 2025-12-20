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
