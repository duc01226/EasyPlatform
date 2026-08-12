using System.Security.Cryptography;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the message-bus diagnostic boundary at runtime, complementing the source-shape tests that only assert the
/// sinks call it.
/// <para />Both credential-shaped and identity-shaped members are planted, and the assertions cover the property
/// NAMES as well as the values — a type-only envelope discloses neither, whereas any redaction scheme that masks
/// values still leaks the schema.
/// <para />The persisted case deliberately builds the stored transport JSON and asserts the sentinels ARE in it
/// before asserting they are absent from the diagnostic. That is the whole point of
/// <c>FormatPersistedMessage</c> taking a type name rather than the row: the payload sitting next to it in the
/// database stays unread.
/// </summary>
public class PlatformMessageBusDiagnosticFormatterTests
{
    [Fact]
    public void FormatRuntimeMessage_WhenPayloadContainsMarkedCredentialAndUnmarkedIdentity_EmitsTypeOnly()
    {
        var credentialSentinel = CreateSentinel();
        var identitySentinel = CreateSentinel();
        var message = new DiagnosticMessage
        {
            Credential = credentialSentinel,
            Identity = identitySentinel
        };

        var diagnostics = PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(message);

        diagnostics.Should().Contain(nameof(DiagnosticMessage));
        diagnostics.Should().NotContain(credentialSentinel);
        diagnostics.Should().NotContain(identitySentinel);
        diagnostics.Should().NotContain(nameof(DiagnosticMessage.Credential));
        diagnostics.Should().NotContain(nameof(DiagnosticMessage.Identity));
    }

    [Fact]
    public void FormatPersistedMessage_WhenTransportPayloadContainsCredentialAndIdentity_DoesNotAcceptPayload()
    {
        var credentialSentinel = CreateSentinel();
        var identitySentinel = CreateSentinel();
        var persistedTransportJson =
            $"{{\"credential\":\"{credentialSentinel}\",\"identity\":\"{identitySentinel}\"}}";

        var diagnostics =
            PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(typeof(DiagnosticMessage).FullName);

        persistedTransportJson.Should().Contain(credentialSentinel);
        persistedTransportJson.Should().Contain(identitySentinel);
        diagnostics.Should().Contain(nameof(DiagnosticMessage));
        diagnostics.Should().NotContain(credentialSentinel);
        diagnostics.Should().NotContain(identitySentinel);
    }

    /// <summary>
    /// The bus message and the exception are two SEPARATE disclosure boundaries, and this test is the only place
    /// that exercises both at once — so each gets its own sentinel.
    /// <para />The message-body sentinels stay excluded (the payload boundary is unchanged); the exception MESSAGE
    /// is now expected, per the reversal recorded on <c>PlatformDiagnosticJsonSerializer.SerializeException</c>;
    /// <see cref="Exception.Data" /> stays excluded. Merging the last two into one sentinel — as this test did
    /// before the reversal — would let the expected message disclosure satisfy the assertion and silently retire
    /// the <c>Data</c> protection.
    /// </summary>
    [Fact]
    public void ConsumerFailureLog_WhenMessageContainsCredentialAndIdentity_LogsExceptionDetailButNoPayload()
    {
        var credentialSentinel = CreateSentinel();
        var identitySentinel = CreateSentinel();
        var exceptionMessageSentinel = CreateSentinel();
        var exceptionDataSentinel = CreateSentinel();
        var capturedLogs = new List<string>();
        var capturedExceptions = new List<Exception?>();
        var logger = new CaptureLogger(capturedLogs, capturedExceptions);
        var message = new DiagnosticMessage
        {
            Credential = credentialSentinel,
            Identity = identitySentinel
        };
        var exception = new InvalidOperationException(exceptionMessageSentinel);
        exception.Data["provider-response"] = exceptionDataSentinel;

        IPlatformMessageBusConsumer.LogError(
            logger,
            typeof(PlatformMessageBusDiagnosticFormatterTests),
            message,
            exception);

        capturedLogs.Should().ContainSingle();
        capturedExceptions.Should().ContainSingle().Which.Should().BeNull(
            "the raw exception object must not be supplied to ILogger independently of formatted state");
        capturedLogs[0].Should().Contain(nameof(DiagnosticMessage));
        capturedLogs[0].Should().Contain(nameof(InvalidOperationException));
        capturedLogs[0].Should().NotContain(credentialSentinel);
        capturedLogs[0].Should().NotContain(identitySentinel);
        capturedLogs[0].Should().Contain(
            exceptionMessageSentinel,
            "a consumer failure log that names only the exception type cannot be acted on");
        capturedLogs[0].Should().NotContain(
            exceptionDataSentinel,
            "Exception.Data stays unread — this is the assertion that must survive every future edit to this test");
    }

    [Fact]
    public void NormalSerialization_WhenMessageContainsCredentials_PreservesTransportPayload()
    {
        var sentinel = CreateSentinel();
        var message = new DiagnosticMessage { Credential = sentinel, Identity = sentinel };

        var transportJson = PlatformJsonSerializer.Serialize(message);
        var diagnostics = PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(message);

        transportJson.Should().Contain(sentinel, "normal message transport must remain unchanged");
        diagnostics.Should().NotContain(sentinel);
    }

    private static string CreateSentinel()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    private sealed class DiagnosticMessage
    {
        [PlatformSensitiveData]
        public string Credential { get; init; } = string.Empty;

        public string Identity { get; init; } = string.Empty;
    }

    private sealed class CaptureLogger(
        List<string> capturedLogs,
        List<Exception?> capturedExceptions) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            capturedLogs.Add(formatter(state, exception));
            capturedExceptions.Add(exception);
        }
    }
}
