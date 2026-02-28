# bravoINSIGHTS API Reference

Complete API endpoint documentation for the bravoINSIGHTS analytics and business intelligence platform.

## Overview

bravoINSIGHTS exposes 39 REST API endpoints across 10 controllers, organized by functional domain. All endpoints follow REST conventions and return JSON responses.

**Base URL:** `/api/`

**Authentication:** OAuth 2.0 with JWT Bearer tokens

**Response Format:** JSON

---

## Controllers Summary

| Controller | Endpoints | Primary Purpose |
|-----------|-----------|-----------------|
| DashboardController | 10 | Dashboard CRUD operations and templates |
| TileController | 7 | Tile visualization management and positioning |
| DataSourceController | 2 | Data source access and field retrieval |
| DashboardAccessRightController | 3 | User access control and permissions |
| DashboardShareSettingController | 2 | Public sharing and link management |
| ColorSchemeController | 5 | Color theme creation and assignment |
| DocumentController | 6 | Data aggregation, search, and retrieval |
| ManagementController | 1 | System administration and data reseeding |
| UserController | 2 | User discovery and organization queries |
| DataSourceAccessRightController | 1 | Data source permission verification |

---

## 1. DashboardController (10 Endpoints)

Core dashboard management operations.

### 1.1 Create Dashboard

Create a new blank dashboard.

```http
POST /api/dashboards
Content-Type: application/json

{
  "name": "Sales Analytics Dashboard"
}
```

**Response:** 201 Created
```json
{
  "id": "dash123",
  "name": "Sales Analytics Dashboard",
  "companyId": "comp123",
  "createdBy": "user456",
  "createdDate": "2025-12-31T10:00:00Z",
  "lastModifiedDate": "2025-12-31T10:00:00Z",
  "pages": [],
  "type": "Standard",
  "isDeleted": false
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

**Status Codes:**
- 201: Dashboard created successfully
- 400: Invalid request (empty name, etc.)
- 401: Unauthorized
- 403: Forbidden

---

### 1.2 Create Dashboard from Template

Instantly generate a dashboard from a predefined template.

```http
POST /api/dashboards:create-sample
Content-Type: application/json
```

**Response:** 201 Created
```json
{
  "id": "dash124",
  "name": "Sample Dashboard",
  "pages": [...],
  "tiles": [...]
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

### 1.3 Create Dashboard from Data Source

Auto-generate dashboard from selected data source.

```http
POST /api/dashboards:create-dashboard-by-datasource
Content-Type: application/json

{
  "dataSourceId": "ds123",
  "dashboardName": "Auto-Generated Report"
}
```

**Response:** 201 Created
```json
{
  "id": "dash125",
  "name": "Auto-Generated Report",
  "tiles": [
    {
      "id": "tile1",
      "name": "Revenue by Region",
      "type": "BarChart"
    }
  ]
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

### 1.4 List Dashboards

Retrieve all dashboards accessible to current user.

```http
GET /api/dashboards?externalDataSourceId=ds123&skipCount=0&maxResultCount=10
```

**Query Parameters:**
- `externalDataSourceId` (optional): Filter by data source
- `skipCount` (optional): Pagination offset (default: 0)
- `maxResultCount` (optional): Limit results (default: 10)

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "dash123",
      "name": "Sales Analytics Dashboard",
      "description": "Regional sales metrics",
      "createdDate": "2025-12-31T10:00:00Z"
    }
  ],
  "totalCount": 1
}
```

**Authorization:** SubscriptionClaimAuthorize (read access required)

---

### 1.5 Get Dashboard Details

Retrieve specific dashboard metadata without tile details.

```http
GET /api/dashboards/{id}
```

**Path Parameters:**
- `id` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "id": "dash123",
  "name": "Sales Analytics Dashboard",
  "description": "Regional sales metrics",
  "companyId": "comp123",
  "createdBy": "user456",
  "createdDate": "2025-12-31T10:00:00Z",
  "lastModifiedDate": "2025-12-31T10:00:00Z",
  "pages": [],
  "type": "Standard",
  "isDeleted": false
}
```

**Status Codes:**
- 200: Success
- 404: Dashboard not found
- 403: Access denied

---

### 1.6 Get Dashboard with Tiles

Retrieve complete dashboard structure including all tiles and pages.

```http
GET /api/dashboards:with-tiles?dashboardId=dash123
```

**Query Parameters:**
- `dashboardId` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "id": "dash123",
  "name": "Sales Analytics Dashboard",
  "pages": [
    {
      "id": "page1",
      "name": "Overview"
    }
  ],
  "tiles": [
    {
      "id": "tile1",
      "name": "Sales by Region",
      "type": "BarChart",
      "width": 6,
      "height": 4,
      "positionX": 0,
      "positionY": 0,
      "colorSchemeId": "cs001",
      "aggregateQuery": {...},
      "chartSettings": {...}
    }
  ]
}
```

