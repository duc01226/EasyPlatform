# bravoINSIGHTS Troubleshooting Guide

Comprehensive troubleshooting guide for common issues, debugging steps, and frequently asked questions in the bravoINSIGHTS analytics platform.

---

## Common Issues

### Dashboard & Visualization Issues

#### Issue: Dashboard Not Loading

**Symptoms:**
- Dashboard page shows loading spinner indefinitely
- 404 error when accessing dashboard
- Tiles display as "No Data"

**Possible Causes:**
1. Dashboard ID is incorrect
2. User lacks permissions to access dashboard
3. Data source connectivity issues
4. Database connection timeout

**Debugging Steps:**

1. **Verify Dashboard Exists**
   ```bash
   # Check if dashboard exists in database
   GET /api/dashboards/{dashboard-id}
   ```
   - If 404 returned, dashboard doesn't exist
   - Verify dashboard ID from dashboard list

2. **Check User Permissions**
   ```bash
   # List dashboards accessible to current user
   GET /api/dashboards
   ```
   - If target dashboard not in list, user lacks access
   - Contact dashboard owner to request access

3. **Verify Data Source Health**
   ```bash
   # List available data sources
   GET /api/dataSources
   ```
   - If no data sources listed, verify data source configuration
   - Check data source connection strings in configuration

4. **Check Browser Console**
   - Look for JavaScript errors
   - Check network tab for failed API calls
   - Verify OAuth token expiration

**Solution:**
- For permission issues: Request dashboard access from owner
- For missing dashboard: Create new dashboard or restore from backup
- For data source issues: Check database connectivity and credentials
- For token expiration: Re-authenticate and refresh page

---

#### Issue: Tiles Display as "No Data"

**Symptoms:**
- Tile area is blank or shows "No Data Available"
- Charts don't render even though data source is configured
- Aggregation query fails silently

**Possible Causes:**
1. Data source returns empty result set
2. Query dimensions/measures don't match available fields
3. Filters are too restrictive
4. Data source access rights restriction

**Debugging Steps:**

1. **Verify Query Configuration**
   ```bash
   # Get tile details
   GET /api/tiles/{tile-id}
   ```
   - Check aggregateQuery.dimensions exist in data source
   - Verify aggregateQuery.measures are valid
   - Review filters for correct field names

2. **Test Data Source Directly**
   ```bash
   # Get available fields in data source
   GET /api/dataSources/{data-source-id}/fields
   ```
   - Verify dimension fields are present
   - Verify measure fields are present
   - Check field names match exactly (case-sensitive)

3. **Test Aggregation Query**
   ```bash
   # Execute test aggregation
   POST /api/documents:aggregate
   {
     "dataSourceIds": ["ds-id"],
     "dimensions": ["field1"],
     "measures": ["field2"],
     "filters": [],
     "limit": 100
   }
   ```
   - If empty result, data doesn't match query criteria
   - Try removing filters to test basic connectivity

4. **Check Data Source Access Rights**
   ```bash
   # Verify tile has access to data source
   POST /api/dataSourceAccessRights:checkAccessRightOfTile
   {
     "tileId": "tile-id",
     "dataSourceId": "ds-id"
   }
   ```
   - If hasAccess=false, user lacks data source permission

**Solution:**
- Verify field names match available fields exactly
- Remove or simplify filters to test connectivity
- Check data source contains records matching filters
- Request data source access if permission-denied

---

#### Issue: Tile Update Not Persisting

**Symptoms:**
- Tile configuration changes are not saved
- Tile reverts to previous state after refresh
- Update returns 200 but changes don't appear

**Possible Causes:**
1. Concurrent updates creating race condition
2. User lacks edit permissions
3. Tile configuration validation failing silently
4. Network timeout during save

**Debugging Steps:**

1. **Verify User Permissions**
   ```bash
   # Check current user's dashboard access level
   GET /api/dashboardAccessRights:byDashboardId/{dashboard-id}
   ```
   - Look for user entry with accessLevel = "Edit"
   - If only "View" access, cannot modify

