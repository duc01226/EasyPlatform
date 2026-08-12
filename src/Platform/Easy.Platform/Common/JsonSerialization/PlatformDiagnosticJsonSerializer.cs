using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Easy.Platform.Common.JsonSerialization;

/// <summary>
/// WHAT: The serializer behind every observability sink (logs, distributed-trace tags, persisted diagnostic
/// fields). For observed VALUES it is payload-free: it never serializes them, emitting a tiny fixed-shape envelope
/// carrying only a type name, e.g. <c>{"DataType":"MyApp.SaveUserCommand"}</c> or <c>{"MessageType":"..."}</c>.
/// <para />
/// <see cref="SerializeException" /> is the ONE deliberate exception to that rule: it renders the exception's
/// message, demystified stack trace, and inner TYPE chain, because on swallowed and persist-only paths its
/// envelope is the sole record of the failure. It still never reads <see cref="Exception.Data" /> and never
/// traverses the observed payload. See its remarks for the full trade-off.
/// </summary>
/// <remarks>
/// <para>
/// WHY (1) — disclosure. Diagnostics fan out to sinks with a much wider audience than the data itself: log
/// aggregators, APM traces, inbox/outbox rows. Serializing a command, event, entity, bus message, or exception into
/// those sinks leaks credentials, tokens, PII, and tenant data. Emitting the type alone keeps the operationally
/// useful signal ("which contract failed") while making the payload structurally unreachable — nothing walks the
/// object graph, so there is no property, dictionary key, or dynamic member left to leak. That is stronger than
/// allow/deny-listing properties, which silently fails open for every newly added member and for untyped
/// containers such as <see cref="Dictionary{TKey,TValue}" /> or anonymous objects.
/// </para>
/// <para>
/// WHY (2) — availability. A diagnostic sink must never break the operation it is observing. Traversing a
/// caller-owned object runs caller-owned getters and converters, which can throw, recurse, or block; the resulting
/// failure would replace the real failure being logged. This type never touches the value, and its two failure
/// paths both degrade to a constant instead of propagating.
/// </para>
/// <para>
/// WHY (3) — isolation. It deliberately does NOT use <see cref="PlatformJsonSerializer" /> options. Application
/// resolvers and converters are configurable per service and could re-introduce traversal or throw inside the
/// diagnostic path, so the diagnostic boundary owns a bare <see cref="JsonSerializerOptions" /> instance.
/// </para>
/// <para>
/// HOW to use it: do not call this type from application code — it is <c>internal</c> on purpose. Reach it through
/// its public facades: <see cref="PlatformJsonSerializer.SerializeForDiagnostics{TValue}" /> and
/// <see cref="PlatformJsonSerializer.SerializeExceptionForDiagnostics" /> for CQRS/persistence/background-job
/// sinks, and <c>PlatformMessageBusDiagnosticFormatter</c> for runtime and persisted bus messages. Normal
/// transport, model-binding, and persistence serialization stays on <see cref="PlatformJsonSerializer.Serialize{TValue}(TValue)" />
/// and is unaffected.
/// </para>
/// <para>
/// HOW it is enforced: <c>PlatformDiagnosticSinkSourceShapeTests</c> asserts on the source shape of every known
/// sink, so a new sink that bypasses this boundary (raw <c>ToFormattedJson()</c>, <c>{@Request}</c> destructuring,
/// <c>ex.Message</c>/<c>BeautifyStackTrace()</c>) fails the build. Behavior — including hostile getters and
/// converters — is covered by <c>PlatformDiagnosticJsonSerializerTests</c>.
/// </para>
/// <para>
/// Related: <see cref="PlatformSensitiveDataAttribute" /> is the complementary opt-in marker for the few
/// <em>explicitly typed</em> diagnostic projections that do render real content (HTTP request-body redaction).
/// It does not apply here: the payload methods render no content for it to mark, and
/// <see cref="SerializeException" /> renders a fixed set of exception fields chosen at this boundary rather than
/// an opt-in projection of a caller-owned type.
/// </para>
/// </remarks>
internal static class PlatformDiagnosticJsonSerializer
{
    /// <summary>
    /// The single placeholder used whenever a type name cannot be resolved, is blank, or serialization itself
    /// fails — so a diagnostic value is always present and always payload-free.
    /// </summary>
    private const string UnknownType = "unknown";

