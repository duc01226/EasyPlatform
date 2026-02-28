# bravoINSIGHTS - Analytics & Business Intelligence

## Overview

bravoINSIGHTS is a comprehensive analytics and business intelligence platform designed for enterprise HR and talent management systems. It provides organizations with powerful tools to create, manage, and share interactive dashboards, visualizations, and reports. The module enables data-driven decision-making through flexible data sources, customizable visualizations, and collaborative analytics capabilities.

**Key Capabilities:**
- Multi-format dashboard creation and management
- Advanced tile-based visualization system with charts, metrics, and filters
- Data source integration and querying
- Role-based access control and dashboard sharing
- Real-time data aggregation and analytics
- Template-based dashboard generation
- Color scheme customization

## Architecture Overview

bravoINSIGHTS follows a microservice architecture with Clear Architecture layers:

```
Backend:  Analyze.Service (ASP.NET Core)
          ├── Controllers (API endpoints)
          ├── Application (CQRS Commands/Queries)
          ├── Domain (Entities, Value Objects)
          └── Infrastructure (Data Access, External Services)

Data Store: MongoDB (Primary), SQL Server (Secondary)
Authentication: OAuth 2.0 / Role-based authorization
```

## Sub-Modules

### 1. Dashboard Management

**Description:** Core module for creating, editing, viewing, and managing dashboards. Provides comprehensive lifecycle management for dashboard objects including creation from templates, direct creation, and persistence.

#### Features

##### 1.1 Create Dashboard
- **Description:** Create a new blank dashboard with a specified name. Initializes dashboard with default settings and empty pages.
- **Backend API:** `DashboardController.CreateDashboard`
- **Commands:** `CreateDashboardCommand`
- **HTTP Method:** POST `/api/dashboards`
- **Request Body:**
  ```json
  {
    "name": "Sales Analytics Dashboard"
  }
  ```
- **Response:** `DashboardModel` with auto-generated ID
- **Authorization:** SubscriptionClaimAuthorize (requires write access)
- **Business Workflow:**
  1. User initiates dashboard creation UI
  2. User enters dashboard name and configuration
  3. System validates dashboard name (non-empty, unique per company)
  4. System creates dashboard entity with default page structure
  5. System returns created dashboard for further configuration

##### 1.2 Create Dashboard from Template
- **Description:** Instantly generate a dashboard from a predefined sample template. Automatically populates dashboards with tiles, data sources, and visualizations.
- **Backend API:** `DashboardController.CreateSampleDashboard`
- **Commands:** `CreateSampleDashboardCommand`
- **HTTP Method:** POST `/api/dashboards:create-sample`
- **Response:** `DashboardModel` with populated tiles
- **Business Workflow:**
  1. User selects sample template from template gallery
  2. System retrieves template configuration with predefined tiles
  3. System clones template into new dashboard instance
  4. System links data sources to new dashboard
  5. System displays dashboard with sample visualizations ready for use

##### 1.3 Create Dashboard from Data Source
- **Description:** Auto-generate dashboard visualization from a selected data source. System analyzes data structure and creates appropriate tiles automatically.
- **Backend API:** `DashboardController.CreateDashboardFromDataSource`
- **Commands:** `CreateDashboardFromDataSourceCommand`
- **HTTP Method:** POST `/api/dashboards:create-dashboard-by-datasource`
- **Request Body:**
  ```json
  {
    "dataSourceId": "ds123",
    "dashboardName": "Auto-Generated Report"
  }
  ```
- **Response:** `DashboardWithTilesModel`
- **Business Workflow:**
  1. User selects data source for dashboard generation
  2. System analyzes data source schema and field types
  3. System generates appropriate tile types (charts, metrics, filters)
  4. System creates dashboard with auto-generated tiles and layouts
  5. System returns complete dashboard structure for preview and customization

##### 1.4 List Dashboards
- **Description:** Retrieve all accessible dashboards for the current user with optional filtering by external data source.
- **Backend API:** `DashboardController.ListDashboards`
- **Queries:** `ListDashboardsQuery`
- **HTTP Method:** GET `/api/dashboards`
- **Query Parameters:**
  - `externalDataSourceId` (optional): Filter by data source ID
- **Response:** `ListDashboardsQueryResult` (List of `DashboardModel`)
- **Authorization:** SubscriptionClaimAuthorize (read-only)
- **Business Workflow:**
  1. System retrieves all dashboards accessible to user
  2. System applies company and role-based filtering
  3. System optionally filters by data source if specified
  4. System returns sorted and paginated dashboard list
  5. User displays dashboard list in UI with search/filter options

##### 1.5 Get Dashboard Details
- **Description:** Retrieve specific dashboard metadata and configuration without tile details.
- **Backend API:** `DashboardController.GetDashboard`
- **Queries:** `GetDashboardQuery`
- **HTTP Method:** GET `/api/dashboards/{id}`
- **Path Parameters:**
  - `id`: Dashboard ID
