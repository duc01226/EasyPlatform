namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Utility class for integration tests: unique data generation and eventual-consistency polling.
/// This is a platform-level helper that can be used by any service's integration tests.
/// </summary>
public static class PlatformIntegrationTestHelper
{
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
    /// processing — data state may not be immediately correct after command returns. Default timeout is 5s.
    /// </para>
    /// </summary>
    /// <param name="condition">Async condition to poll — returns true when satisfied</param>
    /// <param name="timeout">Max wait time (default: 5 seconds)</param>
    /// <param name="pollingInterval">Interval between polls (default: 100ms)</param>
    /// <param name="timeoutMessage">Message for TimeoutException if condition not met</param>
    public static async Task WaitUntilAsync(
        Func<Task<bool>> condition,
        TimeSpan? timeout = null,
        TimeSpan? pollingInterval = null,
        string? timeoutMessage = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveTimeout = timeout ?? TimeSpan.FromSeconds(5);
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
    /// <param name="timeout">Max wait time (default: 5 seconds)</param>
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
        var effectiveTimeout = timeout ?? TimeSpan.FromSeconds(5);
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
}
