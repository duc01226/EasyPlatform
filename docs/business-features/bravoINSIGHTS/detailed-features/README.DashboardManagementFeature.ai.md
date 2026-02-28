# Dashboard Management Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.DashboardManagementFeature.md](./README.DashboardManagementFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoINSIGHTS |
| Service | Analyze.Service |
| Database | SQL Server / MongoDB |
| Schema | Dashboards, Tiles, DashboardAccessRights, DashboardShareSettings |

### File Locations

```
Entities:    src/Services/bravoINSIGHTS/Analyze.Domain/Entities/{Dashboard,Tile,DashboardAccessRight}.cs
Commands:    src/Services/bravoINSIGHTS/Analyze.Application/UseCaseCommands/Dashboard/
Queries:     src/Services/bravoINSIGHTS/Analyze.Application/UseCaseQueries/Dashboard/
Controllers: src/Services/bravoINSIGHTS/Analyze.Service/Controllers/DashboardController.cs
Frontend:    src/WebV2/apps/bravo-insights-*/src/app/dashboard/
```

---

## Domain Model

### Entities

```
Dashboard : BaseSoftDeleteEntity<Dashboard>
├── Id: string (ULID)
├── Name: string (required)
├── OwnerId: string (creator)
├── Type: DashboardType (Normal | Sample | Company | SampleTemplate)
├── Pages: List<Page> (layout containers)
├── FilterFields: List<Field> (global filters)
├── IsHideGlobalFilter: bool
├── CompanyId: string (multi-tenant)
├── ProductScope: int?
├── SampleTemplateDashboardName: string
├── ForMainDataSourceId: string
├── Deleted: bool (soft delete flag)
└── Tiles: List<Tile> (lazy-loaded)

Tile : BaseEntity<Tile>
├── Id: string (ULID)
├── DashboardId: string (FK)
├── Type: TileType (Chart | Numeric | Group | RichText | Filter | Unknown)
├── Width: ushort (1-24 grid columns)
├── Height: ushort (1-12 grid rows)
├── PositionX: short (grid X coordinate)
├── PositionY: short (grid Y coordinate)
├── Name: LanguageString
├── Description: LanguageString
├── OwnerId: string
├── CustomLabels: List<FieldCustomLabel>
├── Align: TileAlignOptions
└── CreatedAt: DateTime

DashboardAccessRight : BaseEntity<DashboardAccessRight>
├── Id: string (userId:::dashboardId)
├── UserId: string
├── DashboardId: string
├── Right: AccessRight (None | Read | Write)
├── CreatedBy: string
└── CreatedAt: DateTime

Page
├── Id: string
├── Name: string
├── CreatedAt: DateTime
└── TileIds: List<string>

DashboardShareSetting
├── Id: string (dashboardId)
├── ShareByLinkEnabled: bool
└── ShareByLinkKey: string
```

### Value Objects / Enums

```
DashboardType: Normal | Sample | Company | SampleTemplate
TileType: Chart | Numeric | Group | RichText | Filter | Unknown
AccessRight: None | Read | Write
FieldCustomLabel { FieldId: string, Label: Dict<string, string> }
TileAlignOptions: Left | Center | Right
```

### Key Expressions

```csharp
// Dashboard ownership
public bool IsOwner(string userId)
    => userId == OwnerId && Type is DashboardType.Normal or DashboardType.Sample;

// Company dashboard access
public static Expression<Func<Dashboard, bool>> OfCompanyExpr(string companyId)
    => d => d.CompanyId == companyId && d.Type == DashboardType.Company;

// Template filter
public static Expression<Func<Dashboard, bool>> SampleTemplateExpr()
    => d => d.Type == DashboardType.SampleTemplate && d.Deleted == false;
```

---

## API Contracts

### Commands

