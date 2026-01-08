# Frontend Quick Reference

> Quick decision guide for frontend development. For detailed patterns, see [CLAUDE.md](../CLAUDE.md#frontend-patterns).

## Decision Tree

```
Need frontend feature?
├── Simple component → PlatformComponent
├── Complex state → PlatformVmStoreComponent + Store
├── Forms → PlatformFormComponent
├── API calls → PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

## Component Hierarchy

```typescript
// Platform foundation layer
PlatformComponent               // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent         // + ViewModel integration
├── PlatformFormComponent       // + Reactive forms integration
└── PlatformVmStoreComponent    // + ComponentStore state management

// Application framework layer
AppBaseComponent                // + Auth, roles, company context
├── AppBaseVmComponent          // + ViewModel + auth context
├── AppBaseFormComponent        // + Forms + auth + validation
└── AppBaseVmStoreComponent     // + Store + auth + loading/error
```

## Key Patterns

### 1. Component with Store

```typescript
@Component({ providers: [MyStore] })
export class MyComponent extends AppBaseVmStoreComponent<MyState, MyStore> {
    constructor(store: MyStore) { super(store); }
    ngOnInit() { this.store.load(); }
}
```

### 2. API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Entity'; }
    getAll(q?: Query): Observable<Entity[]> { return this.get('', q); }
    save(cmd: SaveCmd): Observable<Result> { return this.post('', cmd); }
}
```

### 3. Form Component

```typescript
export class FormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: {
            email: new FormControl(this.currentVm().email, [Validators.required])
        }
    });
    submit() { if (this.validateForm()) { /* save */ } }
}
```

### 4. Subscription Cleanup

```typescript
// ALWAYS use untilDestroyed()
this.data$.pipe(
    this.observerLoadingErrorState('load'),
    this.tapResponse(d => this.data = d),
    this.untilDestroyed()
).subscribe();
```

### 5. BEM CSS Naming (MANDATORY)

```html
<!-- Every element MUST have BEM class -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <button class="user-list__btn --primary --small">Edit</button>
</div>
```

## Common Commands

```bash
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
nx build playground-text-snippet
nx test platform-core
```

## Anti-Patterns

- Direct HttpClient - Extend PlatformApiService
- Manual signals - Use PlatformVmStore
- Missing untilDestroyed() - Always use .pipe(this.untilDestroyed())
- Elements without BEM classes - ALL elements need BEM naming

## Related Documentation

- [CLAUDE.md](../CLAUDE.md#frontend-patterns) - Complete frontend patterns
- [Architecture Overview](./architecture-overview.md) - System design