2. **Validate Tile Configuration**
   ```bash
   # Get current tile state
   GET /api/tiles/{tile-id}
   ```
   - Compare with local changes
   - Verify all required fields are present
   - Check for schema validation errors

3. **Check Network Traffic**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Attempt tile update
   - Check response body for error details
   - Look for 400/403 status codes

4. **Test Tile Update**
   ```bash
   # Simple tile name update test
   POST /api/tiles/{tile-id}
   {
     "name": {"en": "Test Update"}
   }
   ```
   - If fails, check response error message
   - If succeeds, issue is with other fields

**Solution:**
- Request edit access from dashboard owner
- Simplify tile configuration to minimal changes
- Check for validation errors in response
- Retry update after waiting 5 seconds (cache timeout)

---

### Access Control & Sharing Issues

#### Issue: Cannot Access Shared Dashboard

**Symptoms:**
- Share link returns 404 or 410 error
- Shared dashboard shows "Access Denied"
- Share link times out loading

**Possible Causes:**
1. Share link expired
2. Share link key is incorrect
3. Dashboard was deleted
4. User removed from allowed list
5. Share link never activated

**Debugging Steps:**

1. **Verify Share Link Format**
   - Share link should be: `/dashboards/share/{share-key}`
   - Check for typos in share key
   - Share keys are case-sensitive

2. **Check Share Settings**
   ```bash
   # Get share settings (owner only)
   GET /api/dashboardShareSettings:get-or-create-default?id={dashboard-id}
   ```
   - Verify isPublic=true or user in allowedUsers
   - Check expirationDate is in future

3. **Test Dashboard Access**
   ```bash
   # Try accessing dashboard with share key
   GET /api/dashboards:with-tiles-for-share-by-link?dashboardShareByLinkKey={share-key}
   ```
   - 404: Share key not found or invalid
   - 410: Share link expired
   - 403: User not in allowed list

4. **Verify Share Link Expiration**
   - Check expirationDate in share settings
   - Current date/time must be before expiration
   - System uses UTC timestamps

**Solution:**
- Request new share link from dashboard owner
- Verify share link expiration date with owner
- Ask owner to verify your email in allowed users
- Contact dashboard owner if issues persist

---

#### Issue: User Cannot See Dashboard After Sharing

**Symptoms:**
- Dashboard doesn't appear in user's dashboard list
- User receives access notification but can't access
- Recently shared dashboard not visible

**Possible Causes:**
1. Access rights not fully committed to database
2. User's session cache not refreshed
3. Access granted but user not notified of change
4. Browser caching issue

**Debugging Steps:**

1. **Verify Access Rights Saved**
   ```bash
   # Get all access rights for dashboard
   GET /api/dashboardAccessRights:byDashboardId/{dashboard-id}
   ```
   - Look for user's entry in results
   - Verify accessLevel is "View" or "Edit"

2. **Check User's Dashboard List**
   ```bash
   # List dashboards visible to target user
   # (requires impersonation or user's own call)
   GET /api/dashboards
   ```
   - If dashboard not in list, access rights not synced
   - May take 1-2 minutes for cache refresh

3. **Refresh User's Session**
   - Ask user to:
     1. Logout completely
     2. Clear browser cache (Ctrl+Shift+Delete)
     3. Login again
   - This forces dashboard list refresh

4. **Verify Email Notification**
   - Check user's email for share notification
   - If not received, email configuration may have issues
   - Dashboard is accessible even without email

**Solution:**
- Wait 2 minutes for cache refresh and try again
- User should logout and login to refresh session
- Verify access rights were saved (check via API)
- Check email configuration in deployment settings

---

#### Issue: Cannot Revoke User Access

**Symptoms:**
- Delete access rights request returns error
- User still sees dashboard after access revoked
- Cannot remove users from sharing list

**Possible Causes:**
1. User is dashboard owner (cannot remove own access)
2. Race condition with concurrent updates
3. Database connection issue
4. User lacks admin permissions

