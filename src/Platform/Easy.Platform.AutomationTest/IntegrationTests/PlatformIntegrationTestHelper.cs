using Easy.Platform.Domain.Exceptions;

namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Utility class for integration tests: unique data generation and eventual-consistency polling.
/// This is a platform-level helper that can be used by any service's integration tests.
/// </summary>
public static class PlatformIntegrationTestHelper
{
    /// <summary>
    /// Canonical default max wait for ALL integration-test eventual-consistency polling.
    /// <para>
    /// 120s is the project standard: long enough to absorb async event-handler / bus-consumer / background-job
    /// lag under normal load, but short enough that a genuinely hung or broken path fails fast instead of
    /// masquerading as a slow one. No per-test wait should exceed this — a test that needs more is signalling
    /// a real bug (or running under infra contention that must be fixed at the runner, not by widening waits).
    /// The only sanctioned exception is one-time FIXTURE cold-start seed-cascade waits, which are not per-test.
    /// </para>
    /// </summary>
    public static readonly TimeSpan DefaultMaxWait = TimeSpan.FromSeconds(120);

    /// <summary>
    /// Returns "{baseName}_{8-char-guid}" for unique entity names.
    /// </summary>
    public static string UniqueName(string baseName)
    {
        return $"{baseName}_{Guid.NewGuid().ToString("N")[..8]}";
    }

    /// <summary>
    /// Returns a 12-character unique ID.
    /// </summary>
    public static string UniqueId()
    {
        return Guid.NewGuid().ToString("N")[..12];
    }

    /// <summary>
    /// Returns "{prefix}_{8-char-guid}@test.local" for unique email addresses.
    /// </summary>
    public static string UniqueEmail(string prefix = "test")
    {
        return $"{prefix}_{Guid.NewGuid().ToString("N")[..8]}@test.local";
    }

    /// <summary>
    /// Polls a condition until it returns true or the timeout expires.
    /// Use for eventual-consistency assertions (message bus side-effects, background jobs, async event handlers).
    /// <para>
    /// <strong>CRITICAL:</strong> Commands trigger async event handlers, message bus consumers, and background
    /// processing — data state may not be immediately correct after command returns. Default timeout is 120s.
    /// </para>
    /// </summary>
    /// <param name="condition">Async condition to poll — returns true when satisfied</param>
    /// <param name="timeout">Max wait time (default: 120 seconds)</param>
    /// <param name="pollingInterval">Interval between polls (default: 100ms)</param>
    /// <param name="timeoutMessage">Message for TimeoutException if condition not met</param>
    public static async Task WaitUntilAsync(
        Func<Task<bool>> condition,
        TimeSpan? timeout = null,
        TimeSpan? pollingInterval = null,
        string? timeoutMessage = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveTimeout = timeout ?? DefaultMaxWait;
        var effectiveInterval = pollingInterval ?? TimeSpan.FromMilliseconds(100);
        var deadline = DateTime.UtcNow + effectiveTimeout;

        while (DateTime.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (await condition())
                return;

            await Task.Delay(effectiveInterval, cancellationToken);
        }

        throw new TimeoutException(
            timeoutMessage ?? $"Condition not met within {effectiveTimeout.TotalSeconds}s");
    }

    /// <summary>
    /// Polls an assertion action until it passes (no exception) or the timeout expires.
    /// The action should throw (e.g., FluentAssertions) if the condition is not met.
    /// On timeout, throws <see cref="TimeoutException"/> with the last assertion failure as inner exception.
    /// </summary>
    /// <param name="assertion">Async assertion that throws on failure</param>
    /// <param name="timeout">Max wait time (default: 120 seconds)</param>
    /// <param name="pollingInterval">Interval between polls (default: 100ms)</param>
    /// <param name="timeoutMessage">Message for TimeoutException if assertion never passes</param>
    /// <param name="cancellationToken">Cancellation token to stop polling early (e.g., test runner timeout)</param>
    public static async Task WaitUntilAsync(
        Func<Task> assertion,
        TimeSpan? timeout = null,
        TimeSpan? pollingInterval = null,
        string? timeoutMessage = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveTimeout = timeout ?? DefaultMaxWait;
        var effectiveInterval = pollingInterval ?? TimeSpan.FromMilliseconds(100);
        var deadline = DateTime.UtcNow + effectiveTimeout;
        Exception? lastException = null;

        while (DateTime.UtcNow < deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await assertion();
                return;
            }
            catch (Exception ex)
            {
                lastException = ex;
                await Task.Delay(effectiveInterval, cancellationToken);
            }
        }