- **Response:** `DashboardModel`
- **Business Workflow:**
  1. User opens dashboard details view
  2. System retrieves dashboard by ID with authorization check
  3. System verifies user has access rights to dashboard
  4. System returns dashboard metadata and configuration
  5. UI renders dashboard details and available actions

##### 1.6 Get Dashboard with Tiles
- **Description:** Retrieve complete dashboard structure including all associated tiles, pages, and visualization configurations. Full dashboard ready for rendering.
- **Backend API:** `DashboardController.GetDashboardWithTiles`
- **Queries:** `GetDashboardWithTilesQuery`
- **HTTP Method:** GET `/api/dashboards:with-tiles`
- **Query Parameters:**
  - `dashboardId`: Dashboard ID
- **Response:** `DashboardWithTilesModel` (includes nested `TileModel` array)
- **Business Workflow:**
  1. User opens dashboard for viewing/editing
  2. System retrieves dashboard with all associated tiles
  3. System loads tile configurations, data queries, and visual settings
  4. System applies user color scheme preferences
  5. System returns fully hydrated dashboard ready for rendering and data binding

##### 1.7 Get Dashboard by Share Link
- **Description:** Retrieve dashboard for public/shared viewing without authentication. Enables sharing dashboards via unique share links.
- **Backend API:** `DashboardController.GetDashboardWithTilesForShareByLink`
- **Queries:** `GetDashboardWithTilesByShareLinkQuery`
- **HTTP Method:** GET `/api/dashboards:with-tiles-for-share-by-link`
- **Query Parameters:**
  - `dashboardShareByLinkKey`: Share link token
- **Response:** `DashboardWithTilesModel`
- **Authorization:** No authentication required (uses share link key)
- **Business Workflow:**
  1. External user receives shared dashboard link
  2. System validates share link key and permissions
  3. System checks if share link is active and not expired
  4. System retrieves dashboard with tiles for public sharing
  5. System applies share link restrictions (read-only, limited data)

##### 1.8 Get Sample Template Dashboards
- **Description:** Retrieve list of available sample dashboard templates. Templates serve as starting points for new dashboards.
- **Backend API:** `DashboardController.GetSampleTemplateDashboards`
- **Queries:** `GetSampleTemplateDashboardsQuery`
- **HTTP Method:** GET `/api/dashboards:sample-template`
- **Response:** List of `DashboardModel` (template dashboards)
- **Business Workflow:**
  1. User opens template gallery
  2. System retrieves all sample templates with preview data
  3. System filters templates by user's organization context
  4. System returns template list with descriptions and thumbnails
  5. User selects template to instantiate from gallery

##### 1.9 Update Dashboard
- **Description:** Modify dashboard configuration including name, description, pages, and other metadata.
- **Backend API:** `DashboardController.UpdateDashboard`
- **Commands:** `UpdateDashboardCommand`
- **HTTP Method:** POST `/api/dashboards/{id}`
- **Path Parameters:**
  - `id`: Dashboard ID
- **Request Body:**
  ```json
  {
    "name": "Updated Dashboard Name",
    "description": "New description"
  }
  ```
- **Authorization:** SubscriptionClaimAuthorize (requires write access)
- **Business Workflow:**
  1. User modifies dashboard name, description, or settings
  2. System validates updates (name uniqueness, required fields)
  3. System applies role-based authorization checks
  4. System persists dashboard changes with audit trail
  5. System broadcasts dashboard update to connected clients

##### 1.10 Delete Dashboard
- **Description:** Soft-delete dashboard (mark as deleted, retain data). Deleted dashboards are hidden from user views but remain in system for audit purposes.
- **Backend API:** `DashboardController.SoftDeleteDashboard`
- **Commands:** `DeleteDashboardCommand`
- **HTTP Method:** DELETE `/api/dashboards/{id}`
- **Path Parameters:**
  - `id`: Dashboard ID
- **Authorization:** SubscriptionClaimAuthorize (requires write access)
- **Business Workflow:**
  1. User initiates dashboard deletion
  2. System verifies user has delete permission on dashboard
  3. System checks for dependent items (tiles, shares, etc.)
  4. System marks dashboard as deleted (soft delete)
  5. System removes dashboard from user's dashboard list

---

### 2. Tile Management (Visualization)

**Description:** Module for creating and managing individual visualization elements within dashboards. Tiles are the fundamental building blocks for data visualization, including charts, metrics, filters, and rich content.

#### Tile Types
- **Chart Tiles:** Bar, line, pie, area, scatter charts with customizable axes
- **Numeric Tiles:** KPI metrics, gauge charts, counters with compare functionality
- **Filter Tiles:** Dropdown, checkbox, date range filters for dashboard interactivity
- **Rich Text Tiles:** HTML content, markdown, embedded documentation
- **Group Tiles:** Container tiles for organizing related visualizations

#### Features

