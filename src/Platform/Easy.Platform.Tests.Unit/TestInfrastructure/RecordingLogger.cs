using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.TestInfrastructure;

/// <summary>
/// A purpose-built capturing <see cref="ILogger" /> shared by every unit test in this project that needs to observe
/// what a logger call recorded, instead of asserting "did not throw".
/// <para>
/// <b>Why not <c>Mock&lt;ILogger&gt;</c>:</b> that convention exists for tests that IGNORE the logger; capturing a
/// generic <c>Log&lt;TState&gt;</c> call through Moq requires reflection over the formatter delegate, which is both
/// unreadable and easy to get silently wrong. A small fake states the same intent plainly.
/// </para>
/// <para>
/// <b>Why <see cref="CapturedLogEntry.State" /> is kept, not just the formatted text:</b> the structured-logging
/// destructure operator (<c>{@Message}</c>) passes an object itself as a state value; whether that object's fields ever
/// reach a sink as text depends on the sink (Serilog destructures it; the default formatter calls <c>ToString()</c>).
/// Asserting only the formatted string would pass against this fake while a real Serilog sink leaked everything — the
/// reference check on <see cref="CapturedLogEntry.State" /> is what a PII-leak regression test needs.
/// </para>
/// <para>
/// <b>Why <see cref="Entries" /> is lock-protected:</b> this fake is shared by tests of background-job executors that
/// internally fan work out with <c>ParallelAsync</c>. No test currently logs from more than one thread against a
/// single instance, but a fake this widely reused should not silently corrupt <see cref="Entries" /> the day a test
/// does — so writes are serialized and <see cref="Entries" /> returns a snapshot copy taken under the same lock,
/// making concurrent enumeration safe by construction rather than by the accident of who calls it today.
/// </para>
/// </summary>
internal sealed class RecordingLogger : ILogger
{
    private readonly List<CapturedLogEntry> entries = [];
    private readonly Lock entriesLock = new();

    public IReadOnlyList<CapturedLogEntry> Entries
    {
        get
        {
            lock (entriesLock)
                return entries.ToList();
        }
    }

    public int ErrorCount => Entries.Count(entry => entry.Level == LogLevel.Error);

    public int WarningCount => Entries.Count(entry => entry.Level == LogLevel.Warning);

    public string LastWarningFormatted => Entries.LastOrDefault(entry => entry.Level == LogLevel.Warning)?.Formatted ?? "";

    public IDisposable BeginScope<TState>(TState state)
        where TState : notnull => NoopScope.Instance;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        var entry = new CapturedLogEntry(
            logLevel,
            formatter(state, exception),
            (state as IEnumerable<KeyValuePair<string, object?>>)?.ToList() ?? [],
            exception);

        lock (entriesLock)
            entries.Add(entry);
    }

    private sealed class NoopScope : IDisposable
    {
        public static readonly NoopScope Instance = new();

        public void Dispose() { }
    }
}

/// <summary>
/// One call captured by <see cref="RecordingLogger" />.
/// </summary>
internal sealed record CapturedLogEntry(
    LogLevel Level,
    string Formatted,
    IReadOnlyList<KeyValuePair<string, object?>> State,
    Exception? Exception);

/// <summary>
/// An <see cref="ILoggerFactory" /> that always hands back the same <see cref="RecordingLogger" />, for consumers that
/// resolve their logger through a factory rather than taking one directly.
/// </summary>
internal sealed class RecordingLoggerFactory : ILoggerFactory
{
    public RecordingLogger Logger { get; } = new();

    public ILogger CreateLogger(string categoryName) => Logger;

    public void AddProvider(ILoggerProvider provider) { }

    public void Dispose() { }
}

/// <summary>
/// An <see cref="ILoggerProvider" /> over the same <see cref="RecordingLogger" />, for a component that resolves its
/// logger from a REAL <c>LoggerFactory.Create(...)</c> pipeline - level filters and all - rather than from a fake
/// factory. <see cref="RecordingLoggerFactory" /> cannot serve that case at all: the real builder accepts PROVIDERS,
/// not factories, so without this adapter such a suite has no way onto the shared fake and has to hand-roll its own.
/// </summary>
internal sealed class RecordingLoggerProvider : ILoggerProvider
{
    public RecordingLogger Logger { get; } = new();

    public ILogger CreateLogger(string categoryName) => Logger;

    public void Dispose() { }
}