        throw new TimeoutException(
            timeoutMessage ?? $"Assertion not satisfied within {effectiveTimeout.TotalSeconds}s",
            lastException);
    }

    /// <summary>
    /// Default attempt budget for <see cref="ExecuteWithConcurrencyRetryAsync{T}"/> — 1 initial try + up to 2 retries.
    /// </summary>
    public const int DefaultConcurrencyRetryAttempts = 3;

    /// <summary>
    /// Executes <paramref name="action"/>, retrying ONLY on optimistic-concurrency conflicts, up to
    /// <paramref name="maxAttempts"/> times (default <see cref="DefaultConcurrencyRetryAttempts"/>).
    /// <para>
    /// <strong>Why this is safe and does not mask bugs.</strong> Integration suites are deliberately additive and
    /// run the REAL background consumers / entity-event-handlers / jobs, which concurrently touch shared seed
    /// entities. A command that reads-then-writes such an entity can therefore lose a row-version race transiently
    /// — a flake, not a defect. A concurrency conflict rolls the whole unit of work back (nothing was committed), so
    /// re-running the action simply re-reads the latest row version and re-applies the command — idempotent by
    /// construction. Crucially, retry is scoped to concurrency conflicts ONLY: any OTHER exception propagates
    /// immediately on its first occurrence (never retried, never swallowed), and a conflict that still persists after
    /// every attempt is re-thrown as a genuine, non-transient contention failure. This resilience must never be used
    /// to paper over an assertion failure or a real handler bug.
    /// </para>
    /// </summary>
    /// <param name="action">The (transactional, hence safely re-runnable) action to execute.</param>
    /// <param name="maxAttempts">Total attempts including the first (default 3). Values &lt; 1 are treated as 1.</param>
    /// <param name="retryDelay">Delay between attempts (default 200ms) — lets the racing writer settle.</param>
    public static async Task<T> ExecuteWithConcurrencyRetryAsync<T>(
        Func<Task<T>> action,
        int maxAttempts = DefaultConcurrencyRetryAttempts,
        TimeSpan? retryDelay = null)
    {
        var effectiveMaxAttempts = maxAttempts < 1 ? 1 : maxAttempts;
        var delay = retryDelay ?? TimeSpan.FromMilliseconds(200);

        for (var attempt = 1; attempt <= effectiveMaxAttempts; attempt++)
        {
            try
            {
                return await action();
            }
            catch (Exception ex) when (attempt < effectiveMaxAttempts && IsConcurrencyConflict(ex))
            {
                await Task.Delay(delay);
            }
        }

        // Unreachable: on the final attempt the catch filter is false, so the action either returns or its exception
        // propagates. Present only to satisfy definite-assignment (all paths must return or throw).
        throw new InvalidOperationException(
            "ExecuteWithConcurrencyRetryAsync exhausted its attempt budget without a return or a propagated exception.");
    }

    /// <summary>
    /// Void overload of <see cref="ExecuteWithConcurrencyRetryAsync{T}"/>.
    /// </summary>
    public static Task ExecuteWithConcurrencyRetryAsync(
        Func<Task> action,
        int maxAttempts = DefaultConcurrencyRetryAttempts,
        TimeSpan? retryDelay = null)
    {
        return ExecuteWithConcurrencyRetryAsync(
            async () =>
            {
                await action();
                return true;
            },
            maxAttempts,
            retryDelay);
    }

    /// <summary>
    /// True when <paramref name="ex"/> (or any exception in its inner-exception chain) is an optimistic-concurrency
    /// conflict — the ONLY transient class <see cref="ExecuteWithConcurrencyRetryAsync{T}"/> retries. Matches the
    /// platform's <see cref="PlatformDomainRowVersionConflictException"/> directly, plus the provider-native
    /// concurrency exceptions (EF <c>DbUpdateConcurrencyException</c>, Mongo write-conflicts) by type name so no
    /// persistence-provider package reference is needed here.
    /// <para>
    /// PUBLIC so every test suite shares ONE definition of "is this a concurrency conflict". Call this instead of
    /// re-implementing the check — hand-rolled copies drift, and the common hand-rolled form
    /// (<c>ex.GetType().Name is "..."</c>) is silently broken by a type rename because the compiler cannot see the
    /// dependency. The typed <see cref="PlatformDomainRowVersionConflictException"/> arm below is the one that
    /// matters in practice: every provider translates its native concurrency error into that type before it escapes
    /// the persistence layer. The name-based arm is defence-in-depth for raw provider exceptions surfacing from code
    /// paths that bypass the platform DbContext (e.g. an ASP.NET Identity store on a non-platform DbContext).
    /// </para>
    /// </summary>
    public static bool IsConcurrencyConflict(Exception? ex)
    {
        for (var current = ex; current != null; current = current.InnerException)
        {
            if (current is PlatformDomainRowVersionConflictException)
                return true;

            var typeName = current.GetType().Name;
            if (typeName.Contains("ConcurrencyException", StringComparison.Ordinal) ||
                typeName.Contains("RowVersionConflict", StringComparison.Ordinal))
                return true;
        }

        return false;
    }
}
