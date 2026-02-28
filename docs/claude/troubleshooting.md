# Troubleshooting & Support

> Common issues and solutions for BravoSUITE development and Claude Code

## Quick Navigation

- [Claude Code Issues](#claude-code-issues) - Hooks, configuration, workflows
- [Build & Compilation](#build--compilation-errors) - .NET, Angular build failures
- [Runtime Errors](#runtime-errors) - Repository, event handlers, message bus
- [Frontend Issues](#frontend-issues) - Components, forms, API services
- [Database Issues](#database-issues) - Connections, migrations
- [Performance Issues](#performance-issues) - Queries, memory

---

## Claude Code Issues

### Hooks Not Executing

```javascript
// Problem: SessionStart hook not running

// Checklist:
// 1. Check hook registration in .claude/settings.json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume",
      "hooks": [{ "type": "command", "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/session-init.cjs" }]
    }]
  }
}

// 2. Verify hook file exists and has no syntax errors
node .claude/hooks/session-init.cjs  // Test manually

// 3. Check for permission issues
// Hook must be executable and path must be correct

// 4. Enable debug logging
// Set CK_DEBUG=1 in environment
```

### Configuration Not Loading

```javascript
// Problem: .ck.json settings not applied

// Checklist:
// 1. Verify JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/.ck.json')))"

// 2. Check file location (must be .claude/.ck.json)
// 3. Verify codingLevel value is 0-5 or -1 (disabled)
{
  "codingLevel": 4,  // 0=ELI5, 5=God Mode, -1=disabled
  "privacyBlock": true
}

// 4. Restart Claude Code session after config changes
```

### Coding Level Not Changing Output Style

```javascript
// Problem: Output style doesn't match configured level

// Solution: Check session-init.cjs injection
// The hook reads .ck.json and injects guidelines on session start

// Verify:
// 1. codingLevel in .ck.json is 0-5 (not -1)
// 2. session-init.cjs hook is registered for SessionStart
// 3. Output style file exists: .claude/output-styles/coding-level-{N}-*.md

// Temporary override with command:
/coding-level 3  // Change to Senior mode
```

### Workflow Not Detected

```javascript
// Problem: Automatic workflow not triggering

// Checklist:
// 1. Check workflows.json settings.enabled = true
// 2. Verify trigger patterns match your prompt
// 3. Check pattern priority (lower = higher priority)

// Example: "add dark mode" should trigger feature workflow
// Pattern: "\\b(implement|add|create)\\b.*\\b(feature)\\b"

// Override: Use quick: prefix or explicit /command
// quick: add dark mode  // Skips confirmation, runs workflow
// /plan                 // Explicit command
```

### Privacy Block Preventing Edits

```javascript
// Problem: Edit blocked by privacy-block.cjs

// Reason: Attempting to edit sensitive files
// Blocked patterns: .env*, credentials*, secrets/*

// Solution:
// 1. Check .ck.json privacyBlock setting
// 2. Review blocked patterns in privacy-block.cjs
// 3. Add specific allow rules in settings.json if needed:
{
  "permissions": {
    "allow": ["Edit(**/my-safe-config.json)"]
  }
}
```

### MCP Server Connection Failed

```bash
# Problem: MCP server not responding

# Checklist:
# 1. Check .mcp.json configuration
# 2. Verify npm package is available
npx -y @modelcontextprotocol/server-github --help

# 3. Check environment variables (e.g., GITHUB_PERSONAL_ACCESS_TOKEN)
# 4. Restart Claude Code to reinitialize MCP connections
```

### Subagent Context Lost

```javascript
// Problem: Spawned agents don't have correct context

// Solution: subagent-init.cjs hook injects context
// Verify hook is registered for SubagentStart event

// Check agent receives:
// - Active plan path
// - Reports directory
// - Development rules path
// - Naming patterns

// If context lost, check:
// 1. SubagentStart hook registration in settings.json
// 2. subagent-init.cjs file exists and has no errors
```

---

## Common Issues & Solutions

| Issue                          | Solution                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Build failures**             | Check platform package versions and run `dotnet restore`               |
| **Missing repositories**       | Search for `I{ServiceName}PlatformRootRepository` in Domain project    |
| **Component not found**        | Verify inheritance chain and check available base class methods        |
| **API calls failing**          | Verify service is running and check endpoint routes                    |
| **Database connection issues** | Ensure infrastructure is started with dev-start scripts                |
| **Entity event not firing**    | Verify event handler is in `UseCaseEvents/` folder with correct naming |
| **Validation not working**     | Check if using `PlatformValidationResult` fluent API correctly         |
| **Store not updating UI**      | Ensure using signals and proper change detection                       |
| **FormArray not validating**   | Check `dependentValidations` configuration                             |

## Build & Compilation Errors

### .NET Build Failures

```bash
# Clean and restore
dotnet clean BravoSUITE.sln
dotnet restore BravoSUITE.sln

# Rebuild
dotnet build BravoSUITE.sln
```

### Angular Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install

# Rebuild
nx build growth-for-company
```

### Missing Dependencies

```bash
# Check Easy.Platform versions
dotnet list package | grep Easy.Platform

# Update platform packages
dotnet add package Easy.Platform --version <latest>
```

## Runtime Errors

### Repository Not Found

```csharp
// Error: Cannot resolve IGrowthRootRepository<Entity>

// Solution: Check registration in DI container
// Ensure entity is registered in DbContext
public class GrowthDbContext : PlatformDbContext
{
    public DbSet<Entity> Entities { get; set; }  // Add this
}
```

### Entity Event Handler Not Called

```csharp
// Checklist:
// 1. Handler in UseCaseEvents/ folder (NOT DomainEventHandlers/)
// 2. Correct naming: [Action]On[Event][Entity]EntityEventHandler
// 3. Single generic parameter: PlatformCqrsEntityEventApplicationHandler<Entity>
// 4. HandleWhen() is public override async Task<bool> (NOT protected bool)
// 5. Check filter logic in HandleWhen()
```

### Message Bus Consumer Not Processing

```csharp
// Checklist:
// 1. Consumer registered in DI
// 2. HandleWhen() returns true for the message
// 3. RabbitMQ is running (check localhost:15672)
// 4. Check message routing key matches
// 5. LastMessageSyncDate handling for race conditions
```

## Frontend Issues

### Component State Not Updating

```typescript
// Problem: UI not reflecting state changes

// Solution 1: Ensure using signals
public vm = this.store.vm$;  // Not just this.store.state

// Solution 2: Check change detection
this.cdr.detectChanges();  // Force update if needed

// Solution 3: Verify subscription
.pipe(this.untilDestroyed()).subscribe();  // Ensure subscribed
```

### Form Validation Not Working

```typescript
// Problem: Async validators not running

// Solution: Use ifAsyncValidator
new FormControl('', [], [
  ifAsyncValidator(() => this.form.valid, asyncValidator)  // Runs only if sync valid
]);

// Problem: Dependent validation not triggering
// Solution: Configure dependentValidations
protected initialFormConfig = () => ({
  controls: { ... },
  dependentValidations: { email: ['firstName'] }  // email revalidates when firstName changes
});
```

### API Service Errors

```typescript
// Problem: Requests failing silently

// Solution: Use proper error handling
this.api
    .getData()
    .pipe(
        this.observerLoadingErrorState('loadData'), // Tracks loading/error state
        this.tapResponse(
            data => this.handleSuccess(data),
            error => this.handleError(error) // Handle errors explicitly
        )
    )
    .subscribe();
```

## Database Issues

### Connection Failures

```bash
# Verify infrastructure is running
docker ps | grep sql
docker ps | grep mongo
docker ps | grep postgres

# Start infrastructure
.\Bravo-DevStarts\"COMMON Infrastructure Dev-start.cmd"
```

### Migration Errors

```bash
# EF Core migrations
dotnet ef migrations add NewMigration
dotnet ef database update

# Check pending migrations
dotnet ef migrations list
```

## Performance Issues

### Slow Queries

```csharp
// Problem: N+1 queries

// Solution: Use eager loading
await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Company, e => e.Departments);

// Solution: Use projection
await repository.FirstOrDefaultAsync(
    query => query.Where(...).Select(e => new { e.Id, e.Name }), ct);
```

### Memory Issues

```csharp
// Problem: Large data sets

// Solution: Use paging
var queryBuilder = repository.GetQueryBuilder((uow, q) =>
    q.Where(...).OrderBy(e => e.Id).PageBy(skip, take));

// Solution: Use streaming for exports
await foreach (var entity in repository.AsAsyncEnumerable(expr))
{
    yield return entity;
}
```

## Getting Help

### Documentation Resources

| Topic | Documentation |
|-------|---------------|
| Skills | [skills/README.md](./skills/README.md) |
| Skills | [skills/README.md](./skills/README.md) |
| Hooks | [hooks/README.md](./hooks/README.md) |
| Agents | [agents/README.md](./agents/README.md) |
| Configuration | [configuration/README.md](./configuration/README.md) |
| Backend Patterns | [backend-patterns.md](./backend-patterns.md) |
| Frontend Patterns | [frontend-patterns.md](./frontend-patterns.md) |

### Quick References

1. **Study Platform Example:** `src/PlatformExampleApp` for working patterns
2. **Search Documentation:**
    - Use `/scout` command for codebase exploration
    - Check [architecture.md](./architecture.md) for file locations
3. **Check Existing Implementations:**
    - Look for similar features in the codebase
    - Search for patterns in existing handlers/components
4. **Claude Code Setup:**
    - See [configuration/README.md](./configuration/README.md) for all config files
    - Check [hooks/extending-hooks.md](./hooks/extending-hooks.md) for custom hooks

## Debugging Protocol

When debugging issues, follow the [AI Debugging Protocol](.github/AI-DEBUGGING-PROTOCOL.md):

1. **Never assume** based on first glance
2. **Verify with multiple search patterns**
3. **Check both static AND dynamic code usage**
4. **Read actual implementations**, not just interfaces
5. **Trace full dependency chains**
6. **Declare confidence level** and uncertainties
7. **Request user confirmation** when confidence < 90%

## Quality Checklist

Before considering a task complete:

- [ ] Follows Clean Architecture layers correctly
- [ ] Uses platform validation patterns
- [ ] Implements proper error handling
- [ ] Uses microservice-specific repositories
- [ ] Includes unit tests for business logic
- [ ] No direct cross-service dependencies
- [ ] Uses message bus for cross-service communication
- [ ] Proper authorization checks
- [ ] Input validation implemented

---

## Related Documentation

- [README.md](./README.md) - Documentation hub and quick start
- [quick-start.md](./quick-start.md) - 5-minute onboarding
- [hooks/README.md](./hooks/README.md) - Hook system overview
- [configuration/README.md](./configuration/README.md) - All configuration files
- [anti-patterns.md](./anti-patterns.md) - Common mistakes to avoid

---

*Source: BravoSUITE troubleshooting guide | Claude Code configuration issues*
