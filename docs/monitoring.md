# Monitoring & Health Checks

> System observability, performance monitoring, and health checks for BravoSUITE

## Monitoring Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Application Performance** | Azure Application Insights | Request tracking, exception monitoring |
| **Infrastructure** | Grafana + Prometheus | System metrics, custom dashboards |
| **Logs** | Structured logging with Serilog | Centralized log aggregation |
| **Database** | Azure SQL Analytics, MongoDB Compass | Query performance, index optimization |

---

## PostgreSQL Performance Monitoring

### Azure Performance Insights

**Key Features:**
- Query Performance: Identify slow queries and bottlenecks
- Resource Utilization: Monitor CPU, memory, I/O
- Wait Statistics: Analyze database wait events
- Historical Trends: Track performance patterns

**Configuration:**

```yaml
postgresql:
    performance_insights:
        enabled: true
        retention_period: 7  # days
        monitoring_interval: 60  # seconds

    connection_monitoring:
        max_connections: 100
        connection_timeout: 30
        idle_timeout: 300
```

**Monitoring Queries:**

```sql
-- Active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Query performance
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC LIMIT 10;

-- Database size
SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database ORDER BY pg_database_size(datname) DESC;
```

---

## Grafana Dashboard

### Dashboard Panels

- **Connection Pool Status**: Active, idle, waiting connections
- **Query Performance**: Execution time, throughput, error rates
- **Resource Utilization**: CPU, memory, disk I/O, network
- **Database Growth**: Size trends and storage utilization
- **Replication Status**: Master-slave lag and sync status

### Alert Configuration

```yaml
alerts:
    postgresql:
        - name: 'High Connection Usage'
          condition: 'connection_usage > 80%'
          severity: 'warning'
          notification_channels: ['slack', 'email']

        - name: 'Slow Query Detection'
          condition: 'query_duration > 5s'
          severity: 'critical'
          notification_channels: ['pagerduty']

        - name: 'Database Size Growth'
          condition: 'db_growth_rate > 10% per day'
          severity: 'warning'
          notification_channels: ['email']
```

---

## Prometheus Exporter

```yaml
postgresql_exporter:
    data_source_name: 'postgresql://user:password@localhost:5432/database?sslmode=disable'
    queries:
        - name: 'custom_business_metrics'
          query: |
              SELECT
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
              FROM pg_stat_user_tables;
          metrics:
              - inserts:
                    usage: 'COUNTER'
                    description: 'Number of tuples inserted'
              - updates:
                    usage: 'COUNTER'
                    description: 'Number of tuples updated'
              - deletes:
                    usage: 'COUNTER'
                    description: 'Number of tuples deleted'
```

---

## ASP.NET Core Health Checks

### Configuration

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddHealthChecks()
        .AddNpgSql(connectionString: Configuration.GetConnectionString("PostgreSQL"))
        .AddCheck<CustomPostgreSQLHealthCheck>("postgresql-custom");
}
```

### Custom Health Check

```csharp
public class CustomPostgreSQLHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = new NpgsqlConnection(
                _configuration.GetConnectionString("PostgreSQL"));
            await connection.OpenAsync(cancellationToken);

            // Basic connectivity
            var command = new NpgsqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync(cancellationToken);

            // Performance metrics
            var performanceCommand = new NpgsqlCommand(@"
                SELECT count(*) as active_connections
                FROM pg_stat_activity
                WHERE state = 'active'", connection);

            var activeConnections = (long)await performanceCommand
                .ExecuteScalarAsync(cancellationToken);

            var data = new Dictionary<string, object>
            {
                ["active_connections"] = activeConnections,
                ["connection_string"] = connection.ConnectionString.Split(';')[0]
            };

            return activeConnections > 50
                ? HealthCheckResult.Degraded("High connection count", null, data)
                : HealthCheckResult.Healthy("PostgreSQL is healthy", data);
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL is unavailable", ex);
        }
    }
}
```

---

## Performance Optimization

### Backend

```csharp
// Use pagination for large datasets
await RootServiceProvider.ExecuteInjectScopedPagingAsync(
    maxItemCount: totalCount,
    pageSize: 50,
    ProcessPageMethod
);

// Add database indexes
await collection.Indexes.CreateManyAsync([
    new CreateIndexModel<Entity>(
        Builders<Entity>.IndexKeys.Ascending(e => e.SearchField)
    )
]);

// Cache frequently accessed data
await cacheProvider.CacheRequestAsync(
    () => repository.GetExpensiveDataAsync(),
    cacheKey,
    TimeSpan.FromMinutes(15)
);
```

### Frontend

```typescript
// Use OnPush change detection
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush
})

// Proper cleanup via PlatformComponent
export class Component extends PlatformComponent {
    // Automatic subscription cleanup via takeUntilDestroyed()
}

// Lazy loading for routes
const routes: Routes = [
    {
        path: 'employees',
        loadChildren: () => import('./employee/employee.module')
            .then(m => m.EmployeeModule)
    }
];
```

---

## Best Practices

1. **Baseline Establishment**: Record normal metrics for comparison
2. **Proactive Alerting**: Set thresholds before performance degrades
3. **Capacity Planning**: Monitor growth trends for scaling
4. **Query Optimization**: Regular review of slow query logs
5. **Backup Monitoring**: Ensure backup processes complete

---

**Next:** [Deployment](./deployment.md) | [Troubleshooting](./claude/troubleshooting.md)
