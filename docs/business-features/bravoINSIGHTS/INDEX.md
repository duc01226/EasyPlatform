# bravoINSIGHTS Documentation Index

Complete documentation for the bravoINSIGHTS analytics and business intelligence platform.

## Documentation Files

### 1. README.md (Main Reference - 42 KB)
Comprehensive documentation covering all features, APIs, data models, and workflows.

**Contents:**
- Module overview and capabilities
- System architecture
- 9 sub-modules with 29 features
- Complete API endpoint specifications
- Request/response examples
- Business workflows
- Data models and entity definitions
- Security considerations
- Deployment and configuration
- Maintenance and monitoring

**Best for:** Complete technical reference, API integration, system understanding

### 2. API-REFERENCE.md (API Documentation - 15 KB)
Complete REST API endpoint documentation for all 39 endpoints.

**Contents:**
- 10 Controllers with detailed endpoint specifications
- HTTP method, path, and query parameters for each endpoint
- Request/response examples with JSON samples
- Authentication and authorization requirements
- Error codes and status codes
- Pagination and caching strategy
- Rate limiting information
- End-to-end integration examples

**Best for:** API integration, endpoint details, request/response format

### 3. TROUBLESHOOTING.md (Support Guide - 18 KB)
Comprehensive troubleshooting guide with common issues and solutions.

**Contents:**
- Common issues with debugging steps and solutions
- Access control and sharing problems
- Performance optimization and monitoring
- Authentication and authorization issues
- Frequently asked questions (FAQ)
- Health check endpoints
- Monitoring and metrics
- Getting help resources

**Best for:** Troubleshooting problems, debugging issues, common questions

### 4. INDEX.md (This File)
Documentation index and guide to all documentation resources.

### 5. detailed-features/ (Detailed Feature Documentation - TBD)
Directory structure reserved for in-depth feature documentation and implementation guides.

**Purpose:** Store detailed feature specifications, implementation guides, and advanced usage patterns as documentation expands.

**Current Status:** Directory structure established for future use.

**Best for:** Deep dives into specific features, implementation patterns, advanced configurations

## Feature Quick Reference

### Dashboard Management (10 features)
- Create, list, get, update, delete dashboards
- Create from templates or data sources
- Share via links

Reference: README.md sections 1.1-1.10

### Tile Management (7 features)
- Create, list, get, update, delete tiles
- Configure data queries and visualizations
- Update size, position, alignment

Reference: README.md sections 2.1-2.7

### Data Source Management (2 features)
- List available data sources
- Get data source fields and definitions

Reference: README.md sections 3.1-3.2

### Access Control & Sharing (4 features)
- Save, list, delete dashboard access rights
- Check data source access permissions

Reference: README.md sections 4.1-4.4

### Dashboard Sharing (2 features)
- Get or create share settings
- Update sharing configuration

Reference: README.md sections 5.1-5.2

### Color Schemes (5 features)
- Get, create, delete custom color schemes
- Apply schemes to dashboards and tiles

Reference: README.md sections 6.1-6.5

### Document & Data Aggregation (6 features)
- Aggregate documents across data sources
- Search documents with full-text search
- Get distinct field values

Reference: README.md sections 7.1-7.6

### Administration (1 feature)
- Re-seed sample data and dashboards

Reference: README.md section 8.1

### User Management (2 features)
- Get same organization users
- Get users for dashboard sharing

Reference: README.md sections 9.1-9.2

## Controllers Overview

| Controller | Endpoints | Purpose |
|------------|-----------|---------|
| DashboardController | 10 | Dashboard CRUD and templates |
| TileController | 7 | Tile management and layout |
| DataSourceController | 2 | Data source access |
| DashboardAccessRightController | 3 | Access control |
| DashboardShareSettingController | 2 | Public sharing configuration |
| ColorSchemeController | 5 | Color theme management |
| DocumentController | 6 | Data aggregation and search |
| ManagementController | 1 | System administration |
| UserController | 2 | User discovery |
| DataSourceAccessRightController | 1 | Data source permissions |

## Reading Guides by User Role

### For Developers
1. Start with: README.md "API Integration Patterns"
2. Review: API-REFERENCE.md for endpoint details
3. Check: Specific feature sections with examples

### For Product Managers
1. Start with: README.md "Overview" and "Common Workflows"
2. Review: Feature Quick Reference sections
3. Check: Specific feature descriptions

