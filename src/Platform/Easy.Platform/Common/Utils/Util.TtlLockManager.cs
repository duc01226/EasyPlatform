#region

using System.Collections.Concurrent;

#endregion

namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    /// <summary>
    /// Provides TTL-based lock management with automatic cleanup of stale locks.
    /// Useful for preventing race conditions when multiple concurrent operations
    /// target the same resource (e.g., authentication per configuration).
    /// </summary>
    /// <remarks>
    /// Usage:
    /// <code>
    /// // Simple usage
    /// await Util.TtlLockManager.ExecuteWithLockAsync(
    ///     lockKey: configId,
    ///     action: async () => await AuthenticateAsync(config),
    ///     category: "AuthLocks");
    ///
    /// // With custom TTL
    /// var result = await Util.TtlLockManager.ExecuteWithLockAsync(
    ///     lockKey: resourceId,
    ///     action: async () => await FetchResourceAsync(resourceId),
    ///     category: "ResourceLocks",
    ///     lockTtl: TimeSpan.FromMinutes(30));
    /// </code>
    /// </remarks>
    public static class TtlLockManager
    {
        /// <summary>
        /// Default TTL for locks - locks not accessed within this period will be cleaned up
        /// </summary>
        public static readonly TimeSpan DefaultLockTtl = TimeSpan.FromHours(1);

        /// <summary>
        /// Default interval between cleanup checks
        /// </summary>
        public static readonly TimeSpan DefaultCleanupInterval = TimeSpan.FromMinutes(10);

        /// <summary>
        /// Default maximum number of locks per category
        /// </summary>
        public const int DefaultMaxLocks = 500;

        private static readonly ConcurrentDictionary<string, LockCategory> Categories = new();

        /// <summary>
        /// Entry for tracking a lock with last access time for TTL-based cleanup.
        /// </summary>
        private sealed class LockEntry : IDisposable
        {
            public SemaphoreSlim Semaphore { get; } = new(1, 1);
            public DateTime LastAccessedUtc { get; set; } = DateTime.UtcNow;

            public void Dispose()
            {
                Semaphore.Dispose();
            }
        }

        /// <summary>
        /// Container for locks within a category with cleanup tracking.
        /// </summary>
        private sealed class LockCategory
        {
            public ConcurrentDictionary<string, LockEntry> Locks { get; } = new();
            public DateTime LastCleanupUtc { get; set; } = DateTime.UtcNow;
            public TimeSpan LockTtl { get; init; } = DefaultLockTtl;
            public TimeSpan CleanupInterval { get; init; } = DefaultCleanupInterval;
            public int MaxLocks { get; init; } = DefaultMaxLocks;
        }

        /// <summary>
        /// Execute an action with exclusive lock, auto-releasing when not accessed for TTL duration.
        /// </summary>
        /// <param name="lockKey">Unique key identifying the resource to lock.</param>
        /// <param name="action">The async action to execute while holding the lock.</param>
        /// <param name="category">Optional category to group related locks (default: "Default").</param>
        /// <param name="lockTtl">Optional TTL for the lock (default: 1 hour).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        public static async Task ExecuteWithLockAsync(
            string lockKey,
            Func<Task> action,
            string? category = null,
            TimeSpan? lockTtl = null,
            CancellationToken cancellationToken = default)
        {
            var lockEntry = GetOrCreateLock(lockKey, category, lockTtl);

            await lockEntry.Semaphore.WaitAsync(cancellationToken);
            try
            {
                await action();
            }
            finally
            {
                lockEntry.Semaphore.Release();
            }
        }

        /// <summary>
        /// Execute an action with exclusive lock, returning a result.
        /// </summary>
        /// <typeparam name="T">Type of the result.</typeparam>
        /// <param name="lockKey">Unique key identifying the resource to lock.</param>
        /// <param name="action">The async action to execute while holding the lock.</param>
        /// <param name="category">Optional category to group related locks (default: "Default").</param>
        /// <param name="lockTtl">Optional TTL for the lock (default: 1 hour).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The result of the action.</returns>
        public static async Task<T> ExecuteWithLockAsync<T>(
            string lockKey,
            Func<Task<T>> action,
            string? category = null,
            TimeSpan? lockTtl = null,
            CancellationToken cancellationToken = default)
        {
            var lockEntry = GetOrCreateLock(lockKey, category, lockTtl);

            await lockEntry.Semaphore.WaitAsync(cancellationToken);
            try
            {
                return await action();
            }
            finally
            {
                lockEntry.Semaphore.Release();
            }
        }

        /// <summary>
        /// Get or create a lock entry, auto-cleaning stale entries periodically.
        /// </summary>
        private static LockEntry GetOrCreateLock(
            string lockKey,
            string? category = null,
            TimeSpan? lockTtl = null)
        {
            var categoryName = category ?? "Default";
            var effectiveTtl = lockTtl ?? DefaultLockTtl;

            var lockCategory = Categories.GetOrAdd(
                categoryName,
                _ => new LockCategory
                {
                    LockTtl = effectiveTtl
                });

            // Periodic cleanup of stale locks (non-blocking check)
            CleanupStaleLocksIfNeeded(lockCategory);

            var lockEntry = lockCategory.Locks.GetOrAdd(lockKey, _ => new LockEntry());
            lockEntry.LastAccessedUtc = DateTime.UtcNow;

            return lockEntry;
        }

        /// <summary>
        /// Manually cleanup stale locks for a specific category or all categories.
        /// </summary>
        /// <param name="category">Optional category name. If null, cleans up all categories.</param>
        public static void CleanupStaleLocks(string? category = null)
        {
            if (category != null)
            {
                if (Categories.TryGetValue(category, out var lockCategory)) CleanupStaleLocksCore(lockCategory);
            }
            else
                foreach (var lockCategory in Categories.Values)
                    CleanupStaleLocksCore(lockCategory);
        }

        /// <summary>
        /// Cleans up stale locks that haven't been accessed within the TTL.
        /// Called periodically during lock acquisition to prevent memory leaks.
        /// </summary>
        private static void CleanupStaleLocksIfNeeded(LockCategory lockCategory)
        {
            var now = DateTime.UtcNow;

            // Only cleanup every CleanupInterval to avoid excessive overhead
            if (now - lockCategory.LastCleanupUtc < lockCategory.CleanupInterval)
                return;

            lockCategory.LastCleanupUtc = now;
            CleanupStaleLocksCore(lockCategory);
        }

        /// <summary>
        /// Core cleanup logic - removes expired locks and enforces max count.
        /// </summary>
        private static void CleanupStaleLocksCore(LockCategory lockCategory)
        {
            var now = DateTime.UtcNow;

            // Remove expired locks
            var expiredKeys = lockCategory.Locks
                .Where(kvp => now - kvp.Value.LastAccessedUtc > lockCategory.LockTtl)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var key in expiredKeys)
                if (lockCategory.Locks.TryRemove(key, out var removedEntry))
                    removedEntry.Dispose();

            // If still over limit, remove oldest entries (LRU eviction)
            if (lockCategory.Locks.Count > lockCategory.MaxLocks)
            {
                var excessCount = lockCategory.Locks.Count - lockCategory.MaxLocks;

                var oldestKeys = lockCategory.Locks
                    .OrderBy(kvp => kvp.Value.LastAccessedUtc)
                    .Take(excessCount)
                    .Select(kvp => kvp.Key)
                    .ToList();

                foreach (var key in oldestKeys)
                    if (lockCategory.Locks.TryRemove(key, out var removedEntry))
                        removedEntry.Dispose();
            }
        }

        /// <summary>
        /// Gets the current count of locks in a category (for diagnostics).
        /// </summary>
        /// <param name="category">Category name.</param>
        /// <returns>Number of locks, or 0 if category doesn't exist.</returns>
        public static int GetLockCount(string category)
        {
            return Categories.TryGetValue(category, out var lockCategory)
                ? lockCategory.Locks.Count
                : 0;
        }

        /// <summary>
        /// Gets all category names (for diagnostics).
        /// </summary>
        /// <returns>List of category names.</returns>
        public static IReadOnlyList<string> GetCategories()
        {
            return Categories.Keys.ToList();
        }
    }
}