---

### 1.7 Get Dashboard by Share Link

Retrieve dashboard for public/shared viewing.

```http
GET /api/dashboards:with-tiles-for-share-by-link?dashboardShareByLinkKey=share-abc123
```

**Query Parameters:**
- `dashboardShareByLinkKey` (required): Share link token

**Response:** 200 OK (same structure as 1.6)

**Authorization:** No authentication required

**Status Codes:**
- 200: Success
- 404: Share link not found
- 410: Share link expired

---

### 1.8 Get Sample Template Dashboards

Retrieve list of available dashboard templates.

```http
GET /api/dashboards:sample-template
```

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "template1",
      "name": "Sales Dashboard",
      "description": "Pre-configured sales metrics",
      "preview": "..."
    }
  ]
}
```

---

### 1.9 Update Dashboard

Modify dashboard configuration.

```http
POST /api/dashboards/{id}
Content-Type: application/json

{
  "name": "Updated Dashboard Name",
  "description": "Updated description",
  "pages": [...]
}
```

**Path Parameters:**
- `id` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "id": "dash123",
  "name": "Updated Dashboard Name",
  "description": "Updated description",
  "lastModifiedDate": "2025-12-31T11:00:00Z"
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

### 1.10 Delete Dashboard

Soft-delete a dashboard.

```http
DELETE /api/dashboards/{id}
```

**Path Parameters:**
- `id` (required): Dashboard ID

**Response:** 204 No Content

**Authorization:** SubscriptionClaimAuthorize (write access required)

**Status Codes:**
- 204: Dashboard deleted successfully
- 404: Dashboard not found
- 403: Access denied

---

## 2. TileController (7 Endpoints)

Visualization tile management and positioning.

### 2.1 Create Tile

Create a new visualization tile within a dashboard page.

```http
POST /api/tiles
Content-Type: application/json

{
  "dashboardId": "dash123",
  "pageId": "page1",
  "name": {
    "en": "Sales by Region"
  },
  "type": "BarChart",
  "width": 6,
  "height": 4,
  "positionX": 0,
  "positionY": 0,
  "colorSchemeId": "cs001",
  "aggregateQuery": {
    "dataSourceId": "ds123",
    "dimensions": ["region"],
    "measures": ["sales"],
    "filters": []
  },
  "chartSettings": {
    "chartType": "BarChart",
    "xAxis": "region",
    "yAxis": "sales"
  }
}
```

**Response:** 201 Created
```json
{
  "id": "tile1",
  "dashboardId": "dash123",
  "name": "Sales by Region",
  "type": "BarChart",
  "width": 6,
  "height": 4,
  "positionX": 0,
  "positionY": 0
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

### 2.2 List Tiles for Dashboard Page

Retrieve all tiles for a specific dashboard page.

```http
GET /api/tiles?dashboardId=dash123&pageId=page1
```

**Query Parameters:**
- `dashboardId` (required): Dashboard ID
- `pageId` (required): Page ID
- `skipCount` (optional): Pagination offset
- `maxResultCount` (optional): Limit results

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "tile1",
      "name": "Sales by Region",
      "type": "BarChart",
      "positionX": 0,
      "positionY": 0,
      "width": 6,
      "height": 4
    }
  ],
  "totalCount": 1
}
```

---

### 2.3 Get Tile Details

Retrieve complete tile configuration.

```http
GET /api/tiles/{id}
```

**Path Parameters:**
- `id` (required): Tile ID

**Response:** 200 OK
```json
{
  "id": "tile1",
  "dashboardId": "dash123",
  "name": "Sales by Region",
  "type": "BarChart",
  "width": 6,
  "height": 4,
  "positionX": 0,
  "positionY": 0,
  "colorSchemeId": "cs001",
  "aggregateQuery": {
    "dataSourceId": "ds123",
    "dimensions": ["region"],
    "measures": ["sales"]
  },
  "chartSettings": {
    "chartType": "BarChart",
    "xAxis": "region",
    "yAxis": "sales"
  }
}
```

---

### 2.4 Update Tile Configuration

Modify tile properties and visualization settings.

```http
POST /api/tiles/{id}
Content-Type: application/json

