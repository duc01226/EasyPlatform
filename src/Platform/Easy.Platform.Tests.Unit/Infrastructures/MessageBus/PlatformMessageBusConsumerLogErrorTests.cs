using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.Infrastructures.MessageBus;

/// <summary>
/// Guards the redaction invariant of <see cref="IPlatformMessageBusConsumer.LogError{TMessage}" />: a failed consume may
/// log the message's IDENTITY but NEVER its payload.
/// <para>
/// <b>Business intent / invariant guarded:</b> bus messages routinely carry personal data (email addresses, names,
/// free-text bodies). This method is the single funnel EVERY consume-failure log in EVERY service goes through —
/// including the retry sites, which are not gated by any per-consumer opt-out — so a payload logged here is personal
/// data copied at ERROR level into a sink with its own retention, outside the reach of an erasure request. These tests
/// fail if that leak is reintroduced.
/// </para>
/// <para>
/// <b>Why the assertions look at the log STATE, not just the formatted text:</b> the structured-logging destructure
/// operator (<c>{@Message}</c>) passes the message OBJECT itself as a state value; whether that object's fields ever
/// reach a sink as text depends on the sink (Serilog destructures it; the default formatter calls
/// <c>ToString()</c>). Asserting only the formatted string would therefore pass against a fake logger while the real
/// Serilog sink leaked everything. The reference check on the state is what actually kills that mutation — do not
/// "simplify" it away.
/// </para>
/// </summary>
public class PlatformMessageBusConsumerLogErrorTests
{
    // Distinctive sentinels: a substring search for these is only meaningful if they cannot occur incidentally.
    private const string PiiEmail = "pii-sentinel-candidate@example-donotuse.test";
    private const string PiiName = "PiiSentinelGivenName";
    private const string PiiFreeText = "PiiSentinelBodyTextThatMustNeverBeLogged";

    [Fact]
    public void LogError_ForTrackableMessage_LogsIdentityAndNeverThePayload()
    {
        var logger = new CapturingLogger();
        var message = new PiiCarryingTrackableTestMessage
        {
            TrackingId = "01JTRACKINGIDSENTINEL0001",
            CreatedUtcDate = new DateTime(2026, 08, 04, 10, 30, 00, DateTimeKind.Utc),
            CandidateEmail = PiiEmail,
            CandidateName = PiiName,
            Body = PiiFreeText
        };

        IPlatformMessageBusConsumer.LogError(logger, typeof(FakeConsumer), message, new InvalidOperationException("consume blew up"));

        var entry = logger.Entries.Should().ContainSingle().Subject;
        entry.Level.Should().Be(LogLevel.Error);

        // --- The leak guard (the mutation-killer) -------------------------------------------------------------------
        entry.State.Should().NotContain(
            kv => ReferenceEquals(kv.Value, message),
            "the message object must never be handed to the logger as state — a destructuring sink would serialize its "
            + "whole object graph, including every personal-data field");

        foreach (var pii in new[] { PiiEmail, PiiName, PiiFreeText })
        {
            entry.Formatted.Should().NotContain(pii, "no personal-data field may appear in the rendered log line");
            entry.State.Should().NotContain(
                kv => ValueRendersContaining(kv.Value, pii),
                "no personal-data field may appear in any structured log property either");
        }

        // --- The diagnosability counter-guard ----------------------------------------------------------------------
        // Without these, "log nothing at all" would pass the leak guard above. A failed consume must still be
        // traceable: which consumer, which message type, and WHICH message (TrackingId is the handle to the
        // authoritative copy in the outbox/inbox store).
        entry.State.Should().Contain(kv => Equals(kv.Value, message.TrackingId), "the TrackingId is how an operator finds the real payload");
        entry.Formatted.Should().Contain(message.TrackingId);
        entry.Formatted.Should().Contain(nameof(PiiCarryingTrackableTestMessage), "the message TYPE is not personal data and is needed to triage");
        entry.Formatted.Should().Contain(typeof(FakeConsumer).FullName!, "the failing consumer must be identifiable");
        entry.Exception.Should().BeOfType<InvalidOperationException>("the cause must survive — redaction applies to the payload, not the error");
    }

    [Fact]
    public void LogError_ForNonTrackableMessage_StillLogsTypeAndDoesNotThrowOrLeak()
    {
        // A message type that is NOT IPlatformTrackableBusMessage takes the `as`-returns-null path. It must degrade to
        // "no identity available" rather than throwing inside an error handler — a logger that throws while reporting a
        // consume failure would replace a handled fault with an unhandled one.
        var logger = new CapturingLogger();
        var message = new PiiCarryingPlainTestMessage { CandidateEmail = PiiEmail };

        var act = () => IPlatformMessageBusConsumer.LogError(logger, typeof(FakeConsumer), message, new InvalidOperationException("boom"));

        act.Should().NotThrow();

        var entry = logger.Entries.Should().ContainSingle().Subject;
        entry.Formatted.Should().Contain(nameof(PiiCarryingPlainTestMessage));
        entry.Formatted.Should().NotContain(PiiEmail);
        entry.State.Should().NotContain(kv => ReferenceEquals(kv.Value, message));
        entry.State.Should().NotContain(kv => ValueRendersContaining(kv.Value, PiiEmail));
    }

    /// <summary>
    /// Extracted as a static method because FluentAssertions' collection predicates are EXPRESSION TREES, which cannot
    /// contain the null-propagating operator — but may call a static method.
    /// </summary>
    private static bool ValueRendersContaining(object? value, string needle)
    {
        return value?.ToString()?.Contains(needle, StringComparison.Ordinal) == true;
    }

    private sealed class FakeConsumer;

    private sealed class PiiCarryingTrackableTestMessage : PlatformTrackableBusMessage
    {
        public string CandidateEmail { get; set; } = "";
        public string CandidateName { get; set; } = "";
        public string Body { get; set; } = "";

        public override string SubQueuePrefix() => "";
    }

    private sealed class PiiCarryingPlainTestMessage
    {
        public string CandidateEmail { get; set; } = "";
    }

    private sealed record CapturedEntry(
        LogLevel Level,
        string Formatted,
        IReadOnlyList<KeyValuePair<string, object?>> State,
        Exception? Exception);

    /// <summary>
    /// A purpose-built capturing <see cref="ILogger" />. The project's convention is <c>new Mock&lt;ILogger&gt;()</c>,
    /// but that convention exists for tests that IGNORE the logger; capturing a generic <c>Log&lt;TState&gt;</c> call
    /// through Moq requires reflection over the formatter delegate, which is both unreadable and easy to get silently
    /// wrong. A 10-line fake states the same intent plainly.
    /// </summary>
    private sealed class CapturingLogger : ILogger
    {
        public List<CapturedEntry> Entries { get; } = [];

        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull => NoopScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Entries.Add(
                new CapturedEntry(
                    logLevel,
                    formatter(state, exception),
                    (state as IEnumerable<KeyValuePair<string, object?>>)?.ToList() ?? [],
                    exception));
        }

        private sealed class NoopScope : IDisposable
        {
            public static readonly NoopScope Instance = new();

            public void Dispose() { }
        }
    }
}