**Debugging Steps:**

1. **Verify User is Not Owner**
   ```bash
   # Get dashboard details
   GET /api/dashboards/{dashboard-id}
   ```
   - Check createdBy field
   - Dashboard owner cannot have access removed

2. **Check for Concurrent Updates**
   - Wait 5 minutes for cache invalidation
   - Retry access revocation
   - Check database directly if possible

3. **Test Access Revocation**
   ```bash
   # Attempt to revoke single user
   POST /api/dashboardAccessRights:deleteManyByDashboard/{dashboard-id}/en
   ["user-to-remove"]
   ```
   - Check response status (should be 204)
   - Verify user entry removed from access list

4. **Verify User Still Has Access**
   - User's dashboard list may be cached
   - User needs to logout/login to refresh

**Solution:**
- Verify revoking user is not the dashboard owner
- Wait for cache refresh (2-5 minutes)
- Retry revocation after wait
- Check database directly for access rights record

---

### Data Source Issues

#### Issue: Data Source Fields Not Loading

**Symptoms:**
- Field list empty when creating tile
- Cannot select dimensions or measures
- "No fields available" message

**Possible Causes:**
1. Data source connection failed
2. Data source schema not scanned
3. User lacks data source access
4. Data source fields not mapped correctly

**Debugging Steps:**

1. **Verify Data Source Exists**
   ```bash
   # List available data sources
   GET /api/dataSources
   ```
   - Check if target data source appears
   - If not, data source not configured

2. **Get Data Source Fields**
   ```bash
   # Retrieve fields for data source
   GET /api/dataSources/{data-source-id}/fields
   ```
   - If empty array, no fields scanned
   - If error, connection issue

3. **Check Data Source Connection**
   - Verify connection string in configuration
   - Test database/API connectivity manually
   - Check credentials are valid
   - Verify network access (firewalls, VPN)

4. **Verify Data Source Accessibility**
   ```bash
   # Check data source access right
   POST /api/dataSourceAccessRights:checkAccessRightOfTile
   {
     "tileId": "tile-id",
     "dataSourceId": "ds-id"
   }
   ```
   - If hasAccess=false, user lacks permission

**Solution:**
- Verify data source connection string
- Check database/API server is running
- Request data source access from admin
- Re-scan data source schema (admin operation)
- Contact administrator if persistent

---

#### Issue: Aggregation Query Timeout

**Symptoms:**
- Aggregation requests hang indefinitely
- Requests timeout after 60 seconds
- "Request Timeout" error in UI

**Possible Causes:**
1. Query on very large dataset (millions of records)
2. Complex aggregation with too many dimensions
3. Slow database/data source
4. Network connectivity issues

**Debugging Steps:**

1. **Simplify Query**
   ```bash
   # Test with minimal aggregation
   POST /api/documents:aggregate
   {
     "dataSourceIds": ["ds-id"],
     "dimensions": ["simple_field"],
     "measures": ["count"],
     "filters": [],
     "limit": 100
   }
   ```
   - If succeeds, original query too complex

2. **Add Filters to Reduce Dataset**
   ```bash
   # Test with filtering
   POST /api/documents:aggregate
   {
     "dataSourceIds": ["ds-id"],
     "dimensions": ["field1"],
     "measures": ["field2"],
     "filters": [
       {
         "field": "status",
         "operator": "equals",
         "value": "active"
       }
     ],
     "limit": 100
   }
   ```
   - Filters reduce data volume before aggregation

3. **Check Data Source Health**
   - Monitor data source CPU/memory usage
   - Check query execution plans
   - Verify database indexes exist
   - Test query directly against data source

4. **Monitor Query Performance**
   - Enable query logging in data source
   - Measure query execution time
   - Check database slow query logs

**Solution:**
- Add time-range filters to limit dataset
- Reduce number of dimensions in aggregation
- Use pre-aggregated data when possible
- Contact data source administrator to optimize indexes
- Consider breaking query into multiple smaller queries

