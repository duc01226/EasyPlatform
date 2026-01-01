# TextSnippet Troubleshooting Guide

## Common Issues

### 1. Snippet Not Saving

**Symptoms:**
- Save button doesn't respond
- Error message "Validation failed"

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Empty snippet text | Ensure `snippetText` field is filled |
| Invalid category ID | Verify category exists |
| Authentication expired | Re-login to refresh token |

**Debug Steps:**
1. Check browser console for errors
2. Verify API response in Network tab
3. Check backend logs for validation errors

---

### 2. Search Not Returning Results

**Symptoms:**
- Empty results despite existing snippets
- Timeout errors

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Full-text index not built | Run database migration |
| Search text too short | Minimum 2 characters required |
| Category filter mismatch | Clear filters and retry |

**Debug Steps:**
1. Test with empty search (returns all)
2. Check database for snippet count
3. Verify full-text search configuration

---

### 3. Message Bus Events Not Processing

**Symptoms:**
- Entity changes not syncing
- Consumer logs show no activity

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| RabbitMQ not running | Start RabbitMQ service |
| Queue not bound | Check exchange bindings |
| Consumer not registered | Verify DI registration |

**Debug Steps:**
1. Check RabbitMQ management UI (localhost:15672)
2. Verify message in queue
3. Check consumer service logs

---

### 4. Background Job Not Executing

**Symptoms:**
- Scheduled job doesn't run
- Job status shows "Pending"

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Hangfire not configured | Check Hangfire dashboard |
| Cron expression error | Validate cron syntax |
| Job throwing exception | Check job logs |

**Debug Steps:**
1. Open Hangfire dashboard (/hangfire)
2. Check recurring jobs list
3. Review failed jobs with stack traces

---

### 5. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- Timeout on queries

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Database server down | Start Docker containers |
| Connection string wrong | Check appsettings.json |
| Firewall blocking | Allow port 1433/27017/5432 |

**Debug Steps:**
1. Run `docker ps` to check containers
2. Test connection with database client
3. Verify connection string in configuration

---

## Logging

### Enable Debug Logging

```json
// appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "PlatformExampleApp": "Debug"
    }
  }
}
```

### Key Log Categories
- `PlatformExampleApp.TextSnippet.Application` - Command/Query handlers
- `Easy.Platform.RabbitMQ` - Message bus operations
- `Easy.Platform.Persistence` - Database operations

---

## Performance Issues

### Slow Queries

1. Check query execution plan
2. Verify indexes exist on filtered columns
3. Use pagination for large result sets

### Memory Usage

1. Monitor with Application Insights
2. Check for memory leaks in stores
3. Dispose subscriptions properly

---

## Getting Help

1. Check [README](./README.md) for feature overview
2. Review [API Reference](./API-REFERENCE.md) for correct usage
3. Search existing issues in repository
4. Create issue with reproduction steps