    /// <summary>
    /// Appended wherever a field was cut short, so a reader can tell "this is all there was" apart from "this is
    /// as much as we kept".
    /// </summary>
    private const string TruncationMarker = "…[truncated]";

    /// <summary>
    /// Upper bound on the whole serialized exception envelope. Mirrors
    /// <c>PlatformHttpRequestBodyDiagnosticSerializer.MaxDiagnosticPayloadBytes</c> (32 KB) but is deliberately
    /// smaller: an exception envelope is written on every failure of every retry, and one of its sinks is a
    /// database column (<c>LastConsumeError</c>/<c>LastSendError</c>) rather than a log line.
    /// </summary>
    /// <remarks>
    /// The columns are <c>nvarchar(max)</c>/<c>text</c>, so this is a hygiene bound, not a correctness one — it
    /// stops a pathological stack trace from dominating a log aggregator or a failed-message row.
    /// </remarks>
    internal const int MaxDiagnosticExceptionBytes = 8 * 1024;

    /// <summary>Per-field char budgets. Deliberately asymmetric: the stack trace is the highest-value field.</summary>
    private const int MaxMessageChars = 1024;

    private const int MaxStackTraceChars = 4096;

    private const int MaxTypeNameChars = 256;

    /// <summary>Successively smaller stack-trace budgets tried before giving the field up entirely.</summary>
    private static readonly int[] StackTraceDegradationBudgets = [MaxStackTraceChars, 1024, 256, 0];

    /// <summary>
    /// Maximum inner-exception type names collected. Counts entries, NOT nesting depth — an
    /// <see cref="AggregateException" /> fan-out is wide rather than deep, and a depth-only bound would let
    /// thousands of siblings through. Collection stops at this many, so a wide aggregate is never materialized.
    /// </summary>
    private const int MaxInnerExceptionEntries = 10;

    /// <summary>
    /// Emits the type-only envelope <c>{"DataType":"..."}</c> for an arbitrary value (command, query, event,
    /// entity, background-job param). The value is used solely to resolve a <see cref="Type" />; it is never
    /// traversed, and none of its members are read.
    /// </summary>
    /// <typeparam name="TValue">Declared type of the observed value.</typeparam>
    /// <param name="value">The observed value. May be <c>null</c> — the declared type is then reported.</param>
    /// <param name="forceUseRuntimeType">
    /// When <c>true</c>, report <c>value.GetType()</c> instead of <typeparamref name="TValue" />. Diagnostic
    /// callers pass <c>true</c> because sinks usually hold the value as a base/interface type (e.g.
    /// <see cref="object" />), which would otherwise report a useless declared type. The runtime type is also
    /// resolved when the declared type is abstract or an interface, for the same reason.
    /// </param>
    /// <param name="writeIndented">Whether to pretty-print the envelope.</param>
    /// <returns>A JSON envelope containing only a type name; never <c>null</c>, never throws.</returns>
    public static string Serialize<TValue>(
        TValue value,
        bool forceUseRuntimeType,
        bool writeIndented)
    {
        var declaredType = typeof(TValue);
        var diagnosticType = value is not null && (forceUseRuntimeType || declaredType.IsAbstract || declaredType.IsInterface)
            ? value.GetType()
            : declaredType;

        return SerializeKnownEnvelope(
            new DataTypeDiagnostic { DataType = GetSafeTypeName(diagnosticType) },
            """{"DataType":"unknown"}""",
            writeIndented);
    }

    /// <summary>
    /// Emits the type-only envelope <c>{"MessageType":"..."}</c> for a bus message. Takes the type name as a
    /// string because the caller may only have the persisted <c>MessageTypeFullName</c> of an inbox/outbox row —
    /// never the deserialized message — which keeps the stored JSON payload out of every retry, cleanup, and
    /// failure diagnostic.
    /// </summary>
    /// <param name="messageType">Message type name; <c>null</c>/blank degrades to <see cref="UnknownType" />.</param>
    /// <param name="writeIndented">Whether to pretty-print the envelope.</param>
    /// <returns>A JSON envelope containing only the message type name; never <c>null</c>, never throws.</returns>
    public static string SerializeMessageType(string? messageType, bool writeIndented = false)
    {
        return SerializeKnownEnvelope(
            new MessageTypeDiagnostic { MessageType = string.IsNullOrWhiteSpace(messageType) ? UnknownType : messageType },
            """{"MessageType":"unknown"}""",
            writeIndented);
    }

