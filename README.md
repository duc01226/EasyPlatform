# 🏗️ Easy.Platform Framework - Developer Guide

[![.NET 8](https://img.shields.io/badge/.NET-8-blue.svg)](https://dotnet.microsoft.com/download)
[![Angular 19](https://img.shields.io/badge/Angular-19-red.svg)](https://angular.io/)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean-green.svg)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![CQRS](https://img.shields.io/badge/Pattern-CQRS-orange.svg)](https://martinfowler.com/bliki/CQRS.html)

> **Easy.Platform** is a comprehensive framework for building enterprise applications with **.NET 8 backend** and **Angular 19 frontend**, featuring Clean Architecture, CQRS, Domain-Driven Design, and event-driven patterns.

## 🎯 Quick Navigation

| **👤 I am a...**    | **🚀 Get Started**                          | **📚 Learn More**                           |
| ------------------- | ------------------------------------------- | ------------------------------------------- |
| **New Developer**   | [Quick Setup](#-quick-setup-5-minutes)      | [Learning Path](#-learning-paths)           |
| **AI Coding Agent** | [AI Guidelines](#-ai-agent-quick-reference) | [Decision Trees](#-decision-trees)          |
| **Architect**       | [Architecture](#-platform-architecture)     | [Technical Docs](#-technical-documentation) |
| **Framework User**  | [Usage Guide](#-framework-usage-guide)      | [Code Examples](#-comprehensive-examples)   |

---

## 🏗️ Platform Architecture

Easy.Platform implements **Clean Architecture** with these core principles:

-   **Domain-Driven Design**: Rich domain models with business logic
-   **CQRS**: Command Query Responsibility Segregation with MediatR
-   **Event-Driven Architecture**: Domain events and cross-service messaging
-   **Multi-Database Support**: Entity Framework Core, MongoDB, PostgreSQL
-   **Microservices Ready**: Modular design for distributed systems

### 🎯 System Architecture

```mermaid
graph TB
    subgraph "🖥️ Frontend Framework - Nx Workspace"
        subgraph "📱 Micro Frontend Apps"
            ADMIN_APP["admin-portal<br/>Management Dashboard"]
            CLIENT_APP["client-portal<br/>User Interface"]
            MOBILE_APP["mobile-app<br/>Mobile Interface"]
        end

        subgraph "🏗️ Shared Libraries"
            PLATFORM_CORE["platform-core<br/>Base Components & Services"]
            DOMAIN_LIB["domain-models<br/>Business Domain Models"]
            UI_COMMON["ui-common<br/>Shared UI Components"]
            SHARED_STYLES["shared-styles<br/>SCSS Themes & Variables"]
            SHARED_ASSETS["shared-assets<br/>Icons & Images"]
        end

        ADMIN_APP --> PLATFORM_CORE
        ADMIN_APP --> DOMAIN_LIB
        ADMIN_APP --> UI_COMMON
        CLIENT_APP --> PLATFORM_CORE
        CLIENT_APP --> DOMAIN_LIB
        CLIENT_APP --> UI_COMMON
        MOBILE_APP --> PLATFORM_CORE
        MOBILE_APP --> DOMAIN_LIB

        DOMAIN_LIB --> PLATFORM_CORE
        UI_COMMON --> PLATFORM_CORE
        UI_COMMON --> SHARED_STYLES
        DOMAIN_LIB --> SHARED_STYLES
        UI_COMMON --> SHARED_ASSETS
    end

    subgraph "🔌 Backend Framework"
        API["ASP.NET Core<br/>Platform Controllers"]
        CQRS["MediatR CQRS<br/>Commands & Queries"]
        Domain["Domain Layer<br/>Entities & Events"]
    end

    subgraph "⚙️ Platform Services"
        Auth["Authentication<br/>& Authorization"]
        Cache["Redis Caching<br/>Provider"]
        Jobs["Hangfire Background<br/>Job Executor"]
        Bus["RabbitMQ Message<br/>Bus Producer/Consumer"]
    end

    subgraph "🗄️ Data Access Layer"
        EF["Entity Framework<br/>Repository Pattern"]
        Mongo["MongoDB<br/>Repository Pattern"]
        Postgres["PostgreSQL<br/>Repository Pattern"]
    end

    ADMIN_APP --> API
    CLIENT_APP --> API
    MOBILE_APP --> API
    API --> CQRS
    CQRS --> Domain
    Domain --> Auth
    Domain --> Cache
    Domain --> Jobs
    Domain --> Bus
    Domain --> EF
    Domain --> Mongo
    Domain --> Postgres
```

### 🛠️ Technology Stack

| Layer               | Technologies                                      |
| ------------------- | ------------------------------------------------- |
| **Backend Core**    | .NET 8, ASP.NET Core, MediatR, FluentValidation   |
| **Frontend Core**   | Angular 19, TypeScript, RxJS, NgRx ComponentStore |
| **Data Access**     | Entity Framework Core, MongoDB Driver, Dapper     |
| **Messaging**       | RabbitMQ, Event Bus Patterns                      |
| **Caching**         | Redis, In-Memory Cache                            |
| **Background Jobs** | Hangfire                                          |
| **File Storage**    | Azure Blob Storage, Local File System             |
| **Authentication**  | JWT, OAuth, Custom Authorization                  |

---

## ⚡ Quick Setup (5 Minutes)

### Prerequisites

```bash
# Verify installations
dotnet --version          # Should be 8.0+
node --version            # Should be 20.0+
npm --version             # Should be 10.0+
```

### Framework Installation

#### Option 1: Use Platform Example App

```bash
# Clone and explore the example
cd src/PlatformExampleApp
dotnet build
dotnet run --project PlatformExampleApp.TextSnippet.Api
```

#### Option 2: Create New Project

```bash
# Create new solution using platform templates
dotnet new sln -n MyPlatformApp
mkdir MyPlatformApp.Domain
mkdir MyPlatformApp.Application
mkdir MyPlatformApp.Persistence
mkdir MyPlatformApp.Service

# Add platform package references
dotnet add package Easy.Platform
dotnet add package Easy.Platform.AspNetCore
dotnet add package Easy.Platform.EfCore
```

#### Frontend Setup (Nx Workspace)

```bash
# Create Nx workspace with Angular
npx create-nx-workspace@latest my-platform-workspace --preset=angular --appName=admin-portal --style=scss

cd my-platform-workspace

# Generate additional applications
nx generate @nx/angular:app client-portal
nx generate @nx/angular:app mobile-app

# Generate shared libraries
nx generate @nx/angular:library platform-core
nx generate @nx/angular:library domain-models
nx generate @nx/angular:library ui-common
nx generate @nx/angular:library shared-styles

# Install platform dependencies
npm install @ngrx/component-store rxjs @angular/material ngx-toastr
npm install @angular/cdk @angular/forms @angular/router
```

---

## 🏗️ Frontend Architecture Overview

### 📱 Micro Frontend Structure

The platform uses **Nx workspace** to create a scalable micro frontend architecture:

```
frontend-workspace/
├── apps/                         # Individual applications
│   ├── admin-portal/            # Management dashboard
│   ├── client-portal/           # User interface
│   └── mobile-app/              # Mobile application
│
├── libs/                        # Shared libraries
│   ├── platform-core/           # Core framework components
│   ├── domain-models/           # Business models and DTOs
│   ├── ui-common/               # Shared UI components
│   ├── shared-styles/           # SCSS themes and variables
│   └── shared-assets/           # Icons and images
│
└── tools/                       # Build and development tools
```

### 🎨 Component Hierarchy Architecture

```typescript
// Platform Core Layer (Framework Foundation)
PlatformComponent               // Base: lifecycle, error handling, subscriptions
├── PlatformVmComponent         // + ViewModel integration
├── PlatformFormComponent       // + Reactive forms integration
└── PlatformVmStoreComponent    // + ComponentStore state management

// Application Layer (Your Business Logic)
AppBaseComponent                // + Auth, roles, company context
├── AppBaseVmComponent          // + ViewModel + auth context
├── AppBaseFormComponent        // + Forms + auth + validation
└── AppBaseVmStoreComponent     // + Store + auth + loading/error

// Feature Layer (Implementation)
├── UserManagementComponent extends AppBaseComponent
├── DashboardComponent extends AppBaseVmStoreComponent
├── UserFormComponent extends AppBaseFormComponent
└── DataTableComponent extends AppBaseComponent
```

### 🔄 State Management Philosophy

#### **MVVM with Strict Separation of Concerns**

```typescript
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   COMPONENTS    │    │   VIEW MODELS   │    │      STORES     │
│   (Pure UI)     │────│ (Pure Logic)    │────│ (State Management) │
│                 │    │                 │    │                 │
│ • Templates     │    │ • Business      │    │ • API Calls     │
│ • User Events   │    │   Logic         │    │ • Caching       │
│ • UI State      │    │ • Validation    │    │ • Background    │
│                 │    │ • Calculations  │    │   Refresh       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Core Principle**: Components handle ONLY UI concerns. ALL business logic, data manipulation, and state management belongs in View Model Stores.

---

## 🏗️ Frontend Development Patterns

### 1. Platform Component (Base Foundation)

```typescript
// Base component with automatic subscription cleanup and state management
@Directive()
export abstract class PlatformComponent implements OnDestroy {
    public destroyed$ = new BehaviorSubject<boolean>(false);
    public status$ = signal(ComponentStateStatus.Pending);

    // Injected platform services
    public toast = inject(ToastrService);
    public translateSrv = inject(PlatformTranslateService);
    public authService = inject(AuthService);

    ngOnDestroy() {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    }

    // Helper method for automatic subscription cleanup
    protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
        return takeUntil(this.destroyed$);
    }

    // Reactive state management
    protected setLoading(value: boolean, requestKey = 'default') {
        // Automatic loading state management
    }

    protected setError(error: string | Error, requestKey = 'default') {
        // Centralized error handling
    }
}
```

### 2. Platform Store (State Management)

```typescript
// Enhanced ComponentStore with caching and lifecycle management
@Injectable()
export abstract class PlatformVmStore<TViewModel extends PlatformVm> extends ComponentStore<TViewModel> {
    // Abstract properties to be implemented
    protected abstract cachedStateKeyName: (() => string) | string;
    public abstract initOrReloadVm: (isReload: boolean) => Observable<any> | void;

    // Built-in state selectors
    public readonly loading$ = this.select(state => state.loading);
    public readonly errorMsg$ = this.select(state => state.errorMsg);

    // Effect wrapper with automatic loading/error state management
    protected effectSimple<T>(generator: (origin$?: Observable<T>) => Observable<any>) {
        return this.effect((origin$: Observable<T>) =>
            generator(origin$).pipe(
                this.observerLoadingErrorState() // Automatic state management
            )
        );
    }

    // Cache-then-refresh strategy
    protected loadWithCache<T>(apiCall: () => Observable<T>, cacheKey: string, updateState: (data: T) => void): Observable<T> {
        return this.cacheService.get(cacheKey).pipe(
            tap(cached => cached && updateState(cached)), // Instant UI update
            switchMap(() => apiCall()), // Background refresh
            tap(fresh => {
                updateState(fresh);
                this.cacheService.set(cacheKey, fresh);
            })
        );
    }
}

// Real-world example implementation
@Injectable()
export class UserManagementStore extends PlatformVmStore<UserManagementState> {
    constructor(private userApi: UserApiService) {
        super(new UserManagementState());
    }

    protected cachedStateKeyName = 'UserManagementStore';

    public override initOrReloadVm = (isReload: boolean) => this.loadUsers();

    // Effect for loading users with caching
    public loadUsers = this.effectSimple(() => {
        return this.loadWithCache(
            () => this.userApi.getUsers(),
            'users-list',
            users => this.updateState({ users })
        );
    });

    // Effect for creating user
    public createUser = this.effectSimple((userData: CreateUserRequest) => {
        return this.userApi.createUser(userData).pipe(
            this.tapResponse(() => {
                this.toast.success('User created successfully');
                this.loadUsers(); // Refresh the list
            })
        );
    });

    // Selectors for reactive UI
    public readonly users$ = this.select(state => state.users);
    public readonly activeUsers$ = this.select(state => state.users.filter(u => u.isActive));
}

interface UserManagementState extends PlatformVm {
    users: User[];
    selectedUser?: User;
    filters: UserFilters;
}
```

### 3. API Service Pattern

```typescript
// Platform API service with automatic error handling and caching
@Injectable({ providedIn: 'root' })
export class UserApiService extends PlatformApiService {
    constructor() {
        super();
        this.apiUrl = environment.apiUrl + '/api/User';
    }

    // GET with automatic caching
    public getUsers(params?: GetUsersQuery): Observable<User[]> {
        return this.get<User[]>('', params);
    }

    // POST with validation
    public createUser(request: CreateUserRequest): Observable<CreateUserResponse> {
        return this.post<CreateUserResponse>('', request);
    }

    // PUT for updates
    public updateUser(id: string, request: UpdateUserRequest): Observable<void> {
        return this.put<void>(`/${id}`, request);
    }

    // DELETE with confirmation
    public deleteUser(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    // File upload with progress tracking
    public uploadUserAvatar(id: string, file: File): Observable<UploadResponse> {
        return this.postFileMultiPartForm<UploadResponse>(`/${id}/avatar`, { file });
    }
}
```

### 4. Form Components with Validation

```typescript
// Platform form component with two-way binding and validation
@Component({
    selector: 'app-user-form',
    template: `
        <form [formGroup]="formGroup" (ngSubmit)="onSubmit()">
            <mat-form-field>
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName" required />
                <mat-error *ngIf="formGroup.get('fullName')?.hasError('required')"> Full name is required </mat-error>
            </mat-form-field>

            <mat-form-field>
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" required />
                <mat-error *ngIf="formGroup.get('email')?.hasError('email')"> Please enter a valid email </mat-error>
            </mat-form-field>

            <mat-form-field>
                <mat-label>Role</mat-label>
                <mat-select formControlName="role" required>
                    <mat-option value="user">User</mat-option>
                    <mat-option value="admin">Admin</mat-option>
                    <mat-option value="manager">Manager</mat-option>
                </mat-select>
            </mat-form-field>

            <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="formGroup.invalid || loading()">
                    {{ isEditMode ? 'Update' : 'Create' }} User
                </button>
                <button mat-button type="button" (click)="onCancel()">Cancel</button>
            </div>
        </form>
    `
})
export class UserFormComponent extends AppBaseFormComponent<UserFormVm> {
    @Input() user?: User;
    @Input() isEditMode = false;

    override initialFormConfig(): FormGroup {
        return this.fb.group({
            fullName: ['', [Validators.required, Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email]],
            role: ['user', Validators.required],
            isActive: [true]
        });
    }

    protected override setupCustomValidation() {
        // Add async validator for email uniqueness
        this.formGroup.get('email')?.setAsyncValidators([this.createEmailUniqueValidator()]);

        // Watch for role changes
        this.formGroup
            .get('role')
            ?.valueChanges.pipe(this.takeUntilDestroyed())
            .subscribe(role => {
                this.handleRoleChange(role);
            });
    }

    private createEmailUniqueValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            if (!control.value || (this.isEditMode && control.value === this.user?.email)) {
                return of(null);
            }

            return this.userApi.checkEmailExists(control.value).pipe(
                map(exists => (exists ? { emailExists: true } : null)),
                catchError(() => of(null))
            );
        };
    }

    onSubmit() {
        if (this.formGroup.valid) {
            const formData = this.formGroup.value as CreateUserRequest;
            this.save.emit(formData);
        }
    }

    onCancel() {
        this.cancel.emit();
    }

    @Output() save = new EventEmitter<CreateUserRequest>();
    @Output() cancel = new EventEmitter<void>();
}
```

### 5. Complete Feature Implementation

```typescript
// Complete user management feature with store integration
@Component({
    selector: 'app-user-management',
    template: `
        <div class="user-management">
            <!-- Header with actions -->
            <div class="header">
                <h2>User Management</h2>
                <button mat-raised-button color="primary" (click)="openCreateDialog()">
                    <mat-icon>add</mat-icon>
                    Add User
                </button>
            </div>

            <!-- Search and filters -->
            <div class="filters">
                <mat-form-field>
                    <mat-label>Search users</mat-label>
                    <input matInput (input)="onSearchChange($event)" placeholder="Search by name or email" />
                    <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>

                <mat-form-field>
                    <mat-label>Filter by role</mat-label>
                    <mat-select (selectionChange)="onRoleFilterChange($event)">
                        <mat-option value="">All Roles</mat-option>
                        <mat-option value="user">Users</mat-option>
                        <mat-option value="admin">Admins</mat-option>
                        <mat-option value="manager">Managers</mat-option>
                    </mat-select>
                </mat-form-field>
            </div>

            <!-- Loading indicator -->
            <div *ngIf="isLoading()" class="loading-container">
                <mat-spinner diameter="50"></mat-spinner>
                <p>Loading users...</p>
            </div>

            <!-- Error message -->
            <div *ngIf="errorMsg$()" class="error-container">
                <mat-icon color="warn">error</mat-icon>
                <p>{{ errorMsg$() }}</p>
                <button mat-button (click)="retryLoad()">Retry</button>
            </div>

            <!-- User list -->
            <div *ngIf="!isLoading() && !errorMsg$()" class="user-list">
                <mat-card *ngFor="let user of filteredUsers$() | async; trackBy: trackByUserId" class="user-card">
                    <mat-card-header>
                        <div mat-card-avatar class="avatar">
                            <img [src]="user.avatarUrl || '/assets/default-avatar.png'" [alt]="user.fullName" />
                        </div>
                        <mat-card-title>{{ user.fullName }}</mat-card-title>
                        <mat-card-subtitle>{{ user.email }}</mat-card-subtitle>
                    </mat-card-header>

                    <mat-card-content>
                        <div class="user-details">
                            <span class="role-badge" [class]="'role-' + user.role">
                                {{ user.role | titlecase }}
                            </span>
                            <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                                {{ user.isActive ? 'Active' : 'Inactive' }}
                            </span>
                        </div>
                    </mat-card-content>

                    <mat-card-actions align="end">
                        <button mat-button (click)="editUser(user)">
                            <mat-icon>edit</mat-icon>
                            Edit
                        </button>
                        <button mat-button color="warn" (click)="deleteUser(user)" [disabled]="user.role === 'admin'">
                            <mat-icon>delete</mat-icon>
                            Delete
                        </button>
                    </mat-card-actions>
                </mat-card>
            </div>

            <!-- Empty state -->
            <div *ngIf="!isLoading() && !errorMsg$() && (filteredUsers$() | async)?.length === 0" class="empty-state">
                <mat-icon class="empty-icon">people_outline</mat-icon>
                <h3>No users found</h3>
                <p>{{ hasFilters() ? 'Try adjusting your filters' : 'Get started by adding your first user' }}</p>
                <button mat-raised-button color="primary" (click)="openCreateDialog()">Add User</button>
            </div>
        </div>
    `,
    providers: [UserManagementStore]
})
export class UserManagementComponent extends AppBaseVmStoreComponent<UserManagementState, UserManagementStore> {
    private searchSubject = new Subject<string>();
    private roleFilterSubject = new Subject<string>();

    // Reactive filtered users based on search and role filter
    public filteredUsers$ = combineLatest([
        this.store.users$,
        this.searchSubject.pipe(startWith(''), debounceTime(300)),
        this.roleFilterSubject.pipe(startWith(''))
    ]).pipe(
        map(([users, search, roleFilter]) => {
            return users.filter(user => {
                const matchesSearch =
                    !search || user.fullName.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());

                const matchesRole = !roleFilter || user.role === roleFilter;

                return matchesSearch && matchesRole;
            });
        })
    );

    ngOnInit() {
        // Initialize store
        this.store.initOrReloadVm(false);
    }

    onSearchChange(event: Event) {
        const target = event.target as HTMLInputElement;
        this.searchSubject.next(target.value);
    }

    onRoleFilterChange(event: MatSelectChange) {
        this.roleFilterSubject.next(event.value);
    }

    hasFilters(): boolean {
        // Check if any filters are applied
        return (
            this.searchSubject.pipe(take(1)).subscribe(search => search !== '').closed ||
            this.roleFilterSubject.pipe(take(1)).subscribe(role => role !== '').closed
        );
    }

    openCreateDialog() {
        const dialogRef = this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            data: { isEditMode: false }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.store.createUser(result);
            }
        });
    }

    editUser(user: User) {
        const dialogRef = this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            data: { user, isEditMode: true }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.store.updateUser(user.id, result);
            }
        });
    }

    deleteUser(user: User) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'Delete User',
                message: `Are you sure you want to delete ${user.fullName}?`,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
            if (confirmed) {
                this.store.deleteUser(user.id);
            }
        });
    }

    retryLoad() {
        this.store.loadUsers();
    }

    trackByUserId(index: number, user: User): string {
        return user.id;
    }
}
```

### 6. Shared UI Library Structure

```typescript
// libs/ui-common/src/lib/components/
export * from './data-table/data-table.component';
export * from './loading-spinner/loading-spinner.component';
export * from './error-message/error-message.component';
export * from './confirm-dialog/confirm-dialog.component';
export * from './file-upload/file-upload.component';
export * from './date-range-picker/date-range-picker.component';
export * from './user-avatar/user-avatar.component';
export * from './status-badge/status-badge.component';
export * from './search-input/search-input.component';

