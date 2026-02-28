# WebV2 Frontend Architecture

> Angular 19 Nx Workspace with Micro Frontend Architecture

## Nx Workspace Structure

```
src/WebV2/                           # Nx Workspace Root
├── apps/                            # Micro Frontend Applications
│   ├── growth-for-company/          # HR & Employee management
│   ├── employee/                    # Employee self-service portal
│   └── notification/                # Notification management
├── libs/                            # Shared Libraries
│   ├── platform-core/               # Framework Foundation
│   ├── bravo-domain/                # Business Domain Logic
│   ├── bravo-common/                # UI Components Library
│   ├── share-styles/                # SCSS Themes & Variables
│   ├── share-animations/            # Reusable Animations
│   └── share-assets/                # Images, Icons, Fonts
└── tools/                           # Build & Development Tools
```

---

## Library Dependencies

```
                    ┌─────────────────────┐
                    │   Applications      │
                    │ growth-for-company  │
                    │ employee            │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ bravo-domain  │ │ bravo-common  │ │ share-styles  │
    │ (Business)    │ │ (UI)          │ │ (SCSS)        │
    └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   platform-core     │
                    │   (Framework)       │
                    └─────────────────────┘
```

---

## Component Hierarchy

```typescript
// Platform Core Layer (Framework Foundation)
PlatformComponent               // Base: lifecycle, subscriptions, signals
├── PlatformVmComponent         // + ViewModel injection
├── PlatformFormComponent       // + Reactive Forms integration
└── PlatformVmStoreComponent    // + ComponentStore state management

// App Base Layer (Business Application Framework)
AppBaseComponent                // + Auth, roles, company context
├── AppBaseVmComponent          // + ViewModel + auth context
├── AppBaseFormComponent        // + Forms + auth + validation
└── AppBaseVmStoreComponent     // + Store + auth + loading/error

// Implementation Layer (Feature Components)
├── EmployeeListComponent extends AppBaseVmStoreComponent
├── LeaveRequestFormComponent extends AppBaseFormComponent
└── DashboardComponent extends AppBaseComponent
```

---

## Domain Library Structure

### `libs/bravo-domain/`

```typescript
bravo-domain/src/
├── _shared/                    // Cross-domain resources
│   ├── components/             // Domain-agnostic UI
│   ├── auth/                   // Authentication services
│   ├── domain-models/          // Common models
│   ├── api-services/           // Shared API patterns
│   └── constants/              // Cross-domain constants
├── account/                    // Account & organization
├── growth/                     // HR Growth domain
│   ├── api-services/           // LeaveRequestApiService
│   ├── components/             // Leave request components
│   ├── domain-models/          // Employee, LeaveRequest
│   ├── form-validators/        // Growth-specific validators
│   └── utils/                  // Growth utilities
├── employee/                   // Employee self-service
└── goal/                       // Goal management
```

### Domain API Service Example

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.apiUrl + '/api/Employee';
    }

    getEmployees(query: GetEmployeesQuery): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }

    saveEmployee(command: SaveEmployeeCommand): Observable<SaveEmployeeResult> {
        return this.post<SaveEmployeeResult>('', command);
    }
}
```

### Domain Model Example

```typescript
export class Employee {
    id: string = '';
    firstName: string = '';
    lastName: string = '';
    email: string = '';
    departmentId: string = '';

