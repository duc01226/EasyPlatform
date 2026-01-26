# Angular Store Patterns Reference

Detailed code examples for PlatformVmStore state management: CRUD, dependent data, caching, component integration.

---

## File Location

```
src/Frontend/apps/{app-name}/src/app/
└── features/
    └── {feature}/
        ├── {feature}.store.ts
        └── {feature}.component.ts
```

---

## Store Architecture

```
PlatformVmStore<TState>
├── State: TState (reactive signal)
├── Selectors: select() -> Signal<T>
├── Effects: effectSimple() -> side effects
├── Updaters: updateState() -> mutations
└── Loading/Error: observerLoadingErrorState()
```

---

## Pattern 1: Basic CRUD Store

```typescript
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@libs/platform-core';

export interface FeatureListState {
    items: FeatureDto[];
    selectedItem?: FeatureDto;
    filters: FeatureFilters;
    pagination: PaginationState;
}

export interface FeatureFilters {
    searchText?: string;
    status?: FeatureStatus[];
    dateRange?: DateRange;
}

export interface PaginationState {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
}

@Injectable()
export class FeatureListStore extends PlatformVmStore<FeatureListState> {
    // State factory
    protected override vmConstructor = (data?: Partial<FeatureListState>) =>
        ({
            items: [],
            filters: {},
            pagination: { pageIndex: 0, pageSize: 20, totalCount: 0 },
            ...data
        }) as FeatureListState;

    // Optional caching
    protected override get enableCaching() { return true; }
    protected override cachedStateKeyName = () => 'FeatureListStore';

    // Selectors
    public readonly items$ = this.select(state => state.items);
    public readonly selectedItem$ = this.select(state => state.selectedItem);
    public readonly filters$ = this.select(state => state.filters);
    public readonly pagination$ = this.select(state => state.pagination);
    public readonly hasItems$ = this.select(state => state.items.length > 0);
    public readonly isEmpty$ = this.select(state => state.items.length === 0);

    // Effects
    public loadItems = this.effectSimple(() => {
        const state = this.currentVm();
        return this.featureApi
            .getList({
                ...state.filters,
                skipCount: state.pagination.pageIndex * state.pagination.pageSize,
                maxResultCount: state.pagination.pageSize
            })
            .pipe(
                this.tapResponse(result => {
                    this.updateState({
                        items: result.items,
                        pagination: { ...state.pagination, totalCount: result.totalCount }
                    });
                })
            );
    }, 'loadItems');

    public saveItem = this.effectSimple(
        (item: FeatureDto) =>
            this.featureApi.save(item).pipe(
                this.tapResponse(saved => {
                    this.updateState(state => ({
                        items: state.items.upsertBy(x => x.id, [saved]),
                        selectedItem: saved
                    }));
                })
            ),
        'saveItem'
    );

    public deleteItem = this.effectSimple(
        (id: string) =>
            this.featureApi.delete(id).pipe(
                this.tapResponse(() => {
                    this.updateState(state => ({
                        items: state.items.filter(x => x.id !== id),
                        selectedItem: state.selectedItem?.id === id ? undefined : state.selectedItem
                    }));
                })
            ),
        'deleteItem'
    );

    // State updaters
    public setFilters(filters: Partial<FeatureFilters>): void {
        this.updateState(state => ({
            filters: { ...state.filters, ...filters },
            pagination: { ...state.pagination, pageIndex: 0 }
        }));
    }

    public setPage(pageIndex: number): void {
        this.updateState(state => ({ pagination: { ...state.pagination, pageIndex } }));
    }

    public selectItem(item?: FeatureDto): void {
        this.updateState({ selectedItem: item });
    }

    public clearFilters(): void {
        this.updateState({
            filters: {},
            pagination: { ...this.currentVm().pagination, pageIndex: 0 }
        });
    }

    constructor(private featureApi: FeatureApiService) {
        super();
    }
}
```

---

## Pattern 2: Store with Dependent Data

