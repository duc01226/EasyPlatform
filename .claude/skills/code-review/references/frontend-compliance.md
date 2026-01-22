# Frontend Compliance Checks

Frontend-specific code review rules for Angular 19 components in EasyPlatform.

## Severity Levels

| Severity | Action | Examples |
|----------|--------|----------|
| **CRITICAL** | MUST fix before approval | Direct Platform* extension, direct HttpClient |
| **HIGH** | MUST fix before merge | Missing untilDestroyed(), manual destroy$ |
| **MEDIUM** | Should fix if time permits | Missing BEM classes, inconsistent naming |
| **LOW** | Document for future | Minor style issues |

## CRITICAL: Component Base Class Hierarchy

**Every component MUST extend AppBase* classes, NEVER Platform* directly.**

```
Hierarchy:
PlatformComponent → AppBaseComponent → FeatureComponent
PlatformVmComponent → AppBaseVmComponent → FeatureComponent
PlatformVmStoreComponent → AppBaseVmStoreComponent → FeatureComponent
PlatformFormComponent → AppBaseFormComponent → FeatureFormComponent
```

### Check: Direct Platform* Extension

**Severity: CRITICAL**

```typescript
// ❌ VIOLATION - Extends Platform* directly
export class MyComponent extends PlatformComponent { }
export class MyComponent extends PlatformVmComponent<MyVm> { }
export class MyComponent extends PlatformVmStoreComponent<MyVm, MyStore> { }
export class MyComponent extends PlatformFormComponent<MyFormVm> { }

// ✅ CORRECT - Extends AppBase* classes
export class MyComponent extends AppBaseComponent { }
export class MyComponent extends AppBaseVmComponent<MyVm> { }
export class MyComponent extends AppBaseVmStoreComponent<MyVm, MyStore> { }
export class MyComponent extends AppBaseFormComponent<MyFormVm> { }
```

**Detection Pattern:**
```regex
extends\s+Platform(Component|VmComponent|VmStoreComponent|FormComponent)
```

**Fix:** Change to corresponding AppBase* class from `shared/base/`.

## CRITICAL: HTTP Client Usage

**Severity: CRITICAL**

```typescript
// ❌ VIOLATION - Direct HttpClient injection
constructor(private http: HttpClient) { }

// ✅ CORRECT - Extend PlatformApiService
export class MyApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/my'; }
}
```

**Detection Pattern:**
```regex
constructor\s*\([^)]*HttpClient[^)]*\)
```

## HIGH: Subscription Management

**Severity: HIGH**

### Manual Destroy Pattern

```typescript
// ❌ VIOLATION - Manual destroy subject
private destroy$ = new Subject<void>();

ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
}

this.data$.pipe(takeUntil(this.destroy$)).subscribe();

// ✅ CORRECT - Use untilDestroyed()
this.data$.pipe(this.untilDestroyed()).subscribe();
```

**Detection Patterns:**
```regex
private\s+destroy\$\s*=\s*new\s+Subject
takeUntil\s*\(\s*this\.destroy\$\s*\)
```

### Missing untilDestroyed()

```typescript
// ❌ VIOLATION - Subscription without cleanup
this.data$.subscribe(data => this.process(data));

// ✅ CORRECT - Always use untilDestroyed()
this.data$.pipe(this.untilDestroyed()).subscribe(data => this.process(data));
```

## HIGH: State Management

**Severity: HIGH**

```typescript
// ❌ VIOLATION - Manual signals in components
employees = signal<Employee[]>([]);
loading = signal(false);

// ✅ CORRECT - Use PlatformVmStore
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeVm> {
    readonly employees$ = this.select(s => s.employees);
    readonly loading$ = this.isLoading$('load');
}
```

**Detection Pattern:**
```regex
(employees|data|items|loading)\s*=\s*signal\s*[<(]
```

## MEDIUM: BEM Classes in Templates

**Severity: MEDIUM**

```html
<!-- ❌ VIOLATION - Elements without BEM classes -->
<div class="card">
    <div>
        <h1>Title</h1>
    </div>
    <div>
        <p>Content</p>
    </div>
</div>

<!-- ✅ CORRECT - All elements have BEM classes -->
<div class="card">
    <div class="card__header">
        <h1 class="card__title">Title</h1>
    </div>
    <div class="card__body">
        <p class="card__content">Content</p>
    </div>
</div>
```

**BEM Format:** `block__element --modifier1 --modifier2` (space-separated modifiers)

```html
<!-- Modifiers as separate classes with -- prefix -->
<button class="card__btn --primary --large">Submit</button>
```

## Review Checklist

For each frontend TypeScript file, verify:

### Components (*.component.ts)

- [ ] Extends AppBase* class, NOT Platform* directly
- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Uses `ViewEncapsulation.None`
- [ ] Template has BEM classes on ALL elements
- [ ] No manual destroy$ / takeUntil patterns

### Stores (*.store.ts)

- [ ] Extends `PlatformVmStore<TViewModel>`
- [ ] Uses `effectSimple()` for API calls
- [ ] Uses `select()` for derived state
- [ ] Marked as `@Injectable()` (not providedIn: 'root')

### Services (*-api.service.ts, *.service.ts)

- [ ] Extends `PlatformApiService`
- [ ] No direct HttpClient injection
- [ ] Defines `apiUrl` getter
- [ ] Uses `{ enableCache: true }` where appropriate

### Forms (*-form.component.ts)

- [ ] Extends `AppBaseFormComponent<TFormVm>`
- [ ] Implements `initialFormConfig()`
- [ ] Uses `validateForm()` before submission
- [ ] Uses `dependentValidations` for cross-field validation

## Report Template

When documenting frontend compliance issues in review report:

```markdown
### Frontend Compliance Issues

| File | Severity | Issue | Fix |
|------|----------|-------|-----|
| my.component.ts | CRITICAL | Extends PlatformComponent directly | Change to AppBaseComponent |
| my.service.ts | CRITICAL | Direct HttpClient injection | Extend PlatformApiService |
| list.component.ts | HIGH | Uses takeUntil(this.destroy$) | Use this.untilDestroyed() |
| card.component.html | MEDIUM | Missing BEM classes on inner divs | Add block__element classes |
```
