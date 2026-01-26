# Specification Update Workflow

## Pattern-Based Discovery

```bash
# Find all spec files
find . -name "*.spec.md" -o -name "*-specification.md"

# Find implementation files
grep -r "class.*Command" --include="*.cs" -l

# Cross-reference specs vs code
grep -r "SaveEmployee" --include="*.md"  # In specs
grep -r "SaveEmployee" --include="*.cs"  # In code
```

---

## Gap Analysis Template

```markdown
# Specification Gap Analysis

## Date: [Date]
## Feature: [Feature Name]

## Implementation Status

| Component | Specified | Implemented | Gap |
|-----------|-----------|-------------|-----|
| Entity: Employee | Y | Y | None |
| Command: SaveEmployee | Y | Y | Missing validation doc |
| Query: GetEmployeeList | Y | Y | Filters not documented |
| Event: OnEmployeeCreated | N | Y | Not in spec |

## New Implementations (Not in Spec)
1. `BulkUpdateEmployeeCommand` - Added in PR #123
2. `EmployeeExportQuery` - Added for reporting

## Spec Items Not Implemented
1. `EmployeeArchiveCommand` - Deferred to Phase 2
2. `EmployeeAuditTrail` - Pending requirements

## Documentation Updates Needed
1. Add BulkUpdateEmployeeCommand to spec
2. Document new query filters
3. Add event handler documentation
```

---

## Spec Update Checklist

### Entities
- [ ] Update property list
- [ ] Document new computed properties
- [ ] Add validation rules
- [ ] Update relationships

### Commands
- [ ] Add new commands
- [ ] Update validation rules
- [ ] Document side effects
- [ ] Add error codes

### Queries
- [ ] Document new filters
- [ ] Update response schema
- [ ] Add pagination details

### Events
- [ ] Document entity events
- [ ] List event handlers
- [ ] Describe cross-service effects

### API Endpoints
- [ ] Add new endpoints
- [ ] Update request/response
- [ ] Document auth requirements

---

## Update Pattern 1: Entity Specification

```markdown
# Employee Entity Specification

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Id | string | Yes | Unique identifier (ULID) |
| FullName | string | Yes | Employee full name (max 200) |
| Email | string | Yes | Email address (unique per company) |
| PhoneNumber | string | No | Contact phone (NEW in v2.1) |

## Computed Properties

| Property | Calculation |
|----------|-------------|
| IsActive | Status == Active && !IsDeleted |
| DisplayName | `{Code} - {FullName}` |

## Validation Rules
1. FullName: Required, max 200 characters
2. Email: Required, valid email format, unique within company

## Static Expressions

| Expression | Purpose |
|------------|---------|
| UniqueExpr(companyId, userId) | Find unique employee |
| ActiveInCompanyExpr(companyId) | Filter active employees |
| SearchExpr(term) | Full-text search |
```

## Update Pattern 2: Command Specification

```markdown
# SaveEmployeeCommand Specification

## Overview
Creates or updates an employee record.

## Request
{ "id": "string | null", "fullName": "string", "email": "string", "status": "Active | Inactive" }

## Validation

| Field | Rule | Error Code |
|-------|------|------------|
| fullName | Required | EMPLOYEE_NAME_REQUIRED |
| email | Unique in company | EMPLOYEE_EMAIL_EXISTS |

## Side Effects
1. **Entity Event**: `PlatformCqrsEntityEvent<Employee>` raised
2. **Cross-Service Sync**: Employee synced via message bus
3. **Notification**: Welcome email sent (create only)

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| EMPLOYEE_NOT_FOUND | 404 | Employee ID not found |
| EMPLOYEE_EMAIL_EXISTS | 400 | Email already in use |
```

## Update Pattern 3: API Endpoint Specification

```markdown
# Employee API Endpoints

## Base URL: `/api/Employee`

### GET /api/Employee
List employees with filtering and pagination.

| Parameter | Type | Description |
|-----------|------|-------------|
| searchText | string | Full-text search |
| statuses | array | Filter by status |
| skipCount | int | Pagination offset |
| maxResultCount | int | Page size (max 100) |

### POST /api/Employee
Create or update employee. See SaveEmployeeCommand spec.

### DELETE /api/Employee/{id}
Soft delete an employee. Response: 204 No Content.

## Authorization

| Endpoint | Required Role |
|----------|---------------|
| GET | Employee, Manager, Admin |
| POST | Manager, Admin |
| DELETE | Admin |
```

---

## Verification

```bash
# Verify all commands are documented
for cmd in $(grep -r "class.*Command" --include="*.cs" -l); do
  name=$(grep -o "class [A-Za-z]*Command" "$cmd" | head -1)
  if ! grep -q "$name" docs/specifications/*.md; then
    echo "Missing in spec: $name"
  fi
done
```

## Validation Report Template

```markdown
# Specification Verification Report

## Summary
- Total Specs: X
- Up to Date: Y
- Needs Update: Z
- Missing: W

## Issues Found
### Outdated Specifications
1. **Entity.spec.md** - Missing: new properties
2. **API-Reference.md** - Missing: new endpoints

## Recommendations
1. Update specs with new properties
2. Add missing command specifications
3. Regenerate API reference from OpenAPI
```
