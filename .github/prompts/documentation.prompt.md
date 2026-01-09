---
description: "Technical documentation management and API documentation"
---

# Documentation Prompt

## Overview

This prompt guides technical documentation creation and maintenance for EasyPlatform, covering code documentation, API docs, architecture decision records, and user guides.

## Documentation Principles

**1. Code as Primary Documentation**
- Self-documenting code through clear naming
- Comments explain "why", not "what"
- Documentation close to code it describes

**2. Single Source of Truth**
- One place for each piece of information
- Avoid duplicate documentation
- Link to canonical sources

**3. Keep It Updated**
- Documentation changes with code
- Stale docs worse than no docs
- Delete obsolete documentation

**4. Write for Audience**
- Developer documentation: Technical, detailed
- API documentation: Examples, contracts
- User documentation: Task-oriented, simple

## Documentation Types

### 1. Code Comments

**When to comment:**

**DO comment:**
```csharp
// ✅ Explains non-obvious business logic
// We must check license expiry 30 days ahead to allow renewal time
// per legal requirements in contract clause 7.2
if (license.ExpiryDate <= DateTime.UtcNow.AddDays(30))
{
    await SendRenewalNotificationAsync(license);
}

// ✅ Explains complex algorithm
// Boyer-Moore string search algorithm for performance on large texts
// Average case O(n/m), worst case O(nm)
var index = BoyerMooreSearch(text, pattern);

// ✅ Explains workaround
// HACK: MongoDB driver doesn't support GroupBy with $lookup in same pipeline
// See: https://jira.mongodb.org/browse/CSHARP-1234
var grouped = items.ToList().GroupBy(x => x.CategoryId);

// ✅ Documents public API
/// <summary>
/// Gets employee by ID with department and manager relationships loaded.
/// </summary>
/// <param name="id">Employee ID</param>
/// <param name="ct">Cancellation token</param>
/// <returns>Employee with relationships loaded</returns>
/// <exception cref="PlatformNotFoundException">Employee not found</exception>
public static async Task<Employee> GetByIdWithRelationsAsync(
    this IPlatformQueryableRootRepository<Employee, string> repo,
    string id,
    CancellationToken ct = default)
```

**DON'T comment:**
```csharp
// ❌ States the obvious
// Get employee by ID
var employee = await repo.GetByIdAsync(id, ct);

// ❌ Explains what code clearly shows
// Loop through employees
foreach (var emp in employees)
{
    // Set employee status to active
    emp.Status = Status.Active;
}

// ❌ Outdated comment (worse than no comment)
// TODO: Add validation (already implemented)
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
```

**XML Documentation (C# Public APIs):**
```csharp
/// <summary>
/// Represents an employee in the system with department and role information.
/// </summary>
/// <remarks>
/// Employees must belong to a company and department. The status determines
/// whether the employee can access the system.
/// </remarks>
public sealed class Employee : RootAuditedEntity<Employee, string, string>
{
    /// <summary>
    /// Gets or sets the employee's full name.
    /// </summary>
    /// <value>
    /// A non-empty string containing the employee's first and last name.
    /// Maximum length is 100 characters.
    /// </value>
    public string Name { get; set; } = "";

    /// <summary>
    /// Creates an expression to filter employees by company.
    /// </summary>
    /// <param name="companyId">The company ID to filter by</param>
    /// <returns>An expression that filters employees belonging to the specified company</returns>
    /// <example>
    /// <code>
    /// var expr = Employee.OfCompanyExpr("01HQVCXYZ123");
    /// var employees = await repo.GetAllAsync(expr, ct);
    /// </code>
    /// </example>
    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;
}
```

**JSDoc (TypeScript Public APIs):**
```typescript
/**
 * Service for managing employee certifications.
 *
 * @remarks
 * Handles CRUD operations for certifications including expiry tracking.
 *
 * @example
 * ```typescript
 * const certs = await this.certificationApi.getByEmployee(employeeId);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CertificationApiService extends PlatformApiService {
    /**
     * Gets all certifications for a specific employee.
     *
     * @param employeeId - The employee ID
     * @returns Observable of certification array
     *
     * @throws {HttpErrorResponse} 404 if employee not found
     * @throws {HttpErrorResponse} 403 if user lacks permissions
     */
    getByEmployee(employeeId: string): Observable<Certification[]> {
        return this.get(`/employee/${employeeId}`);
    }
}
```

### 2. README Files

**Project Root README:**
```markdown
# EasyPlatform

> .NET 9 + Angular 19 Development Platform Framework

## Quick Start

### Prerequisites
- .NET 9 SDK
- Node.js 20+
- Docker Desktop
- MongoDB 7.0+ / SQL Server 2022 / PostgreSQL 15+

### Installation

1. Clone repository
   ```bash
   git clone https://github.com/your-org/EasyPlatform.git
   cd EasyPlatform
   ```

2. Start infrastructure
   ```bash
   docker-compose -f src/platform-example-app.docker-compose.yml up -d
   ```

3. Run backend
   ```bash
   dotnet build EasyPlatform.sln
   dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
   ```

4. Run frontend
   ```bash
   cd src/PlatformExampleAppWeb
   npm install
   nx serve playground-text-snippet
   ```

5. Open browser: http://localhost:4200

## Architecture

[Brief overview with link to detailed docs]

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Claude AI Instructions](CLAUDE.md)
- [Backend Patterns](docs/claude/backend-patterns.md)
- [Frontend Patterns](docs/claude/frontend-patterns.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE)
```

**Feature README:**
```markdown
# Employee Certification Tracking