---

### Color Scheme Issues

#### Issue: Color Scheme Not Applied to Tile

**Symptoms:**
- Tile shows default colors instead of selected scheme
- Color scheme selection doesn't save
- Scheme changes don't appear after refresh

**Possible Causes:**
1. Color scheme not properly assigned to tile
2. Tile configuration not updated with scheme ID
3. Color scheme deleted or unavailable
4. Cache showing stale color configuration

**Debugging Steps:**

1. **Verify Color Scheme Exists**
   ```bash
   # Get all color schemes
   GET /api/colorScheme
   ```
   - Verify target scheme appears in list
   - Check if scheme is deleted

2. **Get Tile Configuration**
   ```bash
   # Check tile color scheme assignment
   GET /api/tiles/{tile-id}
   ```
   - Check colorSchemeId field
   - Verify scheme ID matches selected scheme

3. **Get Color Scheme for Tile**
   ```bash
   # Retrieve active scheme for tile
   GET /api/colorScheme:for-tile?tileId={tile-id}
   ```
   - Verify colors are rendered
   - Check color palette values

4. **Refresh Page Cache**
   - Hard refresh browser (Ctrl+Shift+R)
   - Clear browser cache for site
   - Close and reopen dashboard

**Solution:**
- Verify color scheme still exists in database
- Update tile configuration with correct scheme ID
- Hard refresh browser to clear cache
- Create new color scheme if original deleted
- Check browser DevTools for JavaScript errors

---

### Authentication & Authorization Issues

#### Issue: "401 Unauthorized" Error

**Symptoms:**
- API calls return 401 Unauthorized
- Dashboard page shows login redirect
- "Invalid or expired token" message

**Possible Causes:**
1. OAuth token expired
2. Token not included in request headers
3. JWT token signature invalid
4. User session invalidated

**Debugging Steps:**

1. **Check Token Presence**
   ```bash
   # Check Authorization header
   curl -H "Authorization: Bearer {token}" /api/dashboards
   ```
   - If no Authorization header, add it
   - Token should be Bearer token format

2. **Verify Token Expiration**
   - JWT tokens expire after configurable period (typically 1 hour)
   - Check token expiration time using JWT decoder
   - If expired, need to refresh token