{
  "name": {
    "en": "Updated Tile Name"
  },
  "aggregateQuery": {...},
  "chartSettings": {...}
}
```

**Path Parameters:**
- `id` (required): Tile ID

**Response:** 200 OK
```json
{
  "id": "tile1",
  "name": "Updated Tile Name",
  "lastModifiedDate": "2025-12-31T11:00:00Z"
}
```

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

### 2.5 Update Tile Size and Position

Batch update multiple tiles' dimensions and coordinates.

```http
POST /api/tiles:updateSizeAndPosition
Content-Type: application/json

{
  "tiles": [
    {
      "id": "tile1",
      "width": 6,
      "height": 4,
      "positionX": 0,
      "positionY": 0
    },
    {
      "id": "tile2",
      "width": 6,
      "height": 4,
      "positionX": 6,
      "positionY": 0
    }
  ]
}
```

**Response:** 200 OK
```json
{
  "updatedCount": 2,
  "tiles": [...]
}
```

---

### 2.6 Update Tile Alignment

Auto-align tiles on dashboard using layout algorithms.

```http
POST /api/tiles/align
Content-Type: application/json

{
  "dashboardId": "dash123",
  "pageId": "page1",
  "alignmentType": "Grid"
}
```

**Response:** 200 OK
```json
{
  "alignedCount": 5,
  "tiles": [...]
}
```

---

### 2.7 Delete Tile

Remove tile from dashboard.

```http
DELETE /api/tiles/{id}
```

**Path Parameters:**
- `id` (required): Tile ID

**Response:** 204 No Content

**Authorization:** SubscriptionClaimAuthorize (write access required)

---

## 3. DataSourceController (2 Endpoints)

Data source access and field management.

### 3.1 List Available Data Sources

Retrieve all data sources accessible to current user.

```http
GET /api/dataSources?forEditTileId=tile123&skipCount=0&maxResultCount=10
```

**Query Parameters:**
- `forEditTileId` (optional): Filter for tile-specific sources
- `skipCount` (optional): Pagination offset
- `maxResultCount` (optional): Limit results

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "ds123",
      "name": "Employee Database",
      "type": "MongoDB",
      "description": "Primary employee data source",
      "fieldCount": 45
    }
  ],
  "totalCount": 1
}
```

---

### 3.2 Get Data Source Fields

Retrieve all available fields from a data source.

```http
GET /api/dataSources/{id}/fields?forEditTileId=tile123
```

**Path Parameters:**
- `id` (required): Data Source ID