```
POST /api/dashboards
├── Request:  { name: string }
├── Response: { id, name, ownerId, type: "Normal", pages: [{ id, name: "Untitled" }] }
├── Handler:  CreateDashboardCommandHandler.cs
└── Evidence: CreateDashboardCommand.cs:1-10

POST /api/dashboards/{id}
├── Request:  { name, filterFields[], isHideGlobalFilter }
├── Response: { dashboard: DashboardModel }
├── Handler:  UpdateDashboardCommandHandler.cs
└── Evidence: UpdateDashboardCommand.cs:1-12

DELETE /api/dashboards/{id}
├── Request:  { id }
├── Response: { success: bool }
├── Handler:  DeleteDashboardCommandHandler.cs
└── Evidence: DeleteDashboardCommand.cs

POST /api/dashboards:create-sample
├── Request:  { sourceDashboardId: string }
├── Response: { dashboard: DashboardModel }
├── Handler:  CreateSampleDashboardCommandHandler.cs
└── Evidence: CreateSampleDashboardCommand.cs

POST /api/dashboards:create-dashboard-by-datasource
├── Request:  { name, dataSourceId }
├── Response: { dashboard, tiles }
├── Handler:  CreateDashboardFromDataSourceCommandHandler.cs
└── Evidence: CreateDashboardFromDataSourceCommand.cs

POST /api/tiles
├── Request:  { dashboardId, type, name: LanguageString, width?, height? }
├── Response: { id, dashboardId, type, positionX, positionY }
├── Handler:  CreateTileCommandHandler.cs
└── Evidence: CreateTileCommand.cs:1-8

POST /api/tiles/{id}
├── Request:  { name, description, customLabels[] }
├── Response: { tile: TileModel }
├── Handler:  UpdateTileCommandHandler.cs
└── Evidence: UpdateTileCommand.cs

POST /api/tiles:update-size-and-position
├── Request:  [{ tileId, width, height, positionX, positionY }]
├── Response: [{ id, width, height, positionX, positionY }]
├── Handler:  UpdateTilesSizeAndPositionCommandHandler.cs
└── Evidence: UpdateTilesSizeAndPositionCommand.cs

DELETE /api/tiles/{id}
├── Request:  { id }
├── Handler:  DeleteTileCommandHandler.cs
└── Evidence: DeleteTileCommand.cs

POST /api/dashboard-access-rights
├── Request:  { dashboardId, userId, right: "Read"|"Write" }
├── Response: { accessRight: DashboardAccessRightModel }
├── Handler:  SaveDashboardAccessRightsCommandHandler.cs
└── Evidence: SaveDashboardAccessRightsCommand.cs
```

### Queries

```
GET /api/dashboards
├── Response: ListDashboardsQueryResult { items: DashboardModel[], totalCount }
├── Handler:  ListDashboardsQueryHandler.cs
└── Evidence: ListDashboardsQuery.cs

GET /api/dashboards/{id}
├── Response: DashboardModel
├── Handler:  GetDashboardQueryHandler.cs
└── Evidence: GetDashboardQuery.cs

GET /api/dashboards:with-tiles?dashboardId={id}
├── Response: { dashboard: DashboardModel, tiles: TileModel[] }
├── Handler:  GetDashboardWithTilesQueryHandler.cs
└── Evidence: GetDashboardWithTilesQuery.cs

GET /api/dashboards:sample-template
├── Response: DashboardModel[]
├── Handler:  GetSampleTemplateDashboardsQueryHandler.cs
└── Evidence: GetSampleTemplateDashboardsQuery.cs
```

### DTOs

```
DashboardModel : PlatformEntityDto<Dashboard, string>
├── id: string
├── name: string
├── ownerId: string
├── type: DashboardType
├── pages: PageModel[]
└── filterFields: Field[]

TileModel
├── id: string
├── dashboardId: string
├── type: TileType
├── width, height, positionX, positionY
└── name, description

DashboardWithTilesModel
├── dashboard: DashboardModel
└── tiles: TileModel[]

DashboardAccessRightModel
├── id: string
├── userId: string
├── right: AccessRight
└── createdBy: string
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-DM-001 | Dashboard name required, non-empty | `CreateDashboardCommand.cs:Validate()` |
| BR-DM-002 | User must have subscription to create dashboard | `CreateDashboardCommandHandler.cs:30` |
| BR-DM-003 | Dashboard owner set to current user on creation | `CreateDashboardCommandHandler.cs:35` |
| BR-DM-004 | User can only delete own dashboards (soft delete) | `DeleteDashboardCommand.cs` |
| BR-DM-005 | Soft-deleted dashboards hidden from queries | `Dashboard.cs:Deleted` |
| BR-TL-001 | Tile width must be 1-24 (grid columns) | `Tile.cs:Validate()` |
| BR-TL-002 | Tile height must be 1-12 (grid rows) | `Tile.cs:Validate()` |
| BR-TL-003 | Tile PositionX + Width cannot exceed 24 | `UpdateTilesSizeAndPositionCommand.cs:Validate()` |
| BR-TL-004 | Tile auto-arranged if position not provided | `CreateTileCommandHandler.cs` |
| BR-AC-001 | Dashboard owner has full Read/Write/Delete | `Dashboard.IsOwner()` |
| BR-AC-002 | User with AccessRight.Write can edit dashboard | `DashboardAccessRight.Right == Write` |
| BR-AC-003 | User with AccessRight.Read can view only | `DashboardAccessRight.Right == Read` |
| BR-AC-004 | Public share link requires DashboardShareSetting.ShareByLinkEnabled=true | `DashboardShareSetting.cs` |
| BR-FL-001 | Global filter fields apply to all tiles using those fields | `Dashboard.FilterFields` |
| BR-FL-002 | IsHideGlobalFilter=true hides filter UI | `Dashboard.IsHideGlobalFilter` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Dashboard name required")
        .And(_ => Width >= 1 && Width <= 24, "Tile width must be 1-24")
        .And(_ => PositionX + Width <= 24, "Exceeds grid width");

// Async validation
await validation
    .AndAsync(r => repo.GetByIdAsync(r.DashboardId, ct).EnsureFoundAsync())
    .AndAsync(r => userService.GetUserAsync(r.UserId, ct).EnsureFoundAsync("User not found"));
```