    /// <summary>
    /// Emits the exception envelope <c>{"ExceptionType","Message","StackTrace","InnerExceptionTypes"}</c> for a
    /// failure. This is the ONE diagnostic path that renders real content, and the exception to this class's
    /// payload-free rule.
    /// </summary>
    /// <remarks>
    /// <para>
    /// WHY it renders content, unlike every other method here: on the paths where an exception is swallowed
    /// (<c>PlatformCqrsEventHandler</c> with <c>ThrowExceptionOnHandleFailed=false</c>, the default for non-inbox
    /// handlers) or only persisted (<c>LastConsumeError</c>/<c>LastSendError</c>), this envelope is the ONLY record
    /// of the failure. A type name alone tells a developer that an <c>InvalidOperationException</c> happened
    /// somewhere in a service — which is not enough to fix anything. The same trade-off is already made, and
    /// documented, by <c>PlatformHttpRequestBodyDiagnosticSerializer</c>.
    /// </para>
    /// <para>
    /// WHAT is disclosed, deliberately: the message and the demystified stack frames. Frames carry parameter types
    /// and names but never argument VALUES, so the stack is location data, not payload. The message is the one
    /// genuinely risky field — framework exceptions embed connection strings and URLs with credentials — and it is
    /// included anyway, because the untouched sinks (<c>PlatformGlobalExceptionHandlerMiddleware</c>,
    /// <c>PlatformBackgroundJobExecutor</c>) already log full exceptions, and <c>PlatformInboxBusMessage.JsonMessage</c>
    /// already persists the whole message body in the SAME ROW as <c>LastConsumeError</c>. Withholding it here
    /// protected nothing globally while blinding the two paths that have no other record.
    /// </para>
    /// <para>
    /// WHAT is still NOT disclosed: <see cref="Exception.Data" /> — an untyped bag any library may stuff, with high
    /// risk and near-zero debugging value — and inner exception MESSAGES; only inner exception TYPE names are
    /// collected. The observed payload object is never traversed; that rule is unchanged and lives in
    /// <see cref="Serialize{TValue}" />.
    /// </para>
    /// <para>
    /// NOT scrubbed — an accepted risk, not an oversight. Credential-shaped substrings in the message are NOT
    /// redacted. The exposure is real and routine: <c>SqlException</c>, <c>HttpRequestException</c> and storage-SDK
    /// exceptions embed connection strings and SAS tokens in <c>.Message</c>, and <c>LastConsumeError</c> is a
    /// database column surfaced by support tooling and retained until the row is purged. A bounded regex denylist
    /// was proposed and **rejected** (repository owner, 2026-07-30): a partial scrub invites being mistaken for a
    /// guarantee, and the disclosure was already accepted when message inclusion was chosen. Treat this field as
    /// sensitive at the sink — restrict who can read logs and failure columns — not here.
    /// </para>
    /// <para>
    /// Second accepted risk: demystified frames contain the BUILD MACHINE's absolute source paths (e.g.
    /// <c>D:\src\...</c>). This is low-severity information disclosure about the build environment, not about any
    /// user or tenant, and it is the unavoidable cost of frames a developer can actually read.
    /// </para>
    /// <para>
    /// HOW it stays safe: every read is individually guarded, so a hostile <see cref="Exception.Message" /> or
    /// <see cref="Exception.StackTrace" /> getter degrades that ONE field to <c>null</c> instead of destroying the
    /// diagnostic. Output is bounded by <see cref="MaxDiagnosticExceptionBytes" /> through a degradation ladder,
    /// and the inner walk is bounded by <see cref="MaxInnerExceptionEntries" /> ENTRIES rather than depth.
    /// </para>
    /// </remarks>
    /// <param name="exception">The observed exception; <c>null</c> degrades to <see cref="UnknownType" />.</param>
    /// <param name="writeIndented">Whether to pretty-print the envelope.</param>
    /// <returns>A JSON exception envelope; never <c>null</c>, never throws, never exceeds the byte cap.</returns>
    public static string SerializeException(Exception? exception, bool writeIndented = false)
    {
        const string fallback = """{"ExceptionType":"unknown"}""";

        if (exception == null) return SerializeKnownEnvelope(new ExceptionTypeDiagnostic(), fallback, writeIndented);

        // Capped like the inner type names: a constructed generic's FullName embeds an assembly-qualified name per
        // type argument and is not inherently bounded. The ladder below only shrinks the stack trace, and the
        // terminal fallback re-emits this value, so leaving it uncapped is the one way the byte cap could be
        // exceeded on every rung.
        var exceptionType = Truncate(GetSafeTypeName(exception.GetType()), MaxTypeNameChars)!;
        var message = Truncate(TryReadMessage(exception), MaxMessageChars);
        var innerTypes = CollectInnerExceptionTypeNames(exception);
        var stackTrace = TryReadDemystifiedStackTrace(exception);

        // Degradation ladder rather than a single truncate: per-field char budgets cannot guarantee the BYTE cap,
        // because UTF-8 width and JSON escaping are content-dependent. Shrinking the stack trace step by step
        // keeps the message and inner-type chain — the fields a developer reads first — intact for as long as
        // possible, instead of dropping everything to a type name on the first overflow.
        foreach (var stackBudget in StackTraceDegradationBudgets)
        {
            var json = SerializeKnownEnvelope(
                new ExceptionTypeDiagnostic
                {
                    ExceptionType = exceptionType,
                    Message = message,
                    StackTrace = stackBudget == 0 ? null : Truncate(stackTrace, stackBudget),
                    InnerExceptionTypes = innerTypes
                },
                fallback,
                writeIndented);

            if (Encoding.UTF8.GetByteCount(json) <= MaxDiagnosticExceptionBytes) return json;
        }

        // Every field together still overflows (a pathological multi-byte message). Fall back to the shape this
        // method emitted before enrichment — always well-formed, always under the cap.
        return SerializeKnownEnvelope(new ExceptionTypeDiagnostic { ExceptionType = exceptionType }, fallback, writeIndented);
    }

