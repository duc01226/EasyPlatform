using System.Text.RegularExpressions;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards every F01 sink against bypassing the diagnostic serializer. Runtime redaction behavior is
/// covered by <see cref="PlatformDiagnosticJsonSerializerTests"/> and the slow-request middleware test.
/// </summary>
public class PlatformDiagnosticSinkSourceShapeTests
{
    private const string BackgroundJobPath =
        "src/Platform/Easy.Platform/Application/BackgroundJob/PlatformApplicationBackgroundJobExecutor.cs";

    private const string SlowRequestMiddlewarePath =
        "src/Platform/Easy.Platform.AspNetCore/Middleware/PlatformSlowRequestWarningMiddleware.cs";

    private const string CommandHandlerPath =
        "src/Platform/Easy.Platform/Application/Cqrs/Commands/PlatformCqrsCommandApplicationHandler.cs";

    private const string QueryHandlerPath =
        "src/Platform/Easy.Platform/Application/Cqrs/Queries/PlatformCqrsQueryApplicationHandler.cs";

    private const string EventHandlerPath =
        "src/Platform/Easy.Platform/Common/Cqrs/Events/PlatformCqrsEventHandler.cs";

    private const string EventApplicationHandlerPath =
        "src/Platform/Easy.Platform/Application/Cqrs/Events/PlatformCqrsEventApplicationHandler.cs";

    private const string PersistenceRepositoryPath =
        "src/Platform/Easy.Platform/Persistence/Domain/PlatformPersistenceRepository.cs";

    private const string MessageDiagnosticFormatterPath =
        "src/Platform/Easy.Platform/Infrastructures/MessageBus/PlatformMessageBusDiagnosticFormatter.cs";

    private const string MessageConsumerPath =
        "src/Platform/Easy.Platform/Infrastructures/MessageBus/PlatformMessageBusConsumer.cs";

    private const string CqrsMessageProducerPath =
        "src/Platform/Easy.Platform/Application/MessageBus/Producers/CqrsEventProducers/PlatformCqrsEventBusMessageProducer.cs";

    private const string RabbitMqProducerPath =
        "src/Platform/Easy.Platform.RabbitMQ/PlatformRabbitMqMessageBusProducer.cs";

    private const string RabbitMqInitializerPath =
        "src/Platform/Easy.Platform.RabbitMQ/PlatformRabbitMqProcessInitializerService.cs";

    private const string InboxHelperPath =
        "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformInboxMessageBusConsumerHelper.cs";

    private const string OutboxHelperPath =
        "src/Platform/Easy.Platform/Application/MessageBus/OutboxPattern/PlatformOutboxMessageBusProducerHelper.cs";

    [Fact]
    public void SlowRequestSink_LogsOnlyProtectedPayloadAndOmitsRawQueryAndFullContext()
    {
        var source = ReadRepositoryFile(SlowRequestMiddlewarePath);

        source.Should().Contain("PlatformHttpRequestBodyDiagnosticSerializer.Serialize(context, payload)");
        Regex.IsMatch(source, @"queryString,\s*payload,\s*RequestContextAccessor", RegexOptions.CultureInvariant)
            .Should()
            .BeFalse("the raw buffered payload must never be passed to the logger");
        source.Should().NotContain("QueryString.Value");
        source.Should().NotContain("GetAllKeyValues()");
        source.Should().NotContain("QueryString:{QueryString}");
        source.Should().NotContain("RequestContext:");
    }

    [Fact]
    public void CommandExceptionAndTraceSinks_UseDiagnosticSerialization()
    {
        var source = ReadRepositoryFile(CommandHandlerPath);

        Regex.Matches(source, @"PlatformJsonSerializer\.SerializeForDiagnostics\(request").Count
            .Should()
            .Be(2, "both the exception log and distributed trace tag must use the protected boundary");
        source.Should().NotContain("request.ToFormattedJson()");
        source.Should().NotContain("Request:{@Request}");
        source.Should().NotContain("ex.BeautifyStackTrace()");
        source.Should().NotContain("ex.Message");

        // The exception log must not destructure the whole request context (PII, tenant, authorization data).
        // Asserted on the log template token rather than on "RequestContext.GetAllKeyValues()", because the
        // command handler legitimately calls that to propagate context onto PlatformCqrsCommandEvent.
        source.Should().NotContain("RequestContext:{@RequestContext}");
    }