**Query Parameters:**
- `forEditTileId` (optional): Context for field availability

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "field1",
      "name": "region",
      "type": "String",
      "aggregatable": true,
      "searchable": true
    },
    {
      "id": "field2",
      "name": "salary",
      "type": "Number",
      "aggregatable": true,
      "searchable": false
    }
  ]
}
```

---

## 4. DashboardAccessRightController (3 Endpoints)

User access control and permission management.

### 4.1 Save Dashboard Access Rights

Grant access to dashboard for specific users.

```http
POST /api/dashboardAccessRights:saveManyByDashboard/{dashboardId}/{language}
Content-Type: application/json

[
  {
    "userId": "user123",
    "accessLevel": "Edit"
  },
  {
    "userId": "user456",
    "accessLevel": "View"
  }
]
```

**Path Parameters:**
- `dashboardId` (required): Dashboard ID
- `language` (required): User language for notifications (e.g., "en")

**Response:** 201 Created
```json
{
  "items": [
    {
      "id": "access1",
      "dashboardId": "dash123",
      "userId": "user123",
      "accessLevel": "Edit",
      "grantedDate": "2025-12-31T10:00:00Z",
      "grantedBy": "user789"
    }
  ]
}
```

**Authorization:** Dashboard owner or admin

---

### 4.2 List Dashboard Access Rights

Retrieve all users with access to a dashboard.

```http
GET /api/dashboardAccessRights:byDashboardId/{dashboardId}
```

**Path Parameters:**
- `dashboardId` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "access1",
      "dashboardId": "dash123",
      "userId": "user123",
      "accessLevel": "Edit",
      "grantedDate": "2025-12-31T10:00:00Z",
      "grantedBy": "user789"
    }
  ]
}
```

---

### 4.3 Delete Dashboard Access Rights

Revoke access to dashboard for specific users.

```http
POST /api/dashboardAccessRights:deleteManyByDashboard/{dashboardId}/{language}
Content-Type: application/json

[
  "user123",
  "user456"
]
```

**Path Parameters:**
- `dashboardId` (required): Dashboard ID
- `language` (required): User language for notifications

**Response:** 204 No Content

**Status Codes:**
- 204: Access revoked successfully
- 404: Dashboard not found
- 403: Access denied

---

## 5. DashboardShareSettingController (2 Endpoints)

Public sharing and link management.

### 5.1 Get or Create Dashboard Share Settings

Retrieve or initialize sharing configuration for a dashboard.

```http
GET /api/dashboardShareSettings:get-or-create-default?id=dash123
```

**Query Parameters:**
- `id` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "id": "share1",
  "dashboardId": "dash123",
  "shareKey": "share-abc123def456",
  "isPublic": false,
  "expirationDate": "2026-01-31T23:59:59Z",
  "allowedUsers": ["user123", "user456"],
  "createdDate": "2025-12-31T10:00:00Z"
}
```

---

### 5.2 Update Dashboard Share Setting

Modify dashboard sharing configuration.

```http
POST /api/dashboardShareSettings/{id}
Content-Type: application/json

{
  "isPublic": true,
  "expirationDate": "2026-01-31T23:59:59Z",
  "allowedUsers": ["user1", "user2"]
}
```

**Path Parameters:**
- `id` (required): Dashboard ID

**Response:** 200 OK
```json
{
  "id": "share1",
  "dashboardId": "dash123",
  "shareKey": "share-abc123def456",
  "isPublic": true,
  "expirationDate": "2026-01-31T23:59:59Z",
  "allowedUsers": ["user1", "user2"],
  "lastModifiedDate": "2025-12-31T11:00:00Z"
}
```

**Authorization:** Dashboard owner or admin

---

## 6. ColorSchemeController (5 Endpoints)

Color theme creation, retrieval, and assignment.

### 6.1 Get Color Schemes

Retrieve all available color schemes.

```http
GET /api/colorScheme
```

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "cs001",
      "name": "Default",
      "colors": ["#1f77b4", "#ff7f0e", "#2ca02c"],
      "isSystem": true,
      "description": "System default color scheme"
    },
    {
      "id": "cs002",
      "name": "Corporate Blue",
      "colors": ["#003366", "#0066cc", "#0099ff"],
      "isSystem": false,
      "createdBy": "user123"
    }
  ]
}
```