##### 2.1 Create Tile
- **Description:** Create a new visualization tile within a dashboard page. Supports multiple tile types with type-specific configurations.
- **Backend API:** `TileController.CreateTile`
- **Commands:** `CreateTileCommand`
- **HTTP Method:** POST `/api/tiles`
- **Request Body:**
  ```json
  {
    "dashboardId": "dash123",
    "pageId": "page1",
    "name": {"en": "Sales by Region"},
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
- **Response:** `TileModel` with generated tile ID
- **Business Workflow:**
  1. User selects tile type and adds to dashboard page
  2. User configures data source and query parameters
  3. User selects visualization type and appearance settings
  4. System validates tile configuration and data query
  5. System persists tile with position and sizing information
  6. System returns created tile and refreshes dashboard layout

##### 2.2 List Tiles for Dashboard Page
- **Description:** Retrieve all tiles belonging to a specific dashboard page, ordered by position.
- **Backend API:** `TileController.ListTiles`
- **Queries:** `ListTilesQuery`
- **HTTP Method:** GET `/api/tiles`
- **Query Parameters:**
  - `dashboardId`: Dashboard ID
  - `pageId`: Page ID within dashboard
- **Response:** List of `TileModel`
- **Business Workflow:**
  1. User opens dashboard page
  2. System retrieves all tiles for the page
  3. System orders tiles by position coordinates
  4. System returns tile definitions with data and settings
  5. UI renders tiles in correct positions with responsive layout

##### 2.3 Get Tile Details
- **Description:** Retrieve complete tile configuration including data query, visualization settings, and current data.
- **Backend API:** `TileController.GetTile`
- **Queries:** `GetTileQuery`
- **HTTP Method:** GET `/api/tiles/{id}`
- **Path Parameters:**
  - `id`: Tile ID
- **Response:** `TileModel`
- **Business Workflow:**
  1. User opens tile editing interface
  2. System retrieves tile configuration
  3. System executes data query to fetch current tile data
  4. System loads color scheme and visualization settings
  5. System returns tile with all details for editor UI

##### 2.4 Update Tile Configuration
- **Description:** Modify tile properties including name, data query, visualization settings, and styling.
- **Backend API:** `TileController.UpdateTile`
- **Commands:** `UpdateTileCommand`
- **HTTP Method:** POST `/api/tiles/{id}`
- **Path Parameters:**
  - `id`: Tile ID
- **Request Body:**
  ```json
  {
    "name": {"en": "Updated Tile Name"},
    "aggregateQuery": {...},
    "chartSettings": {...}
  }
  ```
- **Business Workflow:**
  1. User modifies tile configuration in editor
  2. System validates updated query and settings
  3. System executes test query to verify data availability
  4. System updates tile configuration with audit trail
  5. System notifies connected clients of tile update

##### 2.5 Update Tile Size and Position
- **Description:** Batch update multiple tiles' size and position coordinates on dashboard. Enables drag-and-drop layout editing.
- **Backend API:** `TileController.UpdateTilesSizeAndPosition`
- **Commands:** `UpdateTilesSizeAndPositionCommand`
- **HTTP Method:** POST `/api/tiles:updateSizeAndPosition`
- **Request Body:**
  ```json
  {
    "tiles": [
      {
        "id": "tile1",
        "width": 6,
        "height": 4,
        "positionX": 0,
        "positionY": 0
      }
    ]
  }
  ```
- **Business Workflow:**
  1. User drags and resizes tiles in dashboard editor
  2. System collects position and size updates
  3. System validates layout (no overlaps, within bounds)
  4. System batch updates all tile positions
  5. System persists layout changes immediately

##### 2.6 Update Tile Alignment
- **Description:** Auto-align tiles on dashboard using layout algorithms. Organizes tiles with even spacing and proper grid alignment.
- **Backend API:** `TileController.UpdateTileAlignment`
- **Commands:** `UpdateTileAlignmentCommand`
- **HTTP Method:** POST `/api/tiles/align`
- **Request Body:**
  ```json
  {
    "dashboardId": "dash123",
    "pageId": "page1",
    "alignmentType": "Grid"
  }
  ```
- **Business Workflow:**
  1. User clicks "Auto-Align" button in dashboard editor
  2. System analyzes all tiles on current page
  3. System applies grid-based layout algorithm
  4. System calculates optimal positions to eliminate gaps
  5. System batch updates tile positions with alignment

##### 2.7 Delete Tile
- **Description:** Remove tile from dashboard. Tiles are soft-deleted and can be restored from audit trail.
- **Backend API:** `TileController.DeleteTile`
- **Commands:** `DeleteTileCommand`
- **HTTP Method:** DELETE `/api/tiles/{id}`
- **Path Parameters:**
  - `id`: Tile ID
- **Business Workflow:**
  1. User selects "Delete" option on tile
  2. System confirms deletion with user
  3. System removes tile from dashboard page
  4. System adjusts layout if needed
  5. System persists deletion and updates dashboard view

---

### 3. Data Source Management

**Description:** Module for managing external data sources, query parameters, and data connectivity. Data sources are the foundation for all dashboard visualizations and analytics.

#### Features

##### 3.1 List Available Data Sources
- **Description:** Retrieve all data sources accessible to the current user. Includes system data sources and user-created custom sources.
- **Backend API:** `DataSourceController.ListDataSources`
- **Queries:** `ListDataSourcesQuery`
- **HTTP Method:** GET `/api/dataSources`
- **Query Parameters:**
  - `forEditTileId` (optional): Filter for tile-specific data sources
- **Response:** List of `ListDataSourcesQueryResultItem`
- **Business Workflow:**
  1. User opens data source selector in tile editor
  2. System retrieves all available data sources
  3. System filters by company and user permissions
  4. System includes data source metadata and field information
  5. User selects data source for tile visualization

##### 3.2 Get Data Source Fields
- **Description:** Retrieve all available fields from a specific data source. Includes field types, display names, and aggregation capabilities.
- **Backend API:** `DataSourceController.ListDataSourceFields`
- **Queries:** `ListDataSourceFieldsQuery`
- **HTTP Method:** GET `/api/dataSources/{id}/fields`
- **Path Parameters:**
  - `id`: Data Source ID
- **Query Parameters:**
  - `forEditTileId` (optional): Context for field availability
- **Response:** List of `ListDataSourceFieldsQueryResultItem`
- **Business Workflow:**
  1. User selects data source in tile editor
  2. System retrieves all available fields from data source
  3. System filters fields by access rights and data type
  4. System returns field metadata (type, aggregation support, etc.)
  5. User selects dimensions and measures for visualization

---

### 4. Access Control & Sharing

**Description:** Module for managing dashboard visibility, access rights, and sharing capabilities. Enables collaborative analytics with fine-grained permission control.

#### Features

##### 4.1 Save Dashboard Access Rights
- **Description:** Grant access to dashboard for specific users or user groups. Configure read-only or full edit permissions.
- **Backend API:** `DashboardAccessRightController.SaveManyByDashboard`
- **Commands:** `SaveDashboardAccessRightsCommand`
- **HTTP Method:** POST `/api/dashboardAccessRights:saveManyByDashboard/{dashboardId}/{language}`
- **Path Parameters:**
  - `dashboardId`: Dashboard ID
  - `language`: User language for email notifications
- **Request Body:**
  ```json
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
- **Response:** List of `DashboardAccessRightModel`
- **Business Workflow:**
  1. Dashboard owner opens sharing dialog
  2. Owner searches and selects users to share with
  3. Owner assigns access level (View or Edit)
  4. System validates user existence and company membership
  5. System sends notification emails to new users
  6. System persists access rights with audit trail

