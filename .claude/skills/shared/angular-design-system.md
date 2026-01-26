# Angular Component Patterns & Conventions

Canonical reference for Angular 19 component hierarchy, BEM conventions, SCSS patterns, and platform-core imports.

---

## Component Hierarchy

```
PlatformComponent                    # Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             # + ViewModel injection
├── PlatformFormComponent           # + Reactive forms integration
└── PlatformVmStoreComponent        # + ComponentStore state management

AppBaseComponent                     # + Auth, roles, company context
├── AppBaseVmComponent              # + ViewModel + auth context
├── AppBaseFormComponent            # + Forms + auth + validation
└── AppBaseVmStoreComponent         # + Store + auth + loading/error
```

### Base Class Selection

| Scenario             | Base Class                | Use When                      |
| -------------------- | ------------------------- | ----------------------------- |
| Simple display       | `AppBaseComponent`        | Static content, no state      |
| With ViewModel       | `AppBaseVmComponent`      | Needs mutable view model      |
| Form with validation | `AppBaseFormComponent`    | User input forms              |
| Complex state/CRUD   | `AppBaseVmStoreComponent` | Lists, dashboards, multi-step |

**Rule:** Always use `AppBase*` classes (not `Platform*` directly) to get auth/role context.

---

## BEM Naming Convention (MANDATORY)

Every UI element MUST have a BEM class, even without special styling.

- **Block**: Component name (e.g., `feature-list`)
- **Element**: `block__element` (e.g., `feature-list__header`)
- **Modifier**: Separate class with `--` prefix (e.g., `feature-list__btn --primary --small`)

See `bem-component-examples.md` for complete HTML/SCSS examples.

---

## SCSS Patterns

Always style both the **host element** and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element - makes Angular element a proper block container
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper - contains full BEM styling
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header { /* ... */ }
    &__content { flex: 1; overflow-y: auto; }
    &__btn {
        &.--primary { background: $primary-color; }
        &.--small { padding: 0.25rem 0.5rem; }
    }
}
```

---

## Platform-Core Imports

```typescript
// Components
import { AppBaseComponent, AppBaseVmStoreComponent, AppBaseFormComponent } from '@libs/apps-domains';

// Store
import { PlatformVmStore } from '@libs/platform-core';

// Validators
import { ifAsyncValidator, noWhitespaceValidator } from '@libs/platform-core';

// Utilities
import { date_format, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty,
         immutableUpdate, deepClone, guid_generate, task_delay } from '@libs/platform-core';

// Module
import { PlatformCoreModule } from '@libs/platform-core';
```

---

## Key Platform APIs

| API | Purpose |
| --- | ------- |
| `this.untilDestroyed()` | Auto-cleanup subscriptions |
| `this.observerLoadingErrorState('key')` | Track request loading/error |
| `this.isLoading$('key')` | Loading signal for template |
| `this.tapResponse(success, error)` | Handle success/error |
| `this.ngForTrackByItemProp<T>('id')` | Track-by for `@for` loops |
| `this.hasRole('Admin')` | Auth role check |
| `this.reload()` | Reload store data |

---

## Anti-Patterns

| Wrong | Correct |
| ----- | ------- |
| `extends PlatformComponent` (when auth needed) | `extends AppBaseComponent` |
| `private sub: Subscription` + manual cleanup | `.pipe(this.untilDestroyed())` |
| `constructor(private http: HttpClient)` | Use `PlatformApiService` subclass |
| `private destroy$ = new Subject()` + `takeUntil` | `this.untilDestroyed()` |
| Elements without BEM classes | All elements MUST have BEM classes |