Tracks employee certifications with expiry dates and automatic notifications.

## Features

- Add/edit/delete certifications
- Expiry date warnings (30 days ahead)
- Automatic status updates (Active/Expiring/Expired)
- File upload for certificates
- Email notifications on expiry

## Architecture

### Backend

**Domain:**
- `Certification` entity (RootAuditedEntity)
- `CertificationStatus` enum

**Commands:**
- `SaveCertificationCommand` - Create/update
- `DeleteCertificationCommand` - Delete

**Queries:**
- `GetCertificationsByEmployeeQuery` - List by employee
- `GetExpiringCertificationsQuery` - Get expiring soon

**Background Jobs:**
- `CheckExpiringCertificationsJob` - Daily at 3 AM

**Events:**
- `SendNotificationOnCertificationExpiringHandler`

### Frontend

**Components:**
- `CertificationListComponent` - Display list
- `CertificationFormComponent` - Create/edit

**Services:**
- `CertificationApiService` - API calls
- `CertificationStore` - State management

## Usage

### Backend

```csharp
// Get certifications for employee
var certifications = await repo.GetByEmployeeIdAsync(employeeId, ct);

// Save certification
var result = await Cqrs.SendAsync(new SaveCertificationCommand
{
    EmployeeId = "123",
    Name = "AWS Certified Solutions Architect",
    IssueDate = new DateTime(2024, 1, 1),
    ExpiryDate = new DateTime(2027, 1, 1)
});
```

### Frontend

```typescript
// Load certifications
this.store.loadByEmployee(employeeId);

// Subscribe to state
this.store.certifications$.subscribe(certs => {
    console.log('Certifications:', certs);
});
```

## API Reference