// libs/ui-common/src/lib/directives/
export * from './auto-focus/auto-focus.directive';
export * from './click-outside/click-outside.directive';
export * from './loading/loading.directive';
export * from './permission/permission.directive';

// libs/ui-common/src/lib/pipes/
export * from './safe-html/safe-html.pipe';
export * from './file-size/file-size.pipe';
export * from './time-ago/time-ago.pipe';
export * from './truncate/truncate.pipe';

// libs/ui-common/src/lib/services/
export * from './dialog/dialog.service';
export * from './notification/notification.service';
export * from './theme/theme.service';
export * from './export/export.service';
```

---

## 🚀 Nx Workspace Best Practices

### 1. Library Dependency Graph

```typescript
// Dependency rules in nx.json
{
  "projectGraph": {
    "dependencies": {
      "admin-portal": ["platform-core", "domain-models", "ui-common"],
      "client-portal": ["platform-core", "domain-models", "ui-common"],
      "mobile-app": ["platform-core", "domain-models"],

      "domain-models": ["platform-core"],
      "ui-common": ["platform-core", "shared-styles"],
      "platform-core": [] // No dependencies - pure foundation
    }
  }
}
```

### 2. Build and Development Scripts

```json
// package.json scripts
{
    "scripts": {
        "start:admin": "nx serve admin-portal --port=4200",
        "start:client": "nx serve client-portal --port=4201",
        "start:mobile": "nx serve mobile-app --port=4202",

        "build:all": "nx run-many --target=build --all",
        "test:all": "nx run-many --target=test --all",
        "lint:all": "nx run-many --target=lint --all",

        "build:admin": "nx build admin-portal --prod",
        "build:client": "nx build client-portal --prod",
        "build:libs": "nx run-many --target=build --projects=platform-core,domain-models,ui-common"
    }
}
```

### 3. Code Generation and Scaffolding

```bash
# Generate new feature module
nx generate @nx/angular:module features/user-management --project=admin-portal