##### 4.2 List Dashboard Access Rights
- **Description:** Retrieve all users with access to a specific dashboard and their permission levels.
- **Backend API:** `DashboardAccessRightController.GetManyByDashboardId`
- **Queries:** `ListDashboardAccessRightsQuery`
- **HTTP Method:** GET `/api/dashboardAccessRights:byDashboardId/{dashboardId}`
- **Path Parameters:**
  - `dashboardId`: Dashboard ID
- **Response:** List of `DashboardAccessRightModel`
- **Business Workflow:**
  1. Dashboard owner opens sharing panel
  2. System retrieves all users with dashboard access
  3. System displays access level for each user
  4. System shows access grant date and grantor
  5. User can modify or revoke access from this list

##### 4.3 Delete Dashboard Access Rights
- **Description:** Revoke access to dashboard for specific users. Immediately removes user's ability to view or edit dashboard.
- **Backend API:** `DashboardAccessRightController.DeleteManyByDashboard`
- **Commands:** `DeleteDashboardAccessRightsCommand`
- **HTTP Method:** POST `/api/dashboardAccessRights:deleteManyByDashboard/{dashboardId}/{language}`
- **Path Parameters:**
  - `dashboardId`: Dashboard ID
  - `language`: User language
- **Request Body:**
  ```json
  [
    "user123",
    "user456"
  ]
  ```
- **Business Workflow:**
  1. Dashboard owner selects user to revoke access
  2. System confirms revocation with owner
  3. System removes user's access record
  4. System notifies revoked user of access removal
  5. System audits access revocation

##### 4.4 Check Data Source Access Right
- **Description:** Verify if user/tile has permission to access specific data source. Critical for row-level security and data governance.
- **Backend API:** `DataSourceAccessRightController.SaveManyByDashboard`
- **Queries:** `CheckDataSourceAccessRightOfTileQuery`
- **HTTP Method:** POST `/api/dataSourceAccessRights:checkAccessRightOfTile`
- **Request Body:**
  ```json
  {
    "tileId": "tile123",
    "dataSourceId": "ds123"
  }
  ```
- **Response:** Boolean (has access)
- **Business Workflow:**
  1. System loads tile with data source reference
  2. System evaluates user's permissions on data source
  3. System checks role-based access control rules
  4. System returns access determination
  5. Tile rendering depends on access result

---

### 5. Dashboard Sharing & Distribution

**Description:** Module for sharing dashboards with external users and managing public access. Enables secure sharing via share links with expiration and permission controls.

#### Features

