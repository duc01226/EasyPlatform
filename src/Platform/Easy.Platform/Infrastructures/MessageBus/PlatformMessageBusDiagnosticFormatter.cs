using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;

namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Builds a payload-free diagnostic representation for runtime and persisted bus messages.
/// </summary>
/// <remarks>
/// <para>
/// WHAT: the single entry point every message-bus log, trace tag, and persisted failure field goes through. For
/// MESSAGES it emits a type-only JSON envelope and never the body.
/// <para />
/// <see cref="FormatException" /> is the one method here that renders real content — the exception's type, message,
/// stack trace and inner type chain — because on the consume/send failure paths the exception is swallowed and its
/// envelope is the only record. The payload-free rule below governs the MESSAGE, not the exception.
/// </para>
/// <para>
/// WHY it exists as its own type rather than calling the diagnostic serializer directly at each site: the bus has
/// two distinct sources for "which message is this" — a live object during produce/consume, and a stored type name on
/// an inbox/outbox row where the body is JSON that must not be reopened. Giving each source a named method makes the
/// safe call obvious at the call site and keeps the unsafe one (deserialize the row, then log the result) from
/// looking equally reasonable. It also gives the source-shape tests one symbol to assert every sink routes through.
/// </para>
/// <para>
/// WHY payload-free: bus messages carry cross-service business data, and their failure paths are the most heavily
/// logged code in the system — every retry of every poisoned message re-emits the same record. Logging the body
/// there both discloses it and multiplies it by the retry count.
/// </para>
/// </remarks>
public static class PlatformMessageBusDiagnosticFormatter
{
    /// <summary>
    /// Describes a live message object by its runtime type. Used on produce, consume, retry, and trace paths where
    /// the deserialized message is already in hand.
    /// </summary>
    /// <param name="message">The message instance; <c>null</c> degrades to the unknown-type envelope.</param>
    /// <returns>A type-only JSON envelope; never the message content.</returns>
    /// <remarks>
    /// Uses the RUNTIME type, not the declared one — these call sites hold the message as <see cref="object" /> or as
    /// a base message type, so the declared type would name the abstraction rather than the message that failed.
    /// </remarks>
    public static string FormatRuntimeMessage(object? message)
    {
        return FormatMessageType(message?.GetType().GetNameOrGenericTypeName());
    }

    /// <summary>
    /// Describes a stored inbox/outbox message from the type name already on the row.
    /// </summary>
    /// <param name="messageTypeFullName">The row's persisted message type name.</param>
    /// <returns>A type-only JSON envelope; never the stored JSON body.</returns>
    /// <remarks>
    /// This is the method that makes the safe path the easy one. Inbox/outbox failure handlers hold a row whose
    /// <c>JsonMessage</c> column is the full message body; the tempting log line deserializes it or takes its first N
    /// characters, both of which put business data into every retry record. Reading the type name off the row needs
    /// no parse, cannot throw on malformed stored JSON, and answers the only question the log needs.
    /// </remarks>
    public static string FormatPersistedMessage(string? messageTypeFullName)
    {
        return FormatMessageType(messageTypeFullName);
    }

    /// <summary>
    /// Describes a failure by exception type, message, demystified stack trace, and inner exception TYPE names.
    /// <see cref="Exception.Data" /> and inner exception MESSAGES are never read, and the bus message itself is
    /// never touched by this method.
    /// </summary>
    /// <param name="exception">The failure; <c>null</c> degrades to the unknown-type envelope.</param>
    /// <returns>A bounded JSON exception envelope; never throws.</returns>
    /// <remarks>
    /// <para>
    /// Also used for the PERSISTED failure columns (<c>LastConsumeError</c> / <c>LastSendError</c>), not just logs.
    /// Those columns are long-lived rows readable by anyone with database access, so they are held to the same bar as
    /// a log sink rather than treated as internal storage.
    /// </para>
    /// <para>
    /// This method previously emitted the exception TYPE alone. That was reversed because on the consume/send
    /// failure paths the exception is caught and never rethrown, making this envelope the only record — a type name
    /// alone cannot be acted on. The full trade-off, including the accepted disclosure of credential-bearing
    /// messages, is documented on <c>PlatformDiagnosticJsonSerializer.SerializeException</c>; do not re-derive it
    /// here. What did NOT change is the boundary this class exists for: the message payload is still never
    /// serialized — see <see cref="FormatRuntimeMessage{TMessage}" /> and <see cref="FormatPersistedMessage" />.
    /// </para>
    /// </remarks>
    public static string FormatException(Exception? exception)
    {
        return PlatformDiagnosticJsonSerializer.SerializeException(exception);
    }

    /// <summary>
    /// Shared tail for both message overloads, so runtime and persisted diagnostics emit an identical shape and a
    /// log query does not need to know which path produced the record.
    /// </summary>
    /// <param name="messageType">Resolved message type name, or <c>null</c>/blank.</param>
    /// <returns>A type-only JSON envelope.</returns>
    private static string FormatMessageType(string? messageType)
    {
        return PlatformDiagnosticJsonSerializer.SerializeMessageType(messageType);
    }
}
