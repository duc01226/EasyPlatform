---
name: angular-component
description: Use when creating or modifying Angular components in PlatformExampleAppWeb (Angular 19) with proper base class inheritance, state management, and platform patterns.
---

# Angular Component Development Workflow

## Pre-Flight Checklist

- [ ] Identify correct app: `playground-text-snippet`, etc.
- [ ] Search for similar components: `grep "{FeatureName}Component" --include="*.ts"`
- [ ] Determine component type (list, form, detail, dialog)
- [ ] Check if store is needed (complex state)

## Component Hierarchy

```
PlatformComponent                    # Base: lifecycle, subscriptions, signals (from @libs/platform-core)
├── PlatformVmComponent             # + ViewModel injection
├── PlatformFormComponent           # + Reactive forms integration
└── PlatformVmStoreComponent        # + ComponentStore state management

AppBaseComponent (optional)          # App-specific: + Auth, roles, company context
├── AppBaseVmComponent              # + ViewModel + auth context (create in your app)
├── AppBaseFormComponent            # + Forms + auth + validation (create in your app)
└── AppBaseVmStoreComponent         # + Store + auth + loading/error (create in your app)
```

> **Note:** Platform classes are exported from `@libs/platform-core`. AppBase classes are optional app-specific extensions you can create to add auth context, company scope, and role-based access to your components.

## Component Type Decision

| Scenario             | Base Class                 | Use When                      |
| -------------------- | -------------------------- | ----------------------------- |
| Simple display       | `PlatformComponent`        | Static content, no state      |
| With ViewModel       | `PlatformVmComponent`      | Needs mutable view model      |
| Form with validation | `PlatformFormComponent`    | User input forms              |
| Complex state/CRUD   | `PlatformVmStoreComponent` | Lists, dashboards, multi-step |

## File Location

```
src/PlatformExampleAppWeb/apps/{app-name}/src/app/
└── features/
    └── {feature}/
        ├── {feature}.component.ts
        ├── {feature}.component.html
        ├── {feature}.component.scss
        └── {feature}.store.ts (if using store)
```

## Pattern 1: List Component with Store

### Store Definition

```typescript
// {feature}.store.ts
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@libs/platform-core';

export interface FeatureListState {
    items: FeatureDto[];
    selectedItem?: FeatureDto;
    filters: FeatureFilters;
}

@Injectable()
export class FeatureListStore extends PlatformVmStore<FeatureListState> {
    // Initial state
    protected override vmConstructor = (data?: Partial<FeatureListState>) => ({ items: [], filters: {}, ...data }) as FeatureListState;

    // Selectors
    public readonly items$ = this.select(state => state.items);
    public readonly selectedItem$ = this.select(state => state.selectedItem);

    // Effects
    public loadItems = this.effectSimple(() =>
        this.featureApi.getList(this.currentVm().filters).pipe(
            this.observerLoadingErrorState('loadItems'),
            this.tapResponse(items => this.updateState({ items }))
        )
    );

    public saveItem = this.effectSimple((item: FeatureDto) =>
        this.featureApi.save(item).pipe(
            this.observerLoadingErrorState('saveItem'),
            this.tapResponse(saved => {
                this.updateState(state => ({
                    items: state.items.upsertBy(x => x.id, [saved])
                }));
            })
        )
    );

    public deleteItem = this.effectSimple((id: string) =>
        this.featureApi.delete(id).pipe(
            this.observerLoadingErrorState('deleteItem'),
            this.tapResponse(() => {
                this.updateState(state => ({
                    items: state.items.filter(x => x.id !== id)
                }));
            })
        )
    );

    constructor(private featureApi: FeatureApiService) {
        super();
    }
}
```

### List Component

```typescript
// {feature}-list.component.ts
import { Component, OnInit } from '@angular/core';
import { PlatformVmStoreComponent } from '@libs/platform-core';
import { FeatureListStore, FeatureListState } from './feature-list.store';

@Component({
    selector: 'app-feature-list',
    templateUrl: './feature-list.component.html',
    styleUrls: ['./feature-list.component.scss'],
    providers: [FeatureListStore] // Provide store at component level
})
export class FeatureListComponent extends PlatformVmStoreComponent<FeatureListState, FeatureListStore> implements OnInit {
    // Track-by for performance
    trackByItem = this.ngForTrackByItemProp<FeatureDto>('id');

    constructor(store: FeatureListStore) {
        super(store);
    }

    ngOnInit(): void {
        this.store.loadItems();
    }

    onRefresh(): void {
        this.reload(); // Reloads all store data
    }

    onDelete(item: FeatureDto): void {
        this.store.deleteItem(item.id);
    }

    // Check loading state for specific request
    get isDeleting$() {
        return this.store.isLoading$('deleteItem');
    }
}
```

