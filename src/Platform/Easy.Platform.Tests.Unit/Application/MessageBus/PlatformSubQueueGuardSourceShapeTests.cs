using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus;

public class PlatformSubQueueGuardSourceShapeTests
{
    private const string InboxHostedServicePath =
        "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformConsumeInboxBusMessageHostedService.cs";

    private const string OutboxHostedServicePath =
        "src/Platform/Easy.Platform/Application/MessageBus/OutboxPattern/PlatformSendOutboxBusMessageHostedService.cs";

    [Theory]
    [InlineData(
        InboxHostedServicePath,
        "protected async Task<bool> AnyCanHandleInboxBusMessages(",
        "protected virtual async Task InvokeConsumerAsync(",
        "PlatformInboxBusMessage",
        "inboxBusMessageRepository")]
    [InlineData(
        InboxHostedServicePath,
        "protected async Task<List<PlatformInboxBusMessage>> PopToHandleInboxEventBusMessages(",
        "protected IQueryable<PlatformInboxBusMessage> CanHandleMessagesByConsumerIdPrefixQueryBuilder(",
        "PlatformInboxBusMessage",
        "inboxEventBusMessageRepo")]
    [InlineData(
        OutboxHostedServicePath,
        "protected async Task<bool> AnyCanHandleOutboxBusMessages(",
        "private IQueryable<PlatformOutboxBusMessage> CanHandleMessagesByProducerIdPrefixQueryBuilder(",
        "PlatformOutboxBusMessage",
        "outboxBusMessageRepository")]
    [InlineData(
        OutboxHostedServicePath,
        "protected async Task<List<PlatformOutboxBusMessage>> PopToHandleOutboxEventBusMessages(",
        "protected IQueryable<PlatformOutboxBusMessage> CanHandleMessagesByTypeIdPrefixQueryBuilder(",
        "PlatformOutboxBusMessage",
        "outboxEventBusMessageRepo")]
    public void SubQueuePredecessorCheck_IsSkippedWhenMessageHasNoSubQueuePrefix(
        string relativePath,
        string methodStartMarker,
        string methodEndMarker,
        string messageTypeName,
        string repositoryName)
    {
        var source = ReadRepositoryFile(relativePath);
        var methodSource = ExtractSource(source, methodStartMarker, methodEndMarker);

        methodSource.Should().Contain("if (toHandleMessages.IsEmpty())");
        methodSource.Should().Contain("var toHandleMessage = toHandleMessages.First();");
        methodSource.Should().Contain($"{messageTypeName}.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty()");
        methodSource.Should().Contain($"await {repositoryName}.AnyAsync(");
        methodSource.Should().Contain($"{messageTypeName}.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessage)");
        methodSource.Should().NotContain("CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessages.First())");

        var guardIndex = methodSource.IndexOf($"{messageTypeName}.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty()", StringComparison.Ordinal);
        var predecessorAnyIndex = methodSource.IndexOf($"await {repositoryName}.AnyAsync(", StringComparison.Ordinal);

        guardIndex.Should().BeGreaterThanOrEqualTo(0);
        predecessorAnyIndex.Should().BeGreaterThan(guardIndex);
    }

    private static string ExtractSource(string source, string startMarker, string endMarker)
    {
        var start = source.IndexOf(startMarker, StringComparison.Ordinal);
        start.Should().BeGreaterThanOrEqualTo(0);

        var end = source.IndexOf(endMarker, start, StringComparison.Ordinal);
        end.Should().BeGreaterThan(start);

        return source[start..end];
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }
}
