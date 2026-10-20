using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.OutboxPattern;

/// <summary>Retention bounds each provider selection, preserves nonterminal/newest rows, and stops without progress.</summary>
public class PlatformOutboxRetentionBatchTests
{
    [Theory]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-001")]
    [InlineData(false, 0)]
    [InlineData(true, 0)]
    [InlineData(false, 3)]
    [InlineData(true, 3)]
    [InlineData(false, 4)]
    [InlineData(true, 4)]
    [InlineData(false, 17)]
    [InlineData(true, 17)]
    [InlineData(false, 1003)]
    [InlineData(true, 1003)]
    public async Task Cleanup_DrainsInitialExcessInBoundedBatches_AndKeepsNewestAndNonterminalRows(bool keyed, int processedCount)
    {
        using var harness = new CleanerHarness(keyed, processedCount, retained: 3, batch: 7);
        var expected = harness.Rows.Where(row => row.SendStatus != PlatformOutboxBusMessage.SendStatuses.Processed)
            .Concat(harness.Rows.Where(row => row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed)
                .OrderByDescending(row => row.CreatedDate).Take(3)).Select(row => row.Id).ToList();

        await harness.CleanAsync();

        harness.Rows.Select(row => row.Id).Should().BeEquivalentTo(expected);
        if (processedCount <= 3)
            harness.SelectedSizes.Should().BeEmpty();
        else
            harness.SelectedSizes.Should().NotBeEmpty().And.OnlyContain(size => size > 0 && size <= 7);
        harness.SelectedSizes.Sum().Should().Be(Math.Max(0, processedCount - 3));
        harness.Errors.Should().BeEmpty();
        harness.ForeignRepository.Invocations.Should().BeEmpty("keyed cleanup must not use the unqualified foreign store");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-002")]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Cleanup_ZeroRetention_DeletesOnlyProcessedRowsIncludingPartialFinalBatch(bool keyed)
    {
        using var harness = new CleanerHarness(keyed, 19, retained: 0, batch: 7);
        var expected = harness.Rows.Where(row => row.SendStatus != PlatformOutboxBusMessage.SendStatuses.Processed).Select(row => row.Id).ToList();

        await harness.CleanAsync();

        harness.SelectedSizes.Should().Equal(7, 7, 5);
        harness.Rows.Select(row => row.Id).Should().BeEquivalentTo(expected);
        harness.Errors.Should().BeEmpty();
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-003")]
    [InlineData(0, 3)]
    [InlineData(-1, 3)]
    [InlineData(7, -1)]
    public async Task Cleanup_InvalidBatchOrRetention_LogsConfigurationErrorBeforeDeleting(int batch, int retained)
    {
        using var harness = new CleanerHarness(false, 17, retained, batch);
        var expected = harness.Rows.Select(row => row.Id).ToList();

        await harness.CleanAsync();

        harness.SelectedSizes.Should().BeEmpty();
        harness.Rows.Select(row => row.Id).Should().BeEquivalentTo(expected);
        harness.Errors.Should().ContainSingle(error => error is ArgumentOutOfRangeException);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-004")]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Cleanup_CancellationBetweenBatches_PerformsNoFurtherDeletion(bool keyed)
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new CleanerHarness(keyed, 17, retained: 3, batch: 7);
        harness.AfterDeleteAsync = _ => cancellation.CancelAsync();

        await harness.CleanAsync(cancellation.Token);

        harness.SelectedSizes.Should().Equal(7);
        harness.Rows.Count(row => row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed).Should().Be(10);
        harness.DeleteTokens.Should().OnlyContain(token => token == cancellation.Token);
        harness.DeleteTokens.Should().ContainSingle("cancellation must prevent another deletion attempt");
        harness.CountTokens.Should().ContainSingle("cancellation must prevent the next cleanup phase from querying");
        harness.Errors.Should().BeEmpty("cancellation between batches must stop without a cleanup error");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-004")]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Cleanup_CancellationAfterExpiredScan_DoesNotStartFailedMessageScan(bool keyed)
    {
        using var cancellation = new CancellationTokenSource();
        using var harness = new CleanerHarness(keyed, 17, retained: 30, batch: 7);
        var expected = harness.Rows.Select(row => row.Id).ToList();
        harness.AfterCount = count =>
        {
            if (count == 2) cancellation.Cancel();
        };

        await harness.CleanAsync(cancellation.Token);

        harness.CountTokens.Should().HaveCount(2, "the completed expiration scan must be the final provider attempt");
        harness.CountTokens.Should().OnlyContain(token => token == cancellation.Token);
        harness.SelectedSizes.Should().BeEmpty();
        harness.Rows.Select(row => row.Id).Should().BeEquivalentTo(expected);
        harness.Errors.Should().BeEmpty("cancellation after a completed phase must not become a cleanup error");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-005")]
    public async Task Cleanup_CompetingDeleteReturnsZero_StopsWithoutSpinning()
    {
        using var harness = new CleanerHarness(false, 17, retained: 3, batch: 7);
        harness.OverrideDeleteResult = selected =>
        {
            foreach (var row in selected) harness.Rows.Remove(row); // Another cleaner won this selection.
            return 0;
        };

        await harness.CleanAsync();

        harness.SelectedSizes.Should().Equal(7);
        harness.Errors.Should().BeEmpty();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-006")]
    public async Task Cleanup_ConcurrentArrival_DoesNotExpandTheInitialDeletionBudget()
    {
        using var harness = new CleanerHarness(true, 17, retained: 3, batch: 7);
        var newestExisting = harness.Rows.Where(row => row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed)
            .OrderByDescending(row => row.CreatedDate).Take(2).Select(row => row.Id).ToList();
        harness.AfterDeleteAsync = call =>
        {
            if (call == 1) harness.Rows.Add(new PlatformOutboxBusMessage
            {
                Id = "new-arrival",
                SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed,
                CreatedDate = Clock.UtcNow.AddMinutes(1),
                LastSendDate = Clock.UtcNow,
            });
            return Task.CompletedTask;
        };

        await harness.CleanAsync();

        harness.SelectedSizes.Should().Equal(7, 7);
        var processed = harness.Rows.Where(row => row.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed).ToList();
        processed.Should().HaveCount(4, "concurrent arrivals belong to the next invocation's excess budget");
        processed.OrderByDescending(row => row.CreatedDate).Take(3).Select(row => row.Id)
            .Should().BeEquivalentTo(newestExisting.Append("new-arrival"));
        harness.Errors.Should().BeEmpty();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-OUTBOX-RETENTION-007")]
    public async Task Cleanup_ProviderFailure_PreservesRowsAndLogsTheOriginalError()
    {
        using var harness = new CleanerHarness(false, 17, retained: 3, batch: 7);
        var failure = new InvalidOperationException("Synthetic provider failure");
        harness.OverrideDeleteResult = _ => throw failure;
        var expected = harness.Rows.Select(row => row.Id).ToList();

        await harness.CleanAsync();

        harness.Rows.Select(row => row.Id).Should().BeEquivalentTo(expected);
        harness.Errors.Should().ContainSingle(error => ReferenceEquals(error, failure));
    }

    private sealed class CleanerHarness : IDisposable
    {
        private readonly ServiceProvider services;
        private readonly TestCleaner cleaner;
        private readonly bool keyed;

        public CleanerHarness(bool keyed, int processedCount, int retained, int batch)
        {
            this.keyed = keyed;
            var now = Clock.UtcNow;
            Rows = Enumerable.Range(0, processedCount).Select(index => new PlatformOutboxBusMessage
            {
                Id = $"processed-{index:D4}",
                SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed,
                CreatedDate = now.AddSeconds(index - processedCount),
                LastSendDate = now,
            }).Concat(new[]
            {
                PlatformOutboxBusMessage.SendStatuses.New, PlatformOutboxBusMessage.SendStatuses.Processing,
                PlatformOutboxBusMessage.SendStatuses.Failed, PlatformOutboxBusMessage.SendStatuses.Ignored,
            }.Select(status => new PlatformOutboxBusMessage { Id = $"nonterminal-{status}", SendStatus = status, CreatedDate = now })).ToList();
            var config = new PlatformOutboxConfig { MaxStoreProcessedMessageCount = retained, NumberOfDeleteMessagesBatch = batch };
            var repository = new Mock<IPlatformOutboxBusMessageRepository>();
            repository.Setup(repo => repo.CountAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
                .Returns((Expression<Func<PlatformOutboxBusMessage, bool>> predicate, CancellationToken token) =>
                {
                    CountTokens.Add(token);
                    token.ThrowIfCancellationRequested();
                    var count = Rows.Count(predicate.Compile());
                    AfterCount?.Invoke(CountTokens.Count);
                    return Task.FromResult(count);
                });
            repository.Setup(repo => repo.DeleteManyAsync(
                    It.IsAny<Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<PlatformOutboxBusMessage>>>(),
                    It.IsAny<bool>(), It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
                .Returns(async (Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<PlatformOutboxBusMessage>> query,
                    bool dismissSendEvent, Action<PlatformCqrsEntityEvent> _, CancellationToken token) =>
                {
                    DeleteTokens.Add(token);
                    token.ThrowIfCancellationRequested();
                    dismissSendEvent.Should().BeTrue();
                    var selected = query(Rows.AsQueryable()).ToList();
                    SelectedSizes.Add(selected.Count);
                    if (SelectedSizes.Count > processedCount + 2)
                        throw new InvalidOperationException("Regression guard: cleaner failed to stop without progress.");
                    var overridden = OverrideDeleteResult?.Invoke(selected);
                    if (overridden.HasValue) return overridden.Value;
                    foreach (var row in selected) Rows.Remove(row);
                    if (AfterDeleteAsync != null) await AfterDeleteAsync(SelectedSizes.Count);
                    return selected.Count;
                });
            ForeignRepository = new Mock<IPlatformOutboxBusMessageRepository>(MockBehavior.Strict);
            services = new ServiceCollection().AddScoped(_ => keyed ? ForeignRepository.Object : repository.Object).BuildServiceProvider();
            var logger = new Mock<ILogger>();
            logger.Setup(item => item.Log(It.IsAny<LogLevel>(), It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()))
                .Callback(new InvocationAction(invocation =>
                {
                    if (invocation.Arguments[3] is Exception error) Errors.Add(error);
                }));
            var loggerFactory = Mock.Of<ILoggerFactory>(factory => factory.CreateLogger(It.IsAny<string>()) == logger.Object);
            var registry = keyed ? CreateRegistry(repository.Object, config) : null;
            cleaner = new TestCleaner(services, config, registry, loggerFactory);
        }

        public List<PlatformOutboxBusMessage> Rows { get; }
        public List<int> SelectedSizes { get; } = [];
        public List<CancellationToken> DeleteTokens { get; } = [];
        public List<CancellationToken> CountTokens { get; } = [];
        public Action<int>? AfterCount { get; set; }
        public List<Exception> Errors { get; } = [];
        public Mock<IPlatformOutboxBusMessageRepository> ForeignRepository { get; }
        public Func<int, Task>? AfterDeleteAsync { get; set; }
        public Func<List<PlatformOutboxBusMessage>, int?>? OverrideDeleteResult { get; set; }

        public Task CleanAsync(CancellationToken token = default) => keyed ? cleaner.RunIntervalAsync(token) : cleaner.CleanAsync(token);

        public void Dispose()
        {
            cleaner.Dispose();
            services.Dispose();
        }

        private static PlatformMessageBusStoreRegistry CreateRegistry(IPlatformOutboxBusMessageRepository repository, PlatformOutboxConfig config)
        {
            var key = new PlatformMessageBusStoreKey("RetentionStore");
            return new PlatformMessageBusStoreRegistry(
                [new PlatformMessageBusApplicationLaneRegistration(key, typeof(ApplicationLane), "RetentionLane", typeof(ApplicationLane).Assembly,
                    _ => new PlatformInboxConfig(), _ => config)],
                [new PlatformPersistenceMessageBusStoreRegistration(key, typeof(PersistenceOwner), typeof(PersistenceContext),
                    typeof(IPlatformInboxBusMessageRepository), typeof(IPlatformOutboxBusMessageRepository), typeof(IPlatformUnitOfWorkManager),
                    _ => Mock.Of<IPlatformInboxBusMessageRepository>(), _ => repository, _ => null!)],
                [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLane), typeof(PersistenceOwner))],
                isStrictCompositionValidationEnabled: true);
        }
    }

    private sealed class TestCleaner(IServiceProvider services, PlatformOutboxConfig config, IPlatformMessageBusStoreRegistry? registry, ILoggerFactory loggerFactory)
        : PlatformOutboxBusMessageCleanerHostedService(services, loggerFactory,
            Mock.Of<IPlatformApplicationSettingContext>(context => context.ApplicationName == "RetentionHost" && context.ApplicationAssembly == typeof(ApplicationLane).Assembly),
            config, registry)
    {
        public Task CleanAsync(CancellationToken token) => CleanOutboxEventBusMessage(token);
        public Task RunIntervalAsync(CancellationToken token) => IntervalProcessAsync(token);
    }

    private sealed class ApplicationLane { }
    private sealed class PersistenceOwner { }
    private sealed class PersistenceContext { }
}