### List Template

```html
<!-- {feature}-list.component.html -->
<app-loading-and-error-indicator [target]="this">
    @if (vm(); as vm) {
    <div class="feature-list">
        <!-- Header with actions -->
        <div class="header">
            <h1>Features</h1>
            <button (click)="onRefresh()" [disabled]="isStateLoading()()">Refresh</button>
        </div>

        <!-- List items -->
        @for (item of vm.items; track trackByItem) {
        <div class="item">
            <span>{{ item.name }}</span>
            <button (click)="onDelete(item)" [disabled]="isDeleting$() === true">Delete</button>
        </div>
        } @empty {
        <div class="empty">No items found</div>
        }
    </div>
    }
</app-loading-and-error-indicator>
```

## Pattern 2: Form Component

```typescript
// {feature}-form.component.ts
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { PlatformFormComponent } from '@libs/platform-core';
import { ifAsyncValidator, noWhitespaceValidator } from '@libs/platform-core';

export interface FeatureFormVm {
    id?: string;
    name: string;
    code: string;
    status: FeatureStatus;
    effectiveDate?: Date;
}

@Component({
    selector: 'app-feature-form',
    templateUrl: './feature-form.component.html'
})
export class FeatureFormComponent extends PlatformFormComponent<FeatureFormVm> {
    // Form configuration
    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required, Validators.maxLength(200), noWhitespaceValidator]),
            code: new FormControl(
                this.currentVm().code,
                [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)],
                [
                    // Async validator only runs if sync validators pass
                    ifAsyncValidator(() => !this.isViewMode(), this.checkCodeUniqueValidator())
                ]
            ),
            status: new FormControl(this.currentVm().status, [Validators.required]),
            effectiveDate: new FormControl(this.currentVm().effectiveDate)
        },
        // Re-validate code when status changes
        dependentValidations: {
            code: ['status']
        }
    });

    // Initialize or reload view model
    protected initOrReloadVm = (isReload: boolean) => {
        if (this.mode === 'create') {
            return of<FeatureFormVm>({
                name: '',
                code: '',
                status: FeatureStatus.Draft
            });
        }
        return this.featureApi.getById(this.featureId);
    };

    // Custom async validator
    private checkCodeUniqueValidator() {
        return async (control: AbstractControl) => {
            const exists = await firstValueFrom(this.featureApi.checkCodeExists(control.value, this.currentVm().id));
            return exists ? { codeExists: true } : null;
        };
    }

    onSubmit(): void {
        if (!this.validateForm()) return;

        const vm = this.currentVm();
        this.featureApi
            .save(vm)
            .pipe(
                this.observerLoadingErrorState('save'),
                this.tapResponse(
                    saved => this.onSaveSuccess(saved),
                    error => this.onSaveError(error)
                ),
                this.untilDestroyed()
            )
            .subscribe();
    }

    constructor(private featureApi: FeatureApiService) {
        super();
    }
}
```

### Form Template

```html
<!-- {feature}-form.component.html -->
<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <!-- Name field -->
    <div class="form-field">
        <label for="name">Name *</label>
        <input id="name" formControlName="name" />
        @if (formControls('name').errors?.['required']) {
        <span class="error">Name is required</span>
        }
    </div>

    <!-- Code field with async validation -->
    <div class="form-field">
        <label for="code">Code *</label>
        <input id="code" formControlName="code" />
        @if (formControls('code').errors?.['codeExists']) {
        <span class="error">Code already exists</span>
        } @if (formControls('code').pending) {
        <span class="info">Checking...</span>
        }
    </div>

    <!-- Status dropdown -->
    <div class="form-field">
        <label for="status">Status *</label>
        <select id="status" formControlName="status">
            @for (status of statusOptions; track status.value) {
            <option [value]="status.value">{{ status.label }}</option>
            }
        </select>
    </div>

    <!-- Actions -->
    <div class="actions">
        <button type="button" (click)="onCancel()">Cancel</button>
        <button type="submit" [disabled]="!form.valid || isLoading$('save')()">{{ isLoading$('save')() ? 'Saving...' : 'Save' }}</button>
    </div>
</form>
```

