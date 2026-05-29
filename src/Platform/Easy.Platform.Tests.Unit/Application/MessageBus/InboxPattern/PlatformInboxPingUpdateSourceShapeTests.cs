using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

public class PlatformInboxPingUpdateSourceShapeTests
{
    private const string HelperPath =
        "src/Platform/Easy.Platform/Application/MessageBus/InboxPattern/PlatformInboxMessageBusConsumerHelper.cs";

    [Fact]
    public void PingBackgroundTask_UsesOneBatchUpdateInsteadOfOneSetPerInboxMessage()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("inboxBusMessageRepository.UpdateManyAsync(");
        pingMethodSource.Should().Contain("dismissSendEvent: true");
        pingMethodSource.Should().Contain("checkDiff: false");
        pingMethodSource.Should().Contain("existingInboxMessagesDict[toUpdateExistingInboxMessage.Id].LastProcessingPingDate = pingDate");
        pingMethodSource.Should().NotContain("ParallelAsync(async toUpdateExistingInboxMessage");
        pingMethodSource.Should().NotContain("inboxBusMessageRepository.SetAsync(");
    }

    [Fact]
    public void PingBackgroundTask_PreservesScopedUnitOfWorkAndCancellationBoundaries()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("WaitRetryThrowFinalExceptionAsync");
        pingMethodSource.Should().Contain("ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepository)");
        pingMethodSource.Should().Contain("using (var uow = inboxBusMessageRepository.UowManager().Begin())");
        pingMethodSource.Should().Contain("if (!cancellationToken.IsCancellationRequested) await uow.CompleteAsync(cancellationToken)");
        pingMethodSource.Should().Contain("catch (TaskCanceledException)");
        pingMethodSource.Should().Contain("cancellationToken: cancellationToken");
    }

    [Fact]
    public void PingBackgroundTask_UsesSinglePingTimestampForDatabaseAndInMemoryRows()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("var pingDate = Clock.UtcNow;");
        pingMethodSource.Should().Contain("toUpdateExistingInboxMessage.LastProcessingPingDate = pingDate;");
        pingMethodSource.Should().Contain("existingInboxMessagesDict[toUpdateExistingInboxMessage.Id].LastProcessingPingDate = pingDate;");
    }

    [Fact]
    public void PingBackgroundTask_KeepsStandardIntervalPacing()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("delayTimeSeconds: PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds");
        pingMethodSource.Should().NotContain("delayTimeSeconds: 0");
    }

    private static string ExtractStartIntervalPingProcessingSource(string source)
    {
        var methodStart = source.IndexOf("public static void StartIntervalPingProcessing(", StringComparison.Ordinal);
        methodStart.Should().BeGreaterThanOrEqualTo(0);

        var nextMethodStart = source.IndexOf("public static async Task UpdateExistingInboxProcessedMessageAsync(", methodStart, StringComparison.Ordinal);
        nextMethodStart.Should().BeGreaterThan(methodStart);

        return source[methodStart..nextMethodStart];
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