---

## Service Boundaries

### Produces Events

```
DashboardEntityEventBusMessage → [DataSource, User Services]
├── Producer: Platform auto-generated
├── Triggers: Create, Update, Delete on Dashboard
├── Payload: DashboardEntityEventBusMessagePayload
└── Evidence: Dashboard.cs:Entity framework auto-triggers

TileEntityEventBusMessage → [Dependent Services]
├── Producer: Platform auto-generated
├── Triggers: Create, Update, Delete on Tile
└── Payload: TileEntityEventBusMessagePayload
```

### Consumes Events

```
None (Dashboard is data sink, not consumer of external events)
```

### Cross-Service Integration

```
↓ Calls (synchronous)
DataSourceService: Get field definitions for auto-dashboard generation
UserService: Get user context, roles, determine access rights
RequestContext: Current user ID, roles, company ID

→ References (navigation)
Field (from DataSources): Used in FilterFields, Tile configuration
User (from User Service): Owner/Creator reference, access right users
```

### Critical Data Dependencies

```
Dashboard → Pages (1:many, owned)
Dashboard → Tiles (1:many, owned)
Dashboard → FilterFields (1:many, Field references)
Dashboard → DashboardAccessRights (1:many, user permissions)
Tile → DashboardAccessRights (indirectly via dashboard)
```

---

## Critical Paths

### Create Dashboard

```
1. Validate command
   ├── BR-DM-001: Name required
   └── BR-DM-002: Subscription required (skip for Admin)
2. Generate ID → Ulid.NewUlid()
3. Create Dashboard entity
   ├── Type = Normal
   ├── OwnerId = CurrentUserId
   ├── CreatedAt = Clock.UtcNow
   └── Pages = [new Page { Name = "Untitled" }]
4. Save via repository.CreateAsync()
5. Return DashboardModel with dashboard ID + default page
```

Evidence: `CreateDashboardCommandHandler.cs:30-43`

### Add Tile to Dashboard

```
1. Validate command (BR-TL-001, BR-TL-002, BR-TL-003)
   ├── Dashboard exists
   ├── Type valid (Chart|Numeric|Group|RichText|Filter)
   └── Width/Height within bounds
2. Retrieve existing tiles for auto-arrange
3. Create Tile subtype based on TileType (ChartTile, NumericTile, etc.)
4. Call Tile.AutoArrangeTiles(tiles) if no position provided (BR-TL-004)
   └── Auto-positions tile avoiding overlaps
5. Add tile ID to dashboard page's TileIds
6. Save tile via repository.CreateAsync()
7. Return TileModel with assigned position
```

Evidence: `CreateTileCommandHandler.cs`, `Tile.AutoArrangeTiles()`

### Share Dashboard

```
1. Validate dashboard exists and user is owner
2. For user-based sharing:
   ├── Validate target user exists (BR-AC-001)
   ├── Create DashboardAccessRight
   │   ├── Id = DashboardAccessRight.CreateId(userId, dashboardId)
   │   ├── Right = Read|Write
   │   └── CreatedBy = CurrentUserId
   └── Save via repository.CreateAsync()
3. For public link sharing:
   ├── Create/Update DashboardShareSetting
   ├── Set ShareByLinkEnabled = true
   ├── Generate unique ShareByLinkKey
   └── Return shareable URL
```

Evidence: `SaveDashboardAccessRightsCommandHandler.cs`

### Clone Dashboard from Template

