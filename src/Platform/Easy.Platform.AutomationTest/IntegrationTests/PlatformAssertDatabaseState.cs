using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Platform-level helper for verifying database state after command execution in integration tests.
/// Generic over both entity type and repository type, so each service passes its own repository interface.
///
/// <para>
/// <strong>Eventual Consistency:</strong>
/// ALL assertion methods use <see cref="PlatformIntegrationTestHelper.WaitUntilAsync"/> internally.
/// Commands trigger async event handlers, message bus consumers, and background processing —
/// data state may not be immediately correct after command returns. The polling is baked into
/// the assertion infrastructure so individual tests do NOT need WaitUntil wrappers.
/// </para>
///
/// <para>
/// <strong>Usage pattern:</strong> Each service creates a thin alias that locks in the repository type:
/// </para>
/// <code>
/// public static class AssertDatabaseState
/// {
///     public static Task EntityExistsAsync&lt;TEntity&gt;(IServiceProvider sp, string id)
///         where TEntity : class, IRootEntity&lt;string&gt;, new()
///         =&gt; PlatformAssertDatabaseState.EntityExistsAsync&lt;TEntity, IGrowthRootRepository&lt;TEntity&gt;&gt;(sp, id);
/// }
/// </code>
/// </summary>
public static class PlatformAssertDatabaseState
{
    /// <summary>
    /// Default timeout for database state assertions.
    /// Commands may trigger async event handlers and message bus consumers
    /// that update data asynchronously. 5s covers the vast majority of processing chains.
    /// </summary>
    public static readonly TimeSpan DefaultAssertTimeout = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Verifies that an entity with the given ID exists in the database.
    /// Polls with <see cref="DefaultAssertTimeout"/> to handle eventual consistency.
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    public static async Task EntityExistsAsync<TEntity, TRepository>(
        IServiceProvider sp, string id, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
        where TRepository : class, IPlatformRepository<TEntity, string>
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = sp.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<TRepository>();
                var entity = await repo.GetByIdAsync(id);
                entity.Should().NotBeNull(
                    $"Expected {typeof(TEntity).Name} with ID '{id}' to exist in database");
            },
            timeout: timeout ?? DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' not found within timeout");
    }

    /// <summary>
    /// Verifies that an entity exists and matches expected assertions.
    /// Polls with <see cref="DefaultAssertTimeout"/> to handle eventual consistency.
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    public static async Task EntityMatchesAsync<TEntity, TRepository>(
        IServiceProvider sp, string id, Action<TEntity> assertions, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
        where TRepository : class, IPlatformRepository<TEntity, string>
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = sp.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<TRepository>();
                var entity = await repo.GetByIdAsync(id);
                entity.Should().NotBeNull(
                    $"Expected {typeof(TEntity).Name} with ID '{id}' to exist in database");
                assertions(entity!);
            },
            timeout: timeout ?? DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' assertion not satisfied within timeout");
    }

    /// <summary>
    /// Verifies that an entity with the given ID no longer exists in the database.
    /// Polls with <see cref="DefaultAssertTimeout"/> to handle eventual consistency
    /// (e.g., cascade deletes triggered by async entity event handlers).
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    public static async Task EntityDeletedAsync<TEntity, TRepository>(
        IServiceProvider sp, string id, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
        where TRepository : class, IPlatformRepository<TEntity, string>
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = sp.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<TRepository>();
                // Use FirstOrDefaultAsync instead of GetByIdAsync because GetByIdAsync may throw
                // (e.g., if platform adds .EnsureFound()). FirstOrDefaultAsync reliably returns null.
                var entity = await repo.FirstOrDefaultAsync(e => e.Id!.Equals(id, StringComparison.Ordinal));
                return entity == null;
            },
            timeout: timeout ?? DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' still exists after timeout — expected deletion");
    }
}