# Generate component with store
nx generate @nx/angular:component features/user-management/user-list --project=admin-portal
nx generate @nx/angular:service features/user-management/user.store --project=admin-portal

# Generate API service in domain library
nx generate @nx/angular:service user/user-api --project=domain-models

# Generate shared component in UI library
nx generate @nx/angular:component data-table --project=ui-common --export
```

---

## 🏗️ Framework Usage Guide

### 🎯 Backend Platform Usage

#### 1. Platform Module System

The foundation of any platform application is the module system:

```csharp
// Define your application module
public class MyApplicationModule : PlatformApplicationModule
{
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [p => typeof(MyDomainModule)];
    }

    // Configure lazy-loaded request context
    protected override Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        LazyLoadRequestContextAccessorRegistersFactory()
    {
        return new()
        {
            { "CurrentUser", GetCurrentUser }
        };
    }

    private static async Task<object?> GetCurrentUser(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    {
        return await provider.ExecuteInjectScopedAsync<User>(async (repository, cacheProvider) =>
            await cacheProvider.Get().CacheRequestAsync(
                () => repository.FirstOrDefaultAsync(u => u.Id == accessor.Current.UserId()),
                "currentUser",
                tags: ["user"]));
    }
}
```

#### 2. ASP.NET Core Integration

```csharp
// Startup configuration
public class MyApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [
            p => typeof(MyApplicationModule),
            p => typeof(MyPersistenceModule),
            p => typeof(MyRabbitMqMessageBusModule)
        ];
    }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        return configuration.GetSection("AllowCorsOrigins").Get<string[]>();
    }
}

// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddPlatformModule<MyApiAspNetCoreModule>(builder.Configuration);

var app = builder.Build();
app.UsePlatform();
app.Run();
```

#### 3. Clean Architecture Layers

##### Domain Layer

```csharp
// Rich domain entity with business logic
[TrackFieldUpdatedDomainEvent]
public sealed class TextSnippet : RootEntity<TextSnippet, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Content { get; set; } = string.Empty;

    [TrackFieldUpdatedDomainEvent]
    public string Category { get; set; } = string.Empty;

    // Domain logic methods
    public static Expression<Func<TextSnippet, bool>> IsActiveExpr()
        => snippet => !snippet.IsDeleted && !string.IsNullOrEmpty(snippet.Content);

    public PlatformValidationResult<TextSnippet> ValidateForUpdate()
    {
        return this
            .Validate(s => !string.IsNullOrEmpty(s.Content), "Content is required")
            .And(s => s.Content.Length <= 1000, "Content too long");
    }

    public TextSnippet ApplyContentUpdate(string newContent)
    {
        return this.With(s => s.Content = newContent);
    }
}

// Repository interface
public interface ITextSnippetRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new()
{
}
```

##### Application Layer

```csharp
// CQRS Command
public sealed class SaveTextSnippetCommand : PlatformCqrsCommand<SaveTextSnippetCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Content), "Content is required")
            .And(_ => Content.Length <= 1000, "Content too long");
    }
}

// Command Handler
internal sealed class SaveTextSnippetCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveTextSnippetCommand, SaveTextSnippetCommandResult>
{
    private readonly ITextSnippetRootRepository<TextSnippet> repository;

    public SaveTextSnippetCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TextSnippet> repository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.repository = repository;
    }

    protected override async Task<SaveTextSnippetCommandResult> HandleAsync(
        SaveTextSnippetCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Get existing or create new
        var snippet = await repository.FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
        snippet ??= new TextSnippet { Id = request.Id };

        // Step 2: Apply business logic
        var updatedSnippet = snippet
            .ApplyContentUpdate(request.Content)
            .With(s => s.Category = request.Category)
            .ValidateForUpdate()
            .EnsureValid();

        // Step 3: Track changes and save
        updatedSnippet.AutoAddFieldUpdatedEvent(snippet);
        var savedSnippet = await repository.CreateOrUpdateAsync(updatedSnippet, cancellationToken);

        return new SaveTextSnippetCommandResult { Id = savedSnippet.Id };
    }
}
```

##### Persistence Layer

```csharp
// EF Core implementation
internal sealed class TextSnippetRepository<TEntity>
    : PlatformEfCoreRepository<TEntity, string, MyDbContext>, ITextSnippetRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    public TextSnippetRepository(
        DbContextOptions<MyDbContext> dbContextOptions,
        IServiceProvider serviceProvider)
        : base(dbContextOptions, serviceProvider)
    {
    }
}

// MongoDB implementation
internal sealed class TextSnippetMongoRepository<TEntity>
    : PlatformMongoDbRepository<TEntity, string, MyDbContext>, ITextSnippetRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    public TextSnippetMongoRepository(IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
    }
}
```

##### Service Layer

```csharp
// Platform-based controller
[ApiController]
[Route("api/[controller]")]
public class TextSnippetController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> SaveTextSnippet([FromBody] SaveTextSnippetCommand command)
    {
        var result = await Cqrs.SendCommand(command);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetTextSnippets([FromQuery] GetTextSnippetsQuery query)
    {
        var result = await Cqrs.SendQuery(query);
        return Ok(result);
    }
}
```

### 🎨 Frontend Platform Usage

#### 1. Component Hierarchy

The platform provides a hierarchical component structure:

```typescript
// Base platform component with automatic cleanup
@Directive()
export abstract class PlatformComponent implements OnDestroy {
    public destroyed$ = new BehaviorSubject<boolean>(false);
    public status$ = signal(ComponentStateStatus.Pending);

    // Injected platform services
    public toast = inject(ToastrService);
    public translateSrv = inject(PlatformTranslateService);
    public authService = inject(AuthService);

    ngOnDestroy() {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    }

    protected takeUntilDestroyed<T>(): MonoTypeOperatorFunction<T> {
        return takeUntil(this.destroyed$);
    }
}

// Enhanced component with view model support
@Directive()
export abstract class PlatformVmComponent<TViewModel extends PlatformVm> extends PlatformComponent {
    @Input() vm?: TViewModel;

    protected vmSignal = computed(() => this.vm ?? this.createDefaultVm());

    protected abstract createDefaultVm(): TViewModel;
}
```

#### 2. State Management with Platform Store

```typescript
// Platform store with caching and lifecycle management
@Injectable()
export abstract class PlatformVmStore<TViewModel extends PlatformVm> extends ComponentStore<TViewModel> implements OnDestroy {
    // Abstract properties for derived stores
    protected abstract cachedStateKeyName: (() => string) | string;
    public abstract initOrReloadVm: (isReload: boolean) => Observable<any> | void;

    // Automatic state selectors
    public readonly loading$ = this.select(state => state.loading);
    public readonly errorMsg$ = this.select(state => state.errorMsg);

    // Effect wrapper with automatic loading/error handling
    protected effectSimple<T>(generator: (origin$?: Observable<T>) => Observable<any>): (origin$?: Observable<T>) => void {
        return this.effect((origin$: Observable<T>) => generator(origin$).pipe(this.observerLoadingErrorState()));
    }

    protected observerLoadingErrorState<T>(): MonoTypeOperatorFunction<T> {
        return (source: Observable<T>) =>
            source.pipe(
                tap(() => this.setLoading(true)),
                tap({
                    next: () => this.setLoading(false),
                    error: error => {
                        this.setLoading(false);
                        this.setErrorMsg(this.getErrorMessage(error));
                    }
                })
            );
    }
}

// Example implementation
@Injectable()
export class TextSnippetStore extends PlatformVmStore<TextSnippetState> {
    constructor(private textSnippetApi: TextSnippetApiService) {
        super(new TextSnippetState());
    }

    protected cachedStateKeyName = 'TextSnippetStore';