    constructor(data?: Partial<Employee>) {
        if (data) Object.assign(this, data);
    }

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`.trim();
    }
}
```

---

## State Management Pattern

### Store Implementation

```typescript
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    constructor(private employeeApi: EmployeeApiService) {
        super(new EmployeeState());
    }

    protected cachedStateKeyName = 'EmployeeStore';

    // Effects
    public loadEmployees = this.effectSimple(() =>
        this.employeeApi.getEmployees(new GetEmployeesQuery()).pipe(
            this.tapResponse(employees =>
                this.updateState({ employees, selectedEmployee: null })
            )
        )
    );

    public saveEmployee = this.effectSimple((cmd: SaveEmployeeCommand) =>
        this.employeeApi.saveEmployee(cmd).pipe(
            this.tapResponse(result => {
                this.toast.success('Saved');
                this.loadEmployees();
            })
        )
    );

    // Selectors
    public readonly employees$ = this.select(state => state.employees);
    public readonly selectedEmployee$ = this.select(state => state.selectedEmployee);

    public override initOrReloadVm = (isReload: boolean) => this.loadEmployees();
}

interface EmployeeState extends PlatformVm {
    employees: Employee[];
    selectedEmployee?: Employee;
}
```

### Component with Store

```typescript
@Component({
    selector: 'app-employee-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                <div class="employee-grid">
                    @for (employee of vm.employees; track employee.id) {
                        <employee-card
                            [employee]="employee"
                            (click)="selectEmployee(employee)">
                        </employee-card>
                    }
                </div>
            }
        </app-loading-and-error-indicator>
    `,
    providers: [EmployeeStore]
})
export class EmployeeListComponent extends AppBaseVmStoreComponent<EmployeeState, EmployeeStore> {
    selectEmployee(employee: Employee) {
        this.store.updateState({ selectedEmployee: employee });
    }
}
```

---

## Form Handling

### Form Component

```typescript
export class LeaveRequestFormComponent extends AppBaseFormComponent<LeaveRequestFormVm> {
    protected initialFormConfig = (): PlatformFormConfig<LeaveRequestFormVm> => ({
        controls: {
            fromDate: new FormControl(this.currentVm().fromDate, [Validators.required]),
            toDate: new FormControl(this.currentVm().toDate, [Validators.required]),
            reason: new FormControl(this.currentVm().reason, [Validators.required, Validators.maxLength(500)])
        }
    });

    protected override setupCustomValidation() {
        this.formGroup.setAsyncValidators([
            ifAsyncValidator(
                () => !this.isViewMode,
                checkIsLeaveRequestDateRangeOverlappedAsyncValidator(
                    'leaveRequestDateRangeOverlapped',
                    query => this.leaveRequestApi.checkOverlapLeaveRequest(query),
                    () => ({
                        fromDate: this.currentVm().fromDate!,
                        toDate: this.currentVm().toDate!,
                        employeeId: this.selectedEmployeeId
                    })
                )
            )
        ]);
    }

    onSubmit() {
        if (this.validateForm()) { /* process */ }
    }
}
```

---

## Styling Architecture

### `libs/share-styles/`

```scss
// _variables.scss - Global SCSS variables
// _mixins.scss - Reusable mixins
// _themes.scss - Theme definitions
// _typography.scss - Font styles
// _layout.scss - Layout utilities
// material/_material-theme.scss - Material customizations
```

---

## Development Commands

```bash
# Development servers
npm run dev-start:growth        # Port 4206
npm run dev-start:employee      # Port 4205

# Building
nx build growth-for-company
nx build employee

# Testing
nx test growth-for-company
nx test bravo-domain

# Code generation
nx generate @nx/angular:component features/user-management --project=growth-for-company
nx generate @nx/angular:service growth/user-api --project=bravo-domain

# Dependency graph
nx graph
nx affected:build
```

---

## Library Import Rules

```typescript
// ✅ Correct imports
import { PlatformComponent } from '@bravo-suite/platform-core';
import { EmployeeApiService } from '@bravo-suite/bravo-domain/employee';
import { BravoButtonComponent } from '@bravo-suite/bravo-common';

// ❌ Wrong - deep imports
import { PlatformComponent } from 'libs/platform-core/src/lib/components';

// ❌ Wrong - cross-app imports
import { GrowthComponent } from 'apps/growth-for-company/src/app/features';
```

## Dependency Rules

```typescript
// ✅ ALLOWED
apps/* → libs/bravo-domain
apps/* → libs/platform-core
libs/bravo-domain → libs/platform-core
libs/bravo-common → libs/share-styles

// ❌ FORBIDDEN
libs/* → apps/*              // Libs cannot depend on apps
libs/platform-core → libs/bravo-domain  // Platform cannot depend on domain
```

---

## Micro Frontend Benefits

1. **Independent Development** - Teams work on different apps independently
2. **Shared Code Reuse** - Common logic in bravo-domain, UI in bravo-common
3. **Scalable Architecture** - Easy to add new micro frontend apps
4. **Development Efficiency** - Nx provides incremental builds and testing

---

**Next:** [Frontend Patterns](./claude/frontend-patterns.md) | [BravoCommon Guide](./bravocommon-guide.md)