---

### 6.2 Get Color Schemes for Dashboard

Retrieve color schemes applicable to a specific dashboard.

```http
GET /api/colorScheme:for-dashboard?dashboardId=dash123&shareDashboardByLinkKey=share-abc123
```

**Query Parameters:**
- `dashboardId` (required): Dashboard ID
- `shareDashboardByLinkKey` (optional): Share link token

**Response:** 200 OK (same structure as 6.1)

---

### 6.3 Get Color Scheme for Tile

Retrieve color scheme applied to a specific tile.

```http
GET /api/colorScheme:for-tile?tileId=tile1
```

**Query Parameters:**
- `tileId` (required): Tile ID

**Response:** 200 OK
```json
{
  "id": "cs001",
  "name": "Default",
  "colors": ["#1f77b4", "#ff7f0e", "#2ca02c"],
  "isSystem": true
}
```

---

### 6.4 Save Custom Color Scheme

Create and save a custom color scheme.

```http
POST /api/colorScheme
Content-Type: application/json

{
  "name": "Corporate Blue",
  "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"],
  "description": "Custom corporate color scheme"
}
```

**Response:** 201 Created
```json
{
  "id": "cs003",
  "name": "Corporate Blue",
  "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"],
  "isSystem": false,
  "createdBy": "user123",
  "description": "Custom corporate color scheme",
  "createdDate": "2025-12-31T10:00:00Z"
}
```

**Authorization:** Authenticated user (creates personal scheme)

---

### 6.5 Delete Custom Color Scheme

Remove custom color scheme from user's library.

```http
DELETE /api/colorScheme/{id}
```

**Path Parameters:**
- `id` (required): Color Scheme ID

**Response:** 204 No Content

**Status Codes:**
- 204: Color scheme deleted successfully
- 404: Color scheme not found
- 403: Cannot delete system schemes

**Authorization:** Scheme owner or admin

---

## 7. DocumentController (6 Endpoints)

Data aggregation, search, and document retrieval.

### 7.1 Aggregate Documents

Execute aggregation query against data source documents.

```http
POST /api/documents:aggregate
Content-Type: application/json

{
  "dataSourceIds": ["ds123"],
  "dimensions": ["department", "region"],
  "measures": ["salary", "count"],
  "filters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "active"
    }
  ],
  "sort": [
    {
      "field": "salary",
      "direction": "descending"
    }
  ],
  "limit": 100
}
```

**Response:** 200 OK
```json
{
  "aggregatedData": [
    {
      "department": "Sales",
      "region": "North America",
      "salary": 5000000,
      "count": 150
    }
  ],
  "totalRecords": 450
}
```

**Authorization:** User must have access to data source

---

### 7.2 Search Documents

Execute search query across data source documents.

```http
POST /api/documents:search
Content-Type: application/json

{
  "dataSourceIds": ["ds123"],
  "searchText": "employee name",
  "filters": [],
  "pageSize": 20,
  "pageNumber": 1
}
```

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "doc1",
      "name": "John Employee",
      "department": "Sales",
      "salary": 80000
    }
  ],
  "totalCount": 156,
  "pageNumber": 1,
  "pageSize": 20
}
```

---

### 7.3 Search Distinct Field Values

Retrieve distinct values for a specific field.

```http
GET /api/documents:search-distinct-document-field-value-select-items?dataSourceIds[]=ds123&fieldName=region&searchText=&skipCount=0&maxResultCount=50
```

**Query Parameters:**
- `dataSourceIds[]` (required): Array of data source IDs
- `fieldName` (required): Field name
- `searchText` (optional): Filter text
- `skipCount` (optional): Pagination offset
- `maxResultCount` (optional): Limit results

**Response:** 200 OK
```json
{
  "items": [
    {
      "value": "North America",
      "label": "North America"
    },
    {
      "value": "Europe",
      "label": "Europe"
    },
    {
      "value": "Asia Pacific",
      "label": "Asia Pacific"
    }
  ],
  "totalCount": 3
}
```

---

### 7.4 Aggregate Documents for Share Link

Execute aggregation query for shared dashboard.

```http
GET /api/documents:aggregate-for-share-dashboard-by-link
Content-Type: application/json

