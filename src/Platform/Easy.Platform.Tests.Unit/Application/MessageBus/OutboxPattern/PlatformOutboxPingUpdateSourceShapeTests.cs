using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.OutboxPattern;

public class PlatformOutboxPingUpdateSourceShapeTests
{
    private const string HelperPath =
        "src/Platform/Easy.Platform/Application/MessageBus/OutboxPattern/PlatformOutboxMessageBusProducerHelper.cs";

    [Fact]
    public void PingBackgroundTask_UsesOneBatchUpdateInsteadOfOneSetPerOutboxMessage()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("outboxBusMessageRepository.UpdateManyAsync(");
        pingMethodSource.Should().Contain("dismissSendEvent: true");
        pingMethodSource.Should().Contain("checkDiff: false");
        pingMethodSource.Should().Contain("existingOutboxMessagesDict[toUpdateExistingOutboxMessage.Id].LastProcessingPingDate = pingDate");
        pingMethodSource.Should().NotContain("ParallelAsync(async toUpdateExistingOutboxMessage");
        pingMethodSource.Should().NotContain("outboxBusMessageRepository.SetAsync(");
    }

    [Fact]
    public void PingBackgroundTask_PreservesScopedUnitOfWorkAndCancellationBoundaries()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("WaitRetryThrowFinalExceptionAsync");
        pingMethodSource.Should().Contain("ExecuteInjectScopedAsync(async (IPlatformOutboxBusMessageRepository outboxBusMessageRepository)");
        pingMethodSource.Should().Contain("using (var uow = outboxBusMessageRepository.UowManager().Begin())");
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
        pingMethodSource.Should().Contain("toUpdateExistingOutboxMessage.LastProcessingPingDate = pingDate;");
        pingMethodSource.Should().Contain("existingOutboxMessagesDict[toUpdateExistingOutboxMessage.Id].LastProcessingPingDate = pingDate;");
    }

    [Fact]
    public void PingBackgroundTask_KeepsStandardIntervalPacing()
    {
        var source = ReadRepositoryFile(HelperPath);
        var pingMethodSource = ExtractStartIntervalPingProcessingSource(source);

        pingMethodSource.Should().Contain("delayTimeSeconds: PlatformOutboxBusMessage.CheckProcessingPingIntervalSeconds");
        pingMethodSource.Should().NotContain("delayTimeSeconds: 0");
    }

    private static string ExtractStartIntervalPingProcessingSource(string source)
    {
        var methodStart = source.IndexOf("public static void StartIntervalPingProcessing(", StringComparison.Ordinal);
        methodStart.Should().BeGreaterThanOrEqualTo(0);

        var nextMethodStart = source.IndexOf("public async Task RevertExistingOutboxToNewMessageAsync(", methodStart, StringComparison.Ordinal);
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
