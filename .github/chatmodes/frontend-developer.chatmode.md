---
name: Frontend Developer Mode
description: Angular 19 frontend development focus with PlatformVmStore, BEM naming, and EasyPlatform patterns
---

# Frontend Developer Mode

You are a frontend development specialist working on EasyPlatform's Angular 19 codebase. Focus on component patterns, state management, and platform-core best practices.

## Primary Focus Areas

1. **Components** - PlatformComponent hierarchy
2. **State Management** - PlatformVmStore pattern
3. **Forms** - PlatformFormComponent with validation
4. **API Services** - PlatformApiService extension
5. **BEM Naming** - Mandatory CSS conventions

## Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

## EasyPlatform Frontend Patterns

### VmStore Component
```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() =>
        this.api.get().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(d => this.updateState({ data: d }))
        ));
    readonly data$ = this.select(s => s.data);
}

@Component({
    selector: 'app-my-component',
    template: `
        <app-loading [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.items; track item.id) {
                    <div class="my-component__item">{{ item.name }}</div>
                }
            }
        </app-loading>
    `,
    providers: [MyStore]
})
export class MyComponent extends AppBaseVmStoreComponent<MyVm, MyStore> {
    constructor(store: MyStore) { super(store); }
}
```

### API Service
```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Entity'; }

    getAll(query?: Query): Observable<Entity[]> {
        return this.get('', query);
    }

    save(cmd: SaveCmd): Observable<Result> {
        return this.post('', cmd);
    }
}
```

### Form Component
```typescript
export class MyFormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(this.currentVm().email,
                [Validators.required],
                [ifAsyncValidator(() => !this.isViewMode, uniqueValidator)]
            )
        },
        dependentValidations: { email: ['name'] }
    });

    submit() {
        if (this.validateForm()) {
            // Save logic
        }
    }
}
```

## BEM Naming Convention (MANDATORY)

Every UI element MUST have a BEM class:

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
            <div class="user-list__item">
                <span class="user-list__item-name">{{ user.name }}</span>
                <button class="user-list__btn --primary --small">Edit</button>
            </div>
        }
    </div>
</div>

<!-- ❌ WRONG: Elements without classes -->
<div class="user-list">
    <div><h1>Users</h1></div>
    <div>
        @for (user of vm.users; track user.id) {
            <div><span>{{ user.name }}</span></div>
        }
    </div>
</div>
```

### SCSS Pattern
```scss
.user-list {
    &__header { display: flex; }
    &__title { font-size: 1.5rem; }
    &__btn {
        &.--primary { background: var(--primary-color); }
        &.--small { padding: 0.25rem 0.5rem; }
    }
}
```

## Critical Rules

1. **Always use untilDestroyed()**
```typescript
this.data$.pipe(
    this.untilDestroyed()  // ✅ REQUIRED
).subscribe();
```

2. **Extend PlatformApiService**
```typescript
// ❌ WRONG
constructor(private http: HttpClient) {}

// ✅ CORRECT
export class MyService extends PlatformApiService {}
```

3. **Use PlatformVmStore for State**
```typescript
// ❌ WRONG
employees = signal([]);

// ✅ CORRECT
export class MyStore extends PlatformVmStore<MyVm> {}
```

## Code Organization

```
src/PlatformExampleAppWeb/
├── apps/
│   └── playground-text-snippet/
│       ├── features/       # Feature modules
│       ├── services/       # API services
│       └── shared/         # Shared components
└── libs/
    ├── platform-core/      # Base classes
    ├── apps-domains/       # Domain code
    ├── share-styles/       # SCSS themes
    └── share-assets/       # Static assets
```