```typescript
@Injectable()
export class EmployeeFormStore extends PlatformVmStore<EmployeeFormState> {
    protected override vmConstructor = (data?: Partial<EmployeeFormState>) =>
        ({ employee: null, departments: [], positions: [], managers: [], ...data }) as EmployeeFormState;

    public loadFormData = this.effectSimple(
        (employeeId?: string) =>
            forkJoin({
                employee: employeeId ? this.employeeApi.getById(employeeId) : of(this.createNewEmployee()),
                departments: this.departmentApi.getActive(),
                positions: this.positionApi.getAll(),
                managers: this.employeeApi.getManagers()
            }).pipe(
                this.tapResponse(result => {
                    this.updateState({
                        employee: result.employee,
                        departments: result.departments,
                        positions: result.positions,
                        managers: result.managers
                    });
                })
            ),
        'loadFormData'
    );

    public managersForDepartment$ = (departmentId: string) =>
        this.select(state => state.managers.filter(m => m.departmentId === departmentId));
}
```

---

## Pattern 3: Store with Caching

```typescript
@Injectable({ providedIn: 'root' }) // Singleton for caching
export class LookupDataStore extends PlatformVmStore<LookupDataState> {
    protected override get enableCaching() { return true; }
    protected override cachedStateKeyName = () => 'LookupDataStore';
    protected override get cacheExpirationMs() { return 5 * 60 * 1000; } // 5 minutes

    public loadCountries = this.effectSimple(() => {
        if (this.currentVm().countries.length > 0) return EMPTY;
        return this.lookupApi.getCountries().pipe(
            this.tapResponse(countries => { this.updateState({ countries }); })
        );
    }, 'loadCountries');
}
```

---

## Component Integration

```typescript
@Component({
    selector: 'app-feature-list',
    templateUrl: './feature-list.component.html',
    providers: [FeatureListStore] // Component-scoped store
})
export class FeatureListComponent extends AppBaseVmStoreComponent<FeatureListState, FeatureListStore> implements OnInit {
    constructor(store: FeatureListStore) { super(store); }

    ngOnInit(): void { this.store.loadItems(); }

    onSearch(text: string): void {
        this.store.setFilters({ searchText: text });
        this.store.loadItems();
    }

    onPageChange(pageIndex: number): void {
        this.store.setPage(pageIndex);
        this.store.loadItems();
    }

    onDelete(item: FeatureDto): void { this.store.deleteItem(item.id); }
    onRefresh(): void { this.reload(); }

    get isLoading$() { return this.store.isLoading$('loadItems'); }
    get isSaving$() { return this.store.isLoading$('saveItem'); }
    get isDeleting$() { return this.store.isLoading$('deleteItem'); }
}
```

### Template

```html
<app-loading-and-error-indicator [target]="this">
    @if (vm(); as vm) {
    <div class="feature-list">
        <div class="feature-list__filters">
            <input class="feature-list__search" [value]="vm.filters.searchText ?? ''" (input)="onSearch($event.target.value)" placeholder="Search..." />
        </div>

        <div class="feature-list__content">
            @for (item of vm.items; track item.id) {
            <div class="feature-list__item" [class.--selected]="vm.selectedItem?.id === item.id">
                <span class="feature-list__item-name">{{ item.name }}</span>
                <button class="feature-list__item-btn --delete" (click)="onDelete(item)" [disabled]="isDeleting$()">Delete</button>
            </div>
            } @empty {
            <div class="feature-list__empty">No items found</div>
            }
        </div>

        <app-pagination
            [pageIndex]="vm.pagination.pageIndex"
            [pageSize]="vm.pagination.pageSize"
            [totalCount]="vm.pagination.totalCount"
            (pageChange)="onPageChange($event)"
        />
    </div>
    }
</app-loading-and-error-indicator>
```

---

## Key Store APIs

| Method                        | Purpose              | Example                                                   |
| ----------------------------- | -------------------- | --------------------------------------------------------- |
| `select()`                    | Create selector      | `this.select(s => s.items)`                               |
| `updateState()`               | Update state         | `this.updateState({ items })`                             |
| `effectSimple()`              | Create effect        | `this.effectSimple(() => api.call(), 'requestKey')`       |
| `currentVm()`                 | Get current state    | `const state = this.currentVm()`                          |
| `observerLoadingErrorState()` | Track loading/error  | Use outside effectSimple only (effectSimple handles this) |
| `tapResponse()`               | Handle success/error | `.pipe(this.tapResponse(success, error))`                 |
| `isLoading$()`                | Loading signal       | `this.store.isLoading$('loadItems')`                      |
