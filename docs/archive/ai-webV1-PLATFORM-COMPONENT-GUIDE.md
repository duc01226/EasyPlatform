# Platform Component Guide for Web V1 Apps

> **Purpose:** Complete guide for using Platform component patterns in Angular 12 Web V1 applications
> **Package:** `@orient/bravo-common` from `src/Web/BravoComponents/`
> **Standard:** This is the recommended pattern for all new components in Web V1 apps

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Module Setup](#2-module-setup)
3. [AppBaseComponent](#3-appbasecomponent)
4. [PlatformComponent](#4-platformcomponent)
5. [PlatformVmComponent](#5-platformvmcomponent)
6. [PlatformFormComponent](#6-platformformcomponent)
7. [PlatformVmStoreComponent](#7-platformvmstorecomponent)
8. [PlatformApiService](#8-platformapiservice)
9. [Real Examples](#9-real-examples)
10. [Migration Guide](#10-migration-guide)
11. [Decision Tree](#11-decision-tree)
12. [Quick Reference](#12-quick-reference)
    - [Component Template Standard](#component-template-standard)
    - [Component SCSS Standard](#component-scss-standard)
    - [Common Patterns Cheatsheet](#common-patterns-cheatsheet)

---

## 1. Introduction

### Why Platform Components?

The Platform component pattern provides a **unified, enterprise-grade approach** to Angular component development with:

| Feature           | Legacy BaseComponent       | Platform Pattern                                  |
| ----------------- | -------------------------- | ------------------------------------------------- |
| State Management  | Manual BehaviorSubjects    | Built-in `status$`, `loadingMap$`, `errorMsgMap$` |
| Lifecycle Cleanup | Manual `takeUntil()`       | Built-in `untilDestroyed()`                       |
| Change Detection  | Direct `ChangeDetectorRef` | `detectChanges()` with throttling                 |
| Side Effects      | Manual subscription        | `effectSimple()`, `tapResponse()`                 |
| ViewModel         | Manual state               | `initOrReloadVm`, `updateVm()`                    |
| Forms             | Manual setup               | `initialFormConfig()` with mode management        |
| Error Handling    | Per-component              | Centralized via `PlatformApiErrorEventHandler`    |
| Caching           | Not built-in               | Integrated `PlatformCachingService`               |
| Translation       | Manual injection           | Integrated `PlatformTranslateService`             |

### Prerequisites

```bash
# Package dependency
"@orient/bravo-common": "~5.0.29"

# Angular 12
"@angular/core": "~12.2.17"
```

### Class Hierarchy

```
PlatformComponent (Base)
├── PlatformVmComponent<TViewModel>
│   └── PlatformFormComponent<TViewModel>
└── PlatformVmStoreComponent<TViewModel, TStore>
```

---

## 2. Module Setup

### PlatformCoreModule.forRoot()

Configure the Platform framework in your app's root module:

```typescript
// ca.module.ts (CandidateAppClient example)
import {
    BravoCommonModule,
    FlexLayoutModule,
    PlatformCoreModule,
    PlatformCoreModuleConfig,
    PlatformLanguageItem,
    PlatformTranslateConfig,
    PlatformTranslatedToastComponent,
    HttpClientOptions,
    HttpStatusCode,
    PlatformApiErrorEvent,
    PlatformApiErrorEventHandler,
    PlatformHttpOptionsConfigService
} from '@orient/bravo-common';

// 1. Module Configuration Factory
export function PlatformCoreModuleConfigFactory() {
    return new PlatformCoreModuleConfig({
        isDevelopment: environment.isLocalDev == true,
        disableMissingTranslationWarnings: environment.disableMissingTranslationWarnings == true
    });
}

// 2. Translation Configuration Factory
export function PlatformTranslateConfigFactory() {
    return new PlatformTranslateConfig({
        defaultLanguage: 'en',
        slowRequestBreakpoint: 500,
        availableLangs: [
            new PlatformLanguageItem('English', 'en', 'ENG'),
            new PlatformLanguageItem('Vietnamese', 'vi', 'VN'),
            new PlatformLanguageItem('Norsk', 'nb', 'NO')
        ]
    });
}

// 3. Toast Configuration Factory
export function ToastConfigFactory() {
    return {
        newestOnTop: true,
        positionClass: 'toast-bottom-right',
        preventDuplicates: true,
        enableHtml: true,
        toastComponent: PlatformTranslatedToastComponent
    };
}

@NgModule({
    imports: [
        // ... other imports
        BravoCommonModule.forRoot({
            defaultLanguage: 'en',
            slowRequestBreakpoint: 700
        }),
        PlatformCoreModule.forRoot({
            moduleConfig: {
                type: PlatformCoreModuleConfig,
                configFactory: PlatformCoreModuleConfigFactory
            },
            translate: {
                platformConfig: PlatformTranslateConfigFactory(),
                config: TranslateConfigFactory()
            },
            toastConfig: ToastConfigFactory(),
            httpOptionsConfigService: HttpOptionsConfigService,
            appApiErrorEventHandlers: [NoPermissionApiErrorEventHandler]
        })
    ]
})
export class CaModule {}
```

### Custom Error Handler

Handle API errors globally:

```typescript
@Injectable()
export class NoPermissionApiErrorEventHandler extends PlatformApiErrorEventHandler {
    constructor(protected router: Router) {
        super();
    }

    public handle(event: PlatformApiErrorEvent): void {
        if (event.apiError.statusCode == HttpStatusCode.Unauthorized || event.apiError.statusCode == HttpStatusCode.Forbidden) {
            this.router.navigate(['auth-error']);
        }
    }
}
```

### Custom HTTP Options

Add headers to all API requests:

```typescript
@Injectable()
export class HttpOptionsConfigService extends PlatformHttpOptionsConfigService {
    constructor(private context: AppContextService) {
        super();
    }

    public configOptions(options: HttpClientOptions): HttpClientOptions {
        if (options.headers == null) options.headers = {};

        const customerId: number = this.context.currentContextItem.customerId;
        const productionScope: number = this.context.currentContextItem.productionScope;

        (<Record<string, string | string[]>>options.headers)['Product-Scope'] = productionScope.toString();
        (<Record<string, string | string[]>>options.headers)['Customer-Id'] = customerId.toString();

        return options;
    }
}
```

---

## 3. AppBaseComponent

Create your app's base component that all components will extend:

```typescript
// app/shared/_abstract/app-base.component.ts
import { ChangeDetectorRef, Directive, ElementRef, OnInit } from '@angular/core';
import { PlatformCachingService, PlatformComponent, PlatformTranslateService } from '@orient/bravo-common';
import { ToastrService } from 'ngx-toastr';

@Directive()
export abstract class AppBaseComponent extends PlatformComponent implements OnInit {
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef<HTMLElement>,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }
}
```

**Why use AppBaseComponent?**

- Single point to add app-specific base functionality
- Consistent constructor signature across all components
- Easy to add app-wide utilities later

---

## 4. PlatformComponent

The base class providing core functionality for all platform components.

### Key Properties

| Property         | Type                                    | Description                                                          |
| ---------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `status$`        | `BehaviorSubject<ComponentStateStatus>` | Current component state: Pending, Loading, Reloading, Success, Error |
| `loadingMap$`    | `BehaviorSubject<Dictionary<boolean>>`  | Loading state per request key                                        |
| `reloadingMap$`  | `BehaviorSubject<Dictionary<boolean>>`  | Reloading state per request key                                      |
| `errorMsgMap$`   | `BehaviorSubject<Dictionary<string>>`   | Error messages per request key                                       |
| `isStateLoading` | `BehaviorSubject<boolean>`              | Combined loading state                                               |
| `isStateError`   | `BehaviorSubject<boolean>`              | True if any error exists                                             |
| `isStateSuccess` | `BehaviorSubject<boolean>`              | True when status is Success                                          |

### Key Methods

#### `untilDestroyed<T>()`

Auto-cleanup operator for subscriptions:

```typescript
this.someService
    .getData()
    .pipe(this.untilDestroyed())
    .subscribe(data => (this.data = data));
```

#### `detectChanges(delayOrImmediate?)`

Trigger change detection with optional throttling:

```typescript
// Immediate change detection
this.detectChanges();

// Delayed change detection (300ms default)
this.detectChanges(true);

// Custom delay
this.detectChanges(500);
```

#### `effectSimple<T>(fn, requestKey?)`

Create a side effect that handles loading/error states:

```typescript
public loadData = this.effectSimple(() =>
    this.dataService.getData().pipe(
        this.tapResponse(data => {
            this.data = data;
            this.processData();
        })
    ),
    'loadData'  // Optional request key for independent state tracking
);
```

#### `tapResponse<T>(next, error?, complete?)`

Operator that calls change detection and handles responses:

```typescript
this.service
    .getData()
    .pipe(
        this.tapResponse(
            data => {
                this.data = data;
            },
            error => {
                this.handleError(error);
            },
            () => {
                this.onComplete();
            }
        )
    )
    .subscribe();
```

#### `setLoading(loading, requestKey?)`

Manually control loading state:

```typescript
this.setLoading(true, 'saveData');
// ... perform operation
this.setLoading(false, 'saveData');
```

#### `isLoading$(requestKey?)`

Get loading state observable for specific request:

```typescript
// In template
<div *ngIf="isLoading$('saveData') | async">Saving...</div>
```

#### `getErrorMsg$(requestKey?)`

Get error message for specific request:

```typescript
// In template
<div *ngIf="getErrorMsg$('loadData') | async as error" class="alert alert-danger">
    {{ error }}
</div>
```

### Usage Example

```typescript
@Component({
    selector: 'app-simple-display',
    template: `
        <div *ngIf="isStateLoading | async" class="loading">Loading...</div>
        <div *ngIf="isStateError | async" class="error">{{ getAllErrorMsgs$() | async }}</div>
        <div *ngIf="data">{{ data.name }}</div>
    `
})
export class SimpleDisplayComponent extends AppBaseComponent implements OnInit {
    public data: any;

    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService,
        private dataService: DataService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }

    ngOnInit(): void {
        super.ngOnInit();
        this.loadData();
    }

    protected initOrReloadVm = (isReload: boolean): Observable<unknown> => of(undefined);

    public loadData = this.effectSimple(() =>
        this.dataService.getData().pipe(
            this.tapResponse(data => {
                this.data = data;
            })
        )
    );
}
```

---

## 5. PlatformVmComponent

Extends PlatformComponent with ViewModel (MVVM) pattern support.

### Key Properties

| Property         | Type                          | Description                              |
| ---------------- | ----------------------------- | ---------------------------------------- |
| `vm`             | `BehaviorSubject<TViewModel>` | Reactive view model                      |
| `vm$`            | `Observable<TViewModel>`      | Observable stream of VM                  |
| `originalInitVm` | `TViewModel`                  | Clone of initial VM for reset/comparison |

### Abstract Method (Required)

```typescript
protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
```

### Key Methods

#### `currentVm()`

Get current ViewModel (throws if undefined):

```typescript
const name = this.currentVm().userName;
```

#### `updateVm(partial | updater)`

Update ViewModel immutably:

```typescript
// Partial update
this.updateVm({ loading: false, items: newItems });

// Updater function
this.updateVm(vm => ({ ...vm, count: vm.count + 1 }));
```

#### `reload()`

Force reload the ViewModel:

```typescript
public refreshData(): void {
    this.reload();
}
```

### Usage Example

```typescript
interface UserProfileVm {
    userName: string;
    email: string;
    isLoading: boolean;
}

@Component({
    selector: 'app-user-profile',
    template: `
        <div *ngIf="vm$ | async as profile">
            <h2>{{ profile.userName }}</h2>
            <p>{{ profile.email }}</p>
        </div>
    `
})
export class UserProfileComponent extends AppBaseComponent implements OnInit {
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService,
        private userService: UserService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }

    // Required: Define how to load/reload the ViewModel
    protected initOrReloadVm = (isReload: boolean): Observable<UserProfileVm> => {
        return this.userService.getCurrentUser().pipe(
            map(user => ({
                userName: user.name,
                email: user.email,
                isLoading: false
            }))
        );
    };

    public updateEmail(newEmail: string): void {
        this.updateVm({ email: newEmail });
    }
}
```

---

## 6. PlatformFormComponent

Extends PlatformVmComponent with advanced reactive form management.

### Key Properties

| Property        | Type                             | Description                     |
| --------------- | -------------------------------- | ------------------------------- |
| `form`          | `FormGroup`                      | Angular reactive form           |
| `mode`          | `'create' \| 'update' \| 'view'` | Current form mode               |
| `isViewMode`    | `boolean`                        | True when mode is 'view'        |
| `isCreateMode`  | `boolean`                        | True when mode is 'create'      |
| `isUpdateMode`  | `boolean`                        | True when mode is 'update'      |
| `isFormLoading` | `BehaviorSubject<boolean>`       | True if form pending or loading |

### Abstract Method (Required)

```typescript
protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
```

### PlatformFormConfig Interface

```typescript
interface PlatformFormConfig<TViewModel> {
    controls: {
        [K in keyof TViewModel]?:
            | FormControl
            | FormGroup
            | {
                  // For FormArray
                  modelItems: () => TViewModel[K];
                  itemControl: (item: any, index: number) => FormControl | FormGroup;
              };
    };
    dependentValidations?: {
        // When 'price' changes, also validate 'category'
        [K in keyof TViewModel]?: (keyof TViewModel)[];
    };
    groupValidations?: (keyof TViewModel)[][];
}
```

### Key Methods

#### `validateForm(markAsTouched?)`

Validate the form and optionally mark all controls as touched:

```typescript
if (!this.validateForm()) {
    this.toast.error('Please fix validation errors');
    return;
}
```

#### `canSubmitForm()`

Check if form is valid, dirty, and not loading:

```typescript
<button [disabled]="!canSubmitForm()">Submit</button>
```

#### `resetForm()`

Reset form to initial state:

```typescript
public onCancel(): void {
    this.resetForm();
}
```

### Usage Example (ProductFormComponent)

```typescript
interface ProductFormVm {
    productId?: string;
    productName: string;
    category: string;
    price?: number;
    isActive: boolean;
    specifications: ProductSpecification[];
}

@Component({
    selector: 'app-product-form',
    template: `
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Mode indicator -->
            <span
                class="badge"
                [ngClass]="{
                    'badge-success': mode === 'create',
                    'badge-primary': mode === 'update',
                    'badge-secondary': mode === 'view'
                }"
            >
                {{ mode | titlecase }}
            </span>

            <!-- Form fields -->
            <input formControlName="productName" [readonly]="isViewMode" />
            <select formControlName="category" [disabled]="isViewMode">
                <option *ngFor="let cat of categories" [value]="cat.key">{{ cat.label }}</option>
            </select>

            <!-- FormArray for specifications -->
            <div formArrayName="specifications">
                <div *ngFor="let spec of specificationsArray.controls; let i = index" [formGroupName]="i">
                    <input formControlName="name" placeholder="Spec Name" />
                    <input formControlName="value" placeholder="Spec Value" />
                    <button type="button" (click)="removeSpecification(i)">Remove</button>
                </div>
            </div>
            <button type="button" (click)="addSpecification()">Add Specification</button>

            <!-- Submit -->
            <button type="submit" [disabled]="!canSubmitForm() || (isFormLoading | async)">
                {{ mode === 'create' ? 'Create' : 'Update' }}
            </button>
        </form>
    `
})
export class ProductFormComponent extends PlatformFormComponent<ProductFormVm> implements OnInit {
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService,
        private productApi: ProductApiService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
        this.mode = 'create'; // Set initial mode
    }

    // Required: Load ViewModel
    protected initOrReloadVm = (isReload: boolean): Observable<ProductFormVm> => {
        if (this.productId) {
            return this.productApi.getProductById(this.productId);
        }
        return of({
            productName: '',
            category: '',
            price: undefined,
            isActive: true,
            specifications: []
        });
    };

    // Required: Configure form
    protected initialFormConfig = (): PlatformFormConfig<ProductFormVm> => {
        const vm = this.currentVm();

        return {
            controls: {
                productName: new FormControl(vm.productName, [Validators.required, Validators.minLength(2)]),
                category: new FormControl(vm.category, [Validators.required]),
                price: new FormControl(vm.price, [Validators.min(0)]),
                isActive: new FormControl(vm.isActive),
                specifications: {
                    modelItems: () => vm.specifications,
                    itemControl: (spec: ProductSpecification) =>
                        new FormGroup({
                            name: new FormControl(spec.name, [Validators.required]),
                            value: new FormControl(spec.value, [Validators.required]),
                            unit: new FormControl(spec.unit || '')
                        })
                }
            },
            dependentValidations: {
                price: ['category'] // Validate price when category changes
            }
        };
    };

    // FormArray helper
    public get specificationsArray(): FormArray {
        return this.form.get('specifications') as FormArray;
    }

    public addSpecification(): void {
        const currentSpecs = this.currentVm().specifications || [];
        this.updateVm({
            specifications: [...currentSpecs, { name: '', value: '', unit: '' }]
        });
        this.form.markAsDirty();
    }

    public removeSpecification(index: number): void {
        const specs = this.currentVm().specifications.filter((_, i) => i !== index);
        this.updateVm({ specifications: specs });
        this.form.markAsDirty();
    }

    public onSubmit(): void {
        if (!this.validateForm()) {
            this.toast.error('Please fix validation errors');
            return;
        }
        // Submit logic...
    }
}
```

---

## 7. PlatformVmStoreComponent

Extends PlatformComponent with NgRx ComponentStore integration for complex state management.

### Key Properties

| Property           | Type                          | Description                       |
| ------------------ | ----------------------------- | --------------------------------- |
| `store`            | `TViewModelStore`             | Main NgRx ComponentStore instance |
| `vm`               | `BehaviorSubject<TViewModel>` | Delegates to store.vm             |
| `additionalStores` | `PlatformVmStore[]`           | Auto-discovered additional stores |

### Key Methods

| Method               | Description                                 |
| -------------------- | ------------------------------------------- |
| `currentVm()`        | Get current state from store                |
| `updateVm(partial)`  | Update store state                          |
| `reload()`           | Reload main store and all additional stores |
| `isLoading$(key?)`   | Combined loading state from all stores      |
| `getErrorMsg$(key?)` | Combined error messages from all stores     |

### Store Definition

```typescript
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@orient/bravo-common';

interface UserListVm {
    users: User[];
    selectedUser?: User;
    searchText: string;
    totalCount: number;
}

@Injectable()
export class UserListStore extends PlatformVmStore<UserListVm> {
    // Initial state
    protected override initialVm(): UserListVm {
        return {
            users: [],
            selectedUser: undefined,
            searchText: '',
            totalCount: 0
        };
    }

    // Selectors
    readonly users$ = this.select(state => state.users);
    readonly selectedUser$ = this.select(state => state.selectedUser);

    // Effects
    loadUsers = this.effectSimple(() =>
        this.userApi.getUsers(this.currentVm().searchText).pipe(
            this.tapResponse(response => {
                this.updateState({
                    users: response.items,
                    totalCount: response.total
                });
            })
        )
    );

    // Actions
    setSearchText(text: string): void {
        this.updateState({ searchText: text });
        this.loadUsers();
    }

    selectUser(user: User): void {
        this.updateState({ selectedUser: user });
    }

    constructor(private userApi: UserApiService) {
        super();
    }
}
```

### Component Usage

```typescript
@Component({
    selector: 'app-user-list',
    template: `
        <input [(ngModel)]="searchText" (input)="onSearch()" placeholder="Search users..." />

        <div *ngIf="isStateLoading | async">Loading...</div>

        <table *ngIf="store.users$ | async as users">
            <tr *ngFor="let user of users" (click)="onSelectUser(user)">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
            </tr>
        </table>

        <div *ngIf="store.selectedUser$ | async as selected">
            <h3>Selected: {{ selected.name }}</h3>
        </div>
    `,
    providers: [UserListStore] // Provide store at component level
})
export class UserListComponent extends PlatformVmStoreComponent<UserListVm, UserListStore> {
    public searchText = '';

    constructor(public override store: UserListStore) {
        super(store);
    }

    public onSearch(): void {
        this.store.setSearchText(this.searchText);
    }

    public onSelectUser(user: User): void {
        this.store.selectUser(user);
    }

    public refresh(): void {
        this.reload(); // Reloads store and all additional stores
    }
}
```

---

## 8. PlatformApiService

Base class for API services with caching, error handling, and request configuration.

### Key Methods

| Method                                              | Description                 |
| --------------------------------------------------- | --------------------------- |
| `get<T>(path, params?, config?, disableCached?)`    | GET with cache-then-refresh |
| `post<T>(path, body, options?, config?)`            | POST with optional caching  |
| `put<T>(path, body, config?)`                       | PUT request                 |
| `delete<T>(path, config?)`                          | DELETE request              |
| `postFileMultiPartForm<T>(path, formData, config?)` | Multipart file upload       |

### Usage Example

```typescript
import { Injectable } from '@angular/core';
import { PlatformApiService } from '@orient/bravo-common';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserApiService extends PlatformApiService {
    protected override get apiUrl(): string {
        return environment.apiUrl + '/api/users';
    }

    getUsers(searchText?: string): Observable<UserListResponse> {
        return this.get<UserListResponse>('', { searchText });
    }

    getUserById(id: string): Observable<User> {
        return this.get<User>(`/${id}`);
    }

    createUser(request: CreateUserRequest): Observable<User> {
        return this.post<User>('', request);
    }

    updateUser(id: string, request: UpdateUserRequest): Observable<User> {
        return this.put<User>(`/${id}`, request);
    }

    deleteUser(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    uploadAvatar(userId: string, file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);
        return this.postFileMultiPartForm<string>(`/${userId}/avatar`, formData);
    }

    // Cached POST (for search endpoints that are safe to cache)
    searchUsers(criteria: SearchCriteria): Observable<User[]> {
        return this.post<User[]>('/search', criteria, { enableCache: true });
    }
}
```

---

## 9. Real Examples

### Example 1: ProfileCardComponent (Simple Input/Output Component)

```typescript
// From CandidateAppClient: app/shared/components/profile-card/profile-card.component.ts

@Component({
    selector: 'app-profile-card',
    templateUrl: './profile-card.component.html',
    styleUrls: ['./profile-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileCardComponent extends AppBaseComponent implements OnInit, OnChanges {
    @Input() survey: EmployeeProfileSurveyInfo;
    @Input() profileDetail: ProfileDetail | undefined;
    @Input() cardClass: string = 'explore-profile';

    @Output() startProfile = new EventEmitter<ProfileType>();

    public profileDisplayName: string = '';
    public profileDescription: string = '';

    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService,
        private profileDisplayService: ProfileDisplayService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }

    ngOnInit(): void {
        super.ngOnInit();
        this.updateComputedProperties();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['survey'] || changes['profileDetail']) {
            this.updateComputedProperties();
            this.detectChanges(); // Platform method for change detection
        }
    }

    // Required but returns undefined for Input-driven components
    protected initOrReloadVm = (isReload: boolean): Observable<unknown> => of(undefined);

    private updateComputedProperties(): void {
        this.profileDisplayName = this.profileDisplayService.getProfileDisplayName(this.survey?.type);
        this.profileDescription = this.profileDisplayService.getProfileDescription(this.survey?.type);
    }

    public onStartProfile(): void {
        if (this.survey?.type) {
            this.startProfile.emit(this.survey.type);
        }
    }
}
```

### Example 2: MyProfileV3Component (Complex Data Loading)

```typescript
// From CandidateAppClient: app/shared/components/my-profile-v3/my-profile-v3.component.ts

@Component({
    selector: 'my-profile-v3',
    templateUrl: './my-profile-v3.component.html',
    styleUrls: ['./my-profile-v3.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyProfileV3Component extends AppBaseComponent implements OnInit {
    public employeeProfile: EmployeeProfile;
    public profileDetails: ProfileDetail[] = [];
    public completedSurveys: EmployeeProfileSurveyInfo[] = [];

    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService,
        private employeeProfileService: EmployeeProfileService,
        private teamRoleService: TeamRoleService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }

    // initOrReloadVm delegates to loadEmployeeProfile
    protected initOrReloadVm = (isReload: boolean): Observable<unknown | undefined> | undefined => this.loadEmployeeProfile(undefined, isReload);

    ngOnInit(): void {
        super.ngOnInit();

        // Subscribe to external state changes
        this.teamRoleService.teamRoleStatus$.subscribe(status => {
            this.teamRoleStatusResponse = status;
            this.processProfileData();
        });
    }

    // Using effectSimple for side effects
    public loadEmployeeProfile = this.effectSimple(() =>
        this.employeeProfileService.getEmployeeProfile().pipe(
            this.tapResponse(employeeProfile => {
                this.employeeProfile = employeeProfile;
                this.processProfileData();
            })
        )
    );

    public refreshProfiles(): void {
        this.reload(); // Uses Platform's reload mechanism
    }

    private processProfileData(): void {
        // Process loaded data...
        this.detectChanges(); // Trigger change detection
    }
}
```

---

## 10. Migration Guide

### From Legacy BaseComponent to Platform

#### Step 1: Update Base Class

**Before:**

```typescript
import { BaseComponent } from '@app/shared/abstract/base.component';

export class MyComponent extends BaseComponent implements OnInit {
    private ngUnsubscribe$ = new Subject();

    constructor() {
        super();
    }
}
```

**After:**

```typescript
import { AppBaseComponent } from '@app/shared/_abstract/app-base.component';
import { PlatformCachingService, PlatformTranslateService } from '@orient/bravo-common';

export class MyComponent extends AppBaseComponent implements OnInit {
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }
}
```

#### Step 2: Replace Subscription Management

**Before:**

```typescript
this.dataService
    .getData()
    .pipe(takeUntil(this.ngUnsubscribe$))
    .subscribe(data => (this.data = data));
```

**After:**

```typescript
this.dataService.getData()
    .pipe(this.untilDestroyed())
    .subscribe(data => this.data = data);

// Or use effectSimple for side effects:
public loadData = this.effectSimple(() =>
    this.dataService.getData().pipe(
        this.tapResponse(data => this.data = data)
    )
);
```

#### Step 3: Add initOrReloadVm

```typescript
// Required for all Platform components
protected initOrReloadVm = (isReload: boolean): Observable<unknown> => {
    // For simple components with no async init:
    return of(undefined);

    // For components loading data:
    return this.loadData();
};
```

#### Step 4: Use Platform Loading/Error States

**Before:**

```typescript
public isLoading = false;
public error: string | null = null;

loadData() {
    this.isLoading = true;
    this.service.getData().subscribe({
        next: data => { this.data = data; this.isLoading = false; },
        error: err => { this.error = err.message; this.isLoading = false; }
    });
}
```

**After:**

```typescript
// Template uses built-in states
<div *ngIf="isStateLoading | async">Loading...</div>
<div *ngIf="getErrorMsg$() | async as error">{{ error }}</div>

// Component uses effectSimple
public loadData = this.effectSimple(() =>
    this.service.getData().pipe(
        this.tapResponse(data => this.data = data)
    )
);
```

### Migration Checklist

- [ ] Update imports to use `@orient/bravo-common`
- [ ] Change base class to `AppBaseComponent`
- [ ] Update constructor to include Platform dependencies
- [ ] Add `super.ngOnInit()` call in `ngOnInit()`
- [ ] Implement `initOrReloadVm` abstract method
- [ ] Replace `takeUntil(ngUnsubscribe$)` with `untilDestroyed()`
- [ ] Replace manual loading/error states with Platform states
- [ ] Use `effectSimple()` and `tapResponse()` for side effects
- [ ] Use `detectChanges()` instead of direct `ChangeDetectorRef`
- [ ] Test that all subscriptions are properly cleaned up

---

## 11. Decision Tree

### Which Platform Base Class Should I Use?

```
Start
  │
  ├─ Does the component need reactive forms?
  │   ├─ YES → Use PlatformFormComponent
  │   │         • Form modes (create/update/view)
  │   │         • FormArray support
  │   │         • Async validation
  │   │         • initialFormConfig()
  │   │
  │   └─ NO ─┬─ Does it need complex state management?
  │          │
  │          ├─ YES (multiple data sources, caching, computed state)
  │          │   └─ Use PlatformVmStoreComponent
  │          │         • NgRx ComponentStore
  │          │         • Multiple stores coordination
  │          │         • Selectors and effects
  │          │
  │          └─ NO ─┬─ Does it load/manage a ViewModel?
  │                 │
  │                 ├─ YES → Use PlatformVmComponent
  │                 │         • initOrReloadVm pattern
  │                 │         • updateVm() for state
  │                 │         • vm$ observable
  │                 │
  │                 └─ NO → Use PlatformComponent (via AppBaseComponent)
  │                           • Simple display components
  │                           • Input/Output driven
  │                           • effectSimple() for side effects
```

### Quick Decision Table

| Scenario                              | Base Class               | Key Pattern                            |
| ------------------------------------- | ------------------------ | -------------------------------------- |
| Display card with @Input/@Output      | AppBaseComponent         | `initOrReloadVm = () => of(undefined)` |
| Page loading single data set          | AppBaseComponent         | `effectSimple()` + `tapResponse()`     |
| Component with editable state         | PlatformVmComponent      | `initOrReloadVm` + `updateVm()`        |
| Create/Edit/View form                 | PlatformFormComponent    | `initialFormConfig()` + `mode`         |
| Complex list with filters, pagination | PlatformVmStoreComponent | Custom `PlatformVmStore`               |

---

## 12. Quick Reference

### Import Statements

```typescript
// Base component (your app's extension)
import { AppBaseComponent } from '@app/shared/_abstract/app-base.component';

// Platform services (inject in constructor)
import { PlatformCachingService, PlatformTranslateService } from '@orient/bravo-common';

// Platform base classes (for advanced components)
import {
    PlatformComponent,
    PlatformVmComponent,
    PlatformFormComponent,
    PlatformVmStoreComponent,
    PlatformVmStore,
    PlatformFormConfig,
    PlatformFormMode
} from '@orient/bravo-common';

// Platform API service
import { PlatformApiService } from '@orient/bravo-common';

// Module setup
import {
    PlatformCoreModule,
    PlatformCoreModuleConfig,
    PlatformApiErrorEventHandler,
    PlatformHttpOptionsConfigService,
    BravoCommonModule
} from '@orient/bravo-common';

// Third-party (required)
import { ToastrService } from 'ngx-toastr';
```

### Constructor Pattern

```typescript
constructor(
    changeDetector: ChangeDetectorRef,
    elementRef: ElementRef,
    cacheService: PlatformCachingService,
    toast: ToastrService,
    translateSrv: PlatformTranslateService,
    // Your dependencies...
    private myService: MyService
) {
    super(changeDetector, elementRef, cacheService, toast, translateSrv);
}
```

### Component Template Standard

Use `<platform-loading-error-indicator>` for loading/error states instead of `<app-spinner>`:

```html
<!-- Standard component template structure -->
<platform-loading-error-indicator [target]="this"></platform-loading-error-indicator>

<div class="my-component">
    <!-- Component content goes here -->
</div>
```

**Benefits:**

- Automatically shows loading spinner during any `effectSimple()` or `observerLoadingErrorState()` operations
- Displays error messages when requests fail
- Uses the component's built-in `loadingMap$` and `errorMsgMap$` state

### Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.my-component {
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

### Common Patterns Cheatsheet

```typescript
// 1. Required abstract method (even for simple components)
protected initOrReloadVm = (isReload: boolean): Observable<unknown> => of(undefined);

// 2. Load data with automatic loading/error handling
public loadData = this.effectSimple(() =>
    this.service.getData().pipe(
        this.tapResponse(data => this.data = data)
    )
);

// 3. Auto-cleanup subscriptions
this.observable$.pipe(this.untilDestroyed()).subscribe(...);

// 4. Manual change detection
this.detectChanges();

// 5. Update ViewModel (PlatformVmComponent)
this.updateVm({ field: newValue });

// 6. Reload component data
this.reload();

// 7. Check loading state in template
<div *ngIf="isStateLoading | async">Loading...</div>

// 8. Check error state in template
<div *ngIf="getErrorMsg$() | async as error">{{ error }}</div>

// 9. Form validation (PlatformFormComponent)
if (!this.validateForm()) return;

// 10. Check form submittable
[disabled]="!canSubmitForm()"
```

---

## Additional Resources

- **Platform Examples:** `src/Web/BravoComponents/src/components/platform-examples/`
- **CandidateAppClient Implementation:** `src/Web/CandidateAppClient/src/app/`
- **BravoCommon Source:** `src/Web/BravoComponents/projects/bravo-common-lib/`
- **WebV2 Platform Core:** `src/WebV2/libs/platform-core/` (Angular 19+ version)

---

_Generated: 2025-12-25 | For Web V1 Apps (Angular 12) using @orient/bravo-common_