    [Fact]
    public void PersistenceEntityTraceSinks_AllUseDiagnosticSerialization()
    {
        var source = ReadRepositoryFile(PersistenceRepositoryPath);
        var allEntityTraceTags = Regex.Matches(source, @"activity\?\.AddTag\(""Entity"",").Count;
        var protectedEntityTraceTags = Regex
            .Matches(
                source,
                @"activity\?\.AddTag\(""Entity"", PlatformJsonSerializer\.SerializeForDiagnostics\(")
            .Count;

        allEntityTraceTags.Should().BeGreaterThan(0);
        protectedEntityTraceTags.Should().Be(
            allEntityTraceTags,
            "adding a persistence entity trace must not reintroduce ordinary serialization");
    }

    [Fact]
    public void EventQueryAndBackgroundJobSinks_UseRuntimeTypedDiagnosticSerialization()
    {
        var eventSource = ReadRepositoryFile(EventHandlerPath);
        var querySource = ReadRepositoryFile(QueryHandlerPath);
        var backgroundJobSource = ReadRepositoryFile(BackgroundJobPath);

        Regex.Matches(eventSource, @"PlatformJsonSerializer\.SerializeForDiagnostics\(").Count.Should().Be(2);
        Regex.Matches(querySource, @"PlatformJsonSerializer\.SerializeForDiagnostics\(").Count.Should().Be(2);
        Regex.Matches(backgroundJobSource, @"PlatformJsonSerializer\.SerializeForDiagnostics\(").Count.Should().Be(1);

        foreach (var source in new[] { eventSource, querySource, backgroundJobSource })
        {
            source.Should().Contain("forceUseRuntimeType: true");
            source.Should().NotContain("ToFormattedJson()");
            source.Should().NotContain("{@Event");
            source.Should().NotContain("{@Request");
        }

        querySource.Should().NotContain("RequestContext.GetAllKeyValues()");
        querySource.Should().NotContain("ex.BeautifyStackTrace()");
        querySource.Should().NotContain("ex.Message");
        eventSource.Should().NotContain("exception.BeautifyStackTrace()");
        eventSource.Should().NotContain("exception.Message");
    }

    [Fact]
    public void EventApplicationFailureSinks_UsePayloadFreeRuntimeTypedDiagnostics()
    {
        var source = ReadRepositoryFile(EventApplicationHandlerPath);

        Regex.Matches(source, @"PlatformJsonSerializer\.SerializeForDiagnostics\(").Count
            .Should()
            .Be(2, "both request-context transfer and inbox-retry failures must use the protected boundary");
        source.Should().Contain("LogRequestContextTransferFailure(@event, e)");
        source.Should().Contain("LogInboxConsumerRetry(@event, exception)");
        source.Should().Contain("forceUseRuntimeType: true");
        source.Should().NotContain("@event.ToJson()");
        source.Should().NotContain("Event:{@Event}");
        source.Should().NotContain("Event:{Event}");
    }

    [Fact]
    public void MessageBusRuntimeAndFailureSinks_UsePayloadFreeDiagnostics()
    {
        var formatterSource = ReadRepositoryFile(MessageDiagnosticFormatterPath);
        var producerSource = ReadRepositoryFile(RabbitMqProducerPath);
        var initializerSource = ReadRepositoryFile(RabbitMqInitializerPath);
        var consumerSource = ReadRepositoryFile(MessageConsumerPath);
        var cqrsProducerSource = ReadRepositoryFile(CqrsMessageProducerPath);

        formatterSource.Should().Contain("PlatformDiagnosticJsonSerializer.SerializeMessageType(");
        formatterSource.Should().Contain("PlatformDiagnosticJsonSerializer.SerializeException(");
        Regex.Matches(producerSource, @"PlatformMessageBusDiagnosticFormatter\.FormatRuntimeMessage\(").Count.Should().Be(1);
        Regex.Matches(initializerSource, @"PlatformMessageBusDiagnosticFormatter\.FormatRuntimeMessage\(").Count.Should().Be(3);
        Regex.Matches(consumerSource, @"PlatformMessageBusDiagnosticFormatter\.FormatRuntimeMessage\(").Count.Should().Be(2);
        Regex.Matches(cqrsProducerSource, @"PlatformMessageBusDiagnosticFormatter\.FormatRuntimeMessage\(").Count.Should().Be(1);

        producerSource.Should().Contain("PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(runtimeMessage)");
        producerSource.Should().NotContain("activity?.AddTag(\"message\", transportMessage)");
        initializerSource.Should().NotContain("busMessage.ToJson()");
        initializerSource.Should().NotContain("deserializedBusMessage.ToFormattedJson()");
        initializerSource.Should().Contain("PlatformMessageBusDiagnosticFormatter.FormatException(finalEx)");
        initializerSource.Should().NotContain(
            "finalEx.BeautifyStackTrace()",
            "the final requeue failure must not hand the raw exception to ILogger");
        consumerSource.Should().NotContain("{@Message");
        consumerSource.Should().NotContain("{@BusMessage");
        consumerSource.Should().NotContain("e.BeautifyStackTrace()");
        cqrsProducerSource.Should().NotContain("{@EventBusMessageOrEventNotification");
        cqrsProducerSource.Should().Contain("PlatformMessageBusDiagnosticFormatter.FormatException(exception)");
        cqrsProducerSource.Should().NotContain("exception.BeautifyStackTrace()");
        cqrsProducerSource.Should().NotContain("exception.Message");
    }