    public override initOrReloadVm = (isReload: boolean) => this.loadSnippets();

    // Effect for loading data
    public loadSnippets = this.effectSimple(() => {
        return this.textSnippetApi.getSnippets().pipe(this.tapResponse(snippets => this.updateState({ snippets })));
    });

    // Effect for saving
    public saveSnippet = this.effectSimple((command: SaveTextSnippetCommand) => {
        return this.textSnippetApi.saveSnippet(command).pipe(
            this.tapResponse(() => {
                this.toast.success('Snippet saved successfully');
                this.loadSnippets();
            })
        );
    });

    // Selectors
    public readonly snippets$ = this.select(state => state.snippets);
    public readonly selectedSnippet$ = this.select(state => state.selectedSnippet);
}

interface TextSnippetState extends PlatformVm {
    snippets: TextSnippet[];
    selectedSnippet?: TextSnippet;
}
```

#### 3. API Services

```typescript
// Platform API service with automatic error handling
@Injectable({ providedIn: 'root' })
export class TextSnippetApiService extends PlatformApiService {
    constructor() {
        super();
        this.apiUrl = environment.apiUrl + '/api/TextSnippet';
    }

    // GET with automatic caching and error handling
    public getSnippets(params?: GetTextSnippetsQuery): Observable<TextSnippet[]> {
        return this.get<TextSnippet[]>('', params);
    }

    // POST with validation and error handling
    public saveSnippet(command: SaveTextSnippetCommand): Observable<SaveTextSnippetCommandResult> {
        return this.post<SaveTextSnippetCommandResult>('', command);
    }

    // PUT for updates
    public updateSnippet(id: string, command: UpdateTextSnippetCommand): Observable<void> {
        return this.put<void>(`/${id}`, command);
    }

    // DELETE with confirmation
    public deleteSnippet(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }
}
```

#### 4. Form Components

```typescript
// Platform form component with validation
export abstract class PlatformFormComponent<TFormVm extends PlatformVm> extends PlatformVmComponent<TFormVm> {
    protected fb = inject(FormBuilder);
    protected formGroup!: FormGroup;

    // Abstract method for form configuration
    abstract initialFormConfig(): FormGroup;

    ngOnInit() {
        this.formGroup = this.initialFormConfig();
        this.setupCustomValidation();
    }

    protected setupCustomValidation() {
        // Override in derived classes
    }

    protected submitForm() {
        if (this.formGroup.valid) {
            this.onFormSubmit.emit(this.formGroup.value);
        }
    }

    @Output() onFormSubmit = new EventEmitter<any>();
}

// Example implementation
@Component({
    selector: 'app-text-snippet-form',
    template: `
        <form [formGroup]="formGroup" (ngSubmit)="submitForm()">
            <mat-form-field>
                <mat-label>Content</mat-label>
                <textarea matInput formControlName="content" rows="4"></textarea>
                <mat-error *ngIf="formGroup.get('content')?.hasError('required')"> Content is required </mat-error>
            </mat-form-field>

            <mat-form-field>
                <mat-label>Category</mat-label>
                <input matInput formControlName="category" />
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="formGroup.invalid">Save</button>
        </form>
    `
})
export class TextSnippetFormComponent extends PlatformFormComponent<TextSnippetFormVm> {
    override initialFormConfig(): FormGroup {
        return this.fb.group({
            content: ['', [Validators.required, Validators.maxLength(1000)]],
            category: ['', Validators.required]
        });
    }

    protected override setupCustomValidation() {
        // Add custom async validators
        this.formGroup.setAsyncValidators([customAsyncValidator(this.textSnippetApi)]);
    }

    protected override createDefaultVm(): TextSnippetFormVm {
        return new TextSnippetFormVm();
    }
}
```

---

## 📊 Advanced Platform Features

### 🔧 Background Jobs

```csharp
// Platform background job with pagination
[PlatformRecurringJob("0 0 * * *")] // Daily at midnight
public class ProcessSnippetsJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    private readonly ITextSnippetRootRepository<TextSnippet> repository;

    protected override async Task ProcessAsync()
    {
        Logger.LogInformation("Starting snippet processing");

        // Use platform pagination for large datasets
        await ExecutePaged(async snippets =>
        {
            var tasks = snippets.Select(ProcessSnippet);
            await Task.WhenAll(tasks);
        });

        Logger.LogInformation("Completed snippet processing");
    }

    private async Task ProcessSnippet(TextSnippet snippet)
    {
        // Process individual snippet
        await SomeExpensiveOperation(snippet);
    }

    protected override async Task<IQueryable<TextSnippet>> GetItemsQuery()
    {
        return repository.GetQueryBuilder((uow, query) =>
            query.Where(TextSnippet.IsActiveExpr()));
    }
}
```

### 📡 Event-Driven Communication

```csharp
// Entity event producer - automatically publishes when entities change
public sealed class TextSnippetEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippet, string>
{
    // Automatically handles entity change events
}

// Entity event consumer - handles cross-service synchronization
public class ProcessTextSnippetEntityEventBusConsumer :
    PlatformApplicationMessageBusConsumer<TextSnippetEntityEventBusMessage>
{
    protected override async Task<bool> HandleWhen(TextSnippetEntityEventBusMessage message)
    {
        return message.Payload?.EntityData != null;
    }

    protected override async Task HandleLogicAsync(TextSnippetEntityEventBusMessage message)
    {
        var entityEvent = message.Payload;
        var snippet = entityEvent.EntityData;

        switch (entityEvent.CrudAction)
        {
            case PlatformCqrsEntityEventCrudAction.Created:
                await HandleSnippetCreated(snippet);
                break;
            case PlatformCqrsEntityEventCrudAction.Updated:
                await HandleSnippetUpdated(snippet);
                break;
            case PlatformCqrsEntityEventCrudAction.Deleted:
                await HandleSnippetDeleted(snippet.Id);
                break;
        }
    }
}
```

### 🗄️ Data Migration

```csharp
// Platform data migration with pagination
public class InitializeSnippetDataMigration : PlatformDataMigrationExecutor<MyDbContext>
{
    public override string Name => "20250101000001_InitializeSnippetData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 02, 01);

    public override async Task Execute(MyDbContext dbContext)
    {
        await InitializeCategories();
        await MigrateExistingSnippets();
    }

    private async Task MigrateExistingSnippets()
    {
        var totalCount = await repository.CountAsync();

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: totalCount,
            pageSize: 100,
            MigrateSnippetsPage);
    }

    private static async Task MigrateSnippetsPage(
        IServiceProvider serviceProvider,
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var repository = serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippet>>();

        var snippets = await repository.GetAllAsync(
            queryBuilder: query => query.Skip(pageIndex * pageSize).Take(pageSize),
            cancellationToken: cancellationToken);

        foreach (var snippet in snippets)
        {
            // Apply migration logic
            snippet.Category = DetermineCategory(snippet.Content);
            await repository.UpdateAsync(snippet, cancellationToken: cancellationToken);
        }
    }
}
```

### 📚 Data Seeding

```csharp
// Platform data seeder
public sealed class TextSnippetDataSeeder : PlatformApplicationDataSeeder
{
    private readonly ITextSnippetRootRepository<TextSnippet> repository;

    public TextSnippetDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        ITextSnippetRootRepository<TextSnippet> repository)
        : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
        this.repository = repository;
    }

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        await SeedSampleSnippets();
    }

    private async Task SeedSampleSnippets()
    {
        if (await repository.AnyAsync()) return; // Skip if data exists

        var sampleSnippets = new[]
        {
            new TextSnippet { Content = "Sample snippet 1", Category = "Examples" },
            new TextSnippet { Content = "Sample snippet 2", Category = "Templates" }
        };

        foreach (var snippet in sampleSnippets)
        {
            await repository.CreateOrUpdateAsync(snippet);
        }
    }
}
```

---

## 🤖 AI Agent Quick Reference

### 🔍 Investigation Workflow

**ALWAYS follow this sequence when given a task:**

```mermaid
graph TD
    A[📋 Read Requirement] --> B[🔍 Extract Domain Concepts]
    B --> C[🔎 semantic_search for Context]
    C --> D[🔍 grep_search for Patterns]
    D --> E[🕵️ Service Discovery via Endpoints]
    E --> F[📊 Evidence Assessment]
    F --> G[🏗️ Use Platform Patterns]
    G --> H{✅ Ready to Code}