```
1. Load source SampleTemplate dashboard by ID
   └── Validate Type == SampleTemplate
2. Load all template tiles
3. Create new Dashboard via Dashboard.CreateNewSampleDashboard()
   ├── Generate new Dashboard ID (Type=Sample)
   ├── Set OwnerId = CurrentUserId
   ├── Duplicate all pages with new IDs
   ├── Duplicate all tiles with new IDs
   └── Maintain page/tile structure
4. Save new dashboard and tiles
5. Return new DashboardModel
6. Template changes don't affect cloned copies
```

Evidence: `CreateSampleDashboardCommandHandler.cs`, `Dashboard.CreateNewSampleDashboard()`

### Auto-Generate Dashboard from Data Source

```
1. Validate data source exists and user has access
2. Retrieve data source metadata (field definitions)
3. Generate tiles based on field types
   ├── Numeric fields → NumericTile
   └── Dimension fields → ChartTile
4. Create Dashboard entity
5. Call Tile.AutoArrangeTiles() to position all tiles
6. Save dashboard with generated tiles
7. Tiles linked to data source for live data
```

Evidence: `CreateDashboardFromDataSourceCommandHandler.cs`

### Update Tile Size/Position

```
1. Validate dimensions (BR-TL-001, BR-TL-002, BR-TL-003)
   ├── Width: 1-24
   ├── Height: 1-12
   └── PositionX + Width ≤ 24
2. Batch update multiple tiles (prevents N+1)
3. Persist all position changes
4. Return updated tile positions
```

Evidence: `UpdateTilesSizeAndPositionCommandHandler.cs`

### Delete Dashboard (Soft Delete)

```
1. Load dashboard by ID
2. Validate user is owner or has write access
3. Set Deleted = true
4. Save via repository.UpdateAsync()
5. Dashboard hidden from all queries (WHERE Deleted = 0)
6. Can be recovered via database query by admin
```

Evidence: `DeleteDashboardCommand.cs`, `Dashboard.cs:Deleted`

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-DM-001 | Create dashboard with valid name | Dashboard created, owner set, default page added, Type=Normal |
| TC-DM-002 | Create dashboard with empty name | Validation error: "Dashboard name required" |
| TC-DM-003 | Add tile to dashboard | Tile positioned, added to page, auto-arrange applied |
| TC-DM-004 | Tile width exceeds max | Validation error: "Tile width must be 1-24" |
| TC-DM-005 | Tile PositionX + Width > 24 | Validation error: "Exceeds grid width" |
| TC-DM-006 | Share dashboard with user | AccessRight created with correct ID format (userId:::dashboardId) |
| TC-DM-007 | User without write access tries to edit | 403 Forbidden |
| TC-DM-008 | Clone SampleTemplate | New dashboard created (Type=Sample), tiles duplicated, owner set |
| TC-DM-009 | Auto-generate from data source | Dashboard created with tiles based on field types |
| TC-DM-010 | Delete dashboard (soft delete) | Deleted=true, hidden from queries, recoverable |
| TC-DM-011 | Update multiple tile positions | Batch update persists all positions |
| TC-DM-012 | Access role-based dashboards | HrManager/OrgUnitManager can write Company type dashboards |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Create with subscription check | Admin bypasses subscription check | `CreateDashboardCommandHandler.cs:33` |
| Empty tile collection on clone | Creates dashboard with 0 tiles | `CreateSampleDashboardCommandHandler.cs` |
| Dashboard with 100+ tiles | Uses pagination/virtual scrolling in UI | Performance consideration |
| Global filter hidden | IsHideGlobalFilter=true prevents UI rendering | `Dashboard.IsHideGlobalFilter` |
| Non-existent user in share | Validation error before creating AccessRight | `SaveDashboardAccessRightsCommandHandler.cs` |
| Concurrent tile updates | Last write wins (no optimistic lock) | Update handler persists final state |
| Deleted dashboard accessed | 404 Not Found (filtered in query) | `WHERE Deleted = 0` |

---

## Usage Notes

### When to Use This File

- Implementing new dashboard features or API endpoints
- Adding tile types or modifying grid system
- Debugging access control or sharing issues
- Understanding entity relationships quickly
- Code review context for dashboard-related PRs

### When to Use Full Documentation

- Understanding complete business requirements
- Stakeholder/product presentations
- Comprehensive test planning (full test data sets)
- Troubleshooting production incidents
- Understanding UI workflows and user stories
- Security architecture deep dive

---

*Generated from comprehensive documentation. For full details, see [README.DashboardManagementFeature.md](./README.DashboardManagementFeature.md)*