See [API Documentation](#api-documentation)

## Testing

```bash
# Backend tests
dotnet test --filter "FullyQualifiedName~Certification"

# Frontend tests
nx test employee
```

## Database Schema

### Certification Collection (MongoDB)

```json
{
    "_id": "01HQVCXYZ123",
    "employeeId": "01HQVCABC456",
    "name": "AWS Certified Solutions Architect",
    "issueDate": "2024-01-01T00:00:00Z",
    "expiryDate": "2027-01-01T00:00:00Z",
    "status": 1,
    "fileId": "01HQVCDEF789",
    "createdDate": "2024-01-01T10:00:00Z",
    "lastUpdatedDate": "2024-01-01T10:00:00Z",
    "createdBy": "user123",
    "lastUpdatedBy": "user123"
}
```

## Configuration

```json
// appsettings.json
{
    "Certification": {
        "ExpiryWarningDays": 30,
        "MaxFileSize": 5242880,
        "AllowedFileTypes": [".pdf", ".jpg", ".png"]
    }
}
```
```

### 3. API Documentation

**OpenAPI/Swagger (Auto-generated):**
```csharp
// Program.cs
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Employee Service API",
        Version = "v1",
        Description = "Employee management API with certification tracking",
        Contact = new OpenApiContact
        {
            Name = "Support Team",
            Email = "support@example.com"
        }
    });

    // Include XML comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);
});
```

**API Endpoint Documentation:**
```csharp
/// <summary>
/// Save (create or update) a certification
/// </summary>
/// <param name="cmd">Certification details</param>
/// <returns>Saved certification details</returns>
/// <response code="200">Certification saved successfully</response>
/// <response code="400">Validation error</response>
/// <response code="401">Unauthorized</response>
/// <response code="403">Forbidden - insufficient permissions</response>
/// <response code="500">Internal server error</response>
/// <remarks>
/// Sample request:
///
///     POST /api/Certification
///     {
///         "employeeId": "01HQVCABC456",
///         "name": "AWS Certified Solutions Architect",
///         "issueDate": "2024-01-01T00:00:00Z",
///         "expiryDate": "2027-01-01T00:00:00Z"
///     }
///
/// Sample response:
///
///     {
///         "certification": {
///             "id": "01HQVCXYZ123",
///             "employeeId": "01HQVCABC456",
///             "name": "AWS Certified Solutions Architect",
///             "issueDate": "2024-01-01T00:00:00Z",
///             "expiryDate": "2027-01-01T00:00:00Z",
///             "status": 1
///         }
///     }
///
/// </remarks>
[HttpPost]
[ProducesResponseType(typeof(SaveCertificationCommandResult), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
public async Task<IActionResult> Save([FromBody] SaveCertificationCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));
```

**API Documentation Page:**
```markdown
# Employee Service API

Base URL: `https://api.example.com/v1`

## Authentication

All endpoints require JWT bearer token:

```http
Authorization: Bearer <token>
```

## Endpoints

### Certifications

#### Get Certifications by Employee

```http
GET /api/Certification/employee/{employeeId}
```

**Parameters:**
- `employeeId` (path, required): Employee ID

**Response:**
```json
[
    {
        "id": "01HQVCXYZ123",
        "employeeId": "01HQVCABC456",
        "name": "AWS Certified",
        "issueDate": "2024-01-01T00:00:00Z",
        "expiryDate": "2027-01-01T00:00:00Z",
        "status": 1
    }
]
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Employee not found

#### Save Certification

```http
POST /api/Certification
```

**Request Body:**
```json
{
    "id": "01HQVCXYZ123",
    "employeeId": "01HQVCABC456",
    "name": "AWS Certified",
    "issueDate": "2024-01-01T00:00:00Z",
    "expiryDate": "2027-01-01T00:00:00Z"
}
```

**Response:**
```json
{
    "certification": {
        "id": "01HQVCXYZ123",
        "employeeId": "01HQVCABC456",
        "name": "AWS Certified",
        "issueDate": "2024-01-01T00:00:00Z",
        "expiryDate": "2027-01-01T00:00:00Z",
        "status": 1
    }
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions

## Error Responses

All errors return consistent format:

```json
{
    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
    "title": "Validation Error",
    "status": 400,
    "errors": {
        "Name": ["Name is required"],
        "ExpiryDate": ["Expiry date must be after issue date"]
    }
}
```
```

### 4. Architecture Decision Records (ADR)

**ADR Template:**
```markdown
# ADR-001: Use MongoDB for Employee Service

## Status
Accepted

## Context
Employee service needs to store employee data with flexible schema for custom fields.
Options considered:
1. SQL Server (existing infrastructure)
2. MongoDB (document database)
3. PostgreSQL (JSON support)

## Decision
Use MongoDB for employee service storage.

## Rationale
1. **Flexible Schema**: Custom fields per company without migrations
2. **Performance**: Fast reads for large datasets
3. **Platform Support**: Easy.Platform.MongoDB provides patterns
4. **Scalability**: Horizontal scaling for multi-tenant
5. **Developer Experience**: Familiar LINQ syntax

Tradeoffs:
- ❌ No ACID transactions across collections
- ❌ Complex joins require multiple queries
- ✅ Better performance for document-centric queries
- ✅ Schema evolution without migrations

## Consequences

### Positive
- Custom fields implementation simple
- Fast employee list queries
- Easy horizontal scaling

### Negative
- Cross-collection transactions require workarounds
- Team needs MongoDB expertise
- Additional infrastructure to manage

## Implementation
- Use `IPlatformQueryableRootRepository<Employee, string>`
- Store related entities in same document when possible
- Use message bus for cross-service data sync

## Alternatives Considered
**SQL Server:** Rejected due to schema rigidity for custom fields
**PostgreSQL:** Considered viable, but MongoDB better fits document model

## References
- [Easy.Platform.MongoDB documentation]
- [MongoDB Best Practices]

## Date
2024-01-15

## Authors
- John Doe (@johndoe)

## Reviewers
- Jane Smith (@janesmith)
```

**ADR Index:**
```markdown
# Architecture Decision Records

## Active
- [ADR-001](adr/001-use-mongodb.md) - Use MongoDB for Employee Service
- [ADR-002](adr/002-message-bus.md) - RabbitMQ for Cross-Service Communication
- [ADR-003](adr/003-cqrs-pattern.md) - CQRS for Command/Query Separation

## Deprecated
- [ADR-004](adr/004-rest-api.md) - REST API over GraphQL (superseded by ADR-008)

## Proposed
- [ADR-005](adr/005-event-sourcing.md) - Event Sourcing for Audit Trail
```

### 5. Change Documentation

**CHANGELOG.md:**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Employee certification tracking feature
- Background job for expiring certification notifications

### Changed
- Employee API now includes certification count

### Fixed
- Bug #456: Employee save returns 500 when department null

## [1.2.0] - 2024-01-15

### Added
- Department management
- Role-based access control
- Employee import from CSV

### Changed
- Updated to .NET 9
- Migrated to Angular 19

### Deprecated
- Old authentication API (use OAuth 2.0)

### Removed
- Legacy employee search endpoint

### Fixed
- Performance issue with large employee lists
- Memory leak in notification service

### Security
- Fixed SQL injection vulnerability in search

## [1.1.0] - 2023-12-01

### Added
- Employee profiles
- Avatar upload
```

**Migration Guide:**
```markdown
# Migration Guide: v1.1 to v1.2

## Breaking Changes

### 1. Authentication API

**Old:**
```csharp
POST /api/auth/login
{
    "username": "user",
    "password": "pass"
}
```

**New:**
```csharp
POST /api/auth/oauth/token
{
    "grant_type": "password",
    "username": "user",
    "password": "pass",
    "client_id": "web-app"
}
```

**Migration Steps:**
1. Update API calls to new OAuth endpoint
2. Store refresh token for session renewal
3. Update logout to revoke token

### 2. Employee Search Endpoint

**Removed:** `GET /api/employee/search?q={query}`

**Use Instead:** `POST /api/employee/search`
```csharp
{
    "searchText": "query",
    "filters": { ... }
}
```

## Database Migrations

### Required Migrations
```bash
# Backup database
mongodump --db EmployeeDb --out backup/

# Run migration
dotnet run --project Migrator -- --from 1.1 --to 1.2

# Verify
dotnet run --project Migrator -- --verify
```

### Manual Steps
1. Update appsettings.json with new OAuth config
2. Generate client credentials
3. Update CORS origins

## Configuration Changes

**appsettings.json:**
```diff
{
-  "Authentication": {
-    "Type": "Basic"
-  },
+  "Authentication": {
+    "Type": "OAuth",
+    "Authority": "https://auth.example.com",
+    "ClientId": "web-app"
+  }
}
```

## Feature Flags

Enable new features gradually:
```csharp
"FeatureFlags": {
    "NewAuthEnabled": true,
    "CertificationTracking": false
}
```

## Rollback Plan

If issues occur:
```bash
# Restore database
mongorestore --db EmployeeDb backup/EmployeeDb

# Revert code
git checkout v1.1.0

# Restart services
docker-compose restart
```

## Support

Questions? Contact: support@example.com
```

### 6. User Guides

**Quick Start Guide:**
```markdown
# Employee Management - Quick Start

## Creating an Employee

1. Navigate to **Employees** → **New Employee**
2. Fill in required fields:
   - Name (required)
   - Email (required, must be unique)
   - Department (required)
   - Role (optional)
3. Click **Save**

![Create Employee Screenshot](images/create-employee.png)

## Adding Certifications

1. Open employee profile
2. Click **Certifications** tab
3. Click **Add Certification**
4. Fill in details:
   - Certification name
   - Issue date
   - Expiry date
   - Upload certificate (PDF, max 5MB)
5. Click **Save**

## Managing Expiring Certifications

### Viewing Expiring Certifications

1. Navigate to **Certifications** → **Expiring Soon**
2. See list of certifications expiring within 30 days
3. Click certification to view details

### Email Notifications

You'll receive email 30 days before certification expires:

**Subject:** Certification Expiring Soon: [Certification Name]

**Body:**
> Your certification [Name] expires on [Date].
> Please renew before expiry to maintain compliance.

## FAQs

**Q: How do I edit an employee?**
A: Click employee name → Edit button → Make changes → Save

**Q: Can I bulk import employees?**
A: Yes, go to Employees → Import → Upload CSV

**Q: Who can add certifications?**
A: Admins, Managers, and the employee themselves

## Troubleshooting

**Problem:** Employee save fails with "Department required"
**Solution:** Select a department from dropdown before saving

**Problem:** File upload fails
**Solution:** Ensure file is PDF format and under 5MB

## Need Help?

- Email: support@example.com
- Help Desk: https://help.example.com
- Training Videos: https://training.example.com
```

## [CRITICAL] Code Evidence Requirements

**All feature documentation MUST include verifiable code evidence.** This is non-negotiable.

### Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Evidence Verification Table

All test cases and code references must include evidence verification:

| Entity/Component | Documented Lines | Actual Lines | Status |
|------------------|------------------|--------------|--------|
| `Entity.cs` | L6-15 | L6-15 | ✅ Verified |
| `Handler.cs` | L140-156 | L140-156 | ✅ Verified |

### Status Indicators

- ✅ **Verified**: Line numbers confirmed by reading source
- ⚠️ **Stale**: Code changed, line numbers need refresh
- ❌ **Missing**: No evidence provided

### Valid vs Invalid Evidence

| ✅ Valid | ❌ Invalid |
|----------|-----------|
| `ErrorMessage.cs:83` | `{FilePath}:{LineRange}` (template) |
| `Handler.cs:42-52` | `SomeFile.cs` (no line number) |
| `service.ts:115-118` | "Based on CQRS pattern" (vague) |

### Evidence Sources by Content Type

| Content Type | Primary Evidence Source |
|--------------|------------------------|
| Validation errors | `{Module}.Application/Common/Constants/ErrorMessage.cs` |
| Entity properties | `{Entity}.cs` with line numbers |
| API endpoints | Controller + Handler files |
| Frontend behavior | `*.service.ts`, `*.component.ts` |

---

## Documentation Checklist

### New Feature Documentation

- [ ] Code comments on complex logic
- [ ] XML/JSDoc on public APIs
- [ ] README in feature folder
- [ ] API endpoint documentation
- [ ] Examples in code comments
- [ ] Architecture decision recorded (if applicable)
- [ ] CHANGELOG updated
- [ ] User guide updated (if user-facing)
- [ ] Migration guide (if breaking changes)

### Code Evidence (MANDATORY)

- [ ] **EVERY test case has Evidence field** with `file:line` format
- [ ] **No template placeholders** remain (`{FilePath}`, `{LineRange}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Status column included** (✅/⚠️/❌) for verification tables
- [ ] **Edge case errors match** constants from `ErrorMessage.cs`

### Code Review Documentation Check

- [ ] Public APIs have XML/JSDoc comments
- [ ] Complex algorithms explained
- [ ] TODO comments have issue numbers
- [ ] Deprecated code marked with alternatives
- [ ] Examples provided for non-obvious usage
- [ ] All code references have verified line numbers

## Documentation Tools

### Auto-generated Docs

**Backend (Swagger):**
```bash
# Generate API docs
dotnet swagger tofile --output swagger.json bin/Debug/net9.0/Api.dll v1
```

**Frontend (Compodoc):**
```bash
# Generate component docs
npm install -g @compodoc/compodoc
compodoc -p tsconfig.json -s
```

### Markdown Linting

```bash
npm install -g markdownlint-cli
markdownlint "**/*.md"
```

### Documentation Site (MkDocs)

```yaml
# mkdocs.yml
site_name: EasyPlatform Documentation
theme: material

nav:
  - Home: index.md
  - Getting Started:
      - Installation: getting-started/installation.md
      - Quick Start: getting-started/quick-start.md
  - Backend:
      - Architecture: backend/architecture.md
      - Patterns: backend/patterns.md
      - API Reference: backend/api.md
  - Frontend:
      - Components: frontend/components.md
      - State Management: frontend/stores.md
  - ADRs: adr/index.md
```

```bash
# Serve docs locally
mkdocs serve

# Build static site
mkdocs build
```

## Documentation Anti-Patterns

### ❌ Don't

```csharp
// Loop through employees
foreach (var emp in employees)
{
    // Process employee
    ProcessEmployee(emp);
}
```

```markdown
# Feature X

This feature does something.

## How to use

Use the feature by using it.
```

```csharp
// TODO: Fix this
// HACK: Temporary workaround
// NOTE: Check this later
```

### ✅ Do

```csharp
// Process employees in batches to avoid memory pressure on large datasets
// Batch size tuned based on load testing (see ADR-023)
foreach (var batch in employees.Chunk(100))
{
    await ProcessBatchAsync(batch);
}
```

```markdown
# Employee Certification Tracking

Automatically tracks certification expiry dates and sends notifications.

## Features
- Add/edit/delete certifications
- Expiry warnings (30 days)
- Email notifications

## Usage

1. Navigate to employee profile
2. Click Certifications tab
3. Add certification with expiry date
4. System automatically sends reminder 30 days before expiry
```

```csharp
// TODO(#456): Optimize query performance - current implementation scans full collection
// Target: Reduce from 2s to <500ms by adding compound index on (companyId, status, createdDate)
```

## References

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Architecture Decision Records](https://adr.github.io/)
