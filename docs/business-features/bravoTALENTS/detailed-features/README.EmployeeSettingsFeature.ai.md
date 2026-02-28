# Employee Settings Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.EmployeeSettingsFeature.md](./README.EmployeeSettingsFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Services | Setting.Service (MongoDB), Employee.Service (SQL Server) |
| Database | MongoDB (field templates), SQL Server (access rights) |
| Full Docs | [README.EmployeeSettingsFeature.md](./README.EmployeeSettingsFeature.md) |

### File Locations

```
Field Template (Source of Truth):
├── Entity:      src/Services/_SharedCommon/Bravo.Shared/Domain/Entities/AggregatesModel/CompanyClassFieldTemplate.cs
├── Commands:    src/Services/bravoTALENTS/Setting.Application/UseCaseCommands/CompanyClassFieldTemplate/
├── Queries:     src/Services/bravoTALENTS/Setting.Application/UseCaseQueries/CompanyClassFieldTemplate/
├── Controller:  src/Services/bravoTALENTS/Setting.Service/Controllers/CompanyClassFieldTemplateController.cs
└── Frontend:    src/Web/bravoTALENTSClient/src/app/employee-settings/

Financial Access Rights:
├── Entity:      src/Services/bravoTALENTS/Employee.Domain/Entities/EmployeeInfoAccessRightSummary.cs
├── Commands:    src/Services/bravoTALENTS/Employee.Application/UseCaseCommands/AccessRight/
├── Queries:     src/Services/bravoTALENTS/Employee.Application/UseCaseQueries/AccessRight/
├── Controller:  src/Services/bravoTALENTS/Employee.Service/Controllers/AccessRightController.cs
└── Consumer:    src/Services/bravoTALENTS/Employee.Application/ApplyPlatform/MessageBus/Consumers/
```

---

## Domain Model

### Entities

```
CompanyClassFieldTemplate : ClassFieldTemplate<CompanyClassFieldTemplate>
├── Id: string (ULID)
├── CompanyId: string
├── Class: string ("Employee")
├── Groups: List<FieldGroup>
├── Fields: List<Field>
├── DefaultLanguage: string ("en")
├── UniqueExpr(class, companyId): Expression for composite key lookup
└── BuildUniqueCompositeId(class, companyId): "{companyId}_{class}"

EmployeeInfoAccessRightSummary : RootEntity<EmployeeInfoAccessRightSummary, string>
├── Id: string (ULID)
├── EmployeeId: string
├── UserId: string
├── OrgUnitId: string
├── CompanyId: string
├── EmployeeName: string (denormalized)
├── EmployeeEmail: string (denormalized)
├── ResourceSubCategorySummary: List<ResourceSubCategorySummary>
├── AssignedByUserId: string
└── CreatedDate: DateTime
```

### Value Objects

```
Field {
  Code: string, Type: string, DisplayName: Dict<string, string>
  IsSystem: bool, IsRequired: bool, IsDatabaseField: bool, IsReadonly: bool
  OrderNumber: int, Group: FieldGroup, Options: FieldOptions
  TextFieldOptions?, DropdownFieldOptions?, DateTimeFieldOptions?, UploadFileFieldOptions?
}

FieldGroup { Code: string, DisplayName: Dict, OrderNumber: int, Options: Dict }
FieldOptions { DisplayOnQuickCard, DisplayOnEmployeeList, DisplayOnEmployeeSettings, IsFilterable, RequireEmployeeRecordLicense }
DropdownFieldOptions { Options: List<DropdownFieldOptionItem>, IsOptionsEditable: bool, DefaultValue: string }
ResourceSubCategorySummary { ResourceSubCategory: string, Action: AccessRightAction }
```

### Enums

```
AccessRightAction: None=0 | View=1 | Edit=2
FieldType: Text | DropDownList | DateTime | FileUpload
AccessRightType: Job | Contract | Salary | Allowance | Deduction | Commission | Overtime | Bonding
FieldGroups: personal_info | job_info | contract_info | banking_info | emergency_contact | custom_fields
```

---

## API Contracts

### Field Template APIs (Setting.Service)