```

### 🎯 Decision Trees

#### Backend Development

```
Need to add backend feature?
├── New API endpoint? → Use PlatformBaseController + CQRS Command
├── Business logic? → Create Command Handler in Application layer
├── Data access? → Use platform repository pattern
├── Cross-service sync? → Create Entity Event Consumer
├── Scheduled task? → Create PlatformApplicationBackgroundJob
├── Database migration? → Use PlatformDataMigrationExecutor
└── Data seeding? → Create PlatformApplicationDataSeeder
```

#### Frontend Development

```
Need to add frontend feature?
├── Simple component? → Extend PlatformComponent
├── Complex state? → Use PlatformVmStoreComponent + PlatformVmStore
├── Forms? → Extend PlatformFormComponent with validation
├── API calls? → Create service extending PlatformApiService
└── Cross-component data? → Use ComponentStore patterns
```

### 🏗️ Repository Pattern

**Always use platform repository interfaces:**

```csharp
// ✅ GOOD: Platform repository interface
public interface IMyRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new()
{
}

// ✅ GOOD: Root repository for aggregates
public interface IMyRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>
    where TEntity : class, IRootEntity<string>, new()
{
}

// ✅ GOOD: Repository extensions
public static class TextSnippetRepositoryExtensions
{
    public static async Task<List<TextSnippet>> GetActiveSnippetsAsync(
        this ITextSnippetRootRepository<TextSnippet> repository,
        CancellationToken cancellationToken = default)
    {
        return await repository.GetAllAsync(
            TextSnippet.IsActiveExpr(),
            cancellationToken: cancellationToken);
    }
}
```

### 🎯 Code Templates

#### CQRS Command Template

```csharp
// Command
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => !string.IsNullOrEmpty(Name), "Name is required");
    }
}

// Result
public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public string Id { get; set; } = string.Empty;
}

// Handler
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly IMyRootRepository<{Entity}> repository;

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command request, CancellationToken cancellationToken)
    {
        // Step 1: Get or create entity
        var entity = await repository.FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
        entity ??= new {Entity} { Id = request.Id };

        // Step 2: Apply changes
        entity.Name = request.Name;

        // Step 3: Save
        var saved = await repository.CreateOrUpdateAsync(entity, cancellationToken);

        return new Save{Entity}CommandResult { Id = saved.Id };
    }
}
```

#### Frontend Component Template

```typescript
// State
interface {Entity}State extends PlatformVm {
    items: {Entity}[];
    selectedItem?: {Entity};
}

// Store
@Injectable()
export class {Entity}Store extends PlatformVmStore<{Entity}State> {
    constructor(private api: {Entity}ApiService) {
        super(new {Entity}State());
    }

    protected cachedStateKeyName = '{Entity}Store';

    public load{Entity}s = this.effectSimple(() => {
        return this.api.get{Entity}s().pipe(
            this.tapResponse(items => this.updateState({ items }))
        );
    });
}

// Component
@Component({
    selector: 'app-{entity}-list',
    template: `
        @if (vm(); as vm) {
            @for (item of vm.items; track item.id) {
                <div>{{ item.name }}</div>
            }
        }
    `,
    providers: [{Entity}Store]
})
export class {Entity}Component extends PlatformVmStoreComponent<{Entity}State, {Entity}Store> {
    ngOnInit() {
        this.store.load{Entity}s();
    }
}
```

---

## 🏗️ Multi-Database Support

The platform supports multiple database technologies seamlessly:

### Entity Framework Core

```csharp
// EF Core persistence module
public class MyEfCorePersistenceModule : PlatformEfCorePersistenceModule<MyDbContext>
{
    protected override void ConfigureEfCoreOptions(PlatformEfCoreOptions<MyDbContext> options)
    {
        options.ConnectionString = Configuration.GetConnectionString("DefaultConnection");
        options.UseSqlServer(); // or UsePostgreSql(), UseSqlite()
        options.MinPoolSize = 5;
        options.MaxPoolSize = 100;
    }

    protected override void RegisterRepositories(IServiceCollection services)
    {
        services.AddScoped<ITextSnippetRepository<TextSnippet>, TextSnippetEfRepository<TextSnippet>>();
    }
}
```

### MongoDB

```csharp
// MongoDB persistence module
public class MyMongoPersistenceModule : PlatformMongoDbPersistenceModule<MyDbContext>
{
    protected override void ConfigureMongoOptions(PlatformMongoOptions<MyDbContext> options)
    {
        options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
        options.Database = Configuration.GetSection("MongoDB:Database").Value;
    }

    protected override void RegisterRepositories(IServiceCollection services)
    {
        services.AddScoped<ITextSnippetRepository<TextSnippet>, TextSnippetMongoRepository<TextSnippet>>();
    }
}
```

### Repository Implementation

```csharp
// EF Core implementation
public class TextSnippetEfRepository<TEntity>
    : PlatformEfCoreRepository<TEntity, string, MyDbContext>, ITextSnippetRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    public TextSnippetEfRepository(
        DbContextOptions<MyDbContext> options,
        IServiceProvider serviceProvider)
        : base(options, serviceProvider)
    {
    }
}

// MongoDB implementation
public class TextSnippetMongoRepository<TEntity>
    : PlatformMongoDbRepository<TEntity, string, MyDbContext>, ITextSnippetRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    public TextSnippetMongoRepository(IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
    }
}
```

---

## 🔧 Advanced Validation Patterns

### Backend Validation

```csharp
// Command-level validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Title), "Title is required")
        .And(_ => Title.Length <= 100, "Title too long")
        .And(_ => StartDate <= EndDate, "End date must be after start date");
}

// Handler-level async validation
protected override async Task<PlatformValidationResult<SaveEventCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveEventCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async cmd => !(await repository.ExistsWithTitleAsync(cmd.Title)),
                 "Event with this title already exists")
        .AndAsync(async cmd => await ValidateVenueAvailability(cmd.VenueId, cmd.StartDate),
                 "Venue not available at this time");
}

// Domain-level validation
public PlatformValidationResult<Event> ValidateForPublishing()
{
    return this
        .Validate(e => !string.IsNullOrEmpty(e.Description), "Description required for publishing")
        .And(e => e.StartDate > DateTime.UtcNow, "Cannot publish past events")
        .And(e => e.MaxAttendees > 0, "Must specify maximum attendees");
}
```

### Frontend Validation

```typescript
// Reactive form validation
override initialFormConfig(): FormGroup {
    return this.fb.group({
        title: ['', [Validators.required, Validators.maxLength(100)]],
        startDate: [null, Validators.required],
        endDate: [null, Validators.required],
        maxAttendees: [1, [Validators.required, Validators.min(1)]]
    }, {
        validators: [dateRangeValidator('startDate', 'endDate')]
    });
}

// Custom async validator
export function venueAvailabilityValidator(
    eventApi: EventApiService
): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        if (!control.value?.venueId || !control.value?.startDate) {
            return of(null);
        }

        return eventApi.checkVenueAvailability(control.value.venueId, control.value.startDate)
            .pipe(
                map(available => available ? null : { venueNotAvailable: true }),
                catchError(() => of({ venueCheckFailed: true }))
            );
    };
}
```

---

## 🎯 Performance Optimization

### Backend Performance

```csharp
// Repository optimization with expressions
public static class EventRepositoryExtensions
{
    public static async Task<List<Event>> GetUpcomingEventsAsync(
        this IEventRootRepository<Event> repository,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        return await repository.GetAllAsync(
            queryBuilder: query => query
                .Where(Event.IsUpcomingExpr())
                .OrderBy(e => e.StartDate)
                .Take(limit),
            cancellationToken: cancellationToken);
    }