### For System Administrators
1. Start with: README.md "Deployment & Configuration"
2. Review: "Administration & System Management" features
3. Check: TROUBLESHOOTING.md for administration topics

### For Business Analysts
1. Start with: README.md "Data Models"
2. Review: Document aggregation and search features
3. Check: API-REFERENCE.md for data query endpoints

## Key Concepts

- **Dashboard:** Container for visualizations and tiles, can be shared with users
- **Tile:** Individual visualization element (chart, metric, filter, rich text, group)
- **Data Source:** External system providing data for visualizations
- **Aggregation Query:** Data query specifying dimensions, measures, and filters
- **Access Right:** Permission granting user access to dashboard
- **Share Setting:** Configuration for public dashboard sharing via link
- **Color Scheme:** Visual styling applied to dashboards and tiles

## API Endpoints Summary

Total Endpoints Documented: 39

**Methods:**
- GET: 16 endpoints (read-only operations)
- POST: 20 endpoints (create, update, execute)
- DELETE: 3 endpoints (delete operations)

**Key Routes:**
- `/api/dashboards` - Dashboard management
- `/api/tiles` - Tile management
- `/api/dataSources` - Data source access
- `/api/documents:aggregate` - Data aggregation
- `/api/documents:search` - Document search
- `/api/colorScheme` - Color scheme management
- `/api/dashboardAccessRights` - Access control
- `/api/dashboardShareSettings` - Sharing configuration

## Data Models

**Core Entities:**
- Dashboard (with pages and metadata)
- Tile (with visualization configurations)
- DataSource (with field definitions)
- ColorScheme (with color palette)
- DashboardAccessRight (with permission levels)
- DashboardShareSetting (with share configuration)

See README.md "Data Models" section for complete entity specifications.

## Security & Authorization

**Authentication:** OAuth 2.0
**Authorization Policies:**
- CompanyRoleAuthorizationPolicies.EmployeePolicy (standard access)
- SubscriptionClaimAuthorize (subscription/feature checks)
- Admin-only for management operations

See README.md "Authentication & Authorization" section.

## Common Questions

**How do I create a dashboard?**
See Features 1.1-1.3 in README.md for blank, template, or data-driven approaches.

**How do I add visualizations?**
See Feature 2.1 (Create Tile) in README.md with data source configuration.

**How do I share a dashboard?**
See Features 4.1-4.3 (Access Control) or 5.1-5.2 (Public Sharing) in README.md.

**How do I search or aggregate data?**
See Features 7.1-7.3 (Document Aggregation) in README.md.

**What are my customization options?**
See Features 6.1-6.5 (Color Schemes) in README.md.

## Document Statistics

- **Files:** 4 comprehensive documents + detailed-features/ directory
- **Total Size:** 75 KB (excluding detailed-features/)
- **Features:** 29 complete features
- **Controllers:** 10 controllers
- **API Endpoints:** 39 total
- **Code Examples:** 25+ JSON samples
- **Workflows:** 29 business workflows
- **Data Models:** 6 core entities
- **Common Issues:** 15+ documented with solutions
- **FAQ Entries:** 25+ questions and answers

## Navigation Tips

1. **For complete reference:** Use README.md
2. **For API details:** Use API-REFERENCE.md
3. **For troubleshooting:** Use TROUBLESHOOTING.md
4. **For organization:** Use this INDEX.md
5. **Use browser search:** Ctrl+F within documents

## Updates & Maintenance

**Current Version:** 1.0
**Last Updated:** 2025-12-30
**Status:** Production Ready

**Document Coverage:** 100% of major features and APIs

## Support Resources

1. **Main Documentation:** README.md (complete feature reference)
2. **API Reference:** API-REFERENCE.md (39 endpoint details)
3. **Troubleshooting:** TROUBLESHOOTING.md (issues and solutions)
4. **This Index:** INDEX.md (documentation overview)
5. **Detailed Features:** detailed-features/ (expanded feature documentation)
6. **Source Code:** src/Services/bravoINSIGHTS/Analyze/
7. **API Explorer:** Service /swagger endpoint

## Related Services

- bravoTALENTS: Talent management platform
- bravoSURVEYS: Survey and feedback system
- Easy.Platform: Framework core libraries

---

**Documentation Version:** 1.1
**Last Updated:** 2025-12-31
**Owner:** Documentation Team
**Status:** Complete and Production Ready