```
GET /api/company-class-field-template/employee/{companyId}
├── Response: CompanyClassFieldTemplateDto
└── Handler: GetCompanyClassFieldTemplateQuery

GET /api/company-class-field-template/employee/fields
├── Response: EmployeeFieldSettingsTemplate { id, companyId, class, groups[], fields[] }
└── Handler: GetEmployeeFieldsQuery

POST /api/company-class-field-template/employee/custom-field/save
├── Request: { field: { code?, type, displayName, group: { code }, options?, dropdownFieldOptions? } }
├── Response: SaveCustomFieldCommandResult
└── Handler: SaveCustomFieldCommand

POST /api/company-class-field-template/employee/group-fields/save
├── Request: { groupCode, fields: [{ code, orderNumber, isRequired, isReadonly, options }] }
└── Handler: SaveGroupFieldsCommand

GET /api/company-class-field-template/employee/available-groups
├── Response: List<FieldGroup>
└── Handler: GetAvailableGroupsQuery

POST /api/company-class-field-template/employee/groups/save
├── Request: SaveCompanyGroupsCommand
└── Handler: SaveCompanyGroupsCommand
```

### Access Rights APIs (Employee.Service)

```
GET /api/accessright/get-list
├── Request: { resourceCategory, skipCount, maxResultCount }
├── Response: PaginatedResult<AccessRightSummary>
└── Handler: GetListEmployeeInfoAccessRightSummaryQuery

GET /api/accessright/current-user
├── Response: { hasAccessRight, accessRights[], roleBasedAccess: {} }
└── Handler: GetCurrentUserAccessRightQuery

POST /api/accessright/save
├── Request: { id?, employeeId, userId, employeeName, employeeEmail, resourceCategory, resourceSubCategorySummary[] }
└── Handler: SaveEmployeeInfoAccessRightSummaryCommand

DELETE /api/accessright/{id}
└── Handler: DeleteEmployeeInfoAccessRightSummaryCommand
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-ES-001 | Field code unique per company template | `SaveCustomFieldCommand.cs:Validate()` |
| BR-ES-002 | System fields: cannot delete, code/IsDatabaseField protected | `CompanyClassFieldTemplate.KeepOriginalSystemFieldsProperties()` |
| BR-ES-003 | Custom field code auto-gen: "custom_{ulid}" if empty | `SaveCustomFieldCommand.cs` |
| BR-ES-004 | Template must contain default groups (PersonalInfo, JobInfo, ContractInfo) | `CompanyClassFieldTemplate.ValidateContainAllDefaultGroups()` |
| BR-ES-005 | All fields must be assigned to a group | `SaveCustomFieldCommand.cs:Validate()` |
| BR-ES-006 | DropDownList fields require >= 1 option | `SaveCustomFieldCommand.cs:Validate()` |
| BR-ES-007 | Access rights require valid employee in same company | `SaveEmployeeInfoAccessRightSummaryCommand.cs:Validate()` |
| BR-ES-008 | Access rights require >= 1 sub-category action | `SaveEmployeeInfoAccessRightSummaryCommand.cs:Validate()` |
| BR-ES-009 | Action must be None(0), View(1), or Edit(2) | `AccessRightAction` enum |
| BR-ES-010 | HR Manager auto-receives Edit access to Job, Contract | `GetCurrentUserAccessRightQuery.cs` |
| BR-ES-011 | Only "Employee" class templates sync to consumers | `SettingCompanyClassFieldTemplateEntityEventBusConsumer.cs` |
| BR-ES-012 | Out-of-order messages ignored via LastMessageSyncDate | `SettingCompanyClassFieldTemplateEntityEventBusConsumer.cs:HandleLogicAsync` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Field.Type.IsNotNullOrEmpty(), "Field type required")
        .And(_ => Field.Group?.Code.IsNotNullOrEmpty() == true, "Field must belong to a group");

// Async validation in handler (duplicate check)
await validation
    .AndNotAsync(r => templateRepo.AnyAsync(
        t => t.Fields.Any(f => f.Code == r.Field.Code && f.Code != existingCode)),
        "Field code already exists");
```

---

## Service Boundaries

### Produces Events (Setting.Service)

```
CompanyClassFieldTemplateEntityEventBusMessage → [Employee, Growth, Candidate]
├── Producer: Auto-generated by Platform
├── Triggers: Create, Update on CompanyClassFieldTemplate
├── Filter: Only Class == "Employee" processed by consumers
└── Payload: CompanyClassFieldTemplateEntityEventBusMessagePayload
```

### Consumes Events

```
Setting.CompanyClassFieldTemplateEntityEventBusMessage ← Setting.Service
├── Consumer: SettingCompanyClassFieldTemplateEntityEventBusConsumer.cs
├── Services: Employee.Service, Growth.Service, Candidate.Service
├── Action: Upsert field template to local DB
└── Idempotent: Yes (LastMessageSyncDate check)
```

