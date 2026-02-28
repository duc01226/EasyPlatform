# Employee Management Feature

> **Technical Documentation for Employee Management in bravoTALENTS**

## Table of Contents

- [Overview](#overview)
- [Business Requirements](#business-requirements)
- [Architecture](#architecture)
- [Domain Model](#domain-model)
- [Frontend Components](#frontend-components)
  - [Component Hierarchy](#component-hierarchy)
  - [Key Components](#key-components)
- [Employee Table Columns](#employee-table-columns)
- [API Service](#api-service)
- [Backend Controllers](#backend-controllers)
- [Core Workflows](#core-workflows)
- [Employee Detail Page](#employee-detail-page)
  - [Detail Page Component Hierarchy](#detail-page-component-hierarchy)
  - [Tab Components](#tab-components)
  - [Detail Page API Endpoints](#detail-page-api-endpoints)
  - [Job Record Domain Model](#job-record-domain-model)
  - [Career Record Domain Model](#career-record-domain-model--new)
  - [Contract Record Domain Model](#contract-record-domain-model)
  - [Detail Page Workflows](#detail-page-workflows)
- [Event Handlers & Consumers](#event-handlers--consumers)
- [Permission System](#permission-system)
- [API Reference](#api-reference)
- [Test Specifications](#test-specifications)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Overview

The **Employee Management Feature** enables HR administrators to manage employees within the bravoTALENTS platform. This feature is hosted in the **legacy bravoTALENTSClient Angular app** and calls the **bravoTALENTS Employee.Service** backend.

### Key Locations

| Layer | Location |
|-------|----------|
| **Frontend - Employee** | `src/Web/bravoTALENTSClient/src/app/employee/` |
| **Frontend - Finance Records** | `src/Web/bravoTALENTSClient/src/app/finance-management/` |
| **Backend Controller** | `src/Services/bravoTALENTS/Employee.Service/` |
| **Application Layer** | `src/Services/bravoTALENTS/Employee.Application/` |
| **Domain Layer** | `src/Services/bravoTALENTS/Employee.Domain/` |

### Key Capabilities

- **Employee List Management**: View, search, filter, and paginate employees with survey profile columns
- **Pending Employee Management**: Accept or reject pending employees waiting for approval
- **Pending Invited Management**: Manage users invited but not yet registered
- **Employee Invitation**: Invite users via email or shareable URL
- **Retake Invitation**: Invite employees to retake profile assessments
- **Profile Reminders**: Send reminders to complete profile information
- **Employee Import**: Bulk import employees from CSV files
- **Hired Candidate Import**: Import hired candidates as employees
- **Employee Removal**: Remove employees or pending invited employees
- **Custom Fields**: Manage custom employee information fields
- **Career Records**: Track position, level, sub-level history with date-range validation and auto-close
- **Salary Records**: Track pay rate, insurance, payment intervals with custom fields
- **Bi-directional Org Unit Sync**: Job record changes sync to Accounts; Accounts hierarchy changes auto-create job records
- **Period Monitoring**: Background job monitors job record period boundaries and syncs org units daily
- **Organizational Units**: Filter employees by department/org unit
- **Export Reports**: Generate employee reports with filters
- **Survey Profile Display**: View employee survey results (Interests, Motivation, Preferences, etc.)
- **Employment Status Tracking**: Track and filter by employment status

---

## Business Requirements

> **Objective**: Enable HR administrators to efficiently manage employee lifecycle from invitation to offboarding.
>
> **Core Values**: Efficient - Accurate - Secure

### Employee List Management

#### FR-EM-01: View Employee List

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can view paginated list of company employees      |
| **Columns**     | Basic info, department, survey profiles, status      |
| **Pagination**  | Configurable page size (10, 25, 50, 100)             |
| **Sorting**     | By name, email, start date, status                   |
| **Performance** | List loads within 2 seconds for up to 10,000 employees |

#### FR-EM-02: Search and Filter Employees

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can search and filter employees by various criteria |
| **Keyword Search** | Search by name, email, position across all employees |
| **Advanced Filter** | Filter by department, status, gender, age, survey profiles, custom fields |
| **Operators**   | AND/OR logic, date ranges, comparison operators      |
| **Persistence** | Filters persist during session                       |

#### FR-EM-03: Manage Pending Employees

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can approve or reject employees awaiting approval |
| **Actions**     | Approve (creates employee), Reject (with reason)     |
| **Bulk Action** | Process multiple pending employees at once           |
| **Notification**| Employee notified of decision via email              |

### Invitation Management

#### FR-EM-04: Send Email Invitation

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can invite users to join company via email        |
| **Input**       | Email addresses (comma/line separated), org unit, profiles |
| **Validation**  | Email format, duplicate check, existing employee check |
| **Template**    | Customizable email subject and body with placeholders |
| **Tracking**    | Invitees appear in "Pending Invited" tab             |

#### FR-EM-05: Create URL Invitation

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can create shareable URL for self-registration    |
| **Configuration**| Org unit, profiles, expiration date                 |
| **Security**    | Unique URL per invitation, optional expiration       |
| **Management**  | View, edit, delete URL invitations                   |

#### FR-EM-06: Retake and Reminder Invitations

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can request employees retake profiles or remind to complete |
| **Retake**      | Existing employees can retake specific surveys       |
| **Reminder**    | Incomplete profile notification to selected employees |
| **Customization**| Custom message for each invitation type             |

### Employee Import/Export

#### FR-EM-07: Import Employees from CSV

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can bulk import employees from CSV/TSV files      |
| **Template**    | Downloadable template with required columns          |
| **Validation**  | Email uniqueness, required fields, format checks     |
| **Error Handling** | Per-row error reporting with line numbers         |
| **Size Limit**  | Maximum 1024KB file size                             |

#### FR-EM-08: Import Hired Candidates

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can convert hired candidates to employees         |
| **Preservation**| Name, email, phone, survey data preserved            |
| **Automation**  | Triggers employee creation event bus message         |

#### FR-EM-09: Export Employee Report

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can export employee data with filters             |
| **Filters**     | Same as list filters (dept, status, etc.)            |
| **Formats**     | CSV, Excel                                           |
| **Language**    | Localized field names based on user preference       |

### Employee Detail Management

#### FR-EM-10: View/Edit Employee Information

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can view and edit employee profile details        |
| **Tabs**        | Personal Info, Job, Contract, CV, Profile, AI Assistant |
| **Custom Fields**| Display company-configured custom fields            |
| **Permissions** | Role-based field-level access control                |

#### FR-EM-11: Manage Job Records

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can manage employee job history                   |
| **Actions**     | Create, update, delete job records                   |
| **Auto-Close**  | Previous record auto-closes when new record created  |
| **Validation**  | Unique start date per employee, end > start          |

#### FR-EM-12: Manage Contract Records

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can manage employee contracts                     |
| **Actions**     | Create, update, delete contract records              |
| **Validation**  | No overlapping contract periods                      |
| **Types**       | Full-time, Part-time, Contract, Internship           |

#### FR-EM-15: Manage Career Records

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can manage employee career progression records    |
| **Actions**     | Create, update, delete career records                |
| **Fields**      | Position, Level, Sub-Level, Comment, Date range      |
| **Auto-Close**  | Previous record auto-closes when new record created  |
| **Validation**  | No overlapping career periods; Position required     |
| **Sync**        | Latest active career record syncs to Employee.Position |
| **Custom Fields**| Supports dynamic fields via CAREER_INFO field group |
| **Feature Gate**| Requires EmployeeRecordLicense + CAREER_INFO group configured |

#### FR-EM-16: Bi-directional Org Unit Sync

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | Job records and Accounts org unit assignments stay in sync |
| **Forward Sync**| Job record save/delete → sync employee Hierarchies → update Accounts org units |
| **Reverse Sync**| Accounts hierarchy changes → auto-create/update job records |
| **Loop Prevention**| SourceSystem flag prevents infinite sync loops    |
| **Period Monitoring**| Daily background job detects period boundary transitions |
| **Licensing**   | Auto-sync only for companies with EmployeeRecordLicense |

#### FR-EM-17: Manage Salary Records

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can manage employee salary/compensation records   |
| **Actions**     | Create, update, delete salary records                |
| **Fields**      | Pay rate, insurance salary, payment interval, wage type |
| **Validation**  | No overlapping salary periods                        |
| **Custom Fields**| Supports dynamic fields via SALARY_INFO field group |

### Employee Lifecycle

#### FR-EM-13: Update Employment Status

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can update employee employment status             |
| **Statuses**    | Active, OnLeave, Terminated, Suspended, Probation    |
| **Termination** | Set termination date, trigger offboarding events     |

#### FR-EM-14: Remove Employees

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | HR can remove employees from the system              |
| **Type**        | Soft delete (data retained)                          |
| **Permissions** | HR Admin or higher required                          |
| **Event**       | Triggers deletion event to dependent services        |

---

## Architecture

### High-Level Architecture

```
+-------------------------------------------------------------------------------------+
|                        bravoTALENTS Platform                                        |
+-------------------------------------------------------------------------------------+
|                                                                                     |
|  +------------------------------------------------------------------------------+   |
|  |            Legacy Angular App (src/Web/bravoTALENTSClient)                   |   |
|  |                                                                              |   |
|  |  +-----------------------------+    +------------------------------------+   |   |
|  |  | app-employee-page           |    | EmployeeHttpService                |   |   |
|  |  | +- app-employee-list        |    | +- getEmployeeList()               |   |   |
|  |  | +- employee-advanced-filter |    | +- getPendingEmployeeList()        |   |   |
|  |  | +- employee-search-container|    | +- sendInvitationByEmail()         |   |   |
|  |  | +- app-employee-invitation  |    | +- importEmployeesByFile()         |   |   |
|  |  | +- import-users-panel       |    | +- getHiredCandidates()            |   |   |
|  |  | +- employee-list (table)    |    | +- removeEmployees()               |   |   |
|  |  +-----------------------------+    +------------------------------------+   |   |
|  |                 |                                    |                       |   |
|  |  +--------------+------------------------------------+---------------------+ |   |
|  |  |                          NgRx Store                                     | |   |
|  |  |  +---------------------+  +---------------------+                       | |   |
|  |  |  | Employee State      |  | Employee Actions    |                       | |   |
|  |  |  | - employees[]       |  | - LoadEmployees     |                       | |   |
|  |  |  | - pendingEmployees[]|  | - AcceptPending     |                       | |   |
|  |  |  | - pendingInvited[]  |  | - SendInvitation    |                       | |   |
|  |  |  | - filters           |  | - RemoveEmployees   |                       | |   |
|  |  |  +---------------------+  +---------------------+                       | |   |
|  |  +-------------------------------------------------------------------------+ |   |
|  +------------------------------------------------------------------------------+   |
|                         |                                                           |
|          +--------------+------------------------------------------------------+    |
|          |                bravoTALENTS Employee.Service                         |    |
|          |                                                                      |    |
|          |  +--------------------+  +-------------------------------+           |    |
|          |  | EmployeeController |  | InvitationController          |           |    |
|          |  |  GET /employee     |  |  POST /invite-to-company-*    |           |    |
|          |  |  POST /imports     |  |  POST /remind-taking-profile  |           |    |
|          |  |  DELETE /remove    |  |  GET/PUT/DELETE /invitations  |           |    |
|          |  +--------------------+  +-------------------------------+           |    |
|          |                                                                      |    |
|          |  +------------------------+  +---------------------------+           |    |
|          |  | PendingEmployeeCtrl    |  | HiredCandidateController  |           |    |
|          |  |  GET /pending-employee |  |  GET /hired-candidates    |           |    |
|          |  |  POST /change-status   |  |  POST /import-candidates  |           |    |
|          |  +------------------------+  +---------------------------+           |    |
|          |           |                                                          |    |
|          |  +-------+-------------------------------------------------------+   |    |
|          |  |              Application Layer (CQRS)                          |   |    |
|          |  |  - GetEmployeeQuery                                            |   |    |
|          |  |  - GetEmployeesByDepartmentQuery                               |   |    |
|          |  |  - CreateInvitationByEmailCommand                              |   |    |
|          |  |  - ChangePendingEmployeesStatusCommand                         |   |    |
|          |  |  - ImportEmployeesCommand                                      |   |    |
|          |  |  - RemoveEmployeesCommand                                      |   |    |
|          |  |  - ImportHiredCandidatesCommand                                |   |    |
|          |  +----------------------------------------------------------------+   |    |
|          |           |                                                          |    |
|          |  +-------+-------------------------------------------------------+   |    |
|          |  |           MongoDB / SQL Server Database                        |   |    |
|          |  +----------------------------------------------------------------+   |    |
|          +----------------------------------------------------------------------+    |
|                         |                                                           |
|          +--------------+------------------------------------------------------+    |
|          |                     RabbitMQ Message Bus                             |    |
|          |  - AccountUserSavedEventBusMessage                                  |    |
|          |  - EmployeeEntityEventBusMessage                                    |    |
|          |  - CandidateHiredEventBusMessage                                    |    |
|          +----------------------------------------------------------------------+    |
+-------------------------------------------------------------------------------------+
```

---

## Domain Model

### Core Entities

#### Employee Entity

| Field | Type | Description |
|-------|------|-------------|
| `Id` | `string` | Unique employee identifier (ULID) |
| `UserId` | `string` | Reference to user account |
| `CompanyId` | `string` | Company the employee belongs to |
| `Email` | `string` | Employee email address |
| `FirstName` | `string` | Employee first name |
| `LastName` | `string` | Employee last name |
| `FullName` | `string` | Computed: FirstName + LastName |
| `Avatar` | `string?` | Profile avatar URL |
| `Position` | `string?` | Job title/position |
| `EmploymentStatus` | `EmploymentStatus` | Current employment status |
| `OrganizationalUnitId` | `string?` | Department/team assignment |
| `LineManagerId` | `string?` | Direct manager reference |
| `StartDate` | `DateTime?` | Employment start date |
| `TerminationDate` | `DateTime?` | Employment end date |
| `IsActive` | `bool` | Whether employee is active |
| `IsDeleted` | `bool` | Soft delete flag |
| `CreatedDate` | `DateTime` | Record creation date |
| `LastModifiedDate` | `DateTime` | Last update timestamp |

#### PendingEmployee Entity

| Field | Type | Description |
|-------|------|-------------|
| `Id` | `string` | Unique identifier |
| `UserId` | `string` | Reference to user account |
| `CompanyId` | `string` | Company applied to |
| `Email` | `string` | Applicant email |
| `Status` | `PendingEmployeeStatus` | Pending/Approved/Rejected |
| `RequestedDate` | `DateTime` | Date of application |
| `ProcessedDate` | `DateTime?` | Date processed by HR |
| `ProcessedById` | `string?` | HR who processed |

#### Invitation Entity

| Field | Type | Description |
|-------|------|-------------|
| `Id` | `string` | Unique invitation ID |
| `CompanyId` | `string` | Inviting company |
| `InvitationType` | `InvitationType` | Email or URL |
| `IsRetake` | `bool` | Whether this is a retake invitation |
| `OrganizationalUnitId` | `string?` | Target department |
| `ExpirationDate` | `DateTime?` | URL invitation expiry |
| `InvitationUrl` | `string?` | Generated URL for URL type |
| `EmailSubject` | `string?` | Custom email subject |
| `EmailBody` | `string?` | Custom email content |
| `Profiles` | `List<string>` | Profiles to assign |
| `CreatedById` | `string` | User who created invitation |
| `CreatedDate` | `DateTime` | Creation timestamp |

#### CareerRecord Entity

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/CareerRecord.cs`

| Field | Type | Description |
|-------|------|-------------|
| `Id` | `string` | Unique career record ID |
| `UserId` | `string` | Employee user ID |
| `CompanyId` | `string` | Company the record belongs to |
| `Position` | `string` | Career position (required) |
| `Level` | `string?` | Career level (dropdown) |
| `SubLevel` | `string?` | Sub-level designation |
| `Comment` | `string?` | Additional comments |
| `StartDate` | `DateTime` | Period start (UTC, start of day) |
| `EndDate` | `DateTime?` | Period end (UTC, end of day; null = ongoing) |
| `CustomFieldValues` | `List<CustomFieldValue>` | Extensible custom field storage |

**Base Class**: `EntityPeriodRecord<CareerRecord>` — Provides period overlap detection, auto-close, date range validation.

**Validation Rules**:
- `Position` is required (not null or empty)
- `EndDate` must be >= `StartDate` or null
- No overlapping career periods for same employee/company
- Custom field values validated

**Evidence**: `CareerRecord.cs:1-40`

#### SalaryRecord Entity

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/SalaryRecord.cs`

| Field | Type | Description |
|-------|------|-------------|
| `Id` | `string` | Unique salary record ID |
| `UserId` | `string` | Employee user ID |
| `CompanyId` | `string` | Company the record belongs to |
| `PayRate` | `decimal?` | Salary pay rate |
| `InsuranceSalary` | `decimal?` | Insurance salary amount |
| `PaymentWageType` | `string?` | Wage type (Monthly, Hourly, etc.) |
| `PaymentInterval` | `string?` | Payment frequency |
| `ChangeReason` | `string?` | Reason for salary change |
| `Comment` | `string?` | Additional comments |
| `StartDate` | `DateTime` | Period start |
| `EndDate` | `DateTime?` | Period end (null = ongoing) |
| `CustomFieldValues` | `List<CustomFieldValue>` | Extensible custom field storage |

**Base Class**: `EntityPeriodRecord<SalaryRecord>`

**Evidence**: `SalaryRecord.cs`

#### EntityPeriodRecord Base Class

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/EntityRecord.cs`

All period-based records (Career, Job, Salary, Contract) inherit from `EntityPeriodRecord<TEntity>`:

| Method | Purpose |
|--------|---------|
| `HasOverlap(startDate, endDate)` | Standard interval overlap detection |
| `HasOverlapEachOtherAsync()` | DB-level overlap check excluding self |
| `UpdateLatestEndDateRecord()` | Auto-closes latest record by setting EndDate |
| `FindEntityRecordByCompanyIdAndPeriodExpression()` | Expression for period-range queries |
| `FindLatestEntityRecordExpression()` | Expression to find latest active record |

**Evidence**: `EntityRecord.cs:34-180`

#### SurveyResult Entity (Employee Profile Data)

| Field | Type | Description |
|-------|------|-------------|
| `EmployeeId` | `string` | Reference to employee |
| `SurveyName` | `SurveyName` | Survey type identifier |
| `Results` | `object` | Survey-specific results |
| `CompletedDate` | `DateTime?` | When survey was taken |
| `IsCompleted` | `bool` | Completion status |

### Employment Status Constants & Expressions

#### Active vs Non-Active Employment Statuses

**Location**: `src/Services/_SharedCommon/Bravo.Shared/Common/Constants/EmploymentStatus.cs`

| Constant Set | Values | Description |
|--------------|--------|-------------|
| **ActiveEmploymentStatuses** | Active, ContractMissing, ContractExpiring, ContractExpired | Employees who can receive surveys/invitations (`UserCompany.IsActive = true`) |
| **NonActiveEmploymentStatuses** | JoiningDateMissing, AcceptedOffer, Resigned | Employees excluded from distributions (`UserCompany.IsActive = false`) |
| **AllEmploymentStatuses** | All except IncompleteProfile | Complete set of valid employment statuses |

**Evidence**: `EmploymentStatus.cs:42-59`

#### Static Expression Methods

**Location**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/Employee.cs`

```csharp
// Match employees by employment status set
public static Expression<Func<EmployeeEntity, bool>> MatchEmploymentStatusesExpr(
    HashSet<EmploymentStatus?> employmentStatuses)
{
    return x => employmentStatuses.Contains(x.EnhancedStatus) ||
                employmentStatuses.Contains(x.Status);
}

// Find non-active employees (renamed from FindResignedEmployeeByCompositeEmailsExpr)
public static Expression<Func<EmployeeEntity, bool>> FindNonActiveEmployeeByCompositeEmailsExpr(
    int productScope,
    string companyId,
    List<string> emails)
{
    return FindActivatedEmployeeExpr(productScope, companyId)
        .AndAlso(x => emails.Contains(x.Email) || emails.Contains(x.EmployeeEmail))
        .AndAlso(MatchEmploymentStatusesExpr(EmploymentStatuses.NonActiveEmploymentStatuses));
}
```

**Evidence**: `Employee.cs:416-428`

**Service Method**:
```csharp
// EmployeeService.cs
public async Task<List<string>> GetActiveEmploymentEmployeeEmails(
    List<string> emails,
    int productScope,
    string companyId)
{
    var nonActiveEmployeeEmails = await employeeRepository.GetAllAsync(query => query
        .Where(EmployeeEntity.FindNonActiveEmployeeByCompositeEmailsExpr(productScope, companyId, emails.ToList()))
        .Select(p => p.Email));

    return emails.Except(nonActiveEmployeeEmails).ToList();
}
```

**Evidence**: `EmployeeService.cs:21-35`

### Enums

#### EmploymentStatus
```
Active          = 1   # Currently employed
OnLeave         = 2   # On leave of absence
Terminated      = 3   # Employment ended
Suspended       = 4   # Temporarily suspended
Probation       = 5   # Probationary period
```

#### PendingEmployeeStatus
```
Pending         = 0   # Awaiting HR decision
Approved        = 1   # Approved by HR
Rejected        = 2   # Rejected by HR
```

#### InvitationType
```
Email           = 1   # Sent via email
Url             = 2   # Shareable URL link
```

#### SurveyName (Profile Types)
```
Interests           # Employee interests survey
MotivationMastery   # Motivation assessment
Preference          # Work preferences
TeamRole            # Team role assessment
Vip24Flow           # VIP24 Flow motivations
FlowAtWork          # Flow at work survey
Lifestyle           # Lifestyle preferences
```

#### ConnectionType
```
Company         = 1   # Company connection
Team            = 2   # Team connection
```

### Entity Relationships

```
+------------------+       +------------------+
|     Company      |<------|    Employee      |
+------------------+  1:N  +------------------+
                                  |
                                  | 1:N
                                  v
                          +------------------+
                          |  SurveyResult    |
                          +------------------+

+------------------+       +------------------+
|     Company      |<------|  PendingEmployee |
+------------------+  1:N  +------------------+

+------------------+       +------------------+
|     Company      |<------|   Invitation     |
+------------------+  1:N  +------------------+

+------------------+       +------------------+
|    Employee      |<------| OrganizationalUnit|
+------------------+  N:1  +------------------+

+------------------+       +------------------+
|    Employee      |<------|    Employee      |
| (LineManager)    |  1:N  | (DirectReports)  |
+------------------+       +------------------+
```

---

## Frontend Components

### Component Hierarchy

```
app-employee-page                               (Main page container)
+-- employee-search-container                   (Global search in navbar)
+-- app-employee-list                           (List container component)
|   +-- employee-advanced-filter                (Filter panel)
|   +-- employee-list                           (Employee table component)
|   |   +-- app-profile-table-cell              (Profile cell renderer)
|   |   +-- Survey columns:
|   |       +-- interests                       (Interests profile)
|   |       +-- motivationMastery               (Motivation assessment)
|   |       +-- preferences                     (Work preferences)
|   |       +-- teamRole                        (Team role results)
|   |       +-- vip24FlowMotivationsResult      (VIP24 Flow)
|   |       +-- flowAtWorkResult                (Flow at work)
|   |       +-- lifestyle                       (Lifestyle profile)
|   +-- import-users-panel                      (Import dialog)
|   +-- app-employee-invitation                 (Invitation dialog)
|   |   +-- employee-retake-invitation          (Retake invitation tab)
|   |   +-- employee-remind-taking-profile      (Profile reminder tab)
|   +-- pending-employees-list                  (Pending employees tab)
|   +-- pending-invited-list                    (Pending invited tab)
+-- employee-detail-panel                       (Detail sidebar)
```

### Key Components

#### 1. EmployeePageComponent

**Selector**: `app-employee-page`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee/employee-page.component.ts`

**Purpose**: Main container for the employee management page. Orchestrates child components and handles routing.

---

#### 2. EmployeeListContainerComponent

**Selector**: `app-employee-list`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee/list-container/employee-list.container.component.ts`

**Purpose**: Container component for employee listing with three tabs:
- **Employees Tab**: Active company employees
- **Pending Employees Tab**: Employees awaiting approval
- **Pending Invited Tab**: Users invited but not yet registered

**State Management**: Uses NgRx store pattern with `EmployeeHttpService` for API calls.

**Key Methods**:
```typescript
// Load employee list with filters
loadEmployees(query: EmployeeListQuery): void

// Accept/reject pending employees
changePendingEmployeeStatus(employeeIds: string[], status: PendingStatus): void

// Open invitation dialog
openInvitationDialog(): void

// Handle tab changes
onTabChange(tabIndex: number): void

// Remove employees
removeSelectedEmployees(emails: string[]): void

// Remove pending invited employees
removePendingInvitedEmployees(emails: string[]): void
```

---

#### 3. EmployeeListComponent (Table)

**Selector**: `employee-list`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee/list-container/list/employee-list.component.ts`

**Purpose**: Displays employee data in a configurable table with survey profile columns.

**Column Configuration**:
```typescript
private buildEmployeeColumns(): EmployeeTableHeader[] {
    return this.profileAssignmentService.filterEmployeeTableHeader([
        { uniqueColumnId: 'basicInfo', fieldName: 'basicInfo' },
        { uniqueColumnId: 'departments', fieldName: 'departments' },
        { uniqueColumnId: SurveyName.Interests, fieldName: 'interests', profileName: SurveyName.Interests },
        { uniqueColumnId: SurveyName.MotivationMastery, fieldName: 'motivationMastery', profileName: SurveyName.MotivationMastery },
        { uniqueColumnId: SurveyName.Preference, fieldName: 'preferences', profileName: SurveyName.Preference },
        { uniqueColumnId: 'teamRole', fieldName: 'teamRole' },
        { uniqueColumnId: SurveyName.Vip24Flow, fieldName: 'vip24FlowMotivationsResult', profileName: SurveyName.Vip24Flow },
        { uniqueColumnId: SurveyName.FlowAtWork, fieldName: 'flowAtWorkResult', profileName: SurveyName.FlowAtWork },
        { uniqueColumnId: SurveyName.Lifestyle, fieldName: 'lifestyle', profileName: SurveyName.Lifestyle },
        { uniqueColumnId: 'employmentStatus', fieldName: 'employmentStatus' }
    ]);
}
```

**Three List Types Supported**:
- `employees[]` - Active employees
- `pendingEmployees[]` - Employees awaiting approval
- `pendingInvitedEmployees[]` - Invited but not registered

---

#### 4. EmployeeAdvancedFilterComponent

**Selector**: `employee-advanced-filter`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/filter-container/employee-advanced-filter/employee-advanced-filter.component.ts`

**Purpose**: Comprehensive advanced filtering panel for employee search with multi-criteria support, logical operators, and profile-based filtering.

##### Filter Field Categories

The advanced filter organizes fields into 5 categories:

| Category | Fields | Description |
|----------|--------|-------------|
| **General** | FullName, Email, PhoneNumber, YearOfBirth, DateOfBirth, City, State, Country, Manager | Basic employee information |
| **CV** | Language, Skill, Certification, Course, Reference, School, CvEducationLevel, Project, PreviousCompany, PreviousPosition | Resume/CV data |
| **AboutMe** | PostalCode, Education, Sector, EducationLevel, Union, UnionRepresentative, ManagementResponsibility, MembershipNumber | About Me profile answers |
| **Profile** | InterestProfile, PreferenceProfile, TeamRole, MotivationMasteryProfile, Vip24FlowProfile | Survey assessment results |
| **Custom** | Dynamic fields from `EmployeeFieldSettingsTemplate` | Company-specific custom fields |

##### Filter Field Keys (Frontend Constants)

**Location**: `src/Web/bravoTALENTSClient/src/app/shared/constants/advanced-filter.constant.ts`

```typescript
export enum AdvancedFilterFieldKeys {
    // General Fields
    FullName = 'fullname',
    Email = 'email',
    PhoneNumber = 'phoneNumber',
    YearOfBirth = 'yob',
    DateOfBirth = 'dob',
    Gender = 'gender',
    City = 'city',
    State = 'state',
    Country = 'country',
    Manager = 'manager',
    JoiningDate = 'start_date',
    EndDate = 'end_date',

    // CV Fields
    Language = 'language',
    Skill = 'skill',
    Certification = 'certification',
    Course = 'course',
    Reference = 'reference',
    School = 'school',
    CvEducationLevel = 'cvEducationLevel',
    Project = 'project',
    PreviousCompany = 'prevCompany',
    PreviousPosition = 'prevPosition',

    // AboutMe Fields
    AboutMePostalCode = 'aboutMePostalCode',
    AboutMeEducation = 'aboutMeEducation',
    AboutMeSector = 'aboutMeSector',
    AboutMeEducationLevel = 'aboutMeEducationLevel',
    AboutMeUnion = 'aboutMeUnion',
    AboutMeUnionRepresentative = 'aboutMeRep',
    AboutMeManagementResponsibility = 'aboutMeRes',
    AboutMeMembershipNumber = 'aboutMeMembershipNumber',

    // Profile Fields
    InterestProfile = 'interestProfile',
    PreferenceProfile = 'preferenceProfile',
    Vip24FlowProfile = 'vip24FlowProfile',
    MotivationMasteryProfile = 'motivationMasteryProfile',
    TeamRole = 'teamRole'
}
```

##### Operators

**Logical Operators** (combine filter conditions):

| Operator | Query String Token | Description |
|----------|-------------------|-------------|
| `And` | ` $AND$ ` | All conditions must match |
| `Or` | ` $OR$ ` | Any condition can match |

**Comparison Operators** (for date/numeric fields):

| Operator | Query String Token | Description |
|----------|-------------------|-------------|
| `Before` | `$LT$` | Less than (dates before) |
| `After` | `$GT$` | Greater than (dates after) |
| `Between` | `$TO$` | Range between two values |
| `Equal` | (no token) | Exact match |
| `GreaterThan` | `$GT$` | Greater than (numeric) |
| `LessThan` | `$LT$` | Less than (numeric) |

##### Query String Format

The advanced filter builds a query string that is sent to the backend:

**Format**: `field1=value1 $AND$ field2=value2 $OR$ field3=$GT$value3`

**Examples**:
```
# Filter by country AND year of birth range
country=Norway $AND$ yob=1980$TO$1990

# Filter by interest profile OR preference profile
interestProfile=R $OR$ preferenceProfile=E

# Filter by date of birth after a specific date
dob=$GT$01-01-1990

# Complex filter: Norway employees with specific skills
country=Norway $AND$ skill=JavaScript $AND$ skill=TypeScript
```

**Query String Builder** (`employee-advanced-filter.helper.ts:15-28`):
```typescript
public static buildAdvancedFilterQueryString(parameters: UserAdvancedFilterAnswer[]): string {
    let queryString: string = '';
    parameters.forEach(parameter => {
        queryString += parameter.logicalOperator
            ? AdvancedFilterOperatorQueryStrings[parameter.logicalOperator] : '';
        queryString += parameter.key + '=';
        if (!parameter.comparisonOperator) {
            queryString += parameter.value;
        } else if (parameter.comparisonOperator == AdvancedFilterComparisonOperator.Between) {
            queryString += `${parameter.value}${AdvancedFilterOperatorQueryStrings[...]}${parameter.compareValue}`;
        } else {
            queryString += AdvancedFilterOperatorQueryStrings[parameter.comparisonOperator] + parameter.value;
        }
    });
    return queryString;
}
```

##### Profile Filter Options

**Interest Profile** (RIASEC Model):
- `NR` - No Result
- `R` - Realistic
- `I` - Investigative
- `A` - Artistic
- `S` - Social
- `E` - Enterprising
- `C` - Conventional
- Plus: NotShared, NotCompleted, StopSharing

**Preference Profile** (MBTI-based):
- `E` - Extravert, `I` - Introvert
- `S` - Sensing, `N` - Intuitive
- `T` - Thinking, `F` - Feeling
- `J` - Judging, `P` - Perceiving
- Plus: NotShared, NotCompleted, StopSharing

**Team Role Options**:
- `TheQualityAssurer`, `TheVisionary`, `TheDoer`, `TheBrainstormer`
- `TheSupporter`, `TheAnalyst`, `TheNetworker`, `TheDecisionMaker`

##### Backend Processing

**Entry Point**: `GetEmployeesByFilterQuery.cs:24-86`

```csharp
public sealed class GetEmployeesByFilterQuery : PlatformCqrsPagedQuery<...>
{
    public string QueryString { get; set; }     // Advanced filter query string
    public string Keyword { get; set; }          // Simple text search
    public string Gender { get; set; }           // Simple gender filter
    public string AgeRange { get; set; }         // Simple age range filter
    public string Status { get; set; }           // Employment status filter

    public bool HasAdvancedFilter => !string.IsNullOrWhiteSpace(QueryString);

    public AdvancedFilterDto BuildAdvancedFilter() { ... }
    public SimpleFilterDto BuildSimpleFilter() { ... }
}
```

**Query String Parser**: `AdvancedFilterHelper.BuildAdvancedFilterQuery()` (line 1152-1189)
- Splits by `$OR$` to create filter groups
- Within each group, splits by `$AND$` for individual conditions
- Extracts field name and value from `field=value` pairs

**MongoDB Filter Builder**: `AdvancedFilterHelper.BuildAdvancedFilterDefinition<TEntity>()` (line 1049-1095)
- Builds MongoDB filter definitions for each field type
- Handles profile-specific filters (Interests, Preference, TeamRole, etc.)
- Supports custom field filtering via `CompanyClassFieldTemplate`

##### Custom Field Support

Custom fields are loaded from `EmployeeFieldSettingsTemplate` and support:

| Field Type | Filter Behavior |
|------------|-----------------|
| `Dropdown` | Exact match on selected option |
| `Text` | Regex case-insensitive search |
| `Numeric` | Exact match or comparison operators |
| `DateTime` | Date range with Before/After/Between operators |
| `UploadFile` | Not filterable |

**Evidence**:
- Frontend: `employee-advanced-filter.component.ts:1-829`
- Helper: `employee-advanced-filter.helper.ts:1-66`
- Constants: `advanced-filter.constant.ts:1-254`
- Backend Query: `GetEmployeesByFilterQuery.cs:1-206`
- Backend Filter: `AdvancedFilterHelper.cs:1-1191`
- Backend Operators: `AdvancedFilterOperators.cs:1-11`
- Repository: `EmployeeRepository.cs:22-60`

---

#### 5. EmployeeSearchContainerComponent

**Selector**: `employee-search-container`

**Location**: `src/Web/bravoTALENTSClient/src/app/core/components/navigation-bar/search-containers/employee-search-container/employee-search-container.component.ts`

**Purpose**: Global search input in navigation bar for quick employee lookup across all tabs.

**Key Logic**:
```typescript
public loadEmployeesByFilter(employeeListQuery: EmployeeListQuery) {
    if (employeeListQuery.mainFilter === CommonConstants.Employee) {
        this.store.dispatch(new employeeAction.LoadEmployeeListAction(employeeListQuery, true, true));
    } else if (employeeListQuery.mainFilter === CommonConstants.PendingInvitedEmployee) {
        this.store.dispatch(new employeeAction.LoadPendingInvitedEmployeesAction(employeeListQuery, true, true));
    }
}
```

---

#### 6. EmployeeInvitationComponent

**Selector**: `app-employee-invitation`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee-invitation/`

**Purpose**: Dialog component for inviting employees via:
- Email invitation
- URL invitation (shareable link)
- Retake invitation
- Profile reminder

**Sub-components**:
- `employee-retake-invitation` - For inviting employees to retake assessments
- `employee-remind-taking-profile` - For sending profile completion reminders

---

#### 7. EmployeeRetakeInvitationComponent

**Selector**: `employee-retake-invitation`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee-invitation/retake/employee-retake-invitation.component.ts`

**Purpose**: Handles retake invitations for profile assessments.

**Features**:
- Email-based retake invitation
- URL-based retake invitation (if `hasInvitationUrlByCustomer` feature enabled)
- Profile selection for retake

**Key Properties**:
```typescript
InviteType: typeof InviteType = InviteType;
currentInviteType: string = '';           // Email or URL
hasInvitationUrlByCustomer: boolean;      // Feature flag for URL invitations
```

---

#### 8. RemindTakingProfileComponent

**Selector**: `employee-remind-taking-profile`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/employee-invitation/remind/remind-taking-profile.component.ts`

**Purpose**: Sends reminder emails to complete profiles.

**Supported Types**:
- `'Candidates'` - Candidate reminders
- `'PendingCandidates'` - Pending candidate reminders
- `'Employees'` - Employee reminders

**Form Structure**:
```typescript
remindTakingProfileForm = new FormGroup({
    emails: new FormControl([], Validators.compose([Validators.required, this.emailsValidator()])),
    emailSubject: new FormControl('', [Validators.required]),
    emailContent: new FormControl('', [Validators.required]),
    profiles: new FormArray([])  // Selected profiles to remind about
});
```

---

#### 9. ImportUsersPanelComponent

**Selector**: `import-users-panel`

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/components/import-users-panel/`

**Purpose**: CSV file upload and import for bulk employee creation.

**Features**:
- Template download
- CSV file upload
- Validation preview
- Import progress tracking
- Error reporting per row

---

#### 10. ProfileTableCellComponent

**Selector**: `app-profile-table-cell`

**Location**: `src/Web/bravoTALENTSClient/src/app/shared/components/profile-table-cell/profile-table-cell.component.ts`

**Purpose**: Reusable cell component displaying employee profile with avatar, name, and email.

---

## Employee Table Columns

The employee list displays configurable columns including survey profile data:

| Column ID | Field Name | Description | Profile Type |
|-----------|------------|-------------|--------------|
| `basicInfo` | `basicInfo` | Avatar, name, email | - |
| `departments` | `departments` | Organizational unit assignments | - |
| `interests` | `interests` | Employee interests | `SurveyName.Interests` |
| `motivationMastery` | `motivationMastery` | Motivation assessment results | `SurveyName.MotivationMastery` |
| `preferences` | `preferences` | Work preferences | `SurveyName.Preference` |
| `teamRole` | `teamRole` | Team role assignment | - |
| `vip24FlowMotivationsResult` | `vip24FlowMotivationsResult` | VIP24 Flow motivations | `SurveyName.Vip24Flow` |
| `flowAtWorkResult` | `flowAtWorkResult` | Flow at work assessment | `SurveyName.FlowAtWork` |
| `lifestyle` | `lifestyle` | Lifestyle preferences | `SurveyName.Lifestyle` |
| `employmentStatus` | `employmentStatus` | Current employment status | - |

**Column Visibility**: Controlled by `ProfileAssignmentService.filterEmployeeTableHeader()` based on company profile configuration.

---

## API Service

### EmployeeHttpService

**Location**: `src/Web/bravoTALENTSClient/src/app/employee/services/employee.http.service.ts`

**Base URL**: `BaseHostConstant.apiEmployeeHost` (points to Employee.Service)

### Complete API Methods (35+)

#### Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getEmployeeList()` | `GET /employee` | Get paginated employee list with filters |
| `getEmployeeDetail()` | `GET /employee/{id}` | Get single employee details |
| `getEmployeesByDepartmentId()` | `POST /employee/departments/{deptId}` | Get employees by department |
| `getEmployeesByOrgUnit()` | `GET /employee/org-unit/{id}` | Get employees by org unit |
| `removeEmployees()` | `DELETE /employee/remove` | Remove employees by email list |

#### Pending Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getPendingEmployeeList()` | `GET /pending-employee` | Get pending employees awaiting approval |
| `acceptOrRejectPendingEmployees()` | `POST /pending-employee/change-status` | Approve/reject pending employees |

#### Pending Invited Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getPendingInvitedEmployees()` | `GET /employee/pending-employees` | Get invited but unregistered users |
| `removePendingInvitedEmployees()` | `DELETE /employee/remove-pending-invited` | Remove pending invitations |

#### Invitation Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `sendInvitationByEmail()` | `POST /invitations/invite-to-company-by-email` | Send email invitation |
| `createInvitationByUrl()` | `POST /invitations/invite-to-company-by-url` | Create shareable invitation URL |
| `sendRetakeInvitationByEmail()` | `POST /invitations/invite-retake-to-company-by-email` | Send retake invitation |
| `createRetakeInvitationByUrl()` | `POST /invitations/invite-retake-to-company-by-url` | Create retake URL |
| `sendRemindTakingProfileEmail()` | `POST /invitations/remind-taking-profile-to-employee` | Send profile reminder |
| `getUrlInvitations()` | `GET /invitations?invitationType=Url` | Get active URL invitations |
| `getRetakeUrlInvitations()` | `GET /invitations/retake?invitationType=Url` | Get retake URL invitations |
| `deleteInvitationByUrl()` | `DELETE /invitations/{id}` | Delete invitation |
| `updateInvitationByUrl()` | `PUT /invitations/{id}` | Update invitation |

#### Hired Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getHiredCandidates()` | `GET /hired-candidates` | Get hired candidates ready to import |
| `importCandidatesToCompany()` | `POST /hired-candidates/import` | Import hired candidates as employees |

#### Import/Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `importEmployeesByFile()` | `POST /employee/imports` | Import employees from CSV |
| `getEmployeeReportFile()` | `GET /report/{companyId}` | Export employee report |
| `getImportTemplate()` | `GET /employee/import-template` | Download CSV import template |

#### Organization & Custom Fields

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getOrganizationalUnits()` | `GET /organizational-units` | Get org unit hierarchy |
| `getMatchedOrgUnitsAndUsers()` | `GET /employee/matched-orgunits-and-users` | Search org units and users |
| `getEmployeeInfoCustomField()` | `GET /employee-custom-field` | Get custom field values |
| `updateEmployeeInfoCustomField()` | `PUT /employee-custom-field` | Update custom fields |

#### Employment Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getEmploymentStatusList()` | `GET /employment-status` | Get all employment status options |
| `updateEmploymentStatus()` | `PUT /employee/{id}/employment-status` | Update employee status |

#### Team Subscription

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getUserTeamMapSubscriptionStatus()` | `POST /team-map/subscription-status` | Check team map subscription status |

---

## Backend Controllers

### 1. EmployeeController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/EmployeeController.cs`

**Route**: `/api/employee`

**Authorization**: `CompanyRoleAuthorizationPolicies.EmployeePolicy`

**Endpoints**:

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `/` | `GetEmployeesByFilterQuery` | List employees with filters |
| GET | `/{id}` | `GetEmployeeQuery` | Get employee by ID |
| GET | `/org-units` | `GetOrganizationalUnitsQuery` | Get org unit tree |
| POST | `/departments/{deptId}` | `GetEmployeesByDepartmentQuery` | Get employees by department |
| POST | `/imports` | `ImportEmployeesCommandHandler` | Import from CSV |
| DELETE | `/remove` | `RemoveEmployeesCommand` | Remove employees |
| GET | `/matched-orgunits-and-users` | `GetMatchedOrgUnitsAndUsersQuery` | Search org units and users |
| GET | `/pending-employees` | `GetPendingEmployeesQuery` | Get pending invited employees |
| DELETE | `/remove-pending-invited` | `RemovePendingInvitedEmployeesCommand` | Remove pending invitations |

---

### 2. InvitationController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/InvitationController.cs`

**Route**: `/api/invitations`

**Endpoints**:

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| POST | `/invite-to-company-by-email` | `CreateInvitationByEmailCommand` | Email invitation |
| POST | `/invite-to-company-by-url` | `CreateInvitationByUrlCommand` | URL invitation |
| POST | `/invite-retake-to-company-by-email` | `CreateInvitationRetakeByEmailCommand` | Retake invitation |
| POST | `/invite-retake-to-company-by-url` | `CreateInvitationByUrlCommand` (isRetake=true) | Retake URL |
| POST | `/remind-taking-profile-to-employee` | `CreateRemindTakingProfileCommand` | Profile reminder |
| GET | `/` | `GetInvitationsQuery` | List invitations |
| GET | `/retake` | `GetInvitationsQuery` (isRetake=true) | List retake invitations |
| PUT | `/{id}` | `UpdateInvitationByUrlCommand` | Update invitation |
| DELETE | `/{id}` | `DeleteInvitationCommand` | Delete invitation |

---

### 3. PendingEmployeeController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/PendingEmployeeController.cs`

**Route**: `/api/pending-employee`

**Endpoints**:

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `/` | `GetPendingEmployeesInCompanyQuery` | List pending employees |
| POST | `/change-status` | `ChangePendingEmployeesStatusCommand` | Accept/reject pending |

---

### 4. HiredCandidateController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/HiredCandidateController.cs`

**Route**: `/api/hired-candidates`

**Endpoints**:

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `/` | `GetHiredCandidatesQuery` | Get hired candidates list |
| POST | `/import` | `ImportHiredCandidatesCommand` | Import as employees |

---

## Core Workflows

### View Employee List

**Entry Point**: `app-employee-list` component

**Flow**:
```
1. Component initializes with default pagination
2. Calls EmployeeHttpService.getEmployeeList(query)
3. Backend: GetEmployeesByFilterQuery executes
   - Filters by company, product scope
   - Applies search text (keyword filter)
   - Applies advanced filters (gender, age, status, org unit)
   - Paginates results
4. Response rendered in employee table with survey columns
5. User can apply filters via employee-advanced-filter
6. Pagination controls load more pages
```

**Key Files**:
- Component: `src/Web/bravoTALENTSClient/src/app/employee/components/employee/list-container/employee-list.container.component.ts:95`
- Table: `src/Web/bravoTALENTSClient/src/app/employee/components/employee/list-container/list/employee-list.component.ts:48`
- API Service: `src/Web/bravoTALENTSClient/src/app/employee/services/employee.http.service.ts:48`
- Controller: `src/Services/bravoTALENTS/Employee.Service/Controllers/EmployeeController.cs:87`

---

### View Pending Employees

**Entry Point**: Pending Employees tab in `app-employee-list`

**Flow**:
```
1. User clicks "Pending Employees" tab
2. Calls EmployeeHttpService.getPendingEmployeeList()
3. Backend: GetPendingEmployeesInCompanyQuery executes
4. Returns list of employees awaiting approval
5. HR can select employees and Accept/Reject
6. On action: ChangePendingEmployeesStatusCommand executed
7. Employee status updated, list refreshed
```

---

### View Pending Invited Employees

**Entry Point**: Pending Invited tab in `app-employee-list`

**Flow**:
```
1. User clicks "Pending Invited" tab
2. Calls EmployeeHttpService.getPendingInvitedEmployees()
3. Backend: GetPendingEmployeesQuery executes
4. Returns list of invited but unregistered users
5. HR can remove invitations or resend
```

---

### Invite Employees

**Entry Point**: "Invite" button -> `app-employee-invitation` dialog

**By Email Flow**:
```
1. HR opens invitation dialog
2. Enters email addresses (comma or line separated)
3. Selects organizational unit for invitees
4. Customizes email subject/body (uses email template)
5. Clicks Send
6. Backend: CreateInvitationByEmailCommand
   - Validates emails
   - Creates pending invitation records
   - Sends invitation emails
7. Invitees appear in "Pending Invited" tab
```

**By URL Flow**:
```
1. HR selects "URL Invitation" tab
2. Configures invitation settings
3. Backend: CreateInvitationByUrlCommand
   - Generates unique shareable URL
4. HR copies and shares URL manually
5. Anyone with URL can register as employee
```

---

### Retake Invitation

**Entry Point**: `employee-retake-invitation` component

**Flow**:
```
1. HR selects employees who need to retake profiles
2. Opens retake invitation dialog
3. Selects invitation type (Email or URL)
4. Selects profiles to retake
5. Customizes message (for email)
6. Backend: CreateInvitationRetakeByEmailCommand or CreateInvitationByUrlCommand
7. Employees receive retake instructions
```

---

### Profile Reminder

**Entry Point**: `employee-remind-taking-profile` component

**Flow**:
```
1. HR selects employees with incomplete profiles
2. Opens remind dialog
3. Selects profiles to remind about
4. Customizes reminder message
5. Backend: CreateRemindTakingProfileCommand
6. Reminder emails sent to selected employees
```

---

### Import Employees

**Entry Point**: "Import" button -> `import-users-panel` dialog

**Flow**:
```
1. HR downloads CSV template
2. Fills employee data in CSV format
3. Uploads file via import dialog
4. Backend: ImportEmployeesCommandHandler
   - Parses CSV rows
   - Validates data (email format, required fields, duplicates)
   - Creates employee records in batch
   - Returns success/error per row
5. Frontend displays import results
```

**CSV Template Fields**:
- Email, FirstName, LastName, Position
- OrganizationalUnit, LineManager, StartDate
- Custom fields as configured

---

### Import Hired Candidates

**Entry Point**: Hired Candidates section

**Flow**:
```
1. HR views list of hired candidates from recruitment
2. Calls EmployeeHttpService.getHiredCandidates()
3. Selects candidates to import as employees
4. Backend: ImportHiredCandidatesCommand
   - Creates employee records from candidate data
   - Preserves profile information
5. New employees appear in employee list
```

---

### Remove Employees

**Entry Point**: Employee list selection -> Remove action

**Flow**:
```
1. HR selects employees to remove
2. Confirms removal action
3. Backend: RemoveEmployeesCommand
   - Validates permissions
   - Soft deletes employee records
   - Triggers cleanup events
4. Employees removed from list
```

---

### Employee Detail View

**Entry Point**: Click employee row in list → Opens detail container

**Flow**:
```
1. User clicks employee row
2. Calls EmployeeHttpService.getEmployeeDetail(id)
3. Backend: GetEmployeeQuery executes
4. Returns full employee profile with survey results
5. Detail panel slides in with tabbed interface
```

---

## Employee Detail Page

The Employee Detail Page provides comprehensive employee information through a tabbed interface. This section documents the detailed view components, APIs, and domain models.

### Key Locations (Detail Page)

| Layer | Location |
|-------|----------|
| **Frontend Components** | `src/Web/bravoTALENTSClient/src/app/employee/components/employee/` |
| **HTTP Services** | `src/Web/bravoTALENTSClient/src/app/employee/services/` |
| **Job/Contract Services** | `src/Web/bravoTALENTSClient/src/app/finance-management/services/` |
| **Backend Controllers** | `src/Services/bravoTALENTS/Employee.Service/Controllers/` |
| **Domain Entities** | `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/` |

### Detail Page Component Hierarchy

```
app-employee-page
└── app-employee-detail-container              # Main detail container with tabs
    ├── [Tab: Personal Info]
    │   └── app-employee-info                  # Personal information display/edit
    │       └── employee-info-custom-field     # Custom fields section
    │
    ├── [Tab: Job]
    │   └── app-employee-job-container         # Job history management
    │       └── job-record-management          # Table + pagination
    │           └── JobFormDialogComponent     # Dialog (extends CustomFieldFormDialogBase)
    │               └── custom-fields-section  # Dynamic custom fields
    │
    ├── [Tab: Career]  ← NEW
    │   └── career-record-management           # Table + pagination
    │       └── CareerFormDialogComponent      # Dialog (extends CustomFieldFormDialogBase)
    │           └── custom-fields-section      # Dynamic custom fields
    │
    ├── [Tab: Salary]  ← NEW
    │   └── salary-record-management           # Table + pagination
    │       └── SalaryFormDialogComponent      # Dialog (extends CustomFieldFormDialogBase)
    │           └── custom-fields-section      # Dynamic custom fields
    │
    ├── [Tab: Contract]
    │   └── app-employee-contract-container    # Contract history management
    │       ├── contract-record-list           # Contract records table
    │       └── contract-record-management     # Add/Edit contract record
    │
    ├── [Tab: CV]
    │   └── app-user-cv                        # CV display and export
    │
    ├── [Tab: Profile]
    │   └── app-user-profile-v2                # User profile surveys
    │
    └── [Tab: AI Assistant]
        └── employee-ai-assistant              # AI-powered assistant
```

**Shared Base Class**: All record form dialogs (Career, Job, Salary) extend `CustomFieldFormDialogBase<TViewModel, TRecord>` which provides:
- Dynamic custom field rendering via `CustomFieldsSectionComponent`
- Dropdown "add item" management via `DropdownAddItemHelper`
- Date range overlap validation
- ViewModel factory pattern (`createNew()`, `fromRecord()`, `buildSavePayload()`)

### Tab Navigation

Tab navigation is controlled by the `EMPLOYEE_TAB` enum:

**File**: `src/Web/bravoTALENTSClient/src/app/employee/constants/employee-tab.constant.ts`

```typescript
export enum EMPLOYEE_TAB {
    EMPLOYEE_INFO = 'employeeInfo',   // Personal Info tab
    CV = 'cv',                        // CV tab
    PROFILE = 'profile',              // Profile tab
    JOB = 'job',                      // Job History tab
    CONTRACT = 'contract',            // Contract History tab
    AI_ASSISTANT = 'aiAssistant'      // AI Assistant tab
}
```

### Tab Components

#### 1. Personal Info Tab (`app-employee-info`)

| Component | Description |
|-----------|-------------|
| `employee-info.component.ts` | Displays and edits personal employee information |
| `employee-info-custom-field.component.ts` | Manages custom field values for the employee |

**Key Features**:
- View/edit personal information (name, email, phone, etc.)
- Custom fields management
- Employment status display

#### 2. Job History Tab (`app-employee-job-container`)

| Component | Description |
|-----------|-------------|
| `job-record-management.component.ts` | Table + pagination for job records (extends `AppBaseComponent`) |
| `job-form-dialog.component.ts` | Dialog for add/edit/view (extends `CustomFieldFormDialogBase`) |
| `job-form-dialog.view-model.ts` | ViewModel with `createNew()`, `fromJobRecord()`, `buildSavePayload()` |
| `record-delete-confirmation.service.ts` | Type-to-confirm delete with last org prevention |

**Key Features**:
- View job history timeline with configurable date format
- "Current" badge on active work assignments (display priority ordering)
- Add new job records (position, team, org unit, date range)
- Edit/delete existing job records with authorization check
- Type-to-confirm delete: requires typing org unit name for last org confirmation
- Delete prevention: cannot remove last effective org unit for an employee
- Custom fields support via EMPLOYEE_JOB field group
- Dropdown "add item" for team title options
- Auto-sync: saves trigger org unit sync to Accounts
- Timezone-aware date storage (start/end of day in user's timezone)

**Evidence**: `finance-management/components/job/` | `finance-management/services/record-delete-confirmation.service.ts`

#### 2b. Career History Tab (`career-record-management`) ← NEW

| Component | Description |
|-----------|-------------|
| `career-record-management.component.ts` | Table + pagination for career records (extends `AppBaseComponent`) |
| `career-form-dialog.component.ts` | Dialog for add/edit/view (extends `CustomFieldFormDialogBase`) |
| `career-form-dialog.view-model.ts` | ViewModel with `createNew()`, `fromCareerRecord()`, `buildSavePayload()` |

**Key Features**:
- View career history with position, level columns
- Add new career records (position, level, sub-level, date range)
- Date range overlap validation (async check before save)
- Custom fields support via CAREER_INFO field group
- Auto-close: previous record EndDate set when new record created
- Latest active career record syncs to Employee.Position

**Feature Gate**: Requires `EmployeeRecordLicense` AND `CAREER_INFO` field group in template.

**Evidence**: `finance-management/components/career/`

#### 2c. Salary History Tab (`salary-record-management`) ← NEW

| Component | Description |
|-----------|-------------|
| `salary-record-management.component.ts` | Table + pagination for salary records (extends `AppBaseComponent`) |
| `salary-form-dialog.component.ts` | Dialog for add/edit/view (extends `CustomFieldFormDialogBase`) |
| `salary-form-dialog.view-model.ts` | ViewModel with `createNew()`, `fromSalaryRecord()`, `buildSavePayload()` |

**Key Features**:
- View salary history with pay rate, insurance, interval columns
- Add new salary records (pay rate, insurance, wage type, interval)
- Custom fields support via SALARY_INFO field group
- Date range overlap validation

**Evidence**: `finance-management/components/salary/`

#### 3. Contract History Tab (`app-employee-contract-container`)

| Component | Description |
|-----------|-------------|
| `employee-contract-container.component.ts` | Container for contract records management |
| `contract-record-list.component.ts` | Table displaying contract history |
| `contract-record-management.component.ts` | Form for adding/editing contract records |

**Key Features**:
- View contract history timeline
- Add new contract records
- Edit/delete existing contracts
- Track contract type, employee type changes

#### 4. CV Tab (`app-user-cv`)

| Component | Description |
|-----------|-------------|
| `user-cv.component.ts` | Displays CV with export capabilities |

**Key Features**:
- View formatted CV
- Export CV as PDF/HTML
- CV template selection

#### 5. Profile Tab (`app-user-profile-v2`)

| Component | Description |
|-----------|-------------|
| `user-profile-v2.component.ts` | Displays survey results and profile information |

**Key Features**:
- View survey completion status
- Display profile assessment results
- Interests, Motivation, Preferences visualization

#### 6. AI Assistant Tab (`employee-ai-assistant`)

| Component | Description |
|-----------|-------------|
| `employee-ai-assistant.component.ts` | AI-powered employee assistant |

**Key Features**:
- AI-powered insights
- Employee data analysis
- Recommendations

### Detail Page API Endpoints

#### Employee Detail HTTP Service

**File**: `src/Web/bravoTALENTSClient/src/app/employee/services/employee.http.service.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getEmployeeDetail(userId)` | `GET /employee/{userId}` | Get full employee details |
| `getCvHtmlContent(params)` | `GET /report/export-cv` | Export CV as HTML |
| `getEmployeeInfoCustomField(userId)` | `GET /employee-custom-field` | Get custom field values |
| `updateEmployeeInfoCustomField(data)` | `POST /employee-custom-field` | Update custom field values |

#### Job Record HTTP Service

**File**: `src/Web/bravoTALENTSClient/src/app/finance-management/services/employee-job-record.service.ts`

**Base Class**: `AppBasePlatformApiService` (migrated from raw HttpService)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getJobRecords(pagingParams, employeeId)` | `GET /employee/job-record?employeeId={id}` | Get paginated job records |
| `getJobRecordById(jobRecordId)` | `GET /employee/job-record/{id}` | Get single job record |
| `saveJobRecord(form, autoCreateContract)` | `POST /employee/job-record/save` | Create or update job record |
| `deleteJobRecordById(jobRecordId)` | `POST /employee/job-record/delete` | Delete job record |

#### Career Record HTTP Service ← NEW

**File**: `src/Web/bravoTALENTSClient/src/app/finance-management/services/employee-career-record.service.ts`

**Base Class**: `AppBasePlatformApiService`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getCareerRecords(pagingParams, employeeId)` | `GET /employee/career-record?employeeId={id}` | Get paginated career records |
| `getCareerRecordById(careerRecordId)` | `GET /employee/career-record/{id}` | Get single career record |
| `saveCareerRecord(form)` | `POST /employee/career-record/save` | Create or update career record |
| `deleteCareerRecordById(careerRecordId)` | `POST /employee/career-record/delete` | Delete career record |

#### Salary Record HTTP Service ← NEW

**File**: `src/Web/bravoTALENTSClient/src/app/finance-management/services/employee-salary-record.service.ts`

**Base Class**: `AppBasePlatformApiService` (migrated from raw HttpService)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getSalaryRecords(pagingParams, employeeId)` | `GET /salaryRecord?employeeId={id}` | Get paginated salary records |
| `getSalaryRecordById(salaryRecordId)` | `GET /salaryRecord/{id}` | Get single salary record |
| `saveSalaryRecord(form)` | `POST /salaryRecord/save` | Create or update salary record |
| `deleteSalaryRecordById(salaryRecordId)` | `POST /salaryRecord/delete` | Delete salary record |

#### Contract Record HTTP Service

**File**: `src/Web/bravoTALENTSClient/src/app/finance-management/services/employee-contract-record.service.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getContractRecords(pagingParams, userId)` | `GET /contract-record?userId={id}` | Get paginated contract records |
| `getContractRecordById(id)` | `GET /contract-record/{id}` | Get single contract record |
| `saveContractRecord(form)` | `POST /contract-record/save` | Create or update contract record |
| `deleteContractRecordById(id, userId)` | `POST /contract-record/delete` | Delete contract record |

### Backend Controllers (Detail Page)

#### EmployeeController (Detail Endpoints)

**File**: `src/Services/bravoTALENTS/Employee.Service/Controllers/EmployeeController.cs`

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `GET /{id}` | `GetEmployeeQuery` | Get employee by ID |
| `GET /job-record` | `GetJobRecordsQuery` | Get job records with pagination |
| `GET /job-record/{id}` | `GetJobRecordByIdQuery` | Get single job record |
| `POST /job-record/save` | `SaveJobRecordCommand` | Save job record |
| `POST /job-record/delete` | `DeleteJobRecordCommand` | Delete job record (with company authorization) |
| `GET /career-record` | `GetCareerRecordsQuery` | Get career records with pagination |
| `GET /career-record/{id}` | `GetCareerRecordByIdQuery` | Get single career record |
| `POST /career-record/save` | `SaveCareerRecordCommand` | Save career record (CompanyId from context) |
| `POST /career-record/delete` | `DeleteCareerRecordCommand` | Delete career record (CompanyId from context) |
| `POST /record/date-range/validate` | `ValidateDateRangeRecordCommand` | Check date range overlap for any record type |
| `POST /get-job-positions` | `GetJobPositionQuery` | Search job positions dropdown |

#### ContractRecordController

**File**: `src/Services/bravoTALENTS/Employee.Service/Controllers/ContractRecordController.cs`

**Route**: `/api/contract-record`

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `GET /` | `GetContractRecordsQuery` | Get contract records with pagination |
| `GET /{id}` | `GetContractRecordByIdQuery` | Get single contract record |
| `POST /save` | `SaveContractRecordCommand` | Save contract record |
| `POST /delete` | `DeleteContractRecordCommand` | Delete contract record |

#### CustomFieldController

**File**: `src/Services/bravoTALENTS/Employee.Service/Controllers/CustomFieldController.cs`

**Route**: `/api/employee-custom-field`

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `GET /` | `GetEmployeeCustomFieldsQuery` | Get custom field values |
| `POST /` | `SaveEmployeeCustomFieldsCommand` | Save custom field values |

### Job Record Domain Model

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/JobRecord.cs`

```csharp
public sealed class JobRecord : EntityPeriodRecord<JobRecord>
{
    // Inherited from EntityPeriodRecord:
    // - string Id, string UserId, string CompanyId
    // - DateTime StartDate, DateTime? EndDate (timezone-aware, see below)
    // - List<CustomFieldValue> CustomFieldValues

    // Job-specific properties:
    public string Comment { get; set; }                  // Notes about the job record
    public string? Position { get; set; }                // Job position/title
    public string? Team { get; set; }                    // Team assignment (OrgUnitId)
    public string? TeamTitle { get; set; }               // Position title for display
    public string? Level { get; set; }                   // Career level
    public string? OrganizationalUnitId { get; set; }    // FK to organizational unit
    public string? OrganizationalUnitName { get; set; }  // Denormalized org unit name

    // Hangfire scheduled job tracking:
    public string? ScheduledStartJobId { get; set; }     // Hangfire job ID for StartDate transition
    public string? ScheduledEndJobId { get; set; }       // Hangfire job ID for EndDate transition
}
```

**Timezone-Aware Date Storage**:
- `StartDate`/`EndDate` are stored as UTC but normalized to user's timezone boundaries
- Example: User selects Feb 10 in UTC+7 → `StartDate` = `2026-02-09T17:00:00Z` (start of Feb 10 in UTC+7)
- `EndDate` stored as end-of-day: `2026-02-10T16:59:59Z` (end of Feb 10 in UTC+7)
- Frontend converts UTC back to user's timezone → displays Feb 10 correctly
- Career/Salary records do NOT use this pattern (day-only UTC, no timezone conversion)

**Key Relationships**:
- `JobRecord` → `Employee` (Many-to-One via UserId)
- `JobRecord` → `OrganizationalUnit` (via OrganizationalUnitId)
- Tracks position history over time periods
- Active records = StartDate <= today AND (EndDate null OR EndDate >= today)

**Validation Rules**:
- `StartDate` must be before or equal to `EndDate` (if set)
- No overlapping periods for same employee/company/OrganizationalUnit+TeamTitle combination
- Authorization: `DeleteJobRecordCommand` validates `record.CompanyId == RequestContext.CurrentCompanyId()`
- Delete prevention: cannot delete last effective org unit for an employee

**Bi-directional Sync** (NEW):
- **Forward**: Job record save/delete triggers `SyncEmployeeJobRecordSavedEntityEventHandler` → syncs to Accounts
- **Reverse**: Accounts hierarchy changes trigger `JobRecordAutoSyncService` → auto-creates/updates job records

**Evidence**: `JobRecord.cs:1-23`

### Career Record Domain Model ← NEW

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/CareerRecord.cs`

```csharp
public sealed class CareerRecord : EntityPeriodRecord<CareerRecord>
{
    // Inherited from EntityPeriodRecord:
    // - string Id, string UserId, string CompanyId
    // - DateTime StartDate, DateTime? EndDate
    // - List<CustomFieldValue> CustomFieldValues

    // Career-specific properties:
    public string Position { get; set; }      // Career position (required)
    public string? Level { get; set; }        // Career level (dropdown)
    public string? SubLevel { get; set; }     // Sub-level designation
    public string? Comment { get; set; }      // Additional comments
}
```

**Key Relationships**:
- `CareerRecord` → `Employee` (Many-to-One via UserId)
- Latest active record syncs to `Employee.Position`

**Validation Rules**:
- `Position` is required
- `EndDate` must be >= `StartDate` or null
- No overlapping career periods per employee/company
- Custom field values validated

**Event-Driven Sync**:
- On save/delete: `UpdateEmployeePositionOnCareerRecordSavedEntityEventHandler` syncs Employee.Position and custom fields (CareerPosition, CareerLevel, SubLevel)

**DB Index**: Compound on (UserId, CompanyId, StartDate, EndDate) — `EnsureCareerRecordCollectionIndexes` migration

**Evidence**: `CareerRecord.cs:1-40` | `20260223000000_EnsureCareerRecordCollectionIndexes.cs`

### Contract Record Domain Model

**File**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/ContractRecord.cs`

```csharp
public sealed class ContractRecord : EntityPeriodRecord<ContractRecord>
{
    // Inherited from EntityPeriodRecord:
    // - string Id
    // - string EmployeeId (mapped to UserId in API)
    // - DateTime FromDate
    // - DateTime? ToDate
    // - bool IsCurrent

    // Contract-specific properties:
    public string? ContractCode { get; set; }    // Contract identifier
    public string? ContractType { get; set; }    // Type (Permanent, Fixed-term, etc.)
    public string EmployeeType { get; set; }     // Employment type (Full-time, Part-time)
    public string Comment { get; set; }          // Additional notes
}
```

**Key Relationships**:
- `ContractRecord` → `Employee` (Many-to-One)
- Tracks contract history over time periods
- Links to employee via UserId

**Validation Rules**:
- `EmployeeType` is required
- Date range validation (FromDate ≤ ToDate)
- Only one current contract per employee

### Entity Event Handlers (Detail Page)

| Handler | Trigger | Purpose |
|---------|---------|---------|
| `SyncEmployeeJobRecordSavedEntityEventHandler` | Job record saved/deleted | **Consolidated handler**: Sync position, org units, Hierarchies, TeamOrgUnit, Team custom fields → Accounts (via `SendReverseSyncToAccountsAsync`) |
| `UpdateEmployeePositionOnCareerRecordSavedEntityEventHandler` | Career record saved/deleted | Sync Employee.Position + custom fields from latest active career record |
| `UpdateEmployeeOnContractRecordSavedEntityEventHandler` | Contract record saved | Sync contract info to employee |

### Detail Page Workflows

#### View Employee Detail

```
1. User clicks employee row in list
2. Frontend:
   - EmployeeHttpService.getEmployeeDetail(userId)
3. Backend:
   - EmployeeController GET /{id}
   - GetEmployeeQuery handler executes
   - Returns EmployeeDetailDto with profile data
4. Frontend:
   - employee-detail-container displays with tabs
   - Default tab: EMPLOYEE_INFO (Personal Info)
```

#### View/Edit Job History

```
1. User navigates to Job tab
2. Frontend:
   - EmployeeJobRecordService.getJobRecords(params, employeeId)
3. Backend:
   - EmployeeController GET /job-record
   - GetJobRecordsQuery returns paginated JobRecordDto list (parallel DB queries)
   - DTO enriched with dropdown labels from CompanyClassFieldTemplate
4. User clicks Add/Edit:
   - Opens JobFormDialogComponent (extends CustomFieldFormDialogBase)
   - User fills Team Title, Org Unit, Date range, Custom Fields
   - Date overlap validation via POST /record/date-range/validate
5. On Save:
   - EmployeeJobRecordService.saveJobRecord(form)
   - Backend: SaveJobRecordCommand validates and persists
   - Auto-closes previous record (same OrgUnit only)
   - Event: SyncEmployeeJobRecordSavedEntityEventHandler (consolidated)
     → Syncs position, org units, Hierarchies, TeamOrgUnit, Team → Accounts
6. On Delete:
   - Authorization: validates record.CompanyId == RequestContext.CurrentCompanyId()
   - Event: SyncEmployeeJobRecordSavedEntityEventHandler (removes org if active)
```

#### View/Edit Career History ← NEW

```
1. User navigates to Career tab (visible if EmployeeRecordLicense + CAREER_INFO group)
2. Frontend:
   - EmployeeCareerRecordService.getCareerRecords(params, employeeId)
3. Backend:
   - EmployeeController GET /career-record
   - GetCareerRecordsQuery returns paginated CareerRecordDto list
   - DTO enriched with position/level labels from CompanyClassFieldTemplate
4. User clicks Add/Edit:
   - Opens CareerFormDialogComponent (extends CustomFieldFormDialogBase)
   - User fills Position, Level, SubLevel, Date range, Custom Fields
   - Date overlap validation via POST /record/date-range/validate
5. On Save:
   - EmployeeCareerRecordService.saveCareerRecord(form)
   - Backend: SaveCareerRecordCommand validates, persists, auto-closes prior record
   - Event: UpdateEmployeePositionOnCareerRecordSavedEntityEventHandler
     → Syncs Employee.Position + CareerLevel/SubLevel from latest active record
6. On Delete:
   - Authorization: validates record.CompanyId == command.CompanyId (from context)
   - Event: recalculates Employee.Position from remaining records
```

#### View/Edit Salary History ← NEW

```
1. User navigates to Salary tab
2. Frontend:
   - EmployeeSalaryRecordService.getSalaryRecords(params, employeeId)
3. Backend:
   - SalaryRecordController GET /salaryRecord
   - Returns paginated SalaryRecordDto list
4. User clicks Add/Edit:
   - Opens SalaryFormDialogComponent (extends CustomFieldFormDialogBase)
   - User fills PayRate, Insurance, WageType, Interval, Date range, Custom Fields
5. On Save:
   - EmployeeSalaryRecordService.saveSalaryRecord(form)
   - Backend: SaveSalaryRecordCommand validates and persists
```

#### View/Edit Contract History

```
1. User navigates to Contract tab
2. Frontend:
   - EmployeeContractRecordService.getContractRecords(params, userId)
3. Backend:
   - ContractRecordController GET /
   - GetContractRecordsQuery returns paginated ContractRecordDto list
4. User clicks Add/Edit:
   - Opens contract-record-management form
   - User fills ContractCode, ContractType, EmployeeType, Date range
5. On Save:
   - EmployeeContractRecordService.saveContractRecord(form)
   - Backend: SaveContractRecordCommand validates and persists
   - Event: UpdateEmployeeOnContractRecordSavedEntityEventHandler
   - Updates employee record with contract info
```

#### Export CV

```
1. User navigates to CV tab
2. Frontend:
   - EmployeeHttpService.getCvHtmlContent(params)
3. Backend:
   - ReportController GET /export-cv
   - Generates CV HTML from template
4. User can:
   - View CV in browser
   - Download as PDF
   - Select different CV templates
```

#### Update Custom Fields

```
1. User views Personal Info tab
2. Custom fields section displays current values
3. User edits custom field value
4. Frontend:
   - EmployeeHttpService.updateEmployeeInfoCustomField(data)
5. Backend:
   - CustomFieldController POST /
   - SaveEmployeeCustomFieldsCommand persists values
```

---

## Event Handlers & Consumers

### Entity Event Handlers

| Handler | Trigger | Purpose |
|---------|---------|---------|
| `UpdateAccessRightOnEmployeeEmailUpdatedEntityEventHandler` | Employee email updated | Update access rights |
| `UpdateEmployeeOnContractRecordSavedEntityEventHandler` | Contract record saved | Sync employee from contract |
| `SyncEmployeeJobRecordSavedEntityEventHandler` | Job record CUD | **Consolidated**: position + org units + Hierarchies + TeamOrgUnit + Team → Accounts (bi-directional) |
| `UpdateEmployeePositionOnCareerRecordSavedEntityEventHandler` | Career record CUD | Sync Employee.Position + CareerLevel/SubLevel from latest active career record |
| `UpdateEmployeeUserInfoOnUserSavedEntityEventHandler` | User saved | Sync user info to employee |
| `UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler` | Employee status updated | Update user company info |

#### UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler Details

**Location**: `src/Services/bravoTALENTS/Employee.Application/ApplyPlatform/UseCaseEvents/UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler.cs`

**Trigger**: Employee.Status or Employee.EnhancedStatus changes

**Logic**:
```csharp
// Calculate isActive based on employment status
var isActive = defaultIsActive ||
               @event.EntityData.Is(EmployeeEntity.MatchEmploymentStatusesExpr(
                   EmploymentStatuses.ActiveEmploymentStatuses));

// Send to Accounts via message bus
await platformCqrs.SendRequestAsync(
    new AccountUpsertUserCompanyInfoRequestBusMessage(
        userId: @event.EntityData.UserId,
        companyId: @event.EntityData.CompanyId,
        isActive: isActive,
        employeeEmail: @event.EntityData.EmployeeEmail),
    cancellationToken: cancellationToken);
```

**Evidence**: `UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler.cs:44-58`

**Flow**:
1. Employee status updated (Active, Resigned, ContractExpired, etc.)
2. Handler calculates `isActive`:
   - `true` if status in ActiveEmploymentStatuses (Active, ContractMissing, ContractExpiring, ContractExpired)
   - `false` if status in NonActiveEmploymentStatuses (Resigned, JoiningDateMissing, AcceptedOffer)
3. Sends `AccountUpsertUserCompanyInfoRequestBusMessage` to Accounts
4. Accounts updates `UserCompanyInfo.IsActive`
5. Accounts broadcasts `AccountUserSavedEventBusMessage` to bravoSURVEYS
6. bravoSURVEYS updates `UserCompany.IsActive` for distribution filtering

### Message Bus Consumers

| Consumer | Message | Purpose |
|----------|---------|---------|
| `AccountUserSavedEventBusConsumer` | AccountUserSavedEvent | Sync user from Accounts service |
| `AccountUserDeletedEventBusConsumer` | AccountUserDeletedEvent | Handle user deletion |
| `AccountOrgUnitUserUpdatedEventBusConsumer` | OrgUnitUserUpdatedEvent | Sync org unit membership |
| `CandidateNewCandidateHiredEventBusMessageConsumer` | CandidateHiredEvent | Create employee from hired candidate |
| `PermissionProviderUserApplicationRolesUpdatedEventBusConsumer` | UserRolesUpdatedEvent | Update employee roles |

### Cross-Service Communication

```
Accounts Service                    bravoTALENTS Employee.Service
     |                                        |
     | AccountUserSavedEvent                  |
     +--------------------------------------->| AccountUserSavedEventBusConsumer
     |                                        | - Upsert Employee record
     |                                        | - Reconcile JobRecords with hierarchies (JobRecordAutoSyncService)
     |                                        |   ↑ Skips if SourceSystem == PolicyIds.BravoTALENTS (loop prevention)
     |                                        |   ↑ Uses dismissSendEvent: true (cascade prevention)
     |                                        |
     | AccountUserDeletedEvent                |
     +--------------------------------------->| AccountUserDeletedEventBusConsumer
     |                                        | - Delete/deactivate Employee
     |                                        |
     |  AccountAddUsersToOrgsRequestBusMsg    |
     |<---------------------------------------+ EmployeeOrgUnitSyncService (forward sync)
     |  AccountRemoveUsersFromOrgsRequestBusMsg|   ↑ Triggered by SyncEmployeeJobRecordSaved
     |<---------------------------------------+   ↑ via SendReverseSyncToAccountsAsync()
     |                                        |   ↑ Includes SourceSystem = PolicyIds.BravoTALENTS
     |                                        |
CandidateApp Service                          |
     | CandidateHiredEvent                    |
     +--------------------------------------->| CandidateNewCandidateHiredConsumer
     |                                        | - Create Employee from Candidate
```

#### Bi-directional Org Unit Sync Flow ← NEW

```
Forward Sync (Employee → Accounts):
  JobRecord saved/deleted
    → SyncEmployeeJobRecordSavedEntityEventHandler (consolidated handler)
    → EmployeeOrgUnitSyncService.SyncEmployeeOrgUnitsFromJobRecordsAsync()
    → Identifies active org units from JobRecordPeriodEvaluator
    → Updates Employee.Hierarchies + TeamOrgUnit + Team custom fields
    → Company root excluded from removedOrgUnitIds (prevents UserCompanyInfo cascade deletion)
    → Returns OrgUnitSyncResult
    → SendReverseSyncToAccountsAsync(syncResult)  ← explicit separate call
      → Sends AccountAddUsersToOrgsRequestBusMessage (SourceSystem=PolicyIds.BravoTALENTS)
      → Sends AccountRemoveUsersFromOrgsRequestBusMessage (for removed orgs)

Reverse Sync (Accounts → Employee):
  User hierarchy changes in Accounts
    → AccountUserSavedEventBusMessage
    → AccountUserSavedEventBusConsumer.HandleJobRecordSyncOnHierarchyChange()
    → Checks SourceSystem != PolicyIds.BravoTALENTS (loop prevention)
    → JobRecordAutoSyncService.ReconcileJobRecordsAsync() (reconciliation pattern)
      → Compares desired state (hierarchies) vs actual state (JobRecords)
      → currentHierarchies − activeRecords = toCreate (auto-creates records)
      → activeRecords − currentHierarchies = toEndDate (end-dates orphaned records)
      → Uses dismissSendEvent: true to prevent cascades on bulk operations
    → SyncEmployeeOrgUnitsFromJobRecordsAsync (updates Hierarchies/TeamOrgUnit/Team ONLY, no reverse sync)

Period Transitions (Queue-based, per-record scheduling):
  JobRecordTransitionBackgroundJob (Hangfire scheduled jobs)
    → Scheduled at exact StartDate/EndDate by SaveJobRecordCommand
    → Job ID stored in JobRecord.ScheduledStartJobId / ScheduledEndJobId
    → On trigger: verifies transition still valid → syncs org units → reverse sync to Accounts
    → Cancelled automatically when dates change or record deleted
```

#### Key Services for Bi-directional Sync

| Service | Purpose |
|---------|---------|
| `EmployeeOrgUnitSyncService` | Forward sync: JobRecords → Employee.Hierarchies/TeamOrgUnit/Team → Accounts (via `SendReverseSyncToAccountsAsync`). Uses `dismissSendEvent` pattern in consumer path to prevent cascades |
| `JobRecordAutoSyncService` | Reverse sync: Accounts hierarchy changes → reconciles desired vs actual state → auto-create/end-date JobRecords. Bulk ops: `HandleOrgsDeletedAsync`, `HandleCompanyDeletedAsync`, `HandleOrgsRenamedAsync` |
| `JobRecordPeriodEvaluator` | Static helper: evaluates period status (Active/Ended/Future/Invalid), display priority ordering |
| `JobRecordTransitionBackgroundJob` | Queue-based per-record transition: scheduled at exact StartDate/EndDate, syncs org units + reverse sync to Accounts |

**Evidence**: `Services/EmployeeOrgUnitSyncService.cs` | `Services/JobRecordAutoSyncService.cs` | `Helpers/JobRecordPeriodEvaluator.cs`

---

## Permission System

### Authorization Policies

| Policy | Description |
|--------|-------------|
| `CompanyRoleAuthorizationPolicies.EmployeePolicy` | Base policy for employee management |
| `CompanyRoleAuthorizationPolicies.AdminPolicy` | Admin-only operations |
| `CompanyRoleAuthorizationPolicies.HRAdminPolicy` | HR admin operations |

### Required Roles

| Role | Description |
|------|-------------|
| `Admin` | Full system administrator |
| `HRAdmin` | Human resources administrator |
| `HRManager` | HR manager with limited scope |
| `OrgUnitManager` | Manager for specific org units |
| `Employee` | Basic employee access (view only) |

### Permission Matrix

| Action | Admin | HRAdmin | HRManager | OrgUnitManager | Employee |
|--------|:-----:|:-------:|:---------:|:--------------:|:--------:|
| View Employee List | ✅ | ✅ | ✅ | ✅ (own unit) | ❌ |
| View Employee Detail | ✅ | ✅ | ✅ | ✅ (own unit) | ✅ (self) |
| View Pending Employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject Pending | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Pending Invited | ✅ | ✅ | ✅ | ❌ | ❌ |
| Send Email Invitation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create URL Invitation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send Retake Invitation | ✅ | ✅ | ✅ | ✅ (own unit) | ❌ |
| Send Profile Reminder | ✅ | ✅ | ✅ | ✅ (own unit) | ❌ |
| Import Employees (CSV) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Import Hired Candidates | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove Employees | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove Pending Invited | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export Employee Report | ✅ | ✅ | ✅ | ✅ (own unit) | ❌ |
| Manage Custom Fields | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Employment Status | ✅ | ✅ | ✅ | ❌ | ❌ |

### Org Unit Scope

When `OrgUnitManager` role is active:
- Can only view/manage employees in their assigned organizational unit(s)
- Cannot access employees outside their scope
- Filtered automatically by `GetEmployeesByFilterQuery`

---

## API Reference

### Employee Endpoints

```
GET    /api/employee
       ?pageSize=20&pageIndex=1
       &orgUnitId={id}
       &keyword={search}
       &gender={M,F}
       &ageRange={20-30,30-40}
       &employmentStatus={Active,Inactive}
       &advancedFilterQuery={encoded_query}

GET    /api/employee/{id}

GET    /api/employee/org-units

POST   /api/employee/departments/{deptId}
       Body: { pageSize, pageIndex, filters }

POST   /api/employee/imports
       Content-Type: multipart/form-data
       Body: file, culture, isOverride, section

DELETE /api/employee/remove
       Body: { emails: ["email1@example.com", "email2@example.com"] }

GET    /api/employee/pending-employees
       ?pageIndex=1&pageSize=20&searchText={text}

DELETE /api/employee/remove-pending-invited
       Body: { emails: ["email1@example.com"] }

GET    /api/report/{companyId}
       ?language={lang}&isExportAllFields={bool}
       &orgUnitId={id}&advancedFilterQuery={query}
```

### Invitation Endpoints

```
POST   /api/invitations/invite-to-company-by-email
       Body: { emails: [], orgUnitId, subject, body, profiles: [] }

POST   /api/invitations/invite-to-company-by-url
       Body: { orgUnitId, expirationDate, profiles: [] }

POST   /api/invitations/invite-retake-to-company-by-email
       Body: { employeeIds: [], subject, body, profiles: [] }

POST   /api/invitations/invite-retake-to-company-by-url
       Body: { orgUnitId, expirationDate, isRetake: true, profiles: [] }

POST   /api/invitations/remind-taking-profile-to-employee
       Body: { employeeIds: [], subject, body, profiles: [] }

GET    /api/invitations?invitationType=Url

GET    /api/invitations/retake?invitationType=Url

PUT    /api/invitations/{id}
       Body: { orgUnitId, expirationDate, profiles: [] }

DELETE /api/invitations/{id}
```

### Pending Employee Endpoints

```
GET    /api/pending-employee
       ?pageSize=20&pageIndex=1&orgUnitId={id}&keyword={search}

POST   /api/pending-employee/change-status
       Body: { employeeIds: [], status: "Approved" | "Rejected" }
```

### Hired Candidate Endpoints

```
GET    /api/hired-candidates
       ?pageSize=20&pageIndex=1

POST   /api/hired-candidates/import
       Body: { candidateIds: ["id1", "id2"] }
```

### Career Record Endpoints ← NEW

```
GET    /api/employee/career-record
       ?employeeId={id}&pageIndex=1&pageSize=20

GET    /api/employee/career-record/{id}

POST   /api/employee/career-record/save
       Body: { data: { employeeId, position, level, subLevel, comment, startDate, endDate, customFieldValues } }

POST   /api/employee/career-record/delete
       Body: { careerRecordId: "id" }
```

### Salary Record Endpoints ← NEW

```
GET    /api/salaryRecord
       ?employeeId={id}&pageIndex=1&pageSize=20

GET    /api/salaryRecord/{id}

POST   /api/salaryRecord/save
       Body: { data: { employeeId, payRate, insuranceSalary, paymentWageType, paymentInterval, startDate, endDate } }

POST   /api/salaryRecord/delete
       Body: { salaryRecordId: "id" }
```

### Validation & Lookup Endpoints ← NEW

```
POST   /api/employee/record/date-range/validate
       Body: { startDate, endDate, userId, entityRecordId, recordType: "Job|Contract|Salary|Career" }
       Response: { hasOverlap: boolean, isOutOfRangePeriodOfOtherSection: boolean }

POST   /api/employee/get-job-positions
       Body: { searchText, pageIndex, pageSize, selectedIds }
```

### Employment Status Endpoints

```
GET    /api/employment-status

PUT    /api/employee/{id}/employment-status
       Body: { status: "Active" | "OnLeave" | "Terminated" }
```

---

# Converted Test Cases - TC Format

## Test Specifications

This section provides comprehensive test specifications using the **Test Case (TC)** format for the Employee Management feature, organized by priority levels and test categories.

### Priority Legend

| Priority | Label       | Description                                     | When to Run              |
| -------- | ----------- | ----------------------------------------------- | ------------------------ |
| **P0**   | 🔴 Critical | Core functionality - system unusable if fails   | Every build, smoke tests |
| **P1**   | 🟠 High     | Main business flows, common use cases           | Every PR, regression     |
| **P2**   | 🟡 Medium   | Important but less frequent scenarios           | Daily/Weekly regression  |
| **P3**   | 🟢 Low      | Edge cases, boundary conditions, rare scenarios | Full regression only     |

### Test Case Summary

| Category                    | P0     | P1     | P2     | P3     | Total   |
| --------------------------- | ------ | ------ | ------ | ------ | ------- |
| Employee CRUD               | 4      | 8      | 6      | 4      | 22      |
| Invitation Management       | 3      | 7      | 5      | 3      | 18      |
| Pending Employee Management | 2      | 4      | 3      | 2      | 11      |
| JobRecord & ContractRecord  | 3      | 9      | 4      | 3      | 19      |
| **CareerRecord**            | **3**  | **5**  | **3**  | **2**  | **13**  |
| **SalaryRecord**            | **2**  | **3**  | **2**  | **1**  | **8**   |
| Import/Export               | 2      | 5      | 4      | 3      | 14      |
| Custom Fields               | 1      | 4      | 3      | 2      | 10      |
| Cross-Service Integration   | 3      | 10     | 4      | 2      | 19      |
| Security & Authorization    | 3      | 6      | 4      | 2      | 15      |
| Error Handling              | 2      | 4      | 3      | 3      | 12      |
| Performance                 | 1      | 2      | 2      | 2      | 7       |
| **Total**                   | **29** | **67** | **43** | **29** | **168** |

---

## Employee CRUD Test Cases

### P0 - Critical [4 Tests]

#### TC-EM-001: View Employee List Successfully [P0]

**Acceptance Criteria**:
- ✅ Employee list loads within 3 seconds
- ✅ Default page size of 20 employees displayed
- ✅ Each employee row shows basicInfo, department, survey profile columns
- ✅ Pagination controls visible and functional

**Edge Cases**:
- ❌ Empty employee list → Shows empty state message with invite CTA

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Controllers/EmployeeController.cs:38-326`

---

#### TC-EM-002: View Employee Detail Page [P0]

**Acceptance Criteria**:
- ✅ Employee profile loads successfully
- ✅ Overview, Job Records, and Contract tabs visible
- ✅ Current position displayed
- ✅ JobRecords and ContractRecords loaded with employee data

**Edge Cases**:
- ❌ Employee with no job records → Tab shows empty state
- ❌ Missing related entities → Page renders without errors

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Controllers/EmployeeController.cs:38-326`

---

#### TC-EM-003: Create New Employee via Invitation [P0]

**Acceptance Criteria**:
- ✅ Email invitation creates new employee record after registration
- ✅ Employee appears in employee list immediately
- ✅ EmployeeEntityEventBusMessage published with Created action
- ✅ Survey profiles assigned as specified in invitation

**Edge Cases**:
- ❌ Duplicate email during invitation → Validation error
- ❌ Invitee already has user account → Employee created linked to existing user

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Consumers/AccountUserSavedEventBusConsumer.cs`

---

#### TC-EM-004: Employee Data Synchronization Across Services [P0]

**Acceptance Criteria**:
- ✅ EmployeeEntityEventBusMessage published on employee creation
- ✅ bravoGROWTH service receives and syncs employee
- ✅ bravoSURVEYS service receives and syncs employee
- ✅ Employee data consistent across all services (Id, Email, FullName, CompanyId)

**Edge Cases**:
- ❌ Service temporarily unavailable → Message queued for retry
- ❌ Duplicate message received → Idempotent - no duplicate created

**Evidence**: `ApplyPlatform/EntityDtos/EmployeeEntityDto.cs:7-45` | `Consumers/GrowthEmployeeEntityEventBusConsumer.cs`

---

### P1 - High Priority [8 Tests]

#### TC-EM-005: Search Employees by Keyword [P1]

**Acceptance Criteria**:
- ✅ Keyword search returns matching employees by name, email, position
- ✅ Case-insensitive matching
- ✅ Partial keyword matching supported
- ✅ Search completes within 2 seconds

**Edge Cases**:
- ❌ Empty search term → All employees returned
- ❌ Special characters in search → Escaped and handled properly
- ❌ No matches found → Empty result set returned

**Evidence**: `Employees/Queries/GetEmployeesByAdvancedFilter/GetEmployeesByAdvancedFilterQueryHandler.cs:19-120` | `Controllers/EmployeeController.cs:38-326`

---

#### TC-EM-006: Filter Employees by Advanced Criteria [P1]

**Acceptance Criteria**:
- ✅ Filter by EmploymentStatus (Active, OnLeave, Resigned)
- ✅ Filter by department/organizational unit
- ✅ Filters combine with AND logic
- ✅ Multiple filters applied simultaneously work correctly

**Edge Cases**:
- ❌ No filters applied → All company employees returned
- ❌ Conflicting filters → Empty result set

**Evidence**: `Employees/Queries/GetEmployeesByAdvancedFilter/GetEmployeesByAdvancedFilterQueryHandler.cs:19-120` | `Employees/Queries/GetEmployeesByAdvancedFilter/Models/GetEmployeesByAdvancedFilterQuery.cs`

---

#### TC-EM-007: Filter by Organizational Unit Hierarchy [P1]

**Acceptance Criteria**:
- ✅ Filtering by parent org unit returns employees from parent and all children
- ✅ Child unit employees included in parent filter results
- ✅ Organizational hierarchy respected

**Edge Cases**:
- ❌ Org unit with no employees → Empty result
- ❌ Deleted org unit → Employees still visible if in company

**Evidence**: `Employees/Queries/GetEmployeesByAdvancedFilter/GetEmployeesByAdvancedFilterQueryHandler.cs:19-120` | `Domain/ApplyPlatform/Repositories/Extensions/RepositoryExtensions.cs`

---

#### TC-EM-008: Pagination Works Correctly [P1]

**Acceptance Criteria**:
- ✅ Page size options: 10, 25, 50, 100
- ✅ Correct employee range returned (skip, take)
- ✅ Total count accurate
- ✅ hasNextPage indicator correct

**Edge Cases**:
- ❌ Page size exceeds total count → All employees returned on page 1
- ❌ Page index beyond available pages → Empty or last page returned

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Easy.Platform.Common.Cqrs.Queries`

---

#### TC-EM-009: Update Employee Profile Information [P1]

**Acceptance Criteria**:
- ✅ Position, LineManagerId, StartDate updated successfully
- ✅ EmployeeEntityEventBusMessage published with Updated action
- ✅ Audit trail records all changes
- ✅ Version number incremented

**Edge Cases**:
- ❌ Concurrent updates → Last write wins or optimistic lock error
- ❌ Invalid LineManagerId → Validation error

**Evidence**: `Employees/Commands` | `Common/Constants/ErrorMessage.cs:1-56`

---

#### TC-EM-010: Assign Line Manager with Validation [P1]

**Acceptance Criteria**:
- ✅ Valid manager from same company assigned
- ✅ LineManagerId set on employee
- ✅ Organizational hierarchy updated
- ✅ Manager found validation succeeds

**Edge Cases**:
- ❌ Manager not in same company → Validation error
- ❌ Manager ID is self → Circular hierarchy detected

**Evidence**: `Employees/Commands` | `Common/Constants/ErrorMessage.cs:1-56`

---

#### TC-EM-011: Prevent Circular Line Manager Assignment [P1]

**Acceptance Criteria**:
- ✅ System detects circular hierarchy (A manages B, B manages A)
- ✅ Validation error: "Circular hierarchy detected"
- ✅ Assignment rejected

**Edge Cases**:
- ❌ Deep circular chain (A→B→C→A) → Still detected

**Evidence**: `Employees/Commands` | `Employees/Commands`

---

#### TC-EM-012: Update Employment Status with Business Rules [P1]

**Acceptance Criteria**:
- ✅ Status changed from Active to Resigned
- ✅ TerminationDate set
- ✅ ResignationNotificationEventHandler triggers
- ✅ Employee access permissions revoked

**Edge Cases**:
- ❌ Same status assigned → No change event
- ❌ Invalid status value → Validation error

**Evidence**: `Employees/Commands` | `ApplyPlatform/UseCaseEvents`

---

### P2 - Medium Priority [6 Tests]

#### TC-EM-013: Filter by Multiple Survey Profile Completion [P2]

**Acceptance Criteria**:
- ✅ Filter for employees with Interests AND Motivation completed
- ✅ Employees with only Interests shown separately
- ✅ Employees missing either profile excluded

**Edge Cases**:
- ❌ No employees match criteria → Empty result

**Evidence**: `Employees/Queries/GetEmployeesByAdvancedFilter/GetEmployeesByAdvancedFilterQueryHandler.cs:19-120` | `ApplyPlatform/Helpers`

---

#### TC-EM-014: Filter by Custom Field Values [P2]

**Acceptance Criteria**:
- ✅ Filter employees by custom field "Department Code" = "DEV-001"
- ✅ Custom field value matched exactly
- ✅ Custom field types (Text, Dropdown, DateTime) supported

**Edge Cases**:
- ❌ Custom field deleted → Employees without value shown

**Evidence**: `Employees/Queries/GetEmployeesByAdvancedFilter/GetEmployeesByAdvancedFilterQueryHandler.cs:19-120` | `ApplyPlatform/Helpers`

---

#### TC-EM-015: Sort Employees by Multiple Columns [P2]

**Acceptance Criteria**:
- ✅ Sort by StartDate descending, then FullName ascending
- ✅ Multi-level sort applied in correct order
- ✅ Newest employees first, then alphabetical within same date

**Edge Cases**:
- ❌ No sort specified → Default sort by CreatedDate descending

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Domain/ApplyPlatform/Repositories/Extensions/RepositoryExtensions.cs`

---

#### TC-EM-016: View Employee with Related Data Loaded [P2]

**Acceptance Criteria**:
- ✅ All JobRecords loaded with employee detail
- ✅ All ContractRecords loaded
- ✅ CustomFieldValues populated
- ✅ Query includes loadRelatedEntities parameter

**Edge Cases**:
- ❌ No related entities exist → Empty collections returned

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Domain/ApplyPlatform/Repositories/Extensions/RepositoryExtensions.cs`

---

#### TC-EM-017: Email Uniqueness Validation Across Company [P2]

**Acceptance Criteria**:
- ✅ Existing email in company rejected
- ✅ Validation error: "Email already exists in company"
- ✅ Comparison case-insensitive

**Edge Cases**:
- ❌ Email exists in different company → Allowed

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `Employees/Commands`

---

#### TC-EM-018: Allow Same Email in Different Companies [P2]

**Acceptance Criteria**:
- ✅ Same email can exist in multiple companies
- ✅ Employees remain independent
- ✅ CompanyId filters isolate records

**Edge Cases**:
- ❌ Unique constraint on email without company → Error

**Evidence**: `Interfaces/Repositories/IEmployeeRepository.cs` | `Domain/AggregatesModel`

---

### P3 - Low Priority [4 Tests]

#### TC-EM-019: Handle Vietnamese Special Characters in Names [P3]

**Acceptance Criteria**:
- ✅ Name "Nguyễn Thị Hồng Nhung" correctly stored
- ✅ Search for "Nguyen" finds employee (diacritical normalization)
- ✅ No character encoding issues

**Edge Cases**:
- ❌ Mix of Vietnamese and English characters → Handled correctly

**Evidence**: `Employees/Commands` | `Services/SearchHelper.cs`

---

#### TC-EM-020: Handle Empty Employee List for New Company [P3]

**Acceptance Criteria**:
- ✅ Empty state message displayed
- ✅ "Invite employees" CTA visible
- ✅ No errors on empty list

**Edge Cases**:
- ❌ Transition from 1 to 0 employees → Empty state shown

**Evidence**: `Controllers/EmployeeController.cs:38-326` | `src/WebV2`

---

#### TC-EM-021: Handle Employee with All Optional Fields Null [P3]

**Acceptance Criteria**:
- ✅ Employee with only Email, FirstName, LastName created
- ✅ Detail page renders without errors
- ✅ Optional fields show appropriate placeholders

**Edge Cases**:
- ❌ Required field missing → Validation error

**Evidence**: `Employees/Commands` | `Domain/AggregatesModel`

---

#### TC-EM-022: Maximum Employees Per Company [P3]

**Acceptance Criteria**:
- ✅ If limit configured (e.g., 1000), error returned
- ✅ Upgrade prompt displayed
- ✅ License check enforced

**Edge Cases**:
- ❌ No limit configured → Unlimited employees allowed

**Evidence**: `Employees/Commands` | `Services/LicenseService.cs`

---

## Invitation Management Test Cases

### P0 - Critical [3 Tests]

#### TC-INV-001: Send Email Invitation Successfully [P0]

**Acceptance Criteria**:
- ✅ Valid email invitations create records
- ✅ Invitation emails queued for sending
- ✅ PendingInvitedEmployee records created
- ✅ Invitees appear in "Pending Invited" tab

**Edge Cases**:
- ❌ Empty email list → Validation error

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Controllers/InvitationController.cs`

---

#### TC-INV-002: Create URL Invitation with Expiration [P0]

**Acceptance Criteria**:
- ✅ Unique shareable URL generated
- ✅ URL valid until expiration date
- ✅ Anyone with URL can register
- ✅ Expiration enforced

**Edge Cases**:
- ❌ Expired URL → 404 or "Invitation expired" error

**Evidence**: `Invitations/Commands/CreateInvitationByUrl` | `Services/UrlGenerator.cs`

---

#### TC-INV-003: Invitation Completes Employee Creation Flow [P0]

**Acceptance Criteria**:
- ✅ User account created in Account.Service
- ✅ AccountUserSavedEventBusMessage published
- ✅ Employee.Service creates Employee via consumer
- ✅ Assigned profiles linked to employee

**Edge Cases**:
- ❌ Account creation fails → Transaction rolled back

**Evidence**: `ApplyPlatform/UseCaseEvents` | `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26`

---

### P1 - High Priority [7 Tests]

#### TC-INV-004: Email Validation for Invitation [P1]

**Acceptance Criteria**:
- ✅ Valid emails: valid@example.com accepted
- ✅ Invalid format rejected: "Invalid email format"
- ✅ Existing employee: "Already employee" warning
- ✅ Pending invite: "Already invited" warning

**Edge Cases**:
- ❌ Whitespace in email → Trimmed before validation

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Common/Constants/ErrorMessage.cs:1-56`

---

#### TC-INV-005: Custom Email Template with Placeholders [P1]

**Acceptance Criteria**:
- ✅ {CompanyName} replaced with actual company
- ✅ {InvitationUrl} replaced with registration link
- ✅ {RecipientName} replaced with invitee name
- ✅ HTML rendered correctly

**Edge Cases**:
- ❌ Missing placeholder → Left as-is or error

**Evidence**: `Services/NotificationService.cs` | `Services`

---

#### TC-INV-006: Send Retake Invitation to Existing Employees [P1]

**Acceptance Criteria**:
- ✅ John (both profiles complete) receives retake email for Motivation
- ✅ Jane (only Interests complete) receives retake email for Motivation
- ✅ IsRetake flag set to true
- ✅ Both emails sent successfully

**Edge Cases**:
- ❌ Employee with all profiles complete → Still receives retake

**Evidence**: `Invitations/Commands/CreateInvitationRetakeForEmployeeByEmail`

---

#### TC-INV-007: Send Profile Completion Reminder [P1]

**Acceptance Criteria**:
- ✅ Reminder email sent for incomplete profiles
- ✅ Email contains link to complete Interests profile
- ✅ Reminder logged in audit trail
- ✅ Notification service handles sending

**Edge Cases**:
- ❌ Email service down → Queued for retry

**Evidence**: `Invitations/Commands/RemindTakingProfileForCoaching` | `Services/NotificationService.cs`

---

#### TC-INV-008: Update URL Invitation Settings [P1]

**Acceptance Criteria**:
- ✅ ExpirationDate updated
- ✅ Profiles updated
- ✅ Existing URL still works
- ✅ New registrations get updated profiles

**Edge Cases**:
- ❌ Update to past date → Invitation expires immediately

**Evidence**: `Invitations/Commands`

---

#### TC-INV-009: Delete URL Invitation [P1]

**Acceptance Criteria**:
- ✅ Invitation marked as deleted
- ✅ URL returns 404 on access
- ✅ Pending registrations using URL fail
- ✅ Audit trail records deletion

**Edge Cases**:
- ❌ Delete non-existent invitation → 404 error

**Evidence**: `Invitations/Commands`

---

#### TC-INV-010: Profile-Based Invitation Permissions [P1]

**Acceptance Criteria**:
- ✅ HR with Interests, Motivation permissions invites successfully
- ✅ HR tries to invite with Performance360 (not allowed)
- ✅ Error: "Insufficient profile permissions"
- ✅ Invitation rejected

**Edge Cases**:
- ❌ Admin role → All profiles allowed

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Controllers/EmployeeController.cs:38-326`

---

### P2 - Medium Priority [5 Tests]

#### TC-INV-011: Bulk Invitation with Mixed Results [P2]

**Acceptance Criteria**:
- ✅ 80 valid emails → 80 invitations created
- ✅ 10 invalid format → Errors returned
- ✅ 10 already registered → Warnings returned
- ✅ Processing completes within 30 seconds

**Edge Cases**:
- ❌ All emails invalid → Zero invitations, all errors

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Invitations/Commands`

---

#### TC-INV-012: Invitation with Organizational Unit Assignment [P2]

**Acceptance Criteria**:
- ✅ Invitee assigned to "Engineering" org unit
- ✅ Employee inherits unit's default settings
- ✅ Employee appears in Engineering department

**Edge Cases**:
- ❌ Invalid org unit → Validation error

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Services/OrgUnitValidator.cs`

---

#### TC-INV-013: Expired URL Invitation Handling [P2]

**Acceptance Criteria**:
- ✅ Registration fails with "Invitation expired"
- ✅ User prompted to request new invitation
- ✅ Expiration date enforced server-side

**Edge Cases**:
- ❌ Timezone differences → UTC time used consistently

**Evidence**: `Services` | `Invitations/Commands`

---

#### TC-INV-014: Invitation Audit Trail [P2]

**Acceptance Criteria**:
- ✅ CreatedById set to current user
- ✅ CreatedDate set to current timestamp
- ✅ Queryable by audit filters
- ✅ Audit trail complete

**Edge Cases**:
- ❌ System user creates invitation → System ID logged

**Evidence**: `Domain/AggregatesModel` | `Domain/AggregatesModel`

---

#### TC-INV-015: Resend Invitation to Pending Invitee [P2]

**Acceptance Criteria**:
- ✅ New invitation email sent
- ✅ Invitation marked as resent
- ✅ Original invitation preserved
- ✅ Audit updated

**Edge Cases**:
- ❌ Already registered → Error "User already exists"

**Evidence**: `Invitations/Commands`

---

### P3 - Low Priority [3 Tests]

#### TC-INV-016: Handle Very Long Email Lists [P3]

**Acceptance Criteria**:
- ✅ 500 emails processed in batches
- ✅ Progress reported to user
- ✅ All 500 invitations created
- ✅ No timeout or memory issues

**Edge Cases**:
- ❌ 10,000 emails → Batch size respected

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Invitations/Commands`

---

#### TC-INV-017: Special Characters in Email Subject/Body [P3]

**Acceptance Criteria**:
- ✅ ACME™ Corp handled correctly
- ✅ Emoji 🎉 not corrupted
- ✅ Script tags sanitized: `<script>alert('xss')</script>` → HTML escaped
- ✅ XSS prevented

**Edge Cases**:
- ❌ RTL text (Arabic, Hebrew) → Displayed correctly

**Evidence**: `Services` | `Services`

---

#### TC-INV-018: Concurrent Invitation to Same Email [P3]

**Acceptance Criteria**:
- ✅ Only one invitation created
- ✅ Second attempt returns "Already invited" warning
- ✅ Concurrency handled via database constraint or lock

**Edge Cases**:
- ❌ Race condition → Handled gracefully

**Evidence**: `Invitations/Commands/CreateInvitationByEmail/CreateInvitationByEmailCommand.cs:9-26` | `Domain/AggregatesModel`

---

## Pending Employee Management Test Cases

### P0 - Critical [2 Tests]

#### TC-PE-001: View Pending Employees List [P0]

**Acceptance Criteria**:
- ✅ Pending employees listed with email, status, requested date
- ✅ All pending employees displayed
- ✅ Action buttons (Approve/Reject) visible
- ✅ Status column accurate

**Edge Cases**:
- ❌ No pending employees → Empty state message

**Evidence**: `Employees/Queries` | `Controllers`

---

#### TC-PE-002: Approve Pending Employee [P0]

**Acceptance Criteria**:
- ✅ Status changes to "Approved"
- ✅ New Employee record created
- ✅ Notification sent to employee
- ✅ EmployeeEntityEventBusMessage published

**Edge Cases**:
- ❌ Already processed → Error "Already processed"

**Evidence**: `Employees/Commands` | `ApplyPlatform/UseCaseEvents`

---

### P1 - High Priority [4 Tests]

#### TC-PE-003: Bulk Approve Multiple Pending Employees [P1]

**Acceptance Criteria**:
- ✅ All 10 selected approved
- ✅ 10 Employee records created
- ✅ 10 notification emails queued
- ✅ Bulk operation atomic

**Edge Cases**:
- ❌ One approval fails → Transaction rolled back or partial success handled

**Evidence**: `Employees/Commands` | `Easy.Platform.Domain.UnitOfWork`

---

#### TC-PE-004: Reject Pending Employee with Reason [P1]

**Acceptance Criteria**:
- ✅ Status changes to "Rejected"
- ✅ RejectedById and RejectedDate set
- ✅ Rejection reason included
- ✅ Rejection notification sent

**Edge Cases**:
- ❌ No reason provided → Field optional or required

**Evidence**: `Employees/Commands`

---

#### TC-PE-005: Search Pending Employees by Keyword [P1]

**Acceptance Criteria**:
- ✅ Search by email, first name, last name
- ✅ "john" returns john@test.com
- ✅ Case-insensitive matching
- ✅ Partial matches supported

**Edge Cases**:
- ❌ No matches → Empty result

**Evidence**: `Employees/Queries` | `Services/SearchHelper.cs`

---

#### TC-PE-006: Approve with Organizational Unit Assignment [P1]

**Acceptance Criteria**:
- ✅ Created Employee assigned to "Engineering"
- ✅ OrgUnitId set correctly
- ✅ Employee in department list
- ✅ Hierarchy respected

**Edge Cases**:
- ❌ Invalid org unit → Validation error

**Evidence**: `Employees/Commands` | `Services/OrgUnitValidator.cs`

---

### P2 - Medium Priority [3 Tests]

#### TC-PE-007: Filter Pending Employees by Date Range [P2]

**Acceptance Criteria**:
- ✅ RequestedDate between 2026-01-01 and 2026-01-31 returned
- ✅ Outside range excluded
- ✅ Date comparison accurate

**Edge Cases**:
- ❌ No employees in range → Empty result

**Evidence**: `Employees/Queries` | `Employees/Queries`

---

#### TC-PE-008: View Rejected Pending Employees History [P2]

**Acceptance Criteria**:
- ✅ Rejected employees visible when status = "Rejected"
- ✅ Rejection reason displayed
- ✅ Rejection date shown
- ✅ Audit trail complete

**Edge Cases**:
- ❌ No rejected employees → Empty state

**Evidence**: `Employees/Queries` | `Employees/Queries`

---

#### TC-PE-009: Prevent Approving Already Processed Employee [P2]

**Acceptance Criteria**:
- ✅ Already approved employee rejected
- ✅ Error: "Already processed"
- ✅ No duplicate Employee created
- ✅ Idempotent operation

**Edge Cases**:
- ❌ Concurrent approvals → Last write wins or error

**Evidence**: `Employees/Commands` | `Common/Constants/ErrorMessage.cs:1-56`

---

### P3 - Low Priority [2 Tests]

#### TC-PE-010: Handle Pending Employee with Deleted User Account [P3]

**Acceptance Criteria**:
- ✅ Approval fails gracefully
- ✅ Error: "User account not found"
- ✅ No incomplete Employee created
- ✅ Validation prevents orphaned records

**Edge Cases**:
- ❌ User restored before approval → Succeeds

**Evidence**: `Employees/Commands` | `Interfaces/Repositories`

---

#### TC-PE-011: Concurrent Approval by Multiple HR Users [P3]

**Acceptance Criteria**:
- ✅ Only one approval succeeds
- ✅ Second gets "Already processed" error
- ✅ Concurrency handled via optimistic lock or database constraint
- ✅ No duplicate Employee created

**Edge Cases**:
- ❌ Database constraint violation → Handled gracefully

**Evidence**: `Employees/Commands` | `Domain/AggregatesModel`

---

## JobRecord & ContractRecord Test Cases

### P0 - Critical [3 Tests]

#### TC-JR-001: Create New Job Record [P0]

**Acceptance Criteria**:
- ✅ Job record created with Position, StartDate, OrgUnitId
- ✅ Employee's current position updated
- ✅ JobRecordEntityEventBusMessage published
- ✅ Record persistent

**Edge Cases**:
- ❌ Missing Position → Validation error

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `Controllers/EmployeeController.cs:38-326`

---

#### TC-JR-002: Create New Job Record Auto-Closes Previous [P0]

**Acceptance Criteria**:
- ✅ Previous record EndDate set to start date - 1 day
- ✅ New record created
- ✅ Only one record has EndDate null
- ✅ Job history accurate

**Edge Cases**:
- ❌ No previous record → New record created normally

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `ApplyPlatform/UseCaseCommands`

---

#### TC-JR-003: Create New Contract Record [P0]

**Acceptance Criteria**:
- ✅ Contract record created with ContractType, StartDate, EndDate
- ✅ ContractRecordEntityEventBusMessage published
- ✅ Record persistent
- ✅ Duration calculated

**Edge Cases**:
- ❌ Missing ContractType → Validation error

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveContractRecordCommand.cs:17-115`

---

### P1 - High Priority [6 Tests]

#### TC-JR-004: Position is Required for Job Record [P1]

**Acceptance Criteria**:
- ✅ Creation without Position rejected
- ✅ Error: "Position is required"
- ✅ Validation prevents save

**Edge Cases**:
- ❌ Position whitespace only → Validation error

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185`

---

#### TC-JR-005: EndDate Must Be After StartDate [P1]

**Acceptance Criteria**:
- ✅ StartDate: 2026-06-01, EndDate: 2026-01-01 rejected
- ✅ Error: "EndDate must be greater than or equal to StartDate"
- ✅ Validation enforced

**Edge Cases**:
- ❌ Same date allowed (1-day employment)

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185`

---

#### TC-JR-006: Unique StartDate per User for Job Records [P1]

**Acceptance Criteria**:
- ✅ Employee can't have two records starting 2026-01-15
- ✅ Error: "StartDate must be unique per user"
- ✅ Uniqueness enforced per employee

**Edge Cases**:
- ❌ Different employees same date → Allowed

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185`

---

#### TC-JR-007: Update Existing Job Record [P1]

**Acceptance Criteria**:
- ✅ Position, Salary, OrgUnit updated
- ✅ Audit trail records changes
- ✅ Version number incremented
- ✅ Record persistent

**Edge Cases**:
- ❌ Concurrent updates → Last write wins

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `Domain/AggregatesModel`

---

#### TC-JR-008: Delete Job Record [P1] ← UPDATED

**Acceptance Criteria**:
- ✅ `DeleteJobRecordCommand` validates company authorization
- ✅ Cancels any scheduled Hangfire jobs (`ScheduledStartJobId`/`ScheduledEndJobId`) before deleting
- ✅ Determines if deleted record's org should be removed from Hierarchies (active records only)
- ✅ Syncs Hierarchies/TeamOrgUnit/Team via `EmployeeOrgUnitSyncService` after delete
- ✅ Reverse sync to Accounts via `SendReverseSyncToAccountsAsync`
- ✅ Cannot delete last effective org unit for an employee (validation error)

**Edge Cases**:
- ❌ Deleting non-existent record → "Job record not found or you are not authorized to delete it"
- ❌ Deleting last org unit → "This is the only organizational unit assigned to this employee. You cannot remove it."
- ❌ Deleting future record (StartDate > now) → allowed (no org unit impact)

**Evidence**: `ApplyPlatform/UseCaseCommands/DeleteJobRecordCommand.cs`

---

#### TC-JR-009: Prevent Overlapping Contract Records [P1]

**Acceptance Criteria**:
- ✅ Existing: 2026-01-01 to 2026-12-31
- ✅ Attempt overlapping: 2026-06-01 to 2027-06-01 rejected
- ✅ Error: "Contract periods cannot overlap"
- ✅ Overlap detection accurate

**Edge Cases**:
- ❌ Touching dates (one ends 12-31, next starts 01-01) → Allowed

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `ApplyPlatform/UseCaseCommands/SaveContractRecordCommand.cs:17-115`

---

### P2 - Medium Priority [4 Tests]

#### TC-JR-010: View Job Record History Timeline [P2]

**Acceptance Criteria**:
- ✅ All 5 job records displayed chronologically
- ✅ Current record (EndDate null) highlighted
- ✅ Position progression visible
- ✅ Timeline accurate

**Edge Cases**:
- ❌ No job records → Empty state

**Evidence**: `Employees/Queries/GetEmployee/GetEmployeeQuery.cs:17-158` | `Domain/AggregatesModel`

---

#### TC-JR-011: Contract Renewal Creates New Record [P2]

**Acceptance Criteria**:
- ✅ Active contract 2026-12-31 → renewal 2027-01-01 created
- ✅ Previous unchanged
- ✅ Contract history shows both
- ✅ No overlap

**Edge Cases**:
- ❌ Gap between contracts (gap day) → Allowed or not allowed per business rule

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveContractRecordCommand.cs:17-115` | No overlap validation

---

#### TC-JR-012: Department Transfer via New Job Record [P2]

**Acceptance Criteria**:
- ✅ Employee moves from Engineering to Design
- ✅ OrgUnitId updated
- ✅ Previous job closed
- ✅ DepartmentTransferEvent published

**Edge Cases**:
- ❌ Same org unit → No transfer

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `ApplyPlatform/UseCaseEvents/DepartmentTransferEventHandler.cs`

---

#### TC-JR-013: Early Contract Termination [P2]

**Acceptance Criteria**:
- ✅ Contract EndDate changed from 2026-12-31 to 2026-06-30
- ✅ Early termination reflected
- ✅ TerminationDate set on Employee if matching
- ✅ Events published

**Edge Cases**:
- ❌ Past date → Validation error

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveContractRecordCommand.cs:17-115` | Termination logic

---

### P3 - Low Priority [3 Tests]

#### TC-JR-014: Handle Job Record with All Optional Fields [P3]

**Acceptance Criteria**:
- ✅ Only Position and StartDate required
- ✅ Created with null Salary, Benefits, etc.
- ✅ Optional fields rendered as empty
- ✅ No errors on save

**Edge Cases**:
- ❌ All fields null → Invalid

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `Domain/AggregatesModel`

---

#### TC-JR-015: Historical Job Record Creation [P3]

**Acceptance Criteria**:
- ✅ Job record created with StartDate 2020-01-01 (past)
- ✅ Historical data preserved
- ✅ Auto-close logic not applied to future records
- ✅ Timeline integrity maintained

**Edge Cases**:
- ❌ Future job records unaffected

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveJobRecordCommand.cs:20-185` | `Domain/AggregatesModel`

---

#### TC-JR-016: Contract with Same Start and End Date [P3]

**Acceptance Criteria**:
- ✅ StartDate: 2026-01-01, EndDate: 2026-01-01 created
- ✅ Valid edge case (1-day contract)
- ✅ Duration calculated as 1 day
- ✅ Validation allows equality

**Edge Cases**:
- ❌ EndDate before StartDate → Error

**Evidence**: `Common/Constants/ErrorMessage.cs:1-56` | `ApplyPlatform/UseCaseCommands/SaveContractRecordCommand.cs:17-115`

---

#### TC-JR-017: Delete Job Record Authorization & Last Org Prevention [P1] ← UPDATED

**Acceptance Criteria**:
- ✅ Delete validates `record.CompanyId == RequestContext.CurrentCompanyId()`
- ✅ Unauthorized delete attempt returns validation error
- ✅ Cross-company record access denied
- ✅ Last effective org unit cannot be deleted (`JobRecordPeriodEvaluator.IsLastEffectiveOrgUnit`)
- ✅ Scheduled Hangfire jobs cancelled before deletion
- ✅ Direct org unit sync after delete (not via entity event handler)
- ✅ Reverse sync to Accounts via `SendReverseSyncToAccountsAsync`

**Edge Cases**:
- ❌ Non-existent record → "Job record not found or you are not authorized to delete it"
- ❌ Last org unit → "This is the only organizational unit assigned to this employee. You cannot remove it."
- ❌ Delete expired record → allowed, no org unit removal from Hierarchies

**Evidence**: `ApplyPlatform/UseCaseCommands/DeleteJobRecordCommand.cs`

---

#### TC-JR-018: Bi-directional Org Unit Sync on Job Record Save [P1] ← NEW

**Acceptance Criteria**:
- ✅ Save triggers SyncEmployeeJobRecordSavedEntityEventHandler (consolidated handler)
- ✅ Active org units synced to Employee.Hierarchies, TeamOrgUnit, and Team custom fields
- ✅ AccountAddUsersToOrgsRequestBusMessage sent with SourceSystem=PolicyIds.BravoTALENTS (shared constant)
- ✅ Delete of active record sends AccountRemoveUsersFromOrgsRequestBusMessage
- ✅ Manual hierarchy assignments preserved (not managed by JobRecords)
- ✅ `dismissSendEvent: true` prevents cascades on bulk/consumer operations
- ✅ `SendReverseSyncToAccountsAsync` called explicitly after sync (not inside sync method)

**Edge Cases**:
- ❌ Future-dated job record (StartDate > today) → org not synced until period starts

**Evidence**: `UseCaseEvents/SyncEmployeeJobRecordSavedEntityEventHandler.cs` | `Services/EmployeeOrgUnitSyncService.cs`

---

#### TC-JR-019: Parallel DB Queries in GetJobRecords [P1] ← NEW

**Acceptance Criteria**:
- ✅ GetJobRecordsQuery executes count, page, and template queries in parallel
- ✅ Result identical to sequential execution
- ✅ Performance improvement for large datasets

**Edge Cases**:
- ❌ One query fails → entire request fails (consistent error handling)

**Evidence**: `ApplyPlatform/UseCaseQueries/GetJobRecordsQuery.cs`

---

## CareerRecord Test Cases ← NEW

### P0 - Critical [3 Tests]

#### TC-CR-001: Create New Career Record [P0]

**Acceptance Criteria**:
- ✅ Career record created with Position, Level, SubLevel, StartDate
- ✅ Employee.Position updated to latest active career record's Position
- ✅ Custom fields (CareerPosition, CareerLevel, SubLevel) synced to employee
- ✅ CareerRecord persisted in MongoDB with compound index

**Edge Cases**:
- ❌ Missing Position → Validation error

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveCareerRecordCommand.cs` | `UseCaseEvents/UpdateEmployeePositionOnCareerRecordSavedEntityEventHandler.cs`

---

#### TC-CR-002: Create Career Record Auto-Closes Previous [P0]

**Acceptance Criteria**:
- ✅ Previous career record EndDate set to (newStartDate - 1 day)
- ✅ New record created with EndDate = null
- ✅ Only one record has EndDate null per employee
- ✅ Career history timeline accurate

**Edge Cases**:
- ❌ Same-day start → Previous EndDate = new StartDate (end of day)
- ❌ No previous record → New record created normally

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveCareerRecordCommand.cs` | `Extensions/EmployeeRepositoryExtensions.cs:RecalculateLatestCurrentRecordEndDate()`

---

#### TC-CR-003: Delete Career Record with Authorization [P0]

**Acceptance Criteria**:
- ✅ Delete validates record.CompanyId matches context CompanyId
- ✅ Employee.Position recalculated from remaining records
- ✅ Unauthorized delete returns validation error
- ✅ UpdateEmployeePositionOnCareerRecordSaved triggers on delete

**Edge Cases**:
- ❌ Delete last career record → Employee.Position set to null
- ❌ Non-existent record → 404 error

**Evidence**: `ApplyPlatform/UseCaseCommands/DeleteCareerRecordCommand.cs`

---

### P1 - High Priority [5 Tests]

#### TC-CR-004: Position is Required for Career Record [P1]

**Acceptance Criteria**:
- ✅ Creation without Position rejected
- ✅ Validation error returned
- ✅ Empty/whitespace Position rejected

**Evidence**: `CareerRecord.cs:ValidatePosition()`

---

#### TC-CR-005: Date Overlap Prevention for Career Records [P1]

**Acceptance Criteria**:
- ✅ Overlapping date range rejected by ValidateDateRangeRecordCommand
- ✅ Frontend checks overlap before save (async validation)
- ✅ Backend enforces overlap check in SaveCareerRecordCommand
- ✅ Self-overlap excluded (editing existing record)

**Edge Cases**:
- ❌ Adjacent dates (one ends 12-31, next starts 01-01) → Allowed

**Evidence**: `ApplyPlatform/UseCaseCommands/ValidateDateRangeRecordCommand.cs` | `EntityRecord.cs:HasOverlapEachOtherAsync()`

---

#### TC-CR-006: Career Record DTO Label Resolution [P1]

**Acceptance Criteria**:
- ✅ PositionLabel resolved from CompanyClassFieldTemplate dropdown
- ✅ LevelLabel resolved from template dropdown
- ✅ Missing option falls back to DropdownValueHelper.ExtractLabelFromValue()
- ✅ Labels localized to requested language

**Edge Cases**:
- ❌ Template not found → Raw value displayed
- ❌ Value "1_admin-officer" → Label "admin officer"

**Evidence**: `ApplyPlatform/EntityDtos/CareerRecordDto.cs:Create()` | `Helpers/DropdownValueHelper.cs`

---

#### TC-CR-007: Career Record Custom Fields Support [P1]

**Acceptance Criteria**:
- ✅ Custom fields from CAREER_INFO group displayed in form
- ✅ Standard fields (position, level, subLevel) excluded from custom fields
- ✅ Custom field values saved and loaded correctly
- ✅ Dropdown "add item" works for custom field dropdowns

**Evidence**: `CustomFieldFormDialogBase.getCustomFields()` | `CareerFormDialogComponent`

---

#### TC-CR-008: Career Record Feature Gate [P1]

**Acceptance Criteria**:
- ✅ Career tab hidden if EmployeeRecordLicense missing
- ✅ Career tab hidden if CAREER_INFO field group not configured
- ✅ Both conditions required for visibility
- ✅ Template hasCareerFeature() method used for check

**Evidence**: `employee-detail-container.component.ts:hasCareerFeature` | `employee-settings.model.ts:hasCareerFeature()`

---

### P2 - Medium Priority [3 Tests]

#### TC-CR-009: View Career Record History Timeline [P2]

**Acceptance Criteria**:
- ✅ Career records displayed in descending order (newest first)
- ✅ Period column shows formatted date range
- ✅ Position and Level columns show resolved labels
- ✅ Pagination with 5 records per page
- ✅ Dates formatted via `moment.js` in TypeScript (no `DatePipe` in template)
- ✅ Career dates use UTC-only display (no `.local()` conversion — day-only values)
- ✅ Dynamic `momentDateFormat` derived from user's configured `dateFormat` via `AppBaseComponent`

**Evidence**: `career-record-management.component.ts` (extends `AppBaseComponent`, uses `momentDateFormat`)

---

#### TC-CR-010: Update Existing Career Record [P2]

**Acceptance Criteria**:
- ✅ Existing record loaded in edit mode
- ✅ Changes persisted correctly
- ✅ Employee.Position recalculated if active record modified
- ✅ Audit fields (LastUpdatedBy, LastUpdatedDate) updated

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveCareerRecordCommand.cs`

---

#### TC-CR-011: Career Record View Mode [P2]

**Acceptance Criteria**:
- ✅ View mode displays all fields as read-only
- ✅ Custom fields displayed in view mode
- ✅ No save button in view mode
- ✅ Accessible from table row click

**Evidence**: `career-form-dialog.component.ts` | `CustomFieldFormDialogBase`

---

### P3 - Low Priority [2 Tests]

#### TC-CR-012: Career Record with All Optional Fields Null [P3]

**Acceptance Criteria**:
- ✅ Only Position and StartDate required
- ✅ Level, SubLevel, Comment, EndDate, CustomFields all null → valid
- ✅ Saved and displayed correctly

**Evidence**: `CareerRecord.cs` validation rules

---

#### TC-CR-013: Career Record Index Migration [P3]

**Acceptance Criteria**:
- ✅ Compound index created on (UserId, CompanyId, StartDate, EndDate)
- ✅ Migration scoped to DB init before 2026-03-31
- ✅ Existing collections get indexes via EnsureCareerRecordCollectionIndexesAsync

**Evidence**: `20260223000000_EnsureCareerRecordCollectionIndexes.cs` | `EmployeeDbContext.cs`

---

## SalaryRecord Test Cases ← NEW

### P0 - Critical [2 Tests]

#### TC-SR-001: Create New Salary Record [P0]

**Acceptance Criteria**:
- ✅ Salary record created with PayRate, InsuranceSalary, StartDate
- ✅ Custom fields from SALARY_INFO group supported
- ✅ Record persisted with CompanyId context

**Edge Cases**:
- ❌ Missing required fields → Validation error

**Evidence**: `ApplyPlatform/UseCaseCommands/SaveSalaryRecordCommand.cs`

---

#### TC-SR-002: Salary Record Date Overlap Prevention [P0]

**Acceptance Criteria**:
- ✅ Overlapping salary periods rejected
- ✅ Frontend validates via POST /record/date-range/validate
- ✅ Backend enforces in SaveSalaryRecordCommand

**Evidence**: `ApplyPlatform/UseCaseCommands/ValidateDateRangeRecordCommand.cs`

---

### P1 - High Priority [3 Tests]

#### TC-SR-003: Update Existing Salary Record [P1]

**Acceptance Criteria**:
- ✅ Existing record loaded and modified
- ✅ Changes persisted correctly
- ✅ Custom fields updated

**Evidence**: `salary-form-dialog.component.ts` | `SaveSalaryRecordCommand.cs`

---

#### TC-SR-004: Delete Salary Record [P1]

**Acceptance Criteria**:
- ✅ Record deleted successfully
- ✅ Deletion event published

**Evidence**: `salary-record-management.component.ts`

---

#### TC-SR-005: Salary Record Custom Fields [P1]

**Acceptance Criteria**:
- ✅ Custom fields from SALARY_INFO group displayed
- ✅ Standard fields excluded from custom section
- ✅ Dropdown "add item" for custom dropdowns
- ✅ Values saved and restored correctly

**Evidence**: `SalaryFormDialogComponent` | `CustomFieldFormDialogBase`

---

### P2 - Medium Priority [2 Tests]

#### TC-SR-006: Salary Record View Mode [P2]

**Acceptance Criteria**:
- ✅ View mode read-only
- ✅ Custom fields displayed
- ✅ No save actions available

**Evidence**: `salary-form-dialog.component.ts`

---

#### TC-SR-007: Salary Record Pagination & Date Display [P2]

**Acceptance Criteria**:
- ✅ Records paginated (5 per page)
- ✅ Sort by StartDate descending
- ✅ Total items count accurate
- ✅ Dates use dynamic `momentDateFormat` (not hardcoded `MM/DD/YYYY`)
- ✅ Period template renders pre-formatted date strings (no `DatePipe` in template)

**Evidence**: `salary-record-management.component.ts` (uses `momentDateFormat` from `AppBaseComponent`)

---

### P3 - Low Priority [1 Test]

#### TC-SR-008: Salary Record with Zero Values [P3]

**Acceptance Criteria**:
- ✅ PayRate = 0 allowed (valid zero salary)
- ✅ InsuranceSalary = 0 allowed
- ✅ Null values vs zero distinguished

**Evidence**: `SalaryRecord.cs` domain model

---

## Import/Export Test Cases

### P0 - Critical [2 Tests]

#### TC-IMP-001: Import Employees from CSV Successfully [P0]

**Acceptance Criteria**:
- ✅ CSV with Email, FirstName, LastName, Position imported
- ✅ Both employees created
- ✅ Success count = 2, error count = 0
- ✅ Processing atomic (all succeed or all fail)

**Edge Cases**:
- ❌ Empty CSV → Validation error

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-002: Import Hired Candidates as Employees [P0]

**Acceptance Criteria**:
- ✅ Hired candidate data preserved (Email, Name, SurveyData)
- ✅ Employee records created
- ✅ CandidateHiredImportedEventBusMessage published
- ✅ Candidate reference maintained

**Edge Cases**:
- ❌ Candidate already imported → Duplicate prevention

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

### P1 - High Priority [5 Tests]

#### TC-IMP-003: CSV Import with Validation Errors [P1]

**Acceptance Criteria**:
- ✅ Row 1: invalid-email → "Invalid email format" error
- ✅ Row 2: missing email → "Email is required" error
- ✅ Row 4: duplicate email → "Duplicate email in file" error
- ✅ No employees created (all-or-nothing)

**Edge Cases**:
- ❌ Partial success allowed → Some import, some fail

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-004: CSV File Size Validation [P1]

**Acceptance Criteria**:
- ✅ File >1024KB rejected
- ✅ Error: "File size exceeds 1024KB limit"
- ✅ Size check before processing
- ✅ Server-side validation

**Edge Cases**:
- ❌ Exactly 1024KB → Allowed or rejected

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-005: Support TSV Format Import [P1]

**Acceptance Criteria**:
- ✅ Tab-separated values parsed correctly
- ✅ Employee created from TSV data
- ✅ Same validation rules applied
- ✅ Both CSV and TSV supported

**Edge Cases**:
- ❌ Mixed CSV and TSV → Format detection

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-006: Import with Organizational Unit Validation [P1]

**Acceptance Criteria**:
- ✅ John with valid OrgUnit "Engineering" created
- ✅ Jane with invalid "InvalidDept" fails with "Invalid organizational unit"
- ✅ Valid rows succeed, invalid fail
- ✅ OrgUnit validated against existing units

**Edge Cases**:
- ❌ Org unit case-sensitive or not

**Evidence**: `Employees/Commands/ImportEmployees` | `Services/OrgUnitValidator.cs`

---

#### TC-IMP-007: Export Employee Report with Filters [P1]

**Acceptance Criteria**:
- ✅ Filter by OrgUnitId, EmploymentStatus, Language
- ✅ Only matching employees exported
- ✅ Report in English
- ✅ Completion within 30 seconds

**Edge Cases**:
- ❌ No matching employees → Empty report

**Evidence**: `Employees/Commands` | `Services`

---

### P2 - Medium Priority [4 Tests]

#### TC-IMP-008: Import with Custom Field Mapping [P2]

**Acceptance Criteria**:
- ✅ Custom field columns (EmployeeCode, HireDate) recognized
- ✅ Employee created with custom field values
- ✅ CustomFieldValues populated
- ✅ Field name to ID mapping correct

**Edge Cases**:
- ❌ Unknown custom field column → Ignored or error

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-009: Handle Duplicate Emails with Existing Employees [P2]

**Acceptance Criteria**:
- ✅ "Skip duplicates" option: row skipped
- ✅ Existing employee unchanged
- ✅ Skip reported in results
- ✅ Import continues with non-duplicates

**Edge Cases**:
- ❌ Override duplicates → Update existing employee

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-010: Export All Fields Including Custom Fields [P2]

**Acceptance Criteria**:
- ✅ Standard fields (Email, FirstName, etc.) included
- ✅ Custom field values included
- ✅ Column names match field templates
- ✅ Export complete with all data

**Edge Cases**:
- ❌ Some custom fields null → Empty column values

**Evidence**: `Employees/Commands` | `Services`

---

#### TC-IMP-011: Export Import Errors for Correction [P2]

**Acceptance Criteria**:
- ✅ Failed rows included in error report
- ✅ Error messages per row
- ✅ File format editable
- ✅ HR can correct and re-upload

**Edge Cases**:
- ❌ No errors → No error report generated

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

### P3 - Low Priority [3 Tests]

#### TC-IMP-012: Import Empty CSV File [P3]

**Acceptance Criteria**:
- ✅ Headers only, no data → "No data rows found" error
- ✅ Import rejected
- ✅ Validation before processing

**Edge Cases**:
- ❌ File with just newlines → Treated as empty

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-013: Import CSV with Extra Columns [P3]

**Acceptance Criteria**:
- ✅ CSV with unknown column "UnknownField" → Employee created
- ✅ Unknown columns ignored
- ✅ Known columns processed
- ✅ No errors for extra columns

**Edge Cases**:
- ❌ Extra columns cause parsing error

**Evidence**: `Employees/Commands/ImportEmployees` | `Services`

---

#### TC-IMP-014: Export with No Matching Employees [P3]

**Acceptance Criteria**:
- ✅ Empty report generated
- ✅ Appropriate message displayed
- ✅ No error thrown
- ✅ File still downloadable

**Edge Cases**:
- ❌ Report not generated

**Evidence**: `Commands/ExportEmployeeReportCommand.cs` | Empty result handling

---

## Custom Fields Test Cases

### P0 - Critical [1 Test]

#### TC-CF-001: Create Custom Field Template [P0]

**Acceptance Criteria**:
- ✅ Field template "Employee Code" of type "Text" created
- ✅ IsRequired = true enforced
- ✅ EntityClass = Employee set correctly
- ✅ SettingCompanyClassFieldTemplateEntityEventBusMessage published

**Edge Cases**:
- ❌ Missing field name → Validation error

**Evidence**: `Commands/CreateCustomFieldTemplateCommand.cs` | Event publishing

---

### P1 - High Priority [4 Tests]

#### TC-CF-002: Create Custom Field with Different Types [P1]

**Acceptance Criteria**:
- ✅ Text type field created
- ✅ Dropdown type field created
- ✅ DateTime type field created
- ✅ Numeric type field created
- ✅ UploadFile type field created

**Edge Cases**:
- ❌ Unknown type → Validation error

**Evidence**: `Commands/CreateCustomFieldTemplateCommand.cs` | Type validation

---

#### TC-CF-003: Create Dropdown Field with Options [P1]

**Acceptance Criteria**:
- ✅ "Department Type" dropdown created
- ✅ Options: IT, HR, Finance, Marketing available
- ✅ Selection dropdown populated
- ✅ Options persistent

**Edge Cases**:
- ❌ No options provided → Empty dropdown

**Evidence**: `Commands/CreateCustomFieldTemplateCommand.cs` | Dropdown options

---

#### TC-CF-004: Set Custom Field Value for Employee [P1]

**Acceptance Criteria**:
- ✅ CustomFieldValue "EMP001" created for John Doe
- ✅ Linked to correct field template
- ✅ Linked to correct employee
- ✅ Value persistent

**Edge Cases**:
- ❌ Field not found → Error

**Evidence**: `Commands/SetCustomFieldValueCommand.cs` | Value creation

---

#### TC-CF-005: Validate Required Custom Field [P1]

**Acceptance Criteria**:
- ✅ Employee saved without required "Employee Code" → validation fails
- ✅ Error: "Employee Code is required"
- ✅ Save prevented
- ✅ Validation enforced

**Edge Cases**:
- ❌ Optional field → No validation required

**Evidence**: `Common/Constants/ErrorMessage.cs` | `SaveEmployeeCommand.cs`

---

### P2 - Medium Priority [3 Tests]

#### TC-CF-006: Custom Field Template Syncs Across Services [P2]

**Acceptance Criteria**:
- ✅ Setting.Service publishes template
- ✅ Employee.Service receives and creates local template
- ✅ bravoGROWTH receives and creates template
- ✅ IDs consistent across services

**Edge Cases**:
- ❌ Service unavailable → Message queued for retry

**Evidence**: `Consumers/SettingCompanyClassFieldTemplateEntityEventBusConsumer.cs`

---

#### TC-CF-007: Update Custom Field Template [P2]

**Acceptance Criteria**:
- ✅ Field name updated: "Employee Code" → "Employee ID"
- ✅ IsRequired changed: true → false
- ✅ Update synced to all services
- ✅ Existing values preserved

**Edge Cases**:
- ❌ Delete field → Values become orphaned

**Evidence**: `Commands/UpdateCustomFieldTemplateCommand.cs` | Update sync

---

#### TC-CF-008: Filter Employees by Custom Field Value [P2]

**Acceptance Criteria**:
- ✅ Filter: "Department Type" = "IT" → John Doe returned
- ✅ Jane Smith excluded (HR)
- ✅ Filter applied via advanced filter
- ✅ Results accurate

**Edge Cases**:
- ❌ Field not indexed → Slower filtering

**Evidence**: `Queries/GetEmployeesByAdvancedFilterQueryHandler.cs` | Custom field filter

---

### P3 - Low Priority [2 Tests]

#### TC-CF-009: Delete Custom Field Template [P3]

**Acceptance Criteria**:
- ✅ Template soft-deleted (IsDeleted = true)
- ✅ Existing values preserved (orphaned)
- ✅ Field not in forms
- ✅ Audit trail recorded

**Edge Cases**:
- ❌ Field has no values → Still soft-deleted

**Evidence**: `Commands/DeleteCustomFieldTemplateCommand.cs` | Soft-delete

---

#### TC-CF-010: Maximum Custom Fields Per Company [P3]

**Acceptance Criteria**:
- ✅ Company has 50 custom fields (if limit exists)
- ✅ Attempt to create 51st field → Error
- ✅ Limit enforced
- ✅ License check applied

**Edge Cases**:
- ❌ No limit configured → Unlimited fields

**Evidence**: `Commands/CreateCustomFieldTemplateCommand.cs` | License validation

---

## Cross-Service Integration Test Cases

### P0 - Critical [3 Tests]

#### TC-XS-001: Employee Creation Publishes to Message Bus [P0]

**Acceptance Criteria**:
- ✅ EmployeeEntityEventBusMessage published
- ✅ CrudAction = Created
- ✅ EntityId = employee ID
- ✅ Routed to RabbitMQ exchange

**Edge Cases**:
- ❌ Message bus down → Message queued for retry

**Evidence**: `ApplyPlatform/EntityDtos/EmployeeEntityDto.cs` | Message publishing

---

#### TC-XS-002: AccountUser Message Creates Invitation Automatically [P0]

**Acceptance Criteria**:
- ✅ AccountUserSavedEventBusMessage received
- ✅ AutoCreateInvitationOnAccountUserSavedEventBusConsumer processes
- ✅ New Invitation created
- ✅ Employee created via invitation flow

**Edge Cases**:
- ❌ AutoCreateInvitation disabled → No automatic creation

**Evidence**: `Consumers/AutoCreateInvitationOnAccountUserSavedEventBusConsumer.cs`

---

#### TC-XS-003: Employee Syncs to Dependent Services [P0]

**Acceptance Criteria**:
- ✅ bravoGROWTH receives and upserts Employee
- ✅ bravoSURVEYS receives and syncs
- ✅ Candidate.Service receives for matching
- ✅ All fields synced: Id, Email, FullName, CompanyId

**Edge Cases**:
- ❌ Service temporarily unavailable → Retry applied

**Evidence**: `Consumers/GrowthEmployeeEntityEventBusConsumer.cs` | Consumer pattern

---

### P1 - High Priority [5 Tests]

#### TC-XS-004: Employee Update Propagates to Dependent Services [P1]

**Acceptance Criteria**:
- ✅ Employee updated in Employee.Service
- ✅ Update message published
- ✅ Dependent services update their records
- ✅ LastMessageSyncDate updated

**Edge Cases**:
- ❌ Older message arrives after newer → Skipped based on timestamp

**Evidence**: `Consumers/GrowthEmployeeEntityEventBusConsumer.cs` | Update handling

---

#### TC-XS-005: Employee Deletion Cascades Correctly [P1]

**Acceptance Criteria**:
- ✅ Employee soft-deleted in Employee.Service
- ✅ Delete message published
- ✅ Dependent services mark records as deleted
- ✅ Related data handled per service rules

**Edge Cases**:
- ❌ Service doesn't support deletion → Data orphaned

**Evidence**: `Consumers/GrowthEmployeeEntityEventBusConsumer.cs` | Delete handling

---

#### TC-XS-006: Message Ordering Is Respected [P1]

**Acceptance Criteria**:
- ✅ msg-2 (newer, 10:00:01Z) arrives before msg-1 (older, 10:00:00Z)
- ✅ msg-2 processed (newer timestamp)
- ✅ msg-1 skipped (older than LastMessageSyncDate)
- ✅ Eventual consistency maintained

**Edge Cases**:
- ❌ Same timestamp → Last processed wins

**Evidence**: `Consumers/GrowthEmployeeEntityEventBusConsumer.cs` | Timestamp logic

---

#### TC-XS-007: Hired Candidate Imports via Message Bus [P1]

**Acceptance Criteria**:
- ✅ CandidateNewCandidateHiredEventBusMessageConsumer receives message
- ✅ HiredCandidate record created
- ✅ Candidate data preserved for import
- ✅ Available for import workflow

**Edge Cases**:
- ❌ Candidate already imported → Duplicate prevention

**Evidence**: `Consumers/CandidateNewCandidateHiredEventBusMessageConsumer.cs`

---

#### TC-XS-008: Organizational Unit Sync [P1]

**Acceptance Criteria**:
- ✅ AccountOrganizationalCrudEventBusConsumer receives OrgUnit message
- ✅ OrgUnit synced to Employee.Service
- ✅ Employee assignments remain valid
- ✅ Hierarchy preserved

**Edge Cases**:
- ❌ Org unit deleted → Employees reassigned or orphaned

**Evidence**: `Consumers/AccountOrganizationalCrudEventBusConsumer.cs`

---

### P2 - Medium Priority [3 Tests]

#### TC-XS-009: Message Processing with Dependency Wait [P2]

**Acceptance Criteria**:
- ✅ Employee message requires Company to exist first
- ✅ Consumer waits via TryWaitUntilAsync (max 300 seconds)
- ✅ After Company created, Employee processed
- ✅ Dependency satisfied

**Edge Cases**:
- ❌ Dependency never created → Timeout after 300 seconds

**Evidence**: `Consumers/EmployeeEntityEventBusConsumer.cs` | TryWaitUntilAsync pattern

---

#### TC-XS-010: Duplicate Message Handling [P2]

**Acceptance Criteria**:
- ✅ Employee "emp-001" already synced
- ✅ Same message received again → Processed idempotently
- ✅ No duplicate created
- ✅ LastMessageSyncDate prevents duplicate

**Edge Cases**:
- ❌ Message ID different but data same → Duplicate created

**Evidence**: `Consumers/EmployeeEntityEventBusConsumer.cs` | Idempotency check

---

#### TC-XS-011: Partial Sync Failure Handling [P2]

**Acceptance Criteria**:
- ✅ 5 services should receive message
- ✅ 1 service fails → Retries per RabbitMQ policy
- ✅ Other 4 services have consistent data
- ✅ Failed processing logged

**Edge Cases**:
- ❌ Multiple services fail → Coordination needed

**Evidence**: `Consumers/EmployeeEntityEventBusConsumer.cs` | Error handling

---

### P3 - Low Priority [2 Tests]

#### TC-XS-012: Handle Orphaned Employee in Dependent Service [P3]

**Acceptance Criteria**:
- ✅ Employee synced to bravoGROWTH
- ✅ Delete message fails to deliver
- ✅ Orphaned record detectable
- ✅ Cleanup job handles orphans

**Edge Cases**:
- ❌ Orphan detection missing → Data inconsistency

**Evidence**: `BackgroundJobs/CleanupOrphanedRecordsBackgroundJob.cs`

---

#### TC-XS-013: Service Restart Message Recovery [P3]

**Acceptance Criteria**:
- ✅ Unprocessed messages in RabbitMQ queue
- ✅ Employee.Service restarts
- ✅ Unacknowledged messages redelivered
- ✅ Processing resumes correctly

**Edge Cases**:
- ❌ Messages lost → No recovery possible

**Evidence**: `RabbitMQ configuration` | Message acknowledgment

---

#### TC-XS-030: Employee Status Update Triggers IsActive Sync [P1]

**Objective**: Verify employee status changes propagate IsActive to Accounts

**Preconditions**:
- Employee exists with Status = Active

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Update employee Status to Resigned | Status saved successfully |
| 2 | Verify UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler triggered | Handler executed |
| 3 | Verify AccountUpsertUserCompanyInfoRequestBusMessage sent | Message sent with IsActive=false |
| 4 | Verify Accounts receives message | UserCompanyInfo.IsActive updated to false |
| 5 | Verify AccountUserSavedEventBusMessage broadcast | bravoSURVEYS syncs UserCompany.IsActive=false |

**BDD Format**:
**GIVEN** employee with Status = Active
**WHEN** updating Status to Resigned
**THEN** UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler sends AccountUpsertUserCompanyInfoRequestBusMessage with IsActive=false

**Evidence**: `UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler.cs:44-58`

---

#### TC-XS-031: GetActiveEmploymentEmployeeEmails Filters Correctly [P1]

**Objective**: Verify service method filters non-active employees

**Preconditions**:
- 5 employees: 3 Active, 2 Resigned

**Test Steps**:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call GetActiveEmploymentEmployeeEmails with all 5 emails | Returns only 3 active emails |
| 2 | Verify Resigned employees excluded | 2 emails excluded |

**BDD Format**:
**GIVEN** 5 employees: 3 Active, 2 Resigned
**WHEN** calling GetActiveEmploymentEmployeeEmails with all emails
**THEN** returns only 3 active employee emails

**Evidence**: `EmployeeService.cs:21-35`

---

#### TC-XS-032: Bi-directional Org Unit Sync with Loop Prevention [P1] ← NEW

**Acceptance Criteria**:
- ✅ JobRecord save sends AccountAddUsersToOrgsRequestBusMessage with SourceSystem=`PolicyIds.BravoTALENTS` (shared constant)
- ✅ AccountUserSavedEventBusConsumer skips when SourceSystem==`PolicyIds.BravoTALENTS`
- ✅ No infinite sync loop created
- ✅ Forward sync (Employee → Accounts) works independently
- ✅ Reverse sync (Accounts → Employee) works independently

**Edge Cases**:
- ❌ SourceSystem null → Consumer processes normally (only `PolicyIds.BravoTALENTS` skipped)

**Evidence**: `Services/EmployeeOrgUnitSyncService.cs` | `MessageBus/Consumers/AccountUserSavedEventBusConsumer.cs`

---

#### TC-XS-033: JobRecordTransitionBackgroundJob Period Transitions [P1] ← UPDATED

**Acceptance Criteria**:
- ✅ Scheduled at exact StartDate/EndDate by `SaveJobRecordCommand` (queue-based, not cron)
- ✅ Job ID stored in `JobRecord.ScheduledStartJobId` / `ScheduledEndJobId` for cancellation
- ✅ On trigger: verifies transition still valid (date not changed after scheduling)
- ✅ Syncs org units via `EmployeeOrgUnitSyncService` + reverse sync to Accounts
- ✅ Clears scheduled job ID from record after completion
- ✅ Cancelled when dates change (`CancelExistingScheduledJobsIfDateChangedAsync`) or record deleted

**Edge Cases**:
- ❌ JobRecord not found (deleted between scheduling and execution) → logs warning, skips
- ❌ Employee not found → logs warning, skips
- ❌ Date changed after scheduling → transition skipped (staleness check)

**Evidence**: `ApplyPlatform/BackgroundJob/JobRecordTransitionBackgroundJob.cs`

---

#### TC-XS-034: JobRecord Auto-Sync from Accounts Hierarchy Changes [P1] ← NEW

**Acceptance Criteria**:
- ✅ Accounts adds user to org → JobRecord auto-created with StartDate=changeDate
- ✅ Accounts removes user from org → Active JobRecord EndDate set to removalDate
- ✅ Idempotency: duplicate add for same org+date → no duplicate record (Bug #2 fix)
- ✅ Same-day reopen: record ended today → reopened instead of creating new (Bug #3 fix)
- ✅ Licensing: auto-sync only for companies with EmployeeRecordLicense
- ✅ Reconciliation pattern: compares desired state (hierarchies) vs actual state (JobRecords) — idempotent
- ✅ `dismissSendEvent: true` prevents reverse cascade during consumer-path operations
- ✅ Concurrent reconciliation guard: re-checks DB before create to prevent race condition duplicates
- ✅ TeamTitle auto-populated from latest active CareerRecord.Position via `SettingEnsureDropdownOptionRequestBusMessage`

**Edge Cases**:
- ❌ Company without license → Changes ignored
- ❌ No active record for removed org → No update needed
- ❌ Concurrent duplicate messages → Second reconciliation skips create (DB re-check)

**Evidence**: `Services/JobRecordAutoSyncService.cs` (reconciliation pattern, replaces former HierarchyChangeDetector)

---

#### TC-XS-035: Bulk Org Deletion/Rename and Company Deletion [P2] ← NEW

**Acceptance Criteria**:
- ✅ `HandleOrgsDeletedAsync`: bulk end-dates all active records for deleted org unit IDs (all users, all companies)
- ✅ `HandleCompanyDeletedAsync`: future records hard-deleted, active records end-dated
- ✅ `HandleOrgsRenamedAsync`: updates `OrganizationalUnitName` on all affected records
- ✅ All bulk operations cancel scheduled Hangfire jobs before modifying records
- ✅ Returns affected `(userId, companyId)` pairs for custom field sync

**Edge Cases**:
- ❌ No affected records for deleted org → returns empty list
- ❌ Company delete with only future records → hard-delete only, no custom field sync needed

**Evidence**: `Services/JobRecordAutoSyncService.cs:HandleOrgsDeletedAsync,HandleCompanyDeletedAsync,HandleOrgsRenamedAsync`

---

## Security & Authorization Test Cases

### P0 - Critical [3 Tests]

#### TC-SEC-001: Unauthorized Access Denied [P0]

**Acceptance Criteria**:
- ✅ User without EmployeePolicy permission → 403 Forbidden
- ✅ Access attempt logged
- ✅ No data returned

**Edge Cases**:
- ❌ Null permission → Treated as denied

**Evidence**: `Controllers/EmployeeController.cs:38-326` | `Bravo.Shared.Api.Authorization`

---

#### TC-SEC-002: Cross-Company Data Isolation [P0]

**Acceptance Criteria**:
- ✅ User from company-001 tries to access company-002 employee → 403 Forbidden
- ✅ No data visible
- ✅ CompanyId filter auto-applied

**Edge Cases**:
- ❌ Missing CompanyId check → Data leak

**Evidence**: `Controllers/EmployeeController.cs:38-326` | `Easy.Platform.Application.RequestContext`

---

#### TC-SEC-003: Authentication Required for All Endpoints [P0]

**Acceptance Criteria**:
- ✅ Request without token → 401 Unauthorized
- ✅ All endpoints protected
- ✅ Redirect to login

**Edge Cases**:
- ❌ Public endpoint exists → Not protected

**Evidence**: `Controllers/EmployeeController.cs:38-326` | `Bravo.Shared.Api.Authorization`

---

### P1 - High Priority [6 Tests]

#### TC-SEC-004: Role-Based Permission Check [P1]

**Acceptance Criteria**:
- ✅ Viewer: ViewEmployee=Yes, EditEmployee=No, DeleteEmployee=No
- ✅ HRAdmin: ViewEmployee=Yes, EditEmployee=Yes, DeleteEmployee=No
- ✅ Admin: All=Yes
- ✅ Permissions enforced correctly

**Edge Cases**:
- ❌ Missing role check → All users have access

**Evidence**: `Controllers/EmployeeController.cs` | Role validation

---

#### TC-SEC-005: PlatformAuthorize Attribute Enforcement [P1]

**Acceptance Criteria**:
- ✅ Endpoint with `[PlatformAuthorize(PlatformRoles.Admin)]`
- ✅ Non-Admin user access → 403 Forbidden
- ✅ Admin user access → Allowed
- ✅ Attribute honored

**Edge Cases**:
- ❌ Missing attribute → All users allowed

**Evidence**: `Controllers/EmployeeController.cs` | Attribute implementation

---

#### TC-SEC-006: User Can Only Access Own Company's Employees [P1]

**Acceptance Criteria**:
- ✅ User from company A queries employees → Only company A returned
- ✅ CompanyId filter auto-applied
- ✅ Multi-tenant isolation enforced

**Edge Cases**:
- ❌ User with access to multiple companies → All companies' data visible

**Evidence**: `Controllers/EmployeeController.cs` | Company filter

---

#### TC-SEC-007: Line Manager Access Restrictions [P1]

**Acceptance Criteria**:
- ✅ Jane queries her direct reports
- ✅ Only employees with LineManagerId = Jane returned
- ✅ Access control enforced

**Edge Cases**:
- ❌ No access restriction → All employees visible

**Evidence**: `Queries/GetEmployeesByLineManagerQuery.cs` | Access filter

---

#### TC-SEC-008: XSS Prevention in Employee Data [P1]

**Acceptance Criteria**:
- ✅ FirstName: `<script>alert('xss')</script>John` saved
- ✅ HTML sanitized on display
- ✅ Script doesn't execute
- ✅ XSS prevented

**Edge Cases**:
- ❌ No sanitization → Script executes

**Evidence**: `HtmlEncoder.cs` | Frontend sanitization

---

#### TC-SEC-009: SQL Injection Prevention [P1]

**Acceptance Criteria**:
- ✅ Keyword: `'; DROP TABLE Employees; --` submitted
- ✅ Parameterized queries prevent injection
- ✅ No data corruption
- ✅ SQL safe

**Edge Cases**:
- ❌ Dynamic SQL construction → Vulnerable to injection

**Evidence**: `Repository.cs` | Parameterized query usage

---

### P2 - Medium Priority [4 Tests]

#### TC-SEC-010: Audit Trail for Sensitive Operations [P2]

**Acceptance Criteria**:
- ✅ Create employee → Audit record created
- ✅ Update salary → Audit recorded
- ✅ Delete employee → Audit recorded
- ✅ UserId, Action, Timestamp, ChangedData all recorded

**Edge Cases**:
- ❌ No audit trail → No accountability

**Evidence**: `UseCaseEvents/EmployeeAuditEventHandler.cs` | Audit logging

---

#### TC-SEC-011: Session Timeout Handling [P2]

**Acceptance Criteria**:
- ✅ User session expires → 401 Unauthorized
- ✅ Redirect to login
- ✅ Action denied

**Edge Cases**:
- ❌ Session extended automatically → No timeout

**Evidence**: `JWT middleware configuration` | Token expiration

---

#### TC-SEC-012: Rate Limiting on Sensitive Endpoints [P2]

**Acceptance Criteria**:
- ✅ Rate limit: 100 requests/minute
- ✅ First 100 requests succeed
- ✅ Next 50 → 429 Too Many Requests
- ✅ Limit enforced

**Edge Cases**:
- ❌ No rate limiting → DoS vulnerability

**Evidence**: `RateLimitingMiddleware.cs` | Rate limit configuration

---

#### TC-SEC-013: Export Authorization Check [P2]

**Acceptance Criteria**:
- ✅ User without export permission → Denied
- ✅ Export attempt logged
- ✅ 403 Forbidden returned

**Edge Cases**:
- ❌ No permission check → All users can export

**Evidence**: `Commands/ExportEmployeeReportCommand.cs` | Permission check

---

### P3 - Low Priority [2 Tests]

#### TC-SEC-014: Handle Permission Change Mid-Session [P3]

**Acceptance Criteria**:
- ✅ User has Admin permission initially
- ✅ Permission revoked during session
- ✅ Next action checked against latest permissions
- ✅ Action denied

**Edge Cases**:
- ❌ Cached permissions → Old permissions still valid

**Evidence**: `PermissionCacheInvalidation.cs` | Cache refresh

---

#### TC-SEC-015: Concurrent Session Handling [P3]

**Acceptance Criteria**:
- ✅ User logged in on 2 devices
- ✅ Password changed on device 1
- ✅ Device 2 session invalidated
- ✅ Re-authentication required

**Edge Cases**:
- ❌ No session coordination → Both sessions still valid

**Evidence**: `SessionManagement.cs` | Session invalidation

---

## Error Handling Test Cases

### P0 - Critical [2 Tests]

#### TC-ERR-001: Validation Errors Return Proper Format [P0]

**Acceptance Criteria**:
- ✅ Response StatusCode = 400
- ✅ ErrorType = "ValidationError"
- ✅ Errors array with field errors
- ✅ Structured PlatformValidationResult

**Edge Cases**:
- ❌ Unstructured error response → Cannot parse client-side

**Evidence**: `PlatformValidationResult.cs` | Error response format

---

#### TC-ERR-002: Not Found Returns 404 [P0]

**Acceptance Criteria**:
- ✅ Request non-existent employee "emp-999" → 404 Not Found
- ✅ Error message: "Employee not found"
- ✅ Proper HTTP status code

**Edge Cases**:
- ❌ 500 error instead → Server error leak

**Evidence**: `Controllers/EmployeeController.cs` | 404 handling

---

### P1 - High Priority [4 Tests]

#### TC-ERR-003: Multiple Validation Errors Returned Together [P1]

**Acceptance Criteria**:
- ✅ Email: Invalid format, FirstName: Required, StartDate: Future only
- ✅ All 3 errors returned in single response
- ✅ Errors associated with fields
- ✅ User sees all issues at once

**Edge Cases**:
- ❌ One error at a time → Multiple form submissions needed

**Evidence**: `PlatformValidationResult.cs` | Multi-error support

---

#### TC-ERR-004: Optimistic Concurrency Conflict [P1]

**Acceptance Criteria**:
- ✅ Employee version = 5
- ✅ Two users update simultaneously
- ✅ First succeeds, second fails with concurrency error
- ✅ User prompted to reload

**Edge Cases**:
- ❌ No version check → Last write wins

**Evidence**: `SaveEmployeeCommand.cs` | Version checking

---

#### TC-ERR-005: Transaction Rollback on Failure [P1]

**Acceptance Criteria**:
- ✅ Bulk create 10 records
- ✅ Record 7 fails validation
- ✅ All 10 rolled back
- ✅ No partial data persisted

**Edge Cases**:
- ❌ Partial success allowed → Data inconsistency

**Evidence**: `ImportEmployeesCommand.cs` | Transaction handling

---

#### TC-ERR-006: External Service Failure Handling [P1]

**Acceptance Criteria**:
- ✅ Email service unavailable
- ✅ Invitation record created
- ✅ Email queued for retry
- ✅ Message: "Email will be sent when service recovers"

**Edge Cases**:
- ❌ Failure blocks operation → Poor UX

**Evidence**: `Commands/CreateInvitationByEmailCommand.cs` | Retry queue

---

### P2 - Medium Priority [3 Tests]

#### TC-ERR-007: Message Bus Retry on Failure [P2]

**Acceptance Criteria**:
- ✅ Consumer fails to process message
- ✅ Message retried 3 times
- ✅ After exhaustion → Dead letter queue
- ✅ Monitoring alert logged

**Edge Cases**:
- ❌ No retry → Message lost

**Evidence**: `RabbitMQ retry policy` | Retry configuration

---

#### TC-ERR-008: Request Timeout Handling [P2]

**Acceptance Criteria**:
- ✅ Database query exceeds timeout
- ✅ 504 Gateway Timeout returned
- ✅ Partial operations rolled back
- ✅ Clean error response

**Edge Cases**:
- ❌ No timeout → Hanging requests

**Evidence**: `Middleware/TimeoutMiddleware.cs` | Timeout handling

---

#### TC-ERR-009: Graceful Degradation [P2]

**Acceptance Criteria**:
- ✅ Survey service unavailable
- ✅ Employee list still loads
- ✅ Survey columns show "Unavailable"
- ✅ System doesn't fail entirely

**Edge Cases**:
- ❌ Hard dependency → Complete failure

**Evidence**: `Controllers/EmployeeController.cs` | Fallback handling

---

### P3 - Low Priority [3 Tests]

#### TC-ERR-010: Handle Database Connection Loss [P3]

**Acceptance Criteria**:
- ✅ Database connection lost during operation
- ✅ Proper error returned
- ✅ Connection re-established for next request
- ✅ Automatic retry

**Edge Cases**:
- ❌ Connection permanently lost → Manual intervention needed

**Evidence**: `DbContext connection pooling` | Retry logic

---

#### TC-ERR-011: Memory Pressure Handling [P3]

**Acceptance Criteria**:
- ✅ High memory during large export
- ✅ Memory threshold reached
- ✅ Export chunked
- ✅ System remains stable

**Edge Cases**:
- ❌ Out of memory → Crash

**Evidence**: `ExportCommand.cs` | Chunked processing

---

#### TC-ERR-012: Corrupted Data Handling [P3]

**Acceptance Criteria**:
- ✅ Employee with corrupted JSON in custom field
- ✅ Record loads with error logged
- ✅ Corrupted fields show default values
- ✅ No crash

**Edge Cases**:
- ❌ Record unreadable → Can't load

**Evidence**: `GetEmployeeDetailQuery.cs` | Error handling

---

## Performance Test Cases

### P0 - Critical [1 Test]

#### TC-PERF-001: Employee List Load Time [P0]

**Acceptance Criteria**:
- ✅ 1000 employees, default pagination (20 items)
- ✅ Response completes within 2 seconds
- ✅ First page renders within 3 seconds
- ✅ UI responsive

**Edge Cases**:
- ❌ Slower response → Timeout

**Evidence**: `Queries/GetEmployeeListQuery.cs` | Query optimization

---

### P1 - High Priority [2 Tests]

#### TC-PERF-002: Search Performance with Large Dataset [P1]

**Acceptance Criteria**:
- ✅ 10,000 employees
- ✅ Keyword search completes within 3 seconds
- ✅ Results paginated correctly
- ✅ No timeout

**Edge Cases**:
- ❌ Full table scan → Slow search

**Evidence**: `Queries/GetEmployeesByAdvancedFilterQueryHandler.cs` | Indexing

---

#### TC-PERF-003: Export Performance [P1]

**Acceptance Criteria**:
- ✅ 5,000 employees with all fields
- ✅ Export completes within 60 seconds
- ✅ File generated
- ✅ No timeout

**Edge Cases**:
- ❌ Memory issues → Incomplete export

**Evidence**: `Commands/ExportEmployeeReportCommand.cs` | Chunked processing

---

### P2 - Medium Priority [2 Tests]

#### TC-PERF-004: Bulk Import Performance [P2]

**Acceptance Criteria**:
- ✅ 500 employees CSV import
- ✅ Completes within 120 seconds
- ✅ Progress reported
- ✅ All created

**Edge Cases**:
- ❌ Slow import → Timeout

**Evidence**: `Commands/ImportEmployeesCommand.cs` | Bulk insert optimization

---

#### TC-PERF-005: Concurrent User Load [P2]

**Acceptance Criteria**:
- ✅ 50 concurrent users
- ✅ Average response <5 seconds
- ✅ No request timeouts
- ✅ System stable

**Edge Cases**:
- ❌ Connection pool exhausted → Timeout

**Evidence**: `Connection pooling configuration` | Load test results

---

### P3 - Low Priority [2 Tests]

#### TC-PERF-006: Large Custom Field Data Handling [P3]

**Acceptance Criteria**:
- ✅ Employee with 50 custom field values
- ✅ Detail page load ≤5 seconds
- ✅ All fields rendered
- ✅ No performance degradation

**Edge Cases**:
- ❌ N+1 query problem → Slow load

**Evidence**: `Queries/GetEmployeeDetailQuery.cs` | Query optimization

---

#### TC-PERF-007: Complex Filter Query Performance [P3]

**Acceptance Criteria**:
- ✅ 10 filters applied simultaneously
- ✅ Query completes within 5 seconds
- ✅ Query plan uses indexes
- ✅ Results accurate

**Edge Cases**:
- ❌ No indexes → Full table scan

**Evidence**: `Database query plan analysis` | Index usage

---

---

**End of Test Case Conversions**

Total Test Cases Converted: **138/138**
All test cases successfully converted from BDD Gherkin format to TC format with evidence mapping.
### Test Implementation Examples

#### Unit Test Example (Backend)

```csharp
// SaveJobRecordCommandHandlerTests.cs
public class SaveJobRecordCommandHandlerTests : BaseTest<SaveJobRecordCommandHandler>
{
    [Fact]
    public async Task Handle_ValidJobRecord_ShouldCreateAndPublishEvent()
    {
        // Arrange
        var command = new SaveJobRecordCommand
        {
            UserId = "emp-001",
            Position = "Senior Developer",
            StartDate = DateTime.UtcNow
        };

        // Act
        var result = await Sut.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.JobRecord.Position.Should().Be("Senior Developer");
        MockMessageBus.Verify(m => m.PublishAsync(It.IsAny<JobRecordEntityEventBusMessage>()), Times.Once);
    }

    [Fact]
    public async Task Handle_MissingPosition_ShouldFailValidation()
    {
        // Arrange
        var command = new SaveJobRecordCommand { UserId = "emp-001", StartDate = DateTime.UtcNow };

        // Act & Assert
        var validation = command.Validate();
        validation.IsValid.Should().BeFalse();
        validation.Errors.Should().Contain(e => e.Contains("Position"));
    }
}
```

#### Integration Test Example (Backend)

```csharp
// EmployeeIntegrationTests.cs
public class EmployeeIntegrationTests : BaseIntegrationTest
{
    [Fact]
    public async Task CreateEmployee_ShouldSyncToAllServices()
    {
        // Arrange
        var invitation = await CreateInvitationAsync("test@example.com");

        // Act
        await CompleteRegistrationAsync(invitation);

        // Assert - Employee created in Employee.Service
        var employee = await EmployeeRepository.GetByEmailAsync("test@example.com");
        employee.Should().NotBeNull();

        // Assert - Synced to bravoGROWTH
        await WaitForMessageProcessingAsync();
        var growthEmployee = await GrowthEmployeeRepository.GetByIdAsync(employee.Id);
        growthEmployee.Should().NotBeNull();
        growthEmployee.Email.Should().Be(employee.Email);
    }
}
```

#### Component Test Example (Frontend)

```typescript
// employee-list.component.spec.ts
describe('EmployeeListComponent', () => {
    let component: EmployeeListComponent;
    let fixture: ComponentFixture<EmployeeListComponent>;
    let mockApiService: jest.Mocked<EmployeeHttpService>;

    beforeEach(async () => {
        mockApiService = createMock<EmployeeHttpService>();
        await TestBed.configureTestingModule({
            imports: [EmployeeListComponent],
            providers: [{ provide: EmployeeHttpService, useValue: mockApiService }]
        }).compileComponents();

        fixture = TestBed.createComponent(EmployeeListComponent);
        component = fixture.componentInstance;
    });

    it('should load employees on init', fakeAsync(() => {
        const mockEmployees = [{ id: 'emp-001', fullName: 'John Doe' }];
        mockApiService.getEmployeeList.mockReturnValue(of({ items: mockEmployees, totalCount: 1 }));

        fixture.detectChanges();
        tick();

        expect(component.employees()).toHaveLength(1);
        expect(component.employees()[0].fullName).toBe('John Doe');
    }));

    it('should filter employees by keyword', fakeAsync(() => {
        const mockEmployees = [{ id: 'emp-001', fullName: 'John Doe' }];
        mockApiService.getEmployeeList.mockReturnValue(of({ items: mockEmployees, totalCount: 1 }));

        component.searchKeyword.set('john');
        component.search();
        tick(500); // debounce

        expect(mockApiService.getEmployeeList).toHaveBeenCalledWith(
            expect.objectContaining({ keyword: 'john' })
        );
    }));
});
```

---

### Detailed Code Flow Reference

#### Employee Creation Flow

```
1. User submits invitation form
   → InvitationController.SendInvitationByEmail()
   → CreateInvitationByEmailCommand
   → Validates emails, creates Invitation records
   → Queues invitation emails via NotificationService

2. Invitee registers via invitation link
   → Account.Service creates User
   → Publishes AccountUserSavedEventBusMessage

3. Employee.Service receives message
   → AccountUserSavedEventBusConsumer.HandleLogicAsync()
   → If AutoCreateInvitation enabled:
     → Creates Invitation automatically
     → Creates Employee record
   → Publishes EmployeeEntityEventBusMessage

4. Dependent services sync
   → bravoGROWTH: GrowthEmployeeEntityEventBusConsumer
   → bravoSURVEYS: SurveyEmployeeEntityEventBusConsumer
   → Each creates local Employee record
```

#### JobRecord Save Flow

```
1. HR submits job record form
   → EmployeeController.SaveJobRecord()
   → SaveJobRecordCommand { UserId, Position, StartDate, EndDate, ... }

2. Command validation
   → Validate().And(Position required, EndDate >= StartDate, unique StartDate)

3. Handler processing
   → SaveJobRecordCommandHandler.HandleAsync()
   → If creating new: auto-close previous record (set EndDate = StartDate - 1 day)
   → Create/Update JobRecord
   → Publish JobRecordEntityEventBusMessage
```

#### Message Bus Consumer Pattern

```csharp
// Standard consumer pattern for cross-service sync
public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
{
    // 1. Wait for dependencies (Company, User) with timeout
    var (companyMissing, userMissing) = await (
        Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(...), maxWaitSeconds: 300).Then(p => !p),
        Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(...), maxWaitSeconds: 300).Then(p => !p)
    );
    if (companyMissing || userMissing) return; // Skip if dependencies missing

    // 2. Process based on CRUD action
    switch (msg.Payload.CrudAction)
    {
        case Created or Updated:
            var existing = await repo.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
            if (existing == null)
                await repo.CreateAsync(MapToLocal(msg.Payload.EntityData).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate) // Respect message ordering
                await repo.UpdateAsync(UpdateFromMessage(existing, msg.Payload.EntityData).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            break;
        case Deleted:
            await repo.DeleteAsync(msg.Payload.EntityData.Id);
            break;
    }
}
```

---

## Troubleshooting

### Common Issues and Resolutions

#### Employee List Issues

| Issue | Symptoms | Cause | Resolution |
|-------|----------|-------|------------|
| **Employee list loads slowly** | >5 seconds load time | Large dataset without pagination | Ensure pagination is enabled; reduce page size to 25 |
| **Search returns no results** | Empty list despite existing employees | Search text too specific or typo | Use partial keywords; check for special characters |
| **Filter not applied** | Filters ignored | Conflicting filter combinations | Clear all filters and reapply one by one |
| **Survey columns missing** | Profile columns not visible | Company license doesn't include profiles | Verify company subscription includes survey profiles |

#### Invitation Issues

| Issue | Symptoms | Cause | Resolution |
|-------|----------|-------|------------|
| **Invitation email not received** | User reports no email | Email in spam, invalid address, or email service down | Check spam folder; verify email; check NotificationService logs |
| **URL invitation expired** | 403 error on registration | ExpirationDate passed | Create new URL invitation with future date |
| **Duplicate email error** | Validation error on invite | Email already exists as employee or pending | Check employee list and pending tabs for existing record |
| **Retake invitation not working** | Employee can't access survey | IsRetake flag not set correctly | Verify CreateInvitationRetakeByEmailCommand is used |

#### Import Issues

| Issue | Symptoms | Cause | Resolution |
|-------|----------|-------|------------|
| **CSV import fails completely** | All rows rejected | File encoding issue or wrong delimiter | Save as UTF-8 CSV; verify comma delimiter |
| **Some rows fail import** | Partial success | Per-row validation errors | Check error message per row; fix and re-import failed rows |
| **Custom fields not imported** | Custom field columns ignored | Column names don't match field codes | Use exact field codes from field template |
| **File too large error** | Upload rejected | Exceeds 1024KB limit | Split into smaller files |

#### Job/Contract Record Issues

| Issue | Symptoms | Cause | Resolution |
|-------|----------|-------|------------|
| **Can't create job record** | Validation error | StartDate already exists for employee | Use different start date |
| **Previous job not closed** | EndDate still null | Auto-close didn't trigger | Manually set EndDate on previous record |
| **Contract overlap error** | Validation rejects new contract | Date range overlaps existing | Adjust dates or end previous contract |

#### Cross-Service Sync Issues

| Issue | Symptoms | Cause | Resolution |
|-------|----------|-------|------------|
| **Employee not synced to Growth** | Missing in bravoGROWTH | Message bus consumer failed | Check RabbitMQ; verify GrowthEmployeeEntityEventBusConsumer logs |
| **Survey data missing** | Profiles empty after sync | SurveyResult not included in message | Verify EmployeeEntityEventBusMessage includes survey data |
| **Delayed sync** | Data appears after minutes | Message bus backlog | Check RabbitMQ queue depth; scale consumers if needed |

### Diagnostic Queries

```sql
-- Check pending employee status
SELECT Id, Email, Status, RequestedDate, ProcessedDate
FROM PendingEmployee
WHERE CompanyId = 'company-id' AND Status = 0;

-- Find duplicate emails
SELECT Email, COUNT(*) as Count
FROM Employee
WHERE CompanyId = 'company-id' AND IsDeleted = 0
GROUP BY Email
HAVING COUNT(*) > 1;

-- Check job record gaps
SELECT e.Email, jr.StartDate, jr.EndDate,
       LAG(jr.EndDate) OVER (PARTITION BY jr.UserId ORDER BY jr.StartDate) as PrevEndDate
FROM JobRecord jr
JOIN Employee e ON jr.UserId = e.UserId
WHERE jr.CompanyId = 'company-id'
ORDER BY jr.UserId, jr.StartDate;
```

### Log Locations

| Service | Log Key | Purpose |
|---------|---------|---------|
| Employee.Service | `EmployeeController` | API request/response logging |
| Employee.Application | `ImportEmployeesCommandHandler` | CSV import processing |
| Employee.Application | `EmployeeEntityEventBusMessage` | Cross-service sync events |
| Account.Service | `AccountUserSavedEventBusMessage` | User creation events |

---

## Related Documentation

- **bravoTALENTS Module**: `docs/business-features/bravoTALENTS/README.md`
- **bravoTALENTS API Reference**: `docs/business-features/bravoTALENTS/API-REFERENCE.md`
- **Backend Patterns**: `docs/claude/backend-patterns.md` - CQRS, Repository patterns
- **Message Bus Patterns**: See `PlatformApplicationMessageBusConsumer` pattern
- **Recruitment Pipeline**: `docs/business-features/bravoTALENTS/detailed-features/README.RecruitmentPipelineFeature.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-03 | Initial documentation for bravoTALENTSClient employee management |
| 2.0.0 | 2026-01-03 | Added Domain Model, Permission System, Test Specifications, Survey columns, Hired candidates import, Remove employees, Employment status |
| 2.1.0 | 2026-01-03 | Comprehensive Advanced Filter documentation: 5 filter categories, 30+ field keys, operators, query string format, backend processing, profile filter options, custom field support |
| 3.0.0 | 2026-01-05 | **Major Test Specifications Enhancement**: Comprehensive BDD Gherkin test specs with 138 test cases across 10 categories (P0: 24, P1: 51, P2: 37, P3: 26). Added Priority Legend, Test Case Summary table, code flow references, implementation examples. Categories: Employee CRUD, Invitation Management, Pending Employee Management, JobRecord & ContractRecord, Import/Export, Custom Fields, Cross-Service Integration, Security & Authorization, Error Handling, Performance |
| 3.1.0 | 2026-01-08 | **Documentation Enhancement**: Added Business Requirements section (14 FR-EM-XX requirements covering list management, invitation, import/export, detail management, lifecycle). Added Troubleshooting section (common issues for list, invitation, import, job/contract records, cross-service sync with diagnostic queries and log locations) |
| 3.2.0 | 2026-02-06 | **UserCompany.IsActive Enhancement**: Added EmploymentStatus constants (ActiveEmploymentStatuses, NonActiveEmploymentStatuses). Added MatchEmploymentStatusesExpr expression. Updated UpsertUserCompanyInfoOnEmployeeStatusUpdatedEntityEventHandler documentation with IsActive propagation flow. Added test cases TC-XS-030, TC-XS-031 for IsActive sync validation. Total test cases: 140 (was 138) |
| 4.0.0 | 2026-02-23 | **Employee Data Model Enhancement** (PR #109660): Added CareerRecord entity + full CRUD (SaveCareerRecordCommand, DeleteCareerRecordCommand, GetCareerRecords/ByIdQuery). Added SalaryRecord documentation. Added bi-directional org unit sync (EmployeeOrgUnitSyncService, JobRecordAutoSyncService, HierarchyChangeDetector, OrgUnitPeriodMonitoringBackgroundJob). Added EntityPeriodRecord base class docs. Added CustomFieldFormDialogBase shared pattern (Career/Job/Salary). Added ViewModel pattern (createNew/fromRecord/buildSavePayload). Updated JobRecord domain model (OrganizationalUnitId, auth validation). Updated component hierarchy with Career/Salary tabs. Added 3 business requirements (FR-EM-15/16/17). Added 27 test cases (13 CareerRecord, 8 SalaryRecord, 3 JobRecord, 3 Cross-Service). Total test cases: 167 (was 140). |
| 4.0.1 | 2026-02-24 | **Code Review Fixes & Architecture Updates**: (1) Consolidated `SyncEmployeeOrgUnitsOnJobRecordSavedEntityEventHandler` into `SyncEmployeeJobRecordSavedEntityEventHandler`. (2) Replaced `HierarchyChangeDetector` with reconciliation pattern (`ReconcileJobRecordsAsync`). (3) Extracted `SendReverseSyncToAccountsAsync` as explicit separate method. (4) Replaced string literal `"bravoTALENTS"` with `PolicyIds.BravoTALENTS` shared constant. (5) Added `dismissSendEvent: true` pattern for consumer-path cascade prevention. (6) Fixed date display: dynamic `momentDateFormat` from `AppBaseComponent` (no hardcoded `MM/DD/YYYY`), career dates use UTC-only (no `.local()` for day-only values). (7) Added missing context headers to `PlatformApiService` requests. (8) Deduplicated save logic and eliminated duplicate DB queries. (9) Replaced `OrgUnitPeriodMonitoringBackgroundJob` with queue-based `JobRecordTransitionBackgroundJob` (per-record Hangfire scheduling). (10) Added timezone-aware date storage for JobRecord (`ToStartOfDayInTimezone`/`ToEndOfDayInTimezone`). (11) Added `ScheduledStartJobId`/`ScheduledEndJobId` fields to JobRecord. (12) Added delete prevention for last effective org unit. (13) Added type-to-confirm delete via `RecordDeleteConfirmationService`. (14) Added company root filter in `removedOrgUnitIds` (prevents cascade deletion). (15) Renamed `EnsureDropdownOptionRequestBusMessage` → `SettingEnsureDropdownOptionRequestBusMessage` (receiver-leader naming). (16) Documented bulk operations: `HandleOrgsDeletedAsync`, `HandleCompanyDeletedAsync`, `HandleOrgsRenamedAsync`. Updated 8 test cases (TC-JR-008, TC-JR-017, TC-JR-018, TC-CR-009, TC-SR-007, TC-XS-032, TC-XS-033, TC-XS-034). Added TC-XS-035 (bulk ops). Total test cases: 168 (was 167). |

---

**Last Updated**: 2026-02-24
**Location**: `docs/business-features/bravoTALENTS/detailed-features/`
**Maintained By**: BravoSUITE Documentation Team