    /// <summary>
    /// Reads <see cref="Exception.Message" /> behind a guard. <c>Message</c> is virtual, so a caller-owned override
    /// can throw, block, or recurse — and it is read here INSIDE a <c>catch</c> block, where an escaping exception
    /// would replace the failure being recorded.
    /// </summary>
    /// <param name="exception">The observed exception.</param>
    /// <returns>The message, or <c>null</c> if reading it failed.</returns>
    private static string? TryReadMessage(Exception exception)
    {
        try
        {
            return exception.Message;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Produces the demystified stack trace — async/iterator state machines and generic frames rendered as the
    /// source code that generated them, which is the whole reason a developer can read it.
    /// </summary>
    /// <remarks>
    /// Deliberately NOT <c>BeautifyStackTrace()</c>: that helper MUTATES the exception by writing
    /// <c>_stackTraceString</c> through reflection (<c>ExceptionExtensions.cs:35</c>), so observing a failure would
    /// change what an outer handler later logs. Nor <c>ToStringDemystified()</c>, which folds the message and the
    /// whole inner tree into one blob and so cannot be bounded per field. Constructing
    /// <see cref="EnhancedStackTrace" /> directly is the only pure, separately-boundable option.
    /// </remarks>
    /// <param name="exception">The observed exception.</param>
    /// <returns>Demystified frames, the raw stack trace if demystification failed, or <c>null</c>.</returns>
    private static string? TryReadDemystifiedStackTrace(Exception exception)
    {
        try
        {
            var enhanced = new EnhancedStackTrace(exception);
            if (enhanced.FrameCount > 0) return enhanced.ToString();
        }
        catch (Exception)
        {
            // Demystification walks frames reflectively and can fail on exotic runtime types; the raw trace below
            // is still worth having.
        }

        try
        {
            return exception.StackTrace;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Collects inner exception TYPE names — never their messages — breadth-first, bounded by
    /// <see cref="MaxInnerExceptionEntries" /> entries.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The bound counts ENTRIES, not depth, and is enforced while walking rather than by truncating afterwards. An
    /// <see cref="AggregateException" /> from a fan-out can hold thousands of inners; materializing them to throw
    /// most away would allocate proportionally to the failure size on the failure path.
    /// </para>
    /// <para>
    /// Cycle detection uses <see cref="ReferenceEqualityComparer" /> rather than a default
    /// <see cref="HashSet{T}" />: the default comparer would call caller-owned <c>GetHashCode</c>/<c>Equals</c>
    /// overrides, re-introducing exactly the "diagnostic runs caller code" hazard this class exists to avoid.
    /// </para>
    /// </remarks>
    /// <param name="exception">The outermost exception; its own type is reported separately and not included here.</param>
    /// <returns>Ordered inner type names, a trailing <see cref="TruncationMarker" /> when cut short, or <c>null</c> when there are none.</returns>
    private static List<string>? CollectInnerExceptionTypeNames(Exception exception)
    {
        try
        {
            var names = new List<string>();
            var visited = new HashSet<Exception>(ReferenceEqualityComparer.Instance) { exception };
            var pending = new Queue<Exception>();

            var truncated = EnqueueInnerExceptions(exception, pending, visited);

            while (pending.Count > 0 && names.Count < MaxInnerExceptionEntries)
            {
                var current = pending.Dequeue();
                names.Add(Truncate(GetSafeTypeName(current.GetType()), MaxTypeNameChars)!);
                truncated |= EnqueueInnerExceptions(current, pending, visited);
            }

            if (truncated || pending.Count > 0) names.Add(TruncationMarker);

            return names.Count == 0 ? null : names;
        }
        catch (Exception)
        {
            // A caller-owned AggregateException subclass can throw from InnerExceptions; the chain is optional
            // metadata and must never cost the rest of the envelope.
            return null;
        }
    }

    /// <summary>
    /// Enqueues an exception's direct inners, stopping as soon as the queue holds all the entries the caller can
    /// still use.
    /// </summary>
    /// <param name="exception">The exception whose inners to enqueue.</param>
    /// <param name="pending">Breadth-first queue, never grown beyond <see cref="MaxInnerExceptionEntries" />.</param>
    /// <param name="visited">Reference-identity set guarding against cycles and diamond re-entry.</param>
    /// <returns><c>true</c> when inners were left unvisited because the bound was reached.</returns>
    private static bool EnqueueInnerExceptions(Exception exception, Queue<Exception> pending, HashSet<Exception> visited)
    {
        // AggregateException.InnerException aliases InnerExceptions[0], so taking the collection alone avoids
        // reporting the first inner twice.
        if (exception is AggregateException aggregate)
        {
            var inners = aggregate.InnerExceptions;

            for (var i = 0; i < inners.Count; i++)
            {
                if (pending.Count >= MaxInnerExceptionEntries) return true;
                if (inners[i] != null && visited.Add(inners[i])) pending.Enqueue(inners[i]);
            }

            return false;
        }

        var single = exception.InnerException;
        if (single == null || !visited.Add(single)) return false;
        if (pending.Count >= MaxInnerExceptionEntries) return true;

        pending.Enqueue(single);
        return false;
    }

    /// <summary>
    /// Caps a field's length without ever emitting a lone surrogate, which would make the envelope invalid JSON —
    /// the one way a size guard could destroy the diagnostic it is protecting.
    /// </summary>
    /// <param name="value">Value to cap; <c>null</c> passes through.</param>
    /// <param name="maxChars">Maximum characters to keep, before the marker.</param>
    /// <returns>The value, or a truncated copy ending in <see cref="TruncationMarker" />.</returns>
    private static string? Truncate(string? value, int maxChars)
    {
        if (value == null || value.Length <= maxChars) return value;

        var cut = maxChars;
        if (cut > 0 && char.IsHighSurrogate(value[cut - 1])) cut--;

        return string.Concat(value.AsSpan(0, cut), TruncationMarker);
    }

    /// <summary>
    /// The single write point. <typeparamref name="TDiagnostic" /> is always one of the private envelope types
    /// below — a sealed, string-only shape this class constructed itself — so serialization is total and bounded,
    /// and no caller-owned type ever reaches <see cref="JsonSerializer" />.
    /// </summary>
    /// <typeparam name="TDiagnostic">One of the private envelope types declared in this class.</typeparam>
    /// <param name="diagnostic">The envelope instance to write.</param>
    /// <param name="fallback">
    /// Pre-baked JSON literal returned if serialization somehow fails, so the sink still receives well-formed,
    /// same-shaped JSON rather than an exception or a broken log line.
    /// </param>
    /// <param name="writeIndented">Whether to pretty-print the envelope.</param>
    /// <returns>The serialized envelope, or <paramref name="fallback" /> on any failure.</returns>
    private static string SerializeKnownEnvelope<TDiagnostic>(
        TDiagnostic diagnostic,
        string fallback,
        bool writeIndented)
    {
        try
        {
            // Diagnostic serialization must not inherit application resolvers/converters or traverse caller-owned
            // objects. This deliberately broad boundary prevents observability from replacing the observed failure.
            // Nulls are omitted so an envelope only carries the fields it actually has: this is what preserves the
            // exact {"ExceptionType":"unknown"} shape for a null exception now that the exception envelope has
            // optional members. It is a no-op for the two type-only envelopes, whose members are never null.
            return JsonSerializer.Serialize(
                diagnostic,
                new JsonSerializerOptions
                {
                    WriteIndented = writeIndented,
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                });
        }
        catch (Exception)
        {
            return fallback;
        }
    }

    /// <summary>
    /// Resolves a type's display name without ever letting reflection failures escape into the observed operation.
    /// <see cref="Type.FullName" /> is <c>null</c> for generic parameters and some constructed/dynamic types, and
    /// can throw on exotic runtime types — both cases degrade to <see cref="UnknownType" />.
    /// </summary>
    /// <param name="type">The type to name.</param>
    /// <returns>The full type name, its short name, or <see cref="UnknownType" />; never throws.</returns>
    private static string GetSafeTypeName(Type type)
    {
        try
        {
            return type.FullName ?? type.Name;
        }
        catch (Exception)
        {
            // A diagnostic type name is optional metadata; failure must remain payload-free and non-throwing.
            return UnknownType;
        }
    }

    /// <summary>
    /// Envelope for <see cref="Serialize{TValue}" />. Kept private and sealed with a single string member so the
    /// emitted shape is fixed and cannot grow a payload-bearing property. Each sink gets its own envelope type
    /// (rather than one shared <c>Type</c> property) so log queries can filter on the property name that states
    /// what was being observed.
    /// </summary>
    private sealed class DataTypeDiagnostic
    {
        public string DataType { get; init; } = UnknownType;
    }

    /// <summary>Envelope for <see cref="SerializeMessageType" />. See <see cref="DataTypeDiagnostic" />.</summary>
    private sealed class MessageTypeDiagnostic
    {
        public string MessageType { get; init; } = UnknownType;
    }

    /// <summary>
    /// Envelope for <see cref="SerializeException" />. Unlike the other two it carries content, so its added
    /// members are nullable and omitted when null (see <see cref="SerializeKnownEnvelope" />) — that is what keeps
    /// the null-exception case emitting exactly <c>{"ExceptionType":"unknown"}</c> and keeps the common
    /// no-inner-exception case from carrying an empty array on every log line.
    /// </summary>
    private sealed class ExceptionTypeDiagnostic
    {
        public string ExceptionType { get; init; } = UnknownType;

        /// <summary>The exception's message. Accepted as sensitive — see <see cref="SerializeException" /> remarks.</summary>
        public string? Message { get; init; }

        /// <summary>Demystified frames. Location data only: parameter types and names, never argument values.</summary>
        public string? StackTrace { get; init; }

        /// <summary>Inner exception TYPE names only, never their messages.</summary>
        public IReadOnlyList<string>? InnerExceptionTypes { get; init; }
    }
}
