using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Events;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

public class PlatformInboxRetentionTests : PlatformUnitTestBase
{
    [Theory]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-003")]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(2000)]
    public async Task Cleaner_RetainsAllRecentDeduplicationRecordsRegardlessOfLegacyCountLimit(int legacyCountLimit)
    {
        var now = Clock.UtcNow;
        var recentRows = Enumerable.Range(0, 1000).Select(index => new PlatformInboxBusMessage
        {
            Id = $"recent-{index}",
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            CreatedDate = now.AddDays(-1),
            LastConsumeDate = now.AddDays(-1)
        }).ToList();
        var rows = recentRows.ToList();
        rows.Add(new PlatformInboxBusMessage
        {
            Id = "expired-processed",
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            CreatedDate = now.AddDays(-30),
            LastConsumeDate = now.AddDays(-15)
        });
        rows.Add(new PlatformInboxBusMessage
        {
            Id = "expired-ignored",
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Ignored,
            CreatedDate = now.AddDays(-31)
        });
        rows.Add(new PlatformInboxBusMessage
        {
            Id = "unprocessed",
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.New,
            CreatedDate = now.AddDays(-31)
        });

        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository.Setup(repo => repo.CountAsync(It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .Returns((Expression<Func<PlatformInboxBusMessage, bool>> predicate, CancellationToken _) => Task.FromResult(rows.Count(predicate.Compile())));
        repository.Setup(repo => repo.DeleteManyAsync(
                It.IsAny<Expression<Func<PlatformInboxBusMessage, bool>>>(), It.IsAny<bool>(), It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .Returns((Expression<Func<PlatformInboxBusMessage, bool>> predicate, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken _) =>
                Task.FromResult(DeleteRows(rows.Where(predicate.Compile()).ToList())));
        repository.Setup(repo => repo.DeleteManyAsync(
                It.IsAny<Func<IQueryable<PlatformInboxBusMessage>, IQueryable<PlatformInboxBusMessage>>>(), It.IsAny<bool>(), It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
            .Returns((Func<IQueryable<PlatformInboxBusMessage>, IQueryable<PlatformInboxBusMessage>> query, bool _, Action<PlatformCqrsEntityEvent> _, CancellationToken _) =>
                Task.FromResult(DeleteRows(query(rows.AsQueryable()).ToList())));
        using var services = new ServiceCollection().AddScoped(_ => repository.Object).BuildServiceProvider();
        using var cleaner = new TestInboxCleaner(services, new PlatformInboxConfig { MaxStoreProcessedMessageCount = legacyCountLimit });

        await cleaner.CleanAsync();

        rows.Select(row => row.Id).Should().BeEquivalentTo(recentRows.Select(row => row.Id).Append("unprocessed"),
            "cleanup must preserve every recent deduplication record and remove only expired terminal records");
        var canHandle = PlatformInboxBusMessage.CanHandleMessagesExpr(forApplicationName: string.Empty).Compile();
        rows.Where(row => row.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.Processed)
            .Should().OnlyContain(row => !canHandle(row), "retained processed rows must still suppress replay");

        int DeleteRows(List<PlatformInboxBusMessage> selectedRows)
        {
            foreach (var row in selectedRows) rows.Remove(row);
            return selectedRows.Count;
        }
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-004")]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processed, 30, 1, false)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processed, 30, 15, true)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processed, 30, 14 - (1.0 / 1440), false)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processed, 30, 14, true)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processed, 30, 14 + (1.0 / 1440), true)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Ignored, 29, 1, false)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Ignored, 31, 1, true)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Failed, 31, 31, false)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.New, 31, 31, false)]
    [InlineData(PlatformInboxBusMessage.ConsumeStatuses.Processing, 31, 31, false)]
    public void Expiry_ProtectsSuccessfulConsumptionWindowAndPreservesOtherStates(
        PlatformInboxBusMessage.ConsumeStatuses status, double createdDaysAgo, double consumedDaysAgo, bool expectedExpired)
    {
        var now = Clock.UtcNow;
        var message = new PlatformInboxBusMessage
        {
            ConsumeStatus = status,
            CreatedDate = now.AddDays(-createdDaysAgo),
            LastConsumeDate = now.AddDays(-consumedDaysAgo)
        };
        var config = new PlatformInboxConfig();
        var expires = PlatformInboxBusMessage.ToCleanExpiredMessagesExpr(config.DeleteProcessedMessageInSeconds, config.DeleteExpiredIgnoredMessageInSeconds).Compile();

        expires(message).Should().Be(expectedExpired);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-004")]
    [InlineData(13, false)]
    [InlineData(15, true)]
    public void LegacyProcessedRecordWithoutCompletionTimestamp_UsesCreationAge(double createdDaysAgo, bool expectedExpired)
    {
        var message = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            CreatedDate = Clock.UtcNow.AddDays(-createdDaysAgo)
        };
        var config = new PlatformInboxConfig();
        var expires = PlatformInboxBusMessage.ToCleanExpiredMessagesExpr(config.DeleteProcessedMessageInSeconds, config.DeleteExpiredIgnoredMessageInSeconds).Compile();

        expires(message).Should().Be(expectedExpired);
    }

    private sealed class TestInboxCleaner(IServiceProvider services, PlatformInboxConfig config)
        : PlatformInboxBusMessageCleanerHostedService(services, NullLoggerFactory.Instance, Mock.Of<IPlatformApplicationSettingContext>(), config)
    {
        public Task CleanAsync() => CleanInboxEventBusMessage(CancellationToken.None);
    }
}