##### 5.1 Get or Create Dashboard Share Settings
- **Description:** Retrieve or initialize sharing configuration for a dashboard. Controls public access, expiration, and viewing restrictions.
- **Backend API:** `DashboardShareSettingController.GetOrCreateDefaultDashboardShareSettingGet`
- **Queries:** `GetOrCreateDefaultDashboardShareSettingQuery`
- **HTTP Methods:** GET/POST `/api/dashboardShareSettings:get-or-create-default`
- **Query Parameters:**
  - `id`: Dashboard ID
- **Response:** `DashboardShareSettingModel`
- **Business Workflow:**
  1. User opens dashboard share settings
  2. System retrieves existing share settings or creates default
  3. System returns share configuration including expiration settings
  4. User can modify expiration date and view restrictions
  5. System persists updated share settings

##### 5.2 Update Dashboard Share Setting
- **Description:** Modify dashboard sharing configuration including expiration date, allowed viewers, and access restrictions.
- **Backend API:** `DashboardShareSettingController.UpdateDashboardShareSetting`
- **Commands:** `UpdateDashboardShareSettingCommand`
- **HTTP Method:** POST `/api/dashboardShareSettings/{id}`
- **Path Parameters:**
  - `id`: Dashboard ID
- **Request Body:**
  ```json
  {
    "isPublic": true,
    "expirationDate": "2025-12-31T23:59:59Z",
    "allowedUsers": ["user1", "user2"]
  }
  ```
- **Business Workflow:**
  1. User configures share settings (public, expiration, restrictions)
  2. System validates configuration (future expiration, valid users)
  3. System generates or updates share link key
  4. System persists share settings with audit trail
  5. System displays shareable link for distribution

---

### 6. Color Schemes & Customization

**Description:** Module for managing dashboard and tile color themes. Enables personalized visual customization across dashboards.

#### Features

##### 6.1 Get Color Schemes
- **Description:** Retrieve all available color schemes including system defaults and user-created custom schemes.
- **Backend API:** `ColorSchemeController.Get`
- **Queries:** `GetSystemAndMyColorSchemeQuery`
- **HTTP Method:** GET `/api/colorScheme`
- **Response:** List of `ColorSchemeModel`
- **Business Workflow:**
  1. User opens color scheme selector
  2. System retrieves system default schemes
  3. System retrieves user's custom color schemes
  4. System returns complete scheme list with color palettes
  5. User selects scheme for application

##### 6.2 Get Color Schemes for Dashboard
- **Description:** Retrieve color schemes applicable to specific dashboard. Includes dashboard's configured scheme and available alternatives.
- **Backend API:** `ColorSchemeController.GetForDashboard`
- **Queries:** `GetColorSchemesForDashboardQuery`
- **HTTP Method:** GET `/api/colorScheme:for-dashboard`
- **Query Parameters:**
  - `dashboardId`: Dashboard ID
  - `shareDashboardByLinkKey` (optional): Share link token
- **Response:** List of `ColorSchemeModel`
- **Business Workflow:**
  1. Dashboard viewer opens color scheme settings
  2. System retrieves applicable schemes for dashboard context
  3. System includes dashboard's current scheme
  4. System returns schemes compatible with dashboard data
  5. User applies selected scheme to dashboard

##### 6.3 Get Color Scheme for Tile
- **Description:** Retrieve color scheme applied to specific tile. Returns active scheme with color mapping details.
- **Backend API:** `ColorSchemeController.GetForTile`
- **Queries:** `GetColorSchemeForTileQuery`
- **HTTP Method:** GET `/api/colorScheme:for-tile`
- **Query Parameters:**
  - `tileId`: Tile ID
- **Response:** `ColorSchemeModel`
- **Business Workflow:**
  1. System loads tile for rendering
  2. System retrieves tile's assigned color scheme
  3. System resolves color scheme from cache or database
  4. System applies colors to visualization
  5. Tile renders with correct color mapping

##### 6.4 Save Custom Color Scheme
- **Description:** Create and save a custom color scheme. User can define custom color palettes and save for reuse.
- **Backend API:** `ColorSchemeController.Post`
- **Commands:** `SaveMyColorSchemeCommand`
- **HTTP Method:** POST `/api/colorScheme`
- **Request Body:**
  ```json
  {
    "name": "Corporate Blue",
    "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"],
    "description": "Custom corporate color scheme"
  }
  ```
- **Response:** `ColorSchemeModel`
- **Business Workflow:**
  1. User creates custom color scheme in UI editor
  2. User defines color palette for visualizations
  3. System validates color format and palette completeness
  4. System saves scheme with user ownership
  5. System makes scheme available for dashboard/tile assignment

##### 6.5 Delete Custom Color Scheme
- **Description:** Remove custom color scheme from user's library. System-default schemes cannot be deleted.
- **Backend API:** `ColorSchemeController.Delete`
- **Commands:** `DeleteMyColorSchemeCommand`
- **HTTP Method:** DELETE `/api/colorScheme/{id}`
- **Path Parameters:**
  - `id`: Color Scheme ID