    public static Expression<Func<Event, bool>> IsUpcomingExpr()
        => e => e.StartDate > DateTime.UtcNow && !e.IsCancelled;
}

// Caching with platform cache provider
public async Task<List<Event>> GetFeaturedEventsAsync()
{
    return await cacheProvider.Get().CacheRequestAsync(
        () => repository.GetAllAsync(Event.IsFeaturedExpr()),
        "featured-events",
        TimeSpan.FromMinutes(15),
        tags: ["events", "featured"]);
}

// Background job pagination
protected override async Task ProcessAsync()
{
    await ExecutePaged(async events =>
    {
        // Process events in parallel
        var tasks = events.Select(ProcessEvent);
        await Task.WhenAll(tasks);
    });
}
```

### Frontend Performance

```typescript
// Component optimization
@Component({
    selector: 'app-event-list',
    changeDetection: ChangeDetectionStrategy.OnPush, // ✅ OnPush for performance
    template: `
        <cdk-virtual-scroll-viewport itemSize="100" class="event-viewport">
            @for (event of events(); track event.id) {
            <app-event-card [event]="event" />
            }
        </cdk-virtual-scroll-viewport>
    `
})
export class EventListComponent extends PlatformComponent {
    events = signal<Event[]>([]);

    ngOnInit() {
        // Efficient data loading with caching
        this.eventApi
            .getEvents()
            .pipe(this.takeUntilDestroyed())
            .subscribe(events => this.events.set(events));
    }
}

// Store optimization with selectors
@Injectable()
export class EventStore extends PlatformVmStore<EventState> {
    // Memoized selectors
    public readonly upcomingEvents$ = this.select(state => state.events.filter(e => new Date(e.startDate) > new Date()));

    public readonly featuredEvents$ = this.select(state => state.events.filter(e => e.isFeatured));

    // Debounced search
    public searchEvents = this.effectSimple((searchTerm: string) => {
        return of(searchTerm).pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => this.eventApi.searchEvents(term)),
            this.tapResponse(events => this.updateState({ searchResults: events }))
        );
    });
}
```

---

## 🔒 Security & Authorization

### Backend Security

```csharp
// Authorization policies
public static class AuthorizationPolicies
{
    public const string EventManagerPolicy = "EventManager";
    public const string AdminPolicy = "Admin";
}

// Policy configuration
services.AddAuthorization(options =>
{
    options.AddPolicy(AuthorizationPolicies.EventManagerPolicy,
        policy => policy.RequireRole("EventManager", "Admin"));
    options.AddPolicy(AuthorizationPolicies.AdminPolicy,
        policy => policy.RequireRole("Admin"));
});

// Controller authorization
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EventController : PlatformBaseController
{
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.EventManagerPolicy)]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventCommand command)
    {
        var result = await Cqrs.SendCommand(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = AuthorizationPolicies.AdminPolicy)]
    public async Task<IActionResult> DeleteEvent(string id)
    {
        await Cqrs.SendCommand(new DeleteEventCommand { Id = id });
        return NoContent();
    }
}

// Command-level authorization
protected override async Task<PlatformValidationResult<CreateEventCommand>> ValidateRequestAsync(
    PlatformValidationResult<CreateEventCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async cmd => await HasPermissionToCreateEvent(cmd.VenueId),
                 "Insufficient permissions to create event at this venue");
}
```

### Frontend Security

```typescript
// Route guards
@Injectable()
export class EventManagerGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(): Observable<boolean> {
        return this.authService.currentUser$.pipe(
            map(user => {
                if (user?.hasRole('EventManager') || user?.hasRole('Admin')) {
                    return true;
                }
                this.router.navigate(['/unauthorized']);
                return false;
            })
        );
    }
}

// Component-level authorization
@Component({
    selector: 'app-event-actions',
    template: `
        <div class="event-actions">
            @if (canEdit()) {
            <button mat-button (click)="editEvent()">Edit</button>
            } @if (canDelete()) {
            <button mat-button color="warn" (click)="deleteEvent()">Delete</button>
            }
        </div>
    `
})
export class EventActionsComponent extends PlatformComponent {
    @Input() event!: Event;

    canEdit(): boolean {
        return this.authService.hasRole('EventManager') || this.authService.currentUserId() === this.event.createdBy;
    }

    canDelete(): boolean {
        return this.authService.hasRole('Admin');
    }
}
```

---

## 🧪 Testing Framework

### Backend Testing

```csharp
// Unit test for command handler
public class SaveEventCommandHandlerTests
{
    private readonly Mock<IEventRootRepository<Event>> mockRepository;
    private readonly SaveEventCommandHandler handler;

    public SaveEventCommandHandlerTests()
    {
        mockRepository = new Mock<IEventRootRepository<Event>>();
        handler = new SaveEventCommandHandler(
            Mock.Of<IPlatformApplicationRequestContextAccessor>(),
            Mock.Of<IPlatformUnitOfWorkManager>(),
            new Lazy<IPlatformCqrs>(() => Mock.Of<IPlatformCqrs>()),
            Mock.Of<ILoggerFactory>(),
            Mock.Of<IServiceProvider>(),
            mockRepository.Object);
    }