{
  "shareKey": "share-abc123",
  "aggregateQuery": {
    "dataSourceIds": ["ds123"],
    "dimensions": ["region"],
    "measures": ["sales"]
  }
}
```

**Response:** 200 OK
```json
{
  "aggregatedData": [...],
  "totalRecords": 450
}
```

**Authorization:** No authentication required (uses share link validation)

---

### 7.5 Search Documents for Share Link

Execute search query for shared dashboard.

```http
POST /api/documents:search-for-share-dashboard-by-link
Content-Type: application/json

{
  "shareKey": "share-abc123",
  "searchQuery": {
    "dataSourceIds": ["ds123"],
    "searchText": "sales",
    "pageSize": 20,
    "pageNumber": 1
  }
}
```

**Response:** 200 OK (same structure as 7.2)

**Authorization:** No authentication required

---

### 7.6 Delete Documents

Delete documents from data source (admin only).

```http
POST /api/documents:delete
Content-Type: application/json

{
  "dataSourceId": "ds123",
  "documentIds": ["doc1", "doc2"]
}
```

**Response:** 200 OK
```json
{
  "deletedCount": 2,
  "remainingCount": 1248
}
```

**Authorization:** Admin role required

---

## 8. ManagementController (1 Endpoint)

System administration and data management.

### 8.1 Re-seed Sample Data and Dashboards

Reset sample data sources and template dashboards to factory defaults.

```http
POST /api/management/re-seed-bravo-datasources-dashboards
```

**Response:** 200 OK
```json
{
  "status": "success",
  "message": "Sample data and dashboards reset successfully",
  "dataSourcesSeeded": 5,
  "dashboardsSeeded": 8,
  "recordsCreated": 10000
}
```

**Authorization:** Admin role required

**Status Codes:**
- 200: Reset completed successfully
- 403: Admin role required

---

## 9. UserController (2 Endpoints)

User discovery and organization queries.

### 9.1 Get Same Organization Users

Retrieve all users in the same organization.

```http
GET /api/applicationUsers:sameOrganizationUsers
```

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "user123",
      "name": "John Smith",
      "email": "john@company.com",
      "department": "Sales"
    }
  ],
  "totalCount": 156
}
```

---

### 9.2 Get Users for Dashboard Sharing

Retrieve list of users eligible for dashboard sharing.

```http
GET /api/users/for-dasboard-access-right
```

**Response:** 200 OK
```json
{
  "items": [
    {
      "id": "user123",
      "name": "John Smith",
      "email": "john@company.com",
      "department": "Sales",
      "hasAccess": false
    }
  ],
  "totalCount": 156
}
```

---

## 10. DataSourceAccessRightController (1 Endpoint)

Data source permission verification.

### 10.1 Check Data Source Access Right

Verify if user/tile has permission to access specific data source.

```http
POST /api/dataSourceAccessRights:checkAccessRightOfTile
Content-Type: application/json

{
  "tileId": "tile123",
  "dataSourceId": "ds123"
}
```

**Response:** 200 OK
```json
{
  "hasAccess": true,
  "accessLevel": "Read",
  "dataSourceId": "ds123",
  "tileId": "tile123"
}
```

---

## Authentication & Authorization

### OAuth 2.0

All endpoints (except public share links) require OAuth 2.0 authentication.

**Header Format:**
```http
Authorization: Bearer {jwt_token}
```

### Authorization Policies

| Policy | Description | Required For |
|--------|-------------|--------------|
| `CompanyRoleAuthorizationPolicies.EmployeePolicy` | Standard employee access | Most read operations |
| `CompanyRoleAuthorizationPolicies.AdminPolicy` | Admin-only operations | Management, deletion |
| `SubscriptionClaimAuthorize` | Subscription/feature flag checks | Dashboard management |