- **Business Workflow:**
  1. User selects custom scheme for deletion
  2. System verifies scheme ownership
  3. System checks if scheme is in use (optional safeguard)
  4. System deletes scheme from database
  5. System removes from user's available schemes

---

### 7. Document & Data Aggregation

**Description:** Advanced query module for aggregating and searching across multiple documents in data sources. Provides flexible filtering, grouping, and analytics queries.

#### Features

##### 7.1 Aggregate Documents
- **Description:** Execute aggregation query against data source documents. Returns aggregated metrics, grouped data, and summary statistics.
- **Backend API:** `DocumentController.AggregateDocuments`
- **Queries:** `AggregateDocumentsQuery`
- **HTTP Method:** POST `/api/documents:aggregate`
- **Request Body:**
  ```json
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
- **Response:** `AggregateDocumentsResultModel`
- **Business Workflow:**
  1. Tile requests data for visualization
  2. System constructs aggregation query from tile configuration
  3. System applies user's access rights and row-level security
  4. System executes aggregation against data source
  5. System returns aggregated results for tile rendering

##### 7.2 Search Documents
- **Description:** Execute search query across data source documents. Returns matching documents with full-text search capabilities.
- **Backend API:** `DocumentController.SearchDocuments`
- **Queries:** `SearchDocumentsQuery`
- **HTTP Method:** POST `/api/documents:search`
- **Request Body:**
  ```json
  {
    "dataSourceIds": ["ds123"],
    "searchText": "employee name",
    "filters": [],
    "pageSize": 20,
    "pageNumber": 1
  }
  ```
- **Response:** `SearchDocumentsQueryResultModel`
- **Business Workflow:**
  1. Filter tile or search component requests data
  2. System constructs search query with filters and text
  3. System applies pagination and sorting
  4. System executes search against MongoDB/data source
  5. System returns matching documents for display

##### 7.3 Search Distinct Field Values
- **Description:** Retrieve distinct values for a specific field in data source. Used for filter dropdowns and value suggestions.
- **Backend API:** `DocumentController.SearchDistinctDocumentFieldValues`
- **Queries:** `SearchDistinctDocumentFieldValuesQuery`
- **HTTP Method:** GET `/api/documents:search-distinct-document-field-value-select-items`
- **Query Parameters:**
  - `dataSourceIds[]`: Array of data source IDs
  - `fieldName`: Field name to retrieve distinct values
  - `searchText`: Filter text for value matching
  - `skipCount`: Pagination offset
  - `maxResultCount`: Limit results
- **Response:** List of distinct values with display labels
- **Business Workflow:**
  1. Filter tile initializes dropdown component
  2. System queries distinct values from data source
  3. System applies search text filtering
  4. System returns paged result set
  5. UI populates dropdown with available values

##### 7.4 Aggregate Documents for Share Link
- **Description:** Execute aggregation query for shared dashboard (via share link). Applies share link restrictions and read-only mode.
- **Backend API:** `DocumentController.AggregateDocumentsByShareLink`
- **Queries:** `AggregateDocumentsForShareDashboardByLinkQuery`
- **HTTP Method:** GET `/api/documents:aggregate-for-share-dashboard-by-link`
- **Request Body:** (via custom model binder)
  ```json
  {
    "shareKey": "share-abc123",
    "aggregateQuery": {...}
  }
  ```
- **Business Workflow:**
  1. Shared dashboard loads tile data
  2. System validates share link key
  3. System applies share link restrictions to query
  4. System executes aggregation with limited visibility
  5. System returns filtered results for shared view

##### 7.5 Search Documents for Share Link
- **Description:** Execute search query for shared dashboard. Respects share link permissions and data visibility settings.
- **Backend API:** `DocumentController.SearchDocumentsForShareDashboardByLink`
- **Queries:** `SearchDocumentsForShareDashboardByLinkQuery`
- **HTTP Method:** POST `/api/documents:search-for-share-dashboard-by-link`
- **Business Workflow:**
  1. Shared dashboard filter tile requests data
  2. System validates share link and permissions
  3. System applies share link row-level security
  4. System executes search with restricted visibility
  5. System returns filtered documents for shared view

##### 7.6 Delete Documents
- **Description:** Delete documents from data source (admin only). Removes documents and triggers data refresh.
- **Backend API:** `DocumentController.DeleteDocuments`
- **Commands:** `DeleteDocumentsCommand`
- **HTTP Method:** POST `/api/documents:delete`
- **Authorization:** Admin role only
- **Request Body:**
  ```json
  {
    "dataSourceId": "ds123",
    "documentIds": ["doc1", "doc2"]
  }
  ```
- **Business Workflow:**
  1. Admin initiates document deletion
  2. System verifies admin authorization
  3. System deletes documents from data source
  4. System triggers data source refresh
  5. System updates all dependent dashboard tiles

---

### 8. Administration & System Management

**Description:** Administrative module for system configuration, data seeding, and platform management. Restricted to system administrators.

#### Features

##### 8.1 Re-seed Sample Data and Dashboards
- **Description:** Reset sample data sources and template dashboards to factory defaults. Useful for system initialization and demo resets.
- **Backend API:** `ManagementController.ReSeedBravoDataSourcesAndSampleDashboards`
- **Commands:** `ReSeedBravoDataSourcesAndSampleDashboardsCommand`
- **HTTP Method:** POST `/api/management/re-seed-bravo-datasources-dashboards`
- **Authorization:** Admin role only
- **Business Workflow:**
  1. Admin initiates sample data reset
  2. System verifies admin authorization
  3. System truncates sample data sources
  4. System recreates template dashboards
  5. System repopulates with default sample data
  6. System notifies completion to admin

---

### 9. User & Organization Management

**Description:** Module for managing user lists and organization context within analytics system.

#### Features

##### 9.1 Get Same Organization Users
- **Description:** Retrieve all users in the same organization as current user. Used for access control and user selection.
- **Backend API:** `UserController.GetSameOrganizationUsers`
- **Queries:** `GetSameOrganizationUsersQuery`
- **HTTP Method:** GET `/api/applicationUsers:sameOrganizationUsers`
- **Response:** List of `GetSameOrganizationUsersQueryResult`
- **Business Workflow:**
  1. Dashboard sharing dialog opens
  2. System retrieves users in same organization
  3. System filters out already shared users
  4. System returns available users for share selection
  5. Owner selects users to grant access

##### 9.2 Get Users for Dashboard Sharing
- **Description:** Retrieve list of users eligible for dashboard sharing in current organization context. Includes user contact and role information.
- **Backend API:** `UserController.GetUsersForDashboardSharing`
- **Queries:** `GetUsersForDashboardSharingQuery`
- **HTTP Method:** GET `/api/users/for-dasboard-access-right`
- **Response:** List of `GetUsersForDashboardSharingQueryResult`
- **Business Workflow:**
  1. User opens dashboard share dialog
  2. System retrieves eligible users from organization
  3. System includes user contact information
  4. System indicates existing share status
  5. User selects and configures access for users

---

## Data Models

### Core Entities

#### Dashboard
- **Fields:**
  - `id`: Unique identifier
  - `name`: Dashboard display name
  - `description`: Dashboard purpose and description
  - `companyId`: Owning organization
  - `createdBy`: Dashboard creator user ID
  - `createdDate`: Creation timestamp
  - `lastModifiedDate`: Last update timestamp
  - `isDeleted`: Soft delete flag
  - `pages`: Collection of dashboard pages
  - `type`: DashboardType (Standard, Template, Custom)

#### Tile
- **Fields:**
  - `id`: Unique identifier
  - `dashboardId`: Parent dashboard
  - `pageId`: Page within dashboard
  - `name`: Tile name (multilingual)
  - `description`: Tile description (multilingual)
  - `type`: TileType (BarChart, LineChart, Numeric, Filter, RichText, Group)
  - `width`: Display width in grid units
  - `height`: Display height in grid units
  - `positionX`: X-axis position
  - `positionY`: Y-axis position
  - `colorSchemeId`: Applied color scheme
  - `aggregateQuery`: Data query configuration
  - `chartSettings`: Visualization settings
  - `numericSettings`: KPI/metric settings
  - `childTiles`: Nested tiles (for Group tiles)

#### DataSource
- **Fields:**
  - `id`: Unique identifier
  - `name`: Display name
  - `type`: External system type (SAP, Salesforce, Custom DB, etc.)
  - `connectionString`: Data source connection details
  - `fields`: Available field definitions
  - `accessRights`: User/role access configuration
  - `isActive`: Active/inactive status

#### ColorScheme
- **Fields:**
  - `id`: Unique identifier
  - `name`: Scheme name
  - `colors`: Color palette array
  - `isSystem`: System vs. custom flag
  - `createdBy`: Owner user ID
  - `description`: Purpose and usage

#### DashboardAccessRight
- **Fields:**
  - `id`: Unique identifier
  - `dashboardId`: Dashboard reference
  - `userId`: User with access
  - `accessLevel`: Permission level (View, Edit, Admin)
  - `grantedDate`: When access was granted
  - `grantedBy`: User who granted access

#### DashboardShareSetting
- **Fields:**
  - `id`: Unique identifier
  - `dashboardId`: Dashboard reference
  - `shareKey`: Unique share link token
  - `isPublic`: Public access flag
  - `expirationDate`: Share expiration (optional)
  - `allowedUsers`: Restricted user list
  - `createdDate`: Creation timestamp

---

## API Integration Patterns

### Authentication & Authorization
- **Authorization:** OAuth 2.0 with role-based access control
- **Policies:**
  - `CompanyRoleAuthorizationPolicies.EmployeePolicy`: Standard employee access
  - `CompanyRoleAuthorizationPolicies.AdminPolicy`: Admin-only operations
  - `SubscriptionClaimAuthorize`: Subscription/feature flag checks
- **User Context:** Extracted from JWT claims with company and organizational unit scope

### Error Handling
- HTTP 401: Unauthorized (missing/invalid authentication)
- HTTP 403: Forbidden (insufficient permissions)
- HTTP 404: Not Found (resource doesn't exist)
- HTTP 400: Bad Request (validation failures)
- HTTP 200/201: Success responses with data

### Pagination & Filtering
- **Pagination:** `skipCount`, `maxResultCount` parameters
- **Sorting:** Field-based ordering with direction (ascending/descending)
- **Filtering:** Field-level filters with operators (equals, contains, greater than, etc.)
- **Full-Text Search:** Text search across document fields

### Caching Strategy
- Dashboard list: Short-term cache (5 minutes)
- Data source fields: Medium-term cache (15 minutes)
- Color schemes: Long-term cache (1 hour)
- Shared link data: Request-time validation, no cache

---

## Frontend Integration Points

### Component Architecture
- **Dashboard List View:** Displays accessible dashboards with search and filter
- **Dashboard Editor:** Grid-based layout editor for tile positioning and sizing
- **Tile Editor:** Configuration UI for data source selection and visualization settings
- **Sharing Dialog:** User selection and permission assignment
- **Color Scheme Selector:** Visual color palette picker
- **Data Source Connector:** Query builder and field mapping interface

### State Management
- Dashboard list and filter state
- Current dashboard editing context
- Tile selection and configuration
- User selections for sharing
- Color scheme preferences

### Real-time Updates
- WebSocket connections for collaborative editing (optional)
- Tile data refresh on filter changes
- Dashboard layout synchronization across clients

---

## Security Considerations

### Row-Level Security (RLS)
- Access rights enforced at data source level
- Field-level encryption for sensitive dimensions
- Data masking based on user roles

### Data Governance
- Audit trail for all dashboard changes
- Access right change logging
- Document deletion tracking

### Performance & Optimization
- Query result caching with TTL
- Aggregation optimization for large datasets
- Index management on frequently queried fields
- Connection pooling for data source connectivity

---

## Common Workflows

### Creating a New Dashboard with Visualization
1. User accesses dashboard creation
2. Creates new dashboard with name
3. Adds data source and selects fields
4. Creates visualization tile with aggregation query
5. Configures chart type and color scheme
6. Saves and previews dashboard
7. Shares dashboard with team members

### Sharing Dashboard Externally
1. Dashboard owner opens share settings
2. Configures public link and expiration
3. Generates shareable URL
4. Restricts visible data via filters
5. Shares link with external stakeholders
6. External viewers access read-only dashboard

### Modifying Dashboard Layout
1. Opens dashboard in edit mode
2. Drags tiles to new positions
3. Resizes tiles by dragging edges
4. Uses auto-align for even spacing
5. Previews responsive layout
6. Saves final layout

---

## Deployment & Configuration

### Environment Variables
- `AllowCorsOrigins`: Allowed CORS origins for frontend
- `Authentication.AuthorityUrl`: OAuth provider URL
- `Mongo.ConnectionString`: MongoDB connection string
- `Elasticsearch.ConnectionString`: Search engine connection
- `BravoInsightsLogoUrl`: Public logo URL

### Database Schema
- MongoDB collections for documents and dashboards
- Indexes on frequently queried fields (dashboardId, userId, companyId)
- Full-text search indexes for document queries

### Service Dependencies
- OAuth 2.0 authorization server
- MongoDB instance for data persistence
- Elasticsearch for advanced search (optional)
- External data source connections (SAP, Salesforce, etc.)

---

## Maintenance & Monitoring

### Key Metrics
- Query execution time for aggregations
- Data source connectivity health
- Dashboard access frequency
- Active user sessions

### Troubleshooting
- Verify data source connectivity
- Check access rights configuration
- Validate OAuth token expiration
- Monitor MongoDB connection pool
- Review query performance logs

---

## References

### Documentation Files
- **API-REFERENCE.md:** Complete REST API endpoint documentation with 39 endpoints
- **TROUBLESHOOTING.md:** Common issues, debugging steps, and FAQ
- **QUICK-START.md:** Quick navigation guide organized by user role
- **INDEX.md:** Documentation index and complete overview

### Related Services
- bravoTALENTS: Talent management core platform
- bravoSURVEYS: Survey and feedback system
- Easy.Platform: Framework core libraries

### API Documentation
- **API-REFERENCE.md:** Full endpoint specifications with examples
- Swagger/OpenAPI specification available at `/swagger`
- Interactive API explorer for endpoint testing

### Developer Resources
- Backend: `src/Services/bravoINSIGHTS/Analyze/`
- Frontend: `src/WebV2/apps/` (growth-for-company, employee)
- Domain Models: `Analyze.Domain/Entities/`
- CQRS Handlers: `Analyze.Application/UseCase[Commands|Queries]/`

### Support Resources
- **Troubleshooting:** See TROUBLESHOOTING.md for common issues and solutions
- **FAQ:** See TROUBLESHOOTING.md for 25+ frequently asked questions
- **Quick Navigation:** See QUICK-START.md for role-based guidance
- **Documentation Index:** See INDEX.md for complete overview

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Owner:** Documentation Team
**Status:** Published