    [Fact]
    public async Task HandleAsync_WithValidCommand_ShouldSaveEvent()
    {
        // Arrange
        var command = new SaveEventCommand
        {
            Title = "Test Event",
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(2)
        };

        var savedEvent = new Event { Id = "event-1", Title = "Test Event" };
        mockRepository.Setup(r => r.CreateOrUpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(savedEvent);

        // Act
        var result = await handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be("event-1");
        mockRepository.Verify(r => r.CreateOrUpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

// Integration test
[Collection("Database")]
public class EventControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> factory;
    private readonly HttpClient client;

    public EventControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        this.factory = factory;
        this.client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateEvent_WithValidData_ShouldReturnCreated()
    {
        // Arrange
        var command = new SaveEventCommand
        {
            Title = "Integration Test Event",
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(2)
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/Event", command);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SaveEventCommandResult>();
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
    }
}
```

### Frontend Testing

```typescript
// Component testing
describe('EventListComponent', () => {
    let component: EventListComponent;
    let fixture: ComponentFixture<EventListComponent>;
    let mockEventStore: jasmine.SpyObj<EventStore>;

    beforeEach(async () => {
        const eventStoreSpy = jasmine.createSpyObj('EventStore', ['loadEvents']);

        await TestBed.configureTestingModule({
            declarations: [EventListComponent],
            providers: [{ provide: EventStore, useValue: eventStoreSpy }]
        }).compileComponents();

        fixture = TestBed.createComponent(EventListComponent);
        component = fixture.componentInstance;
        mockEventStore = TestBed.inject(EventStore) as jasmine.SpyObj<EventStore>;
    });

    it('should load events on init', () => {
        // Act
        component.ngOnInit();

        // Assert
        expect(mockEventStore.loadEvents).toHaveBeenCalled();
    });
});

// Service testing
describe('EventApiService', () => {
    let service: EventApiService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EventApiService]
        });

        service = TestBed.inject(EventApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    it('should get events', () => {
        // Arrange
        const mockEvents = [
            { id: '1', title: 'Event 1' },
            { id: '2', title: 'Event 2' }
        ];

        // Act
        service.getEvents().subscribe(events => {
            expect(events).toEqual(mockEvents);
        });

        // Assert
        const req = httpMock.expectOne('/api/Event');
        expect(req.request.method).toBe('GET');
        req.flush(mockEvents);
    });
});
```

---

## 📚 Learning Paths

### 🆕 New Developer (Week 1-2)

**Goal**: Understand platform fundamentals and build first feature

**Day 1-2: Platform Exploration**

-   ✅ Complete [Quick Setup](#-quick-setup-5-minutes)
-   ✅ Run `src/PlatformExampleApp` and explore all features
-   ✅ Study the four-layer Clean Architecture structure

**Day 3-4: Core Concepts**

-   📖 Understanding CQRS with command/query handlers
-   📖 Domain entities and business logic placement
-   📖 Repository pattern and data access

**Day 5-7: First Implementation**

-   🔧 Create a simple CRUD operation using platform patterns
-   🎨 Build corresponding frontend component with store
-   📝 Add validation and error handling

### 🔧 Backend Developer Path

**Foundation (Week 1)**

-   🏗️ Clean Architecture layers and responsibilities
-   📡 CQRS implementation with MediatR
-   🗄️ Repository pattern and data access
-   ✅ Validation patterns and error handling

**Advanced (Week 2-3)**

-   🔄 Event-driven architecture and messaging
-   ⏰ Background jobs and scheduled tasks
-   🔄 Data migration and seeding patterns
-   🧪 Testing strategies and best practices

**Mastery (Week 4+)**

-   🏛️ Domain-driven design implementation
-   📊 Performance optimization techniques
-   🔒 Security and authorization patterns
-   🚀 Multi-database and scaling strategies

### 🎨 Frontend Developer Path

**Foundation (Week 1)**

-   🏗️ Component hierarchy and inheritance
-   🔄 State management with Platform stores
-   📝 Reactive forms and validation
-   🌐 API service patterns

**Advanced (Week 2-3)**

-   🎯 Advanced state management patterns
-   🔧 Custom validators and form builders
-   📱 Responsive design and accessibility
-   🧪 Component and service testing

**Mastery (Week 4+)**

-   ⚡ Performance optimization techniques
-   🎨 Advanced UI patterns and animations
-   🔧 Build optimization and deployment
-   📊 Monitoring and error tracking

---

## 🔧 Troubleshooting Guide

### Common Backend Issues

#### Repository Issues

```csharp
// ❌ Problem: Repository not found
// ✅ Solution: Ensure proper registration
services.AddScoped<ITextSnippetRepository<TextSnippet>, TextSnippetRepository<TextSnippet>>();

// ❌ Problem: Database connection errors
// ✅ Solution: Check connection string and module registration
protected override void ConfigureEfCoreOptions(PlatformEfCoreOptions<MyDbContext> options)
{
    options.ConnectionString = Configuration.GetConnectionString("DefaultConnection");
    options.UseSqlServer();
}
```

#### CQRS Validation Issues

```csharp
// ❌ Problem: Validation not triggered
// ✅ Solution: Override Validate() method and call EnsureValid()
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required");
}

// In handler
var validatedCommand = request.EnsureValid();
```

### Common Frontend Issues

#### Store State Issues

```typescript
// ❌ Problem: Store not updating UI
// ✅ Solution: Ensure proper store initialization
ngOnInit() {
    this.store.initOrReloadVm(false);
}

// ❌ Problem: Effects not triggering
// ✅ Solution: Use effectSimple() pattern
public loadData = this.effectSimple(() => {
    return this.api.getData().pipe(
        this.tapResponse(data => this.updateState({ data }))
    );
});
```

#### API Service Issues

```typescript
// ❌ Problem: CORS errors
// ✅ Solution: Configure API base URL correctly
constructor() {
    super();
    this.apiUrl = environment.apiUrl + '/api/MyController';
}

// ❌ Problem: Authentication issues
// ✅ Solution: Ensure auth headers are included
// Platform API service handles this automatically
```

---

## 📊 Performance Guidelines

### Backend Performance

```csharp
// ✅ Use efficient queries with expressions
public static Expression<Func<Event, bool>> ActiveEventsExpr()
    => e => !e.IsDeleted && e.StartDate > DateTime.UtcNow;

// ✅ Implement caching for expensive operations
public async Task<List<Event>> GetFeaturedEventsAsync()
{
    return await cacheProvider.Get().CacheRequestAsync(
        () => repository.GetAllAsync(Event.IsFeaturedExpr()),
        "featured-events",
        TimeSpan.FromMinutes(15));
}

// ✅ Use pagination for large datasets
await ExecutePaged(async events =>
{
    var tasks = events.Select(ProcessEvent);
    await Task.WhenAll(tasks);
});
```

### Frontend Performance

```typescript
// ✅ Use OnPush change detection
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush
})

// ✅ Implement proper cleanup
export class MyComponent extends PlatformComponent {
    // Automatic subscription cleanup via takeUntilDestroyed()
}

// ✅ Use virtual scrolling for large lists
<cdk-virtual-scroll-viewport itemSize="50">
    @for (item of items(); track item.id) {
        <div>{{ item.name }}</div>
    }
</cdk-virtual-scroll-viewport>
```

---

## 📚 Technical Documentation

### 📖 Core Concepts

#### Clean Architecture Implementation

-   **Domain Layer**: Business entities, value objects, domain services
-   **Application Layer**: Use cases, CQRS handlers, application services
-   **Infrastructure Layer**: External concerns (databases, messaging, file storage)
-   **Presentation Layer**: API controllers, web endpoints

#### CQRS with MediatR

-   **Commands**: Write operations that modify state
-   **Queries**: Read operations that return data
-   **Handlers**: Process commands and queries
-   **Events**: Domain and integration events

#### Repository Pattern

-   **Generic repositories**: Platform base implementations
-   **Specific repositories**: Domain-specific interfaces
-   **Unit of Work**: Transaction management
-   **Expression-based queries**: Type-safe query building

### 🎓 Best Practices

#### Code Organization

-   Follow consistent naming conventions
-   Use dependency injection properly
-   Implement proper error handling
-   Write comprehensive tests

#### Performance Optimization

-   Use async/await consistently
-   Implement caching strategies
-   Optimize database queries
-   Monitor application performance

#### Security Considerations

-   Validate all input data
-   Implement proper authorization
-   Use secure communication protocols
-   Follow security best practices

---

## 🔗 External Resources

### Official Documentation

-   [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
-   [Angular Documentation](https://angular.io/docs)
-   [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)
-   [MongoDB Driver for .NET](https://docs.mongodb.com/drivers/csharp/)

### Learning Resources

-   [Clean Architecture Guide](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
-   [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
-   [Domain-Driven Design](https://domainlanguage.com/ddd/)
-   [Angular Architecture Guide](https://angular.io/guide/architecture)

### Community Resources

-   [Stack Overflow](https://stackoverflow.com/)
-   [GitHub Discussions](https://github.com/)
-   [Reddit Development Communities](https://reddit.com/r/dotnet)
-   [Angular Community](https://community.angular.io/)

---

## 📞 Support & Contribution

### 🆘 Getting Help

1. **Framework Documentation**: Start with this guide and explore examples
2. **Code Examples**: Study `src/PlatformExampleApp` for working implementations
3. **Search Patterns**: Use semantic_search() for finding existing patterns
4. **Community**: Engage with development teams and communities

### 🤝 Contributing

1. **Follow Patterns**: Use established platform patterns and conventions
2. **Add Tests**: Include unit and integration tests for new features
3. **Document Changes**: Update relevant documentation sections
4. **Code Review**: Participate in code review process

### 📋 Version Information

-   **Platform Version**: Easy.Platform 1.0
-   **Backend Framework**: .NET 8
-   **Frontend Framework**: Angular 19
-   **Last Updated**: January 2025
-   **Maintainers**: Platform Development Team

---

_This guide provides comprehensive coverage of the Easy.Platform framework. For specific implementation details, refer to the working examples in `src/PlatformExampleApp` and explore the platform source code for advanced patterns and techniques._