### Cross-Service Data Flow

```
Setting.Service ──publish──▶ [RabbitMQ] ──consume──▶ Employee.Service (SQL Server)
   (MongoDB)                                         ──consume──▶ Growth.Service (PostgreSQL)
   Source of Truth                                   ──consume──▶ Candidate.Service (MongoDB)
```

### Consumer Pattern

```csharp
// All consumers follow same pattern
public override async Task HandleLogicAsync(SettingCompanyClassFieldTemplateEntityEventBusMessage message, ...)
{
    if (message.Payload.EntityData.Class != "Employee") return;  // Filter by class

    var existing = await repository.FirstOrDefaultAsync(
        CompanyClassFieldTemplate.UniqueExpr(message.Payload.EntityData.Class, message.Payload.EntityData.CompanyId));

    if (existing == null)
        await repository.CreateAsync(message.Payload.EntityData.With(e => e.LastMessageSyncDate = message.CreatedUtcDate));
    else if (existing.LastMessageSyncDate <= message.CreatedUtcDate)  // Idempotency check
        await repository.UpdateAsync(existing.With(e => { /* update props */ e.LastMessageSyncDate = message.CreatedUtcDate; }));
}
```

---

## Critical Paths

### Add Custom Field

```
1. Validate input (BR-ES-005, BR-ES-006)
   ├── Field type required
   ├── Group code must exist
   └── If dropdown: options.count >= 1
2. Generate code if empty → "custom_{Ulid.NewUlid()}" (BR-ES-003)
3. Check uniqueness → fail: return validation error (BR-ES-001)
4. Add field to template.Fields with OrderNumber
5. Save via repository.UpdateAsync()
6. Platform auto-publishes entity event → Consumers sync
```

### Save Group Fields

```
1. Load template by CompanyId + Class
2. Validate: group exists in template
3. Keep system field properties (BR-ES-002) → KeepOriginalSystemFieldsProperties()
4. Update fields in group: orderNumber, isRequired, isReadonly, options
5. Save → Publish event → Consumers sync
```

### Assign Access Rights

```
1. Validate employee exists in company (BR-ES-007)
2. Validate >= 1 sub-category action (BR-ES-008)
3. Check existing: FirstOrDefaultAsync(e => e.EmployeeId == req.EmployeeId)
4. If exists: Update with new actions
5. If not: Create new EmployeeInfoAccessRightSummary
6. Save via repository.CreateOrUpdateAsync()
```

### Delete Custom Field

```
1. Validate: field.IsSystem == false (BR-ES-002)
   └── System fields cannot be deleted
2. Remove field from template.Fields
3. Save → Publish event → Consumers remove field
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-ES-001 | Create custom field with valid data | Field added, code auto-generated, event published |
| TC-ES-002 | Create field with duplicate code | Returns validation error BR-ES-001 |
| TC-ES-003 | Delete system field | Rejected (IsSystem protection) |
| TC-ES-004 | Save dropdown without options | Returns validation error BR-ES-006 |
| TC-ES-005 | Assign access rights to valid employee | Summary created, sub-categories saved |
| TC-ES-006 | Assign with invalid employee | Returns validation error BR-ES-007 |
| TC-ES-007 | HR Manager access rights | Auto-receives Job=Edit, Contract=Edit |
| TC-ES-008 | Cross-service sync | Template syncs to Employee, Growth, Candidate in <5s |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty field code | Auto-generate "custom_{ulid}" | `SaveCustomFieldCommand.cs` |
| Missing default groups | Validation error | `ValidateContainAllDefaultGroups()` |
| Out-of-order message | Skipped (LastMessageSyncDate) | `Consumer:HandleLogicAsync` |
| Non-Employee class | Consumers skip processing | `Consumer:HandleLogicAsync` |
| Orphan fields (no group) | Validation error | `SaveCustomFieldCommand.cs` |

---

## Usage Notes

### When to Use This File

- Implementing field template features
- Adding/modifying access rights logic
- Debugging cross-service sync issues
- Understanding entity relationships

### When to Use Full Documentation

- Business requirements clarification
- Stakeholder presentations
- Comprehensive test planning
- Troubleshooting production issues
- Understanding UI flows

---

*Generated from comprehensive documentation. For full details, see [README.EmployeeSettingsFeature.md](./README.EmployeeSettingsFeature.md)*