3. **Check Token Validity**
   - Verify token format: `header.payload.signature`
   - Use JWT.io to decode token (don't use untrusted sites with sensitive tokens)
   - Check iss (issuer) and aud (audience) claims

4. **Verify OAuth Provider**
   - Check OAuth 2.0 provider is accessible
   - Verify provider settings in configuration
   - Check provider logs for authentication issues

**Solution:**
- Re-authenticate to get fresh token
- Include Bearer token in Authorization header
- Check OAuth provider configuration
- Contact administrators if persistent
- Clear cookies and try again

---

#### Issue: "403 Forbidden" Error

**Symptoms:**
- API calls return 403 Forbidden
- "Access Denied" message
- Cannot perform operations despite being authenticated

**Possible Causes:**
1. User lacks required permissions
2. Role-based access control (RBAC) restriction
3. Subscription/feature flag disabled
4. Company or organizational unit mismatch

**Debugging Steps:**

1. **Identify Missing Permission**
   - Check response error message
   - Determine required role (Admin, Manager, Employee)
   - Verify user's assigned roles

2. **Check User Roles**
   ```bash
   # Get current user info (if available)
   # Check JWT token claims for roles
   ```
   - User must have required role
   - Multiple roles can be assigned

3. **Verify Subscription Status**
   - Check if bravoINSIGHTS feature is enabled
   - Verify subscription includes required module
   - Check feature flag configuration

4. **Check Organization Context**
   - Verify user is in correct company
   - Verify user's organizational unit has access
   - Check cross-company data access rules

**Solution:**
- Request admin to assign required role
- Check subscription includes required features
- Verify company/organizational unit configuration
- Contact system administrator for permission changes

---

### Performance Issues

#### Issue: Dashboard Loads Slowly

**Symptoms:**
- Dashboard takes 10+ seconds to load
- Tiles load one at a time instead of in parallel
- Performance degrades over time

**Possible Causes:**
1. Too many tiles on single page
2. Complex aggregation queries
3. Large result sets from data sources
4. Slow network connection
5. Memory leaks in browser

**Debugging Steps:**

1. **Measure Load Time**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Reload dashboard
   - Check total load time
   - Identify slowest API calls

2. **Check API Response Times**
   - Look for API calls taking >5 seconds
   - Slow tile data queries indicate data source issues
   - Slow dashboard fetch indicates configuration issue

3. **Reduce Tile Count**
   - Count tiles on current page
   - Ideally limit to 8-12 tiles per page
   - Distribute across multiple pages if needed
   - Use tabs or filtering to show subsets

4. **Simplify Queries**
   - Review tile aggregation queries
   - Remove unnecessary dimensions
   - Add filters to reduce dataset size
   - Increase query limits only if needed

5. **Check Browser Performance**
   - Monitor memory usage in DevTools
   - Check for memory leaks (memory continuously increasing)
   - Close other tabs to free memory
   - Try in different browser to test

**Solution:**
- Reduce tiles per page to 8-10 maximum
- Simplify aggregation queries
- Add filters to reduce data volume
- Split dashboard into multiple pages
- Upgrade browser or use Chrome for better performance
- Contact administrator if data source is slow

---

#### Issue: Search/Aggregation Performance Degradation

**Symptoms:**
- Searches that previously ran in <1s now take 10+ seconds
- Aggregations progressively slower over time
- Performance spikes at certain times of day

**Possible Causes:**
1. Database has grown significantly
2. Missing or stale indexes
3. Database statistics outdated
4. Query optimization changed
5. Peak load times (e.g., business hours)

**Debugging Steps:**

1. **Monitor Query Performance**
   - Enable database query logging
   - Run slow query diagnostics
   - Check query execution plans
   - Identify bottleneck operations

2. **Check Data Size**
   - Estimate total records in data source
   - Check growth rate over time
   - Determine if growth is causing slowdown

3. **Verify Indexes Exist**
   - Check database indexes on frequently queried fields
   - Verify index statistics are current
   - Rebuild indexes if fragmented

4. **Test Specific Queries**
   ```bash
   # Time specific aggregation
   POST /api/documents:aggregate (with timing)
   ```
   - Compare with historical performance
   - Identify which queries regressed

**Solution:**
- Rebuild database indexes
- Update database statistics
- Add new indexes for frequently filtered fields
- Archive old data or use data partitioning
- Contact database administrator
- Consider query caching or pre-aggregation

---

## Frequently Asked Questions (FAQ)

### General Questions

#### Q: How do I reset my password?
**A:** bravoINSIGHTS uses OAuth 2.0 authentication managed by your organization's OAuth provider. To reset your password:
1. Click "Forgot Password" on login page
2. Follow OAuth provider's password reset flow
3. Or contact your system administrator

---

#### Q: Can I export dashboard data?
**A:** Exporting functionality depends on your dashboard's configuration:
1. Tile data can be accessed via the API
2. Use `/api/documents:aggregate` or `/api/documents:search` endpoints
3. Export to CSV/Excel from client application
4. Contact administrator for dashboard export features

---

#### Q: How many dashboards can I create?
**A:** Dashboard limits depend on your subscription:
- Check subscription details in admin panel
- No practical limit on dashboard count
- Performance best at 8-12 tiles per page
- Contact administrator for custom limits

---

#### Q: Can I use the same data source in multiple dashboards?
**A:** Yes, absolutely. Data sources are shared across dashboards:
1. Create one data source configuration
2. Reference it in multiple dashboards
3. All dashboards see latest data
4. Changes to data source affect all dependent tiles

---

### Dashboard Questions

#### Q: How do I duplicate a dashboard?
**A:** There's no built-in duplicate feature, but you can:
1. Export dashboard configuration (if available)
2. Create new dashboard with same name suffix
3. Manually recreate tiles from original
4. Or request duplicate feature from development team

---

#### Q: Can I undo dashboard changes?
**A:** Undo functionality depends on implementation:
1. Audit trail shows all changes
2. You can manually revert to previous configuration
3. Get previous tile configuration via API
4. Contact administrator for version history access

---

#### Q: Why is my shared dashboard read-only?
**A:** Access levels determine edit capabilities:
- **View Access:** Read-only (can't edit)
- **Edit Access:** Can modify tiles and configuration
- Ask dashboard owner to grant "Edit" access level
- See Feature 4.1 in README.md for access level configuration

---

#### Q: How long does a shared link work?
**A:** Share link validity is configurable:
- Default expiration: 30 days from creation
- Configured in dashboard share settings
- Can be extended by dashboard owner
- Expired links show "410 Gone" error

---

### Data & Analytics Questions

#### Q: Why is my aggregation query returning zero results?
**A:** See "Tiles Display as 'No Data'" common issue section above.

**Quick Checks:**
1. Verify filters aren't too restrictive
2. Check dimensions exist in data source
3. Try removing all filters to test
4. Use Search feature to verify data exists

---

#### Q: Can I aggregate across multiple data sources?
**A:** Yes, you can include multiple data source IDs:
```json
POST /api/documents:aggregate
{
  "dataSourceIds": ["ds1", "ds2", "ds3"],
  "dimensions": ["field"],
  "measures": ["count"]
}
```
Note: Field names must match across data sources for correct results.

---

#### Q: How do I search for specific records?
**A:** Use the Search Documents API:
```bash
POST /api/documents:search
{
  "dataSourceIds": ["ds-id"],
  "searchText": "search term",
  "pageSize": 20,
  "pageNumber": 1
}
```
See Feature 7.2 in README.md for detailed search configuration.

---

#### Q: Can I get distinct values for filtering?
**A:** Yes, use the distinct values endpoint:
```bash
GET /api/documents:search-distinct-document-field-value-select-items?dataSourceIds[]=ds-id&fieldName=region
```
See Feature 7.3 in README.md for complete documentation.

---

### Sharing & Collaboration Questions

#### Q: How do I share a dashboard publicly?
**A:** Use share settings with public link:
1. Get share settings (Feature 5.1)
2. Update share setting with isPublic=true (Feature 5.2)
3. Distribute the shareKey to users
4. External users access via share link without login

See Features 5.1-5.2 in README.md for details.

---

#### Q: Can I set an expiration date for shared links?
**A:** Yes, share settings include expiration:
```json
POST /api/dashboardShareSettings/{dashboard-id}
{
  "isPublic": true,
  "expirationDate": "2026-01-31T23:59:59Z"
}
```
Date must be in future UTC format.

---

#### Q: What happens when a shared link expires?
**A:** Expired links return HTTP 410 (Gone):
- Users cannot access the dashboard
- Dashboard owner can extend expiration
- Users can request new share link from owner
- Original shared link cannot be reactivated

---

#### Q: Can I see who accessed my shared dashboard?
**A:** Access logging depends on implementation:
- Check audit logs if available
- Monitor via your application's analytics
- Contact administrator for detailed access reports
- Share links don't require authentication, so tracking may be limited

---

### Color & Customization Questions

#### Q: Can I create custom color schemes?
**A:** Yes, create custom schemes:
```bash
POST /api/colorScheme
{
  "name": "My Colors",
  "colors": ["#1f77b4", "#ff7f0e", "#2ca02c"],
  "description": "Custom palette"
}
```
See Feature 6.4 in README.md for complete documentation.

---

#### Q: Can I use my company's brand colors?
**A:** Yes, create a custom color scheme with brand colors:
1. Get hex codes for brand colors
2. Create custom scheme (Feature 6.4)
3. Apply scheme to dashboards (assign colorSchemeId)
4. All tiles using scheme show brand colors

---

#### Q: Why can't I delete a system color scheme?
**A:** System default schemes cannot be deleted:
- System schemes are protected
- Only custom schemes can be deleted
- Create a new custom scheme if needed
- Contact administrator if system colors need changing

---

### Administration Questions

#### Q: How do I reset sample data?
**A:** Use the re-seed management endpoint:
```bash
POST /api/management/re-seed-bravo-datasources-dashboards
```
This is **Admin-only** operation. See Feature 8.1 in README.md.

---

#### Q: How do I configure data sources?
**A:** Data source configuration is typically done by administrators:
1. Provide connection string to data source
2. Configure field mappings
3. Set up access control rules
4. Enable for users/groups
5. Data sources appear in user dashboard creation

---

#### Q: How do I manage user permissions?
**A:** Use access rights endpoints:
- Grant access (Feature 4.1): Add user with View/Edit level
- List access (Feature 4.2): See all users with access
- Revoke access (Feature 4.3): Remove user from dashboard

See Access Control & Sharing section in README.md.

---

#### Q: Can I backup dashboards?
**A:** Backup strategies depend on your deployment:
1. Database-level backups (MongoDB/SQL Server)
2. Dashboard export via API
3. Dashboard configuration versioning
4. Contact administrator for backup policies

---

## Getting Help

### Resources

1. **Complete API Documentation:** See API-REFERENCE.md
2. **Feature Guide:** See README.md
3. **Quick Navigation:** See QUICK-START.md
4. **Documentation Index:** See INDEX.md
5. **Source Code:** `src/Services/bravoINSIGHTS/Analyze/`
6. **API Explorer:** Available at service `/swagger` endpoint

### When to Contact Support

Contact your system administrator or support team if:
- Issue persists after trying solutions
- Error message indicates internal server error (5xx)
- Performance severely degraded
- Data is corrupted or inaccessible
- Need to change permissions/configuration
- Require custom features or integrations

### Providing Error Information

When reporting issues, include:
1. **Error Message:** Exact error text from UI or API response
2. **Steps to Reproduce:** Specific steps that trigger issue
3. **Screenshots:** Visual evidence of problem
4. **Browser/Device:** Browser name and version, OS
5. **API Response:** Response body from failed API call (sanitize sensitive data)
6. **Timing:** When issue occurs (consistently or intermittently)
7. **User Impact:** How many users affected

---

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Check service health
GET /health
GET /health/ready
GET /health/live
```

These endpoints verify:
- Database connectivity
- Authentication provider connectivity
- Data source connectivity
- Overall service health

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | >5 seconds | Investigate slow queries |
| Error Rate | >1% | Check logs and errors |
| Database Connection Pool | >90% used | Scale connections |
| Memory Usage | >80% | Restart or scale instance |
| Query Timeout Rate | >5% | Optimize queries or data |

---

## Performance Optimization Tips

### For End Users

1. **Reduce Tiles Per Page:** Limit to 8-12 tiles maximum
2. **Use Filters Effectively:** Add filters to reduce data volume
3. **Close Unused Browsers:** Free up memory and bandwidth
4. **Use Appropriate Aggregation:** Don't aggregate billions of records
5. **Cache Data When Possible:** Use pre-aggregated datasets

### For Administrators

1. **Index Frequently Queried Fields:** Improve database performance
2. **Archive Old Data:** Reduce query time on large datasets
3. **Monitor Query Performance:** Identify and optimize slow queries
4. **Load Balance:** Distribute queries across multiple servers
5. **Configure Caching:** Enable caching for dashboards/color schemes

---

## Related Documentation

- **README.md:** Complete feature documentation
- **QUICK-START.md:** Quick navigation by user role
- **API-REFERENCE.md:** Complete API endpoint documentation
- **INDEX.md:** Documentation index and overview

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Owner:** Documentation Team
**Status:** Published