### Access Levels

- **View:** Read-only access
- **Edit:** Full dashboard modification
- **Admin:** Full control including deletion and sharing

---

## Error Codes & Responses

### HTTP Status Codes

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| 200 | OK | Successful read operation |
| 201 | Created | Resource successfully created |
| 204 | No Content | Successful deletion or update |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (unique constraint) |
| 500 | Server Error | Unrecoverable server error |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Dashboard name is required",
    "details": ["name field cannot be empty"]
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `INVALID_REQUEST` | Validation error |
| `CONFLICT` | Resource already exists |
| `INTERNAL_ERROR` | Server error |

---

## Pagination & Filtering

### Pagination Parameters

```http
GET /api/dashboards?skipCount=0&maxResultCount=10
```

**Parameters:**
- `skipCount`: Number of records to skip (default: 0)
- `maxResultCount`: Maximum records to return (default: 10, max: 1000)

### Pagination Response

```json
{
  "items": [...],
  "totalCount": 156,
  "skipCount": 0,
  "maxResultCount": 10
}
```

---

## Caching Strategy

| Resource | TTL | Cache Level |
|----------|-----|------------|
| Dashboard List | 5 minutes | Client + Server |
| Data Source Fields | 15 minutes | Server only |
| Color Schemes | 1 hour | Client + Server |
| Share Link Data | No cache | Per-request validation |
| User Lists | 30 minutes | Server only |

---

## Rate Limiting

- **API Calls:** 1000 requests per hour per user
- **Aggregation Queries:** 100 concurrent requests
- **Search Operations:** 500 requests per hour

---

## Request/Response Examples

### Example 1: Create Dashboard and Add Tile

**Step 1: Create Dashboard**
```http
POST /api/dashboards
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Q4 Sales Report"
}
```

**Response:**
```json
{
  "id": "dash456",
  "name": "Q4 Sales Report",
  "createdDate": "2025-12-31T10:00:00Z"
}
```

**Step 2: Create Tile**
```http
POST /api/tiles
Content-Type: application/json
Authorization: Bearer {token}

{
  "dashboardId": "dash456",
  "pageId": "page1",
  "name": {"en": "Regional Sales"},
  "type": "BarChart",
  "width": 6,
  "height": 4,
  "positionX": 0,
  "positionY": 0,
  "aggregateQuery": {
    "dataSourceId": "ds123",
    "dimensions": ["region"],
    "measures": ["sales"]
  }
}
```

**Response:**
```json
{
  "id": "tile456",
  "dashboardId": "dash456",
  "name": "Regional Sales",
  "type": "BarChart"
}
```

### Example 2: Share Dashboard

**Step 1: Grant Access to User**
```http
POST /api/dashboardAccessRights:saveManyByDashboard/dash456/en
Content-Type: application/json
Authorization: Bearer {token}

[
  {
    "userId": "user789",
    "accessLevel": "View"
  }
]
```

**Response:**
```json
{
  "items": [
    {
      "id": "access456",
      "dashboardId": "dash456",
      "userId": "user789",
      "accessLevel": "View",
      "grantedDate": "2025-12-31T11:00:00Z"
    }
  ]
}
```

**Step 2: Enable Public Share Link**
```http
POST /api/dashboardShareSettings/dash456
Content-Type: application/json
Authorization: Bearer {token}

{
  "isPublic": true,
  "expirationDate": "2026-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "share456",
  "shareKey": "share-xyz789abc123",
  "isPublic": true,
  "expirationDate": "2026-01-31T23:59:59Z"
}
```

---

## Cross-References

- **Related Documentation:** See README.md for comprehensive feature details
- **Troubleshooting:** See TROUBLESHOOTING.md for common issues
- **Quick Navigation:** See QUICK-START.md for role-based guides
- **Complete Index:** See INDEX.md for documentation overview

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Owner:** Documentation Team
**Status:** Published