    [Fact]
    public void InboxAndOutboxDiagnosticBranches_NeverLogRuntimeOrPersistedPayloads()
    {
        var inboxSource = ReadRepositoryFile(InboxHelperPath);
        var outboxSource = ReadRepositoryFile(OutboxHelperPath);

        Regex.Matches(inboxSource, @"PlatformMessageBusDiagnosticFormatter\.Format(?:Runtime|Persisted)Message\(").Count
            .Should()
            .Be(7, "all inbox initial, retry, cleanup, failure, CQRS, and catch diagnostics are inventoried");
        Regex.Matches(outboxSource, @"PlatformMessageBusDiagnosticFormatter\.Format(?:Runtime|Persisted)Message\(").Count
            .Should()
            .Be(9, "all outbox initial, retry, cleanup, failure, and catch diagnostics are inventoried");

        foreach (var source in new[] { inboxSource, outboxSource })
        {
            source.Should().NotContain("ToJson().TakeTop");
            source.Should().NotContain("JsonMessage.TakeTop");
            source.Should().NotContain("{@InboxJsonMessagePayload");
            source.Should().NotContain("{@OutboxJsonMessagePayload");
            Regex.IsMatch(
                    source,
                    @"\b(?:ex|e|exception)\.(?:BeautifyStackTrace\(\)|Message\b)",
                    RegexOptions.CultureInvariant)
                .Should()
                .BeFalse("raw exception objects and messages must not enter operational diagnostics");
        }

        inboxSource.Should().NotContain("InboxJsonMessagePayload");
    }

    /// <summary>
    /// Reads a repository source file with COMMENT-ONLY LINES REMOVED, so these guards assert on the code a sink
    /// actually executes rather than on prose about it.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Why comments are stripped.</b> Every assertion in this class is a raw substring/regex match over file text.
    /// Without stripping, a file that DOCUMENTS a forbidden pattern trips the guard against it — which is exactly
    /// backwards, because explaining why a sink must not use <c>{@Message}</c> is good practice, and the guard punished
    /// it. That is not hypothetical: <c>PlatformMessageBusConsumer.cs:77</c> describes the destructuring operator by
    /// name in its XML docs, and the <c>NotContain("{@Message")</c> check at
    /// <see cref="MessageBusRuntimeAndFailureSinks_UsePayloadFreeDiagnostics" /> failed on that sentence while the
    /// code itself was fully compliant (both <c>FormatRuntimeMessage(</c> call sites present and correct).
    /// </para>
    /// <para>
    /// Only WHOLE comment lines are removed — not trailing comments after code — so a line's executable text is never
    /// truncated, and a <c>//</c> sequence inside a string literal (a URL, say) cannot silently eat the code around it.
    /// </para>
    /// </remarks>
    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);

            if (File.Exists(candidatePath))
                return StripCommentOnlyLines(File.ReadAllText(candidatePath));

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }

    private static string StripCommentOnlyLines(string source)
    {
        var keptLines = source
            .Split('\n')
            .Where(line =>
            {
                var trimmed = line.TrimStart();

                return !trimmed.StartsWith("//", StringComparison.Ordinal) &&
                       !trimmed.StartsWith("/*", StringComparison.Ordinal) &&
                       !trimmed.StartsWith('*');
            });

        return string.Join("\n", keptLines);
    }
}