## Pattern 3: Simple Component

```typescript
// {feature}-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PlatformComponent } from '@libs/platform-core';

@Component({
    selector: 'app-feature-card',
    template: `
        <div class="card" [class.selected]="isSelected">
            <h3>{{ feature.name }}</h3>
            <p>{{ feature.description }}</p>
            @if (canEdit) {
                <button (click)="onEdit.emit(feature)">Edit</button>
            }
        </div>
    `
})
export class FeatureCardComponent extends PlatformComponent {
    @Input() feature!: FeatureDto;
    @Input() isSelected = false;
    @Output() onEdit = new EventEmitter<FeatureDto>();

    get canEdit(): boolean {
        return this.hasRole('Admin', 'Manager');
    }
}
```

## Key Platform APIs

### Lifecycle & Subscriptions

```typescript
// Auto-cleanup subscription
this.data$.pipe(this.untilDestroyed()).subscribe();

// Store named subscriptions
this.storeSubscription('key', observable.subscribe());
this.cancelStoredSubscription('key');
```

### Loading/Error State

```typescript
// Track request state
observable.pipe(this.observerLoadingErrorState('requestKey'));

// Check states in template
isLoading$('requestKey')();
getErrorMsg$('requestKey')();
isStateLoading()();
isStateError()();
```

### Response Handling

```typescript
// Handle success/error
observable.pipe(
    this.tapResponse(
        result => {
            /* success */
        },
        error => {
            /* error */
        }
    )
);
```

### Track-by Functions

```typescript
// For @for loops
trackByItem = this.ngForTrackByItemProp<Item>('id');
trackByList = this.ngForTrackByImmutableList(this.items);
```

## Code Responsibility Hierarchy (CRITICAL)

**Components should only handle UI events - delegate all logic to lower layers:**

| Layer            | Responsibility                                                      |
| ---------------- | ------------------------------------------------------------------- |
| **Entity/Model** | Display helpers, dropdown options, defaults, static factory methods |
| **Service**      | API calls, command factories                                        |
| **Component**    | UI event handling ONLY                                              |

```typescript
// ❌ WRONG: Logic in component (causes duplication)
readonly statusOptions = [{ value: 1, label: 'Active' }, ...];
getStatusClass(item) { return item.isActive ? 'active' : 'inactive'; }

// ✅ CORRECT: Delegate to entity
readonly statusOptions = Entity.getStatusOptions();
getStatusClass(item) { return item.getStatusCssClass(); }
```

---

## Anti-Patterns to AVOID

:x: **Putting reusable logic in component instead of entity/model**

```typescript
// WRONG - logic that should be in entity
readonly options = [{ value: 1, label: 'Option 1' }];

// CORRECT - delegate to entity
readonly options = Entity.getDropdownOptions();
```

:x: **Using wrong base class**

```typescript
// WRONG - using PlatformComponent when auth needed
export class MyComponent extends PlatformComponent {}

// CORRECT - using AppBaseComponent for auth context
export class MyComponent extends AppBaseComponent {}
```

:x: **Manual subscription management**

```typescript
// WRONG
private sub: Subscription;
ngOnDestroy() { this.sub.unsubscribe(); }

// CORRECT
this.data$.pipe(this.untilDestroyed()).subscribe();
```

:x: **Direct HTTP calls**

```typescript
// WRONG
constructor(private http: HttpClient) { }

// CORRECT
constructor(private featureApi: FeatureApiService) { }
```

:x: **Missing loading states**

```html
<!-- WRONG - no loading indicator -->
<div>{{ items }}</div>

<!-- CORRECT - with loading wrapper -->
<app-loading-and-error-indicator [target]="this">
    <div>{{ items }}</div>
</app-loading-and-error-indicator>
```

## Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
app-feature-list {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.feature-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        // BEM child elements...
    }

    &__content {
        flex: 1;
        overflow-y: auto;
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

---

## Verification Checklist

- [ ] Correct base class selected for use case
- [ ] Store provided at component level (if using store)
- [ ] Loading/error states handled with `app-loading-and-error-indicator`
- [ ] Subscriptions use `untilDestroyed()`
- [ ] Track-by functions used in `@for` loops
- [ ] Form validation configured properly
- [ ] Auth checks use `hasRole()` from base class
- [ ] API calls use service extending `PlatformApiService`
- [ ] SCSS styles both host element and main wrapper class
