using System.Collections;
using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Store;

/// <summary>
/// Executable proofs for the process-wide inbox/outbox worker fan-out. Workers are driven through their protected
/// interval/paging surfaces against mocked per-store repositories, so each test asserts an observable repository
/// interaction or predicate instead of the source text of the worker.
/// </summary>
public sealed class PlatformMessageBusWorkerFanOutTests
{
    private static readonly TimeSpan BackgroundWaitTimeout = TimeSpan.FromSeconds(10);

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-101")]
    public void OutboxWorker_BuildsOneStatePerStore_AndUsesMinimumConfiguredInterval()
    {
        var registry = CreateTwoStoreRegistry(
            outboxConfigA: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 7 },
            outboxConfigB: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 3 });

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestOutboxWorker(serviceProvider, registry);

        worker.HasRepository().Should().BeTrue();
        GetPrivateRouteCount(worker, typeof(PlatformSendOutboxBusMessageHostedService), "GetProcessingStates").Should().Be(2);
        GetPrivateRouteStoreKeys(worker, typeof(PlatformSendOutboxBusMessageHostedService), "GetProcessingStates")
            .Should().Equal("Store-A", "Store-B");
        worker.TriggerInterval().Should().Be(TimeSpan.FromSeconds(3));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-102")]
    public void InboxWorker_BuildsOneStatePerApplicationLane_AndUsesMinimumConfiguredInterval()
    {
        var registry = CreateTwoStoreRegistry(
            inboxConfigA: new PlatformInboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 9 },
            inboxConfigB: new PlatformInboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 4 });

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestInboxWorker(serviceProvider, registry);

        worker.HasRepository().Should().BeTrue();
        GetPrivateRouteCount(worker, typeof(PlatformConsumeInboxBusMessageHostedService), "GetProcessingStates").Should().Be(2);
        GetPrivateRouteStoreKeys(worker, typeof(PlatformConsumeInboxBusMessageHostedService), "GetProcessingStates")
            .Should().Equal("Store-A", "Store-B");
        GetPrivateRouteLaneNames(worker, typeof(PlatformConsumeInboxBusMessageHostedService), "GetProcessingStates")
            .Should().Equal("Lane-A", "Lane-B");
        worker.TriggerInterval().Should().Be(TimeSpan.FromSeconds(4));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-103")]
    public void Cleaners_BuildStoreAndLaneStates_FromTypedRegistryDescriptors()
    {
        var registry = CreateTwoStoreRegistry();

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var outboxCleaner = new TestOutboxCleaner(serviceProvider, registry);
        using var inboxCleaner = new TestInboxCleaner(serviceProvider, registry);

        outboxCleaner.HasRepository().Should().BeTrue();
        inboxCleaner.HasRepository().Should().BeTrue();
        GetPrivateRouteCount(outboxCleaner, typeof(PlatformOutboxBusMessageCleanerHostedService), "GetCleanupStates").Should().Be(2);
        GetPrivateRouteCount(inboxCleaner, typeof(PlatformInboxBusMessageCleanerHostedService), "GetCleanupStates").Should().Be(2);
        GetPrivateRouteStoreKeys(outboxCleaner, typeof(PlatformOutboxBusMessageCleanerHostedService), "GetCleanupStates")
            .Should().Equal("Store-A", "Store-B");
        GetPrivateRouteStoreKeys(inboxCleaner, typeof(PlatformInboxBusMessageCleanerHostedService), "GetCleanupStates")
            .Should().Equal("Store-A", "Store-B");
    }

    // ---------------------------------------------------------------------------------------------------------------
    // TC-WORKER-104: lease/retry/paging/cancellation boundaries hold per store.
    // ---------------------------------------------------------------------------------------------------------------

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-104")]
    public async Task OutboxSender_WhenStoreARepositoryFails_StoreBIsStillSent()
    {
        var repositoryA = CreateOutboxRepository();
        repositoryA.Setup(OutboxIdQuery()).ThrowsAsync(new InvalidOperationException("Store-A unavailable"));
        var repositoryB = CreateOutboxRepository();
        var registry = CreateTwoStoreRegistry(
            outboxConfigA: FastOutboxConfig(),
            outboxConfigB: FastOutboxConfig(),
            outboxRepositoryA: repositoryA.Object,
            outboxRepositoryB: repositoryB.Object);

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestOutboxWorker(serviceProvider, registry);
        using var cts = new CancellationTokenSource();

        try
        {
            await worker.RunIntervalAsync(cts.Token);

            (await WaitUntilAsync(() => CountOutboxIdQueries(repositoryA) > 0 && CountOutboxIdQueries(repositoryB) > 0)).Should().BeTrue();
        }
        finally
        {
            await cts.CancelAsync();
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-104")]
    public async Task InboxConsumer_WhenStoreARepositoryFails_StoreBIsStillConsumed()
    {
        var repositoryA = CreateInboxRepository();
        repositoryA.Setup(InboxIdQuery()).ThrowsAsync(new InvalidOperationException("Store-A unavailable"));
        var repositoryB = CreateInboxRepository();
        var registry = CreateTwoStoreRegistry(
            inboxConfigA: FastInboxConfig(),
            inboxConfigB: FastInboxConfig(),
            inboxRepositoryA: repositoryA.Object,
            inboxRepositoryB: repositoryB.Object);

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestInboxWorker(serviceProvider, registry);
        using var cts = new CancellationTokenSource();

        try
        {
            await worker.RunIntervalAsync(cts.Token);

            (await WaitUntilAsync(() => CountInboxIdQueries(repositoryA) > 0 && CountInboxIdQueries(repositoryB) > 0)).Should().BeTrue();
        }
        finally
        {
            await cts.CancelAsync();
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-104")]
    public async Task OutboxCleaner_WhenStoreARepositoryFails_StoreBIsStillCleaned()
    {
        var repositoryA = new Mock<IPlatformOutboxBusMessageRepository>();
        repositoryA
            .Setup(repository => repository.CountAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Store-A unavailable"));
        var repositoryB = new Mock<IPlatformOutboxBusMessageRepository>();
        var registry = CreateTwoStoreRegistry(outboxRepositoryA: repositoryA.Object, outboxRepositoryB: repositoryB.Object);

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var cleaner = new TestOutboxCleaner(serviceProvider, registry);

        await cleaner.RunIntervalAsync(CancellationToken.None);

        CountPredicates<PlatformOutboxBusMessage>(repositoryA).Should().BePositive();
        CountPredicates<PlatformOutboxBusMessage>(repositoryB).Should().Be(3, "all three cleanup phases must still run against store B");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-WORKER-104")]
    [InlineData(true, 1)]
    [InlineData(false, 6)]
    public async Task OutboxSender_CancellationStopsScrollingPaging(bool cancelAfterFirstPage, int expectedPageQueries)
    {
        using var cts = new CancellationTokenSource();
        var messages = new List<PlatformOutboxBusMessage> { OutboxRow("independent", "1") };
        var repository = CreateQueryableOutboxRepository(messages);

        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(outboxRepository: repository.Object);
        using var worker = new TestOutboxWorker(
            serviceProvider,
            registry: null,
            new PlatformOutboxConfig { GetCanHandleMessageGroupedByTypeIdPrefixesPageSize = 5 },
            sendAction: _ =>
            {
                // Keep the row eligible to discriminate the pager's cancellation/budget boundary.
                messages[0].SendStatus = PlatformOutboxBusMessage.SendStatuses.New;
                if (cancelAfterFirstPage) cts.Cancel();
            });

        Func<Task> send = () => worker.SendAsync(cts.Token);
        if (cancelAfterFirstPage)
            await send.Should().ThrowAsync<OperationCanceledException>();
        else
            await send();

        CountOutboxIdQueries(repository).Should().Be(expectedPageQueries);
    }

    [Theory]
    [InlineData(PlatformOutboxBusMessage.SendStatuses.Failed)]
    [InlineData(PlatformOutboxBusMessage.SendStatuses.Processing)]
    [Trait("TechnicalSpec", "TC-MSG-LOAD-001")]
    public async Task OutboxSender_BlockedPredecessor_YieldsAfterOnePageWithoutSendingFollower(PlatformOutboxBusMessage.SendStatuses blockedStatus)
    {
        var messages = new List<PlatformOutboxBusMessage>();
        var repository = CreateQueryableOutboxRepository(messages);
        var sentIds = new List<string>();
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(outboxRepository: repository.Object);
        using var worker = new TestOutboxWorker(serviceProvider, null, sendAction: message => sentIds.Add(message.Id));
        await worker.SendAsync(CancellationToken.None); // Complete the intentional startup immediate-retry pass.
        var before = CountOutboxIdQueries(repository);
        var predecessor = OutboxRow("ordered", "first", blockedStatus);
        predecessor.NextRetryProcessAfter = DateTime.UtcNow.AddDays(1);
        predecessor.LastProcessingPingDate = DateTime.UtcNow;
        var follower = OutboxRow("ordered", "second");
        follower.CreatedDate = predecessor.CreatedDate.AddSeconds(1);
        messages.AddRange([predecessor, follower]);

        await worker.SendAsync(CancellationToken.None);

        (CountOutboxIdQueries(repository) - before).Should().Be(1, "selected followers do not represent claim progress");
        sentIds.Should().BeEmpty("the predecessor still owns its subqueue position");
        follower.SendStatus.Should().Be(PlatformOutboxBusMessage.SendStatuses.New);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MSG-LOAD-001")]
    public async Task OutboxSender_MixedBlockedAndReadyGroups_DrainsReadyGroupThenYields()
    {
        var messages = new List<PlatformOutboxBusMessage>();
        var repository = CreateQueryableOutboxRepository(messages);
        var sentIds = new List<string>();
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(outboxRepository: repository.Object);
        using var worker = new TestOutboxWorker(serviceProvider, null, sendAction: message =>
        {
            sentIds.Add(message.Id);
            message.SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed;
        });
        await worker.SendAsync(CancellationToken.None);
        var before = CountOutboxIdQueries(repository);
        var predecessor = OutboxRow("blocked", "first", PlatformOutboxBusMessage.SendStatuses.Processing);
        predecessor.LastProcessingPingDate = DateTime.UtcNow;
        var follower = OutboxRow("blocked", "second");
        follower.CreatedDate = predecessor.CreatedDate.AddSeconds(1);
        var ready = OutboxRow("ready", "first");
        messages.AddRange([predecessor, follower, ready]);

        await worker.SendAsync(CancellationToken.None);

        sentIds.Should().Equal(ready.Id);
        ready.SendStatus.Should().Be(PlatformOutboxBusMessage.SendStatuses.Processed);
        follower.SendStatus.Should().Be(PlatformOutboxBusMessage.SendStatuses.New);
        (CountOutboxIdQueries(repository) - before).Should().Be(2, "the progress page is followed by one stationary page");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MSG-LOAD-001")]
    public async Task OutboxSender_SelectedRowsLostToAnotherInstance_YieldsWithoutClaim()
    {
        var repository = CreateOutboxRepository(() => ["Payload++++ordered----race"]);
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(outboxRepository: repository.Object);
        using var worker = new TestOutboxWorker(serviceProvider, null);

        await worker.SendAsync(CancellationToken.None);

        CountOutboxIdQueries(repository).Should().Be(1);
    }

    private static PlatformOutboxBusMessage OutboxRow(string prefix, string id, PlatformOutboxBusMessage.SendStatuses status = PlatformOutboxBusMessage.SendStatuses.New) =>
        new()
        {
            Id = $"Payload++++{prefix}----{id}",
            SendStatus = status,
            CreatedDate = DateTime.UtcNow.AddMinutes(-1),
            LastSendDate = DateTime.UtcNow.AddMinutes(-1)
        };

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-104")]
    public async Task PopToHandle_RowVersionConflict_IsSwallowedAndRetried()
    {
        var outboxUow = new Mock<IPlatformUnitOfWorkManager>();
        outboxUow
            .SetupSequence(manager => manager.ExecuteUowTask(It.IsAny<Func<Task<List<PlatformOutboxBusMessage>>>>(), It.IsAny<bool>()))
            .ThrowsAsync(new PlatformDomainRowVersionConflictException("outbox conflict"))
            .ReturnsAsync([]);
        var outboxRepository = new Mock<IPlatformOutboxBusMessageRepository>();
        outboxRepository.Setup(repository => repository.UowManager()).Returns(outboxUow.Object);

        var inboxUow = new Mock<IPlatformUnitOfWorkManager>();
        inboxUow
            .SetupSequence(manager => manager.ExecuteUowTask(It.IsAny<Func<Task<List<PlatformInboxBusMessage>>>>(), It.IsAny<bool>()))
            .ThrowsAsync(new PlatformDomainRowVersionConflictException("inbox conflict"))
            .ReturnsAsync([]);
        var inboxRepository = new Mock<IPlatformInboxBusMessageRepository>();
        inboxRepository.Setup(repository => repository.UowManager()).Returns(inboxUow.Object);

        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(inboxRepository.Object, outboxRepository.Object);
        using var outboxWorker = new TestOutboxWorker(serviceProvider, registry: null);
        using var inboxWorker = new TestInboxWorker(serviceProvider, registry: null);

        (await outboxWorker.PopAsync("prefix", 1, CancellationToken.None)).Should().BeEmpty();
        (await inboxWorker.PopAsync("prefix", 1, CancellationToken.None)).Should().BeEmpty();

        outboxUow.Invocations.Count(invocation => invocation.Method.Name == nameof(IPlatformUnitOfWorkManager.ExecuteUowTask)).Should().Be(2);
        inboxUow.Invocations.Count(invocation => invocation.Method.Name == nameof(IPlatformUnitOfWorkManager.ExecuteUowTask)).Should().Be(2);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // TC-WORKER-105: composed workers use the selected store factory and never fall back; legacy hosts use DI.
    // ---------------------------------------------------------------------------------------------------------------

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-105")]
    public async Task ComposedWorkers_UseEachStoreFactory_AndNeverResolveTheUnqualifiedRepository()
    {
        var inboxRepositoryA = CreateInboxRepository();
        var inboxRepositoryB = CreateInboxRepository();
        var outboxRepositoryA = CreateOutboxRepository();
        var outboxRepositoryB = CreateOutboxRepository();
        var registry = CreateTwoStoreRegistry(
            FastInboxConfig(),
            FastInboxConfig(),
            FastOutboxConfig(),
            FastOutboxConfig(),
            inboxRepositoryA.Object,
            inboxRepositoryB.Object,
            outboxRepositoryA.Object,
            outboxRepositoryB.Object);

        var unqualifiedResolutions = new UnqualifiedResolutionCounter();
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(
            CreateInboxRepository().Object,
            CreateOutboxRepository().Object,
            unqualifiedResolutions);
        using var outboxWorker = new TestOutboxWorker(serviceProvider, registry);
        using var inboxWorker = new TestInboxWorker(serviceProvider, registry);
        using var outboxCleaner = new TestOutboxCleaner(serviceProvider, registry);
        using var inboxCleaner = new TestInboxCleaner(serviceProvider, registry);
        using var cts = new CancellationTokenSource();

        try
        {
            await outboxCleaner.RunIntervalAsync(cts.Token);
            await inboxCleaner.RunIntervalAsync(cts.Token);
            await outboxWorker.RunIntervalAsync(cts.Token);
            await inboxWorker.RunIntervalAsync(cts.Token);

            (await WaitUntilAsync(() =>
                CountOutboxIdQueries(outboxRepositoryA) > 0 && CountOutboxIdQueries(outboxRepositoryB) > 0 &&
                CountInboxIdQueries(inboxRepositoryA) > 0 && CountInboxIdQueries(inboxRepositoryB) > 0)).Should().BeTrue();

            CountPredicates<PlatformOutboxBusMessage>(outboxRepositoryA).Should().Be(3);
            CountPredicates<PlatformOutboxBusMessage>(outboxRepositoryB).Should().Be(3);
            CountPredicates<PlatformInboxBusMessage>(inboxRepositoryA).Should().Be(2);
            CountPredicates<PlatformInboxBusMessage>(inboxRepositoryB).Should().Be(2);
            unqualifiedResolutions.Inbox.Should().Be(0);
            unqualifiedResolutions.Outbox.Should().Be(0);
        }
        finally
        {
            await cts.CancelAsync();
        }
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-WORKER-105")]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LegacyHostWithoutStoreComposition_WorkersUseTheUnqualifiedRepository(bool registryWithoutRuntimeStores)
    {
        var inboxRepository = CreateInboxRepository();
        var outboxRepository = CreateOutboxRepository();
        var registry = registryWithoutRuntimeStores ? CreateRegistryWithoutRuntimeStores() : null;
        registry?.HasRuntimeStoreComposition.Should().BeFalse();

        var unqualifiedResolutions = new UnqualifiedResolutionCounter();
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(inboxRepository.Object, outboxRepository.Object, unqualifiedResolutions);
        using var outboxWorker = new TestOutboxWorker(serviceProvider, registry, FastOutboxConfig());
        using var inboxWorker = new TestInboxWorker(serviceProvider, registry, FastInboxConfig());
        using var outboxCleaner = new TestOutboxCleaner(serviceProvider, registry);
        using var inboxCleaner = new TestInboxCleaner(serviceProvider, registry);
        using var cts = new CancellationTokenSource();

        try
        {
            await outboxCleaner.RunIntervalAsync(cts.Token);
            await inboxCleaner.RunIntervalAsync(cts.Token);
            await outboxWorker.RunIntervalAsync(cts.Token);
            await inboxWorker.RunIntervalAsync(cts.Token);

            (await WaitUntilAsync(() => CountOutboxIdQueries(outboxRepository) > 0 && CountInboxIdQueries(inboxRepository) > 0)).Should().BeTrue();

            CountPredicates<PlatformOutboxBusMessage>(outboxRepository).Should().Be(3);
            CountPredicates<PlatformInboxBusMessage>(inboxRepository).Should().Be(2);
            unqualifiedResolutions.Inbox.Should().BePositive();
            unqualifiedResolutions.Outbox.Should().BePositive();
        }
        finally
        {
            await cts.CancelAsync();
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-105")]
    public async Task LegacyInboxCleaner_CleansStoreWide_RegardlessOfForApplicationName()
    {
        var inboxRepository = new Mock<IPlatformInboxBusMessageRepository>();
        using var serviceProvider = BuildServiceProviderWithUnqualifiedRepositories(inboxRepository: inboxRepository.Object);
        using var cleaner = new TestInboxCleaner(serviceProvider, registry: null);

        await cleaner.RunIntervalAsync(CancellationToken.None);

        var predicates = GetCompiledPredicates<PlatformInboxBusMessage>(inboxRepository);
        predicates.Should().HaveCount(2);

        foreach (var row in CreateInboxRows(["OtherApplication", "LegacyHost", null]))
            predicates.Any(predicate => predicate(row)).Should().BeTrue($"legacy cleanup is store-wide (row {row.ForApplicationName ?? "<null>"}/{row.ConsumeStatus})");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-106")]
    public void ComposedInboxCleanupPredicates_IsolateNamedLanes_AndAssignLegacyRowsOnce()
    {
        var laneAExpired = PlatformInboxBusMessage.ToCleanExpiredMessagesExpr(
                deleteProcessedMessageInSeconds: 1,
                deleteExpiredIgnoredMessageInSeconds: 1,
                forApplicationName: "Lane-A",
                includeUnassignedMessages: true)
            .Compile();
        var laneBExpired = PlatformInboxBusMessage.ToCleanExpiredMessagesExpr(
                deleteProcessedMessageInSeconds: 1,
                deleteExpiredIgnoredMessageInSeconds: 1,
                forApplicationName: "Lane-B",
                includeUnassignedMessages: false)
            .Compile();
        var laneAIgnores = PlatformInboxBusMessage.ToIgnoreFailedExpiredMessagesExpr(
                ignoreExpiredFailedMessageInSeconds: 1,
                forApplicationName: "Lane-A",
                includeUnassignedMessages: true)
            .Compile();
        var laneBIgnores = PlatformInboxBusMessage.ToIgnoreFailedExpiredMessagesExpr(
                ignoreExpiredFailedMessageInSeconds: 1,
                forApplicationName: "Lane-B",
                includeUnassignedMessages: false)
            .Compile();

        var unassignedProcessed = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            CreatedDate = DateTime.UtcNow.AddMinutes(-5)
        };
        var laneAProcessed = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            ForApplicationName = "Lane-A",
            CreatedDate = DateTime.UtcNow.AddMinutes(-5)
        };
        var laneBProcessed = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed,
            ForApplicationName = "Lane-B",
            CreatedDate = DateTime.UtcNow.AddMinutes(-5)
        };
        var unassignedFailed = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Failed,
            CreatedDate = DateTime.UtcNow.AddMinutes(-5)
        };
        var laneBFailed = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Failed,
            ForApplicationName = "Lane-B",
            CreatedDate = DateTime.UtcNow.AddMinutes(-5)
        };

        laneAExpired(unassignedProcessed).Should().BeTrue();
        laneBExpired(unassignedProcessed).Should().BeFalse();
        laneAExpired(laneAProcessed).Should().BeTrue();
        laneAExpired(laneBProcessed).Should().BeFalse();
        laneBExpired(laneBProcessed).Should().BeTrue();

        laneAIgnores(unassignedFailed).Should().BeTrue();
        laneBIgnores(unassignedFailed).Should().BeFalse();
        laneBIgnores(laneBFailed).Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-107")]
    public async Task InboxConsumer_InnerPagingDelay_UsesTheLaneIntervalNotTheHostInterval()
    {
        var repository = CreateInboxRepository(() => ["inbox-message-1"]);
        var registry = CreateTwoStoreRegistry(
            inboxConfigA: FastInboxConfig(pageSize: 3),
            inboxConfigB: FastInboxConfig(),
            inboxRepositoryA: repository.Object,
            inboxRepositoryB: CreateInboxRepository().Object);

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        // The host-level (legacy) interval is one minute; if paging waited on it only one page could run.
        using var worker = new TestInboxWorker(serviceProvider, registry, new PlatformInboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 60 });
        using var cts = new CancellationTokenSource();

        try
        {
            await worker.RunIntervalAsync(cts.Token);

            (await WaitUntilAsync(() => CountInboxIdQueries(repository) >= 3)).Should().BeTrue();
        }
        finally
        {
            await cts.CancelAsync();
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // TC-WORKER-108: two lanes in one store - every inbox row is cleaned by exactly one lane.
    // ---------------------------------------------------------------------------------------------------------------

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-108")]
    public async Task InboxCleaner_TwoLanesInOneStore_EachRowIsOwnedByExactlyOneLane()
    {
        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        var registry = CreateSharedStoreRegistry(inboxRepository: repository.Object);

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var cleaner = new TestInboxCleaner(serviceProvider, registry);

        await cleaner.RunIntervalAsync(CancellationToken.None);

        // Lanes run sequentially in worker lane order (Lane-A, Lane-B); each lane runs two age-based cleanup phases.
        var predicates = GetCompiledPredicates<PlatformInboxBusMessage>(repository);
        predicates.Should().HaveCount(4);
        var laneAPredicates = predicates.Take(2).ToList();
        var laneBPredicates = predicates.Skip(2).ToList();

        var expectedOwnerByApplicationName = new Dictionary<string, string>
        {
            ["<null>"] = "Lane-A",
            ["Lane-A"] = "Lane-A",
            ["Lane-B"] = "Lane-B",
            ["Removed-Lane"] = "Lane-A"
        };

        foreach (var row in CreateInboxRows([null, "Lane-A", "Lane-B", "Removed-Lane"]))
        {
            var owners = new List<string>();
            if (laneAPredicates.Any(predicate => predicate(row))) owners.Add("Lane-A");
            if (laneBPredicates.Any(predicate => predicate(row))) owners.Add("Lane-B");

            owners.Should().Equal(
                [expectedOwnerByApplicationName[row.ForApplicationName ?? "<null>"]],
                $"row {row.ForApplicationName ?? "<null>"}/{row.ConsumeStatus} must be cleaned by exactly one lane");
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // TC-WORKER-109: a store shared by lanes with different outbox settings warns once and uses the first lane.
    // ---------------------------------------------------------------------------------------------------------------

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-109")]
    public void OutboxWorkers_SharedStoreWithDifferentLaneConfigs_WarnOnceAndUseFirstLaneConfig()
    {
        var registry = CreateSharedStoreRegistry(
            outboxConfigA: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 11, MessageCleanerTriggerIntervalInMinutes = 7 },
            outboxConfigB: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 3, MessageCleanerTriggerIntervalInMinutes = 2 });
        var loggerFactory = new CapturingLoggerFactory();

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestOutboxWorker(serviceProvider, registry, loggerFactory: loggerFactory);
        using var cleaner = new TestOutboxCleaner(serviceProvider, registry, loggerFactory);

        worker.HasRepository().Should().BeTrue();
        worker.HasRepository().Should().BeTrue();
        cleaner.HasRepository().Should().BeTrue();
        cleaner.HasRepository().Should().BeTrue();

        worker.TriggerInterval().Should().Be(TimeSpan.FromSeconds(11), "the first lane by ordering (Lane-A) configures the shared store");
        cleaner.TriggerInterval().Should().Be(TimeSpan.FromMinutes(7));

        var warnings = loggerFactory.Entries.Where(entry => entry.Level == LogLevel.Warning).Select(entry => entry.Message).ToList();
        warnings.Should().HaveCount(2, "one warning per worker, not per call");
        warnings.Should().AllSatisfy(message =>
        {
            message.Should().Contain("Store-Shared");
            message.Should().Contain("Lane-A, Lane-B");
            message.Should().Contain("configuration of lane Lane-A");
        });
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-109")]
    public void OutboxWorkers_SharedStoreWithEquivalentLaneConfigs_DoNotWarn()
    {
        var registry = CreateSharedStoreRegistry(
            outboxConfigA: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 5 },
            outboxConfigB: new PlatformOutboxConfig { CheckToProcessTriggerIntervalTimeSeconds = 5 });
        var loggerFactory = new CapturingLoggerFactory();

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var worker = new TestOutboxWorker(serviceProvider, registry, loggerFactory: loggerFactory);
        using var cleaner = new TestOutboxCleaner(serviceProvider, registry, loggerFactory);

        worker.HasRepository().Should().BeTrue();
        cleaner.HasRepository().Should().BeTrue();

        loggerFactory.Entries.Should().NotContain(entry => entry.Level == LogLevel.Warning);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // TC-WORKER-110 / 111: transient state or interval failures never stop a worker permanently.
    // ---------------------------------------------------------------------------------------------------------------

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-110")]
    public void Worker_StateBuildFailure_IsNotCached_AndIsRetriedOnNextCall()
    {
        var inboxConfigCalls = 0;
        var registry = CreateTwoStoreRegistry(
            inboxConfigFactoryA: _ =>
                Interlocked.Increment(ref inboxConfigCalls) == 1
                    ? throw new InvalidOperationException("configuration not ready")
                    : new PlatformInboxConfig());

        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var cleaner = new TestInboxCleaner(serviceProvider, registry);

        cleaner.Invoking(item => item.HasRepository()).Should().Throw<InvalidOperationException>();
        cleaner.HasRepository().Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-111")]
    public async Task IntervalLoop_WhenIntervalComputationThrows_KeepsRunningOnFallbackInterval()
    {
        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        using var service = new ThrowingIntervalService(serviceProvider);

        await service.StartAsync(CancellationToken.None);

        try
        {
            (await WaitUntilAsync(() => service.IntervalProcessCount >= 3)).Should().BeTrue();
        }
        finally
        {
            await service.StopAsync(CancellationToken.None);
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Registry builders
    // ---------------------------------------------------------------------------------------------------------------

    private static PlatformMessageBusStoreRegistry CreateTwoStoreRegistry(
        PlatformInboxConfig? inboxConfigA = null,
        PlatformInboxConfig? inboxConfigB = null,
        PlatformOutboxConfig? outboxConfigA = null,
        PlatformOutboxConfig? outboxConfigB = null,
        IPlatformInboxBusMessageRepository? inboxRepositoryA = null,
        IPlatformInboxBusMessageRepository? inboxRepositoryB = null,
        IPlatformOutboxBusMessageRepository? outboxRepositoryA = null,
        IPlatformOutboxBusMessageRepository? outboxRepositoryB = null,
        Func<IServiceProvider, PlatformInboxConfig>? inboxConfigFactoryA = null)
    {
        inboxConfigA ??= new PlatformInboxConfig();
        inboxConfigB ??= new PlatformInboxConfig();
        outboxConfigA ??= new PlatformOutboxConfig();
        outboxConfigB ??= new PlatformOutboxConfig();
        inboxRepositoryA ??= new Mock<IPlatformInboxBusMessageRepository>().Object;
        inboxRepositoryB ??= new Mock<IPlatformInboxBusMessageRepository>().Object;
        outboxRepositoryA ??= new Mock<IPlatformOutboxBusMessageRepository>().Object;
        outboxRepositoryB ??= new Mock<IPlatformOutboxBusMessageRepository>().Object;

        return new PlatformMessageBusStoreRegistry(
            [
                CreateLane("Store-A", typeof(ApplicationLaneA), "Lane-A", inboxConfigFactoryA ?? (_ => inboxConfigA), outboxConfigA),
                CreateLane("Store-B", typeof(ApplicationLaneB), "Lane-B", _ => inboxConfigB, outboxConfigB)
            ],
            [
                CreatePersistenceStore("Store-A", typeof(PersistenceOwnerA), typeof(PersistenceContextA), inboxRepositoryA, outboxRepositoryA),
                CreatePersistenceStore("Store-B", typeof(PersistenceOwnerB), typeof(PersistenceContextB), inboxRepositoryB, outboxRepositoryB)
            ],
            [
                new PlatformMessageBusStoreBinding(new PlatformMessageBusStoreKey("Store-A"), typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(new PlatformMessageBusStoreKey("Store-B"), typeof(ApplicationLaneB), typeof(PersistenceOwnerB))
            ],
            isStrictCompositionValidationEnabled: true);
    }

    private static PlatformMessageBusStoreRegistry CreateSharedStoreRegistry(
        IPlatformInboxBusMessageRepository? inboxRepository = null,
        PlatformOutboxConfig? outboxConfigA = null,
        PlatformOutboxConfig? outboxConfigB = null)
    {
        inboxRepository ??= new Mock<IPlatformInboxBusMessageRepository>().Object;
        var sharedOutboxConfig = new PlatformOutboxConfig();

        return new PlatformMessageBusStoreRegistry(
            [
                CreateLane("Store-Shared", typeof(ApplicationLaneB), "Lane-B", _ => new PlatformInboxConfig(), outboxConfigB ?? sharedOutboxConfig),
                CreateLane("Store-Shared", typeof(ApplicationLaneA), "Lane-A", _ => new PlatformInboxConfig(), outboxConfigA ?? sharedOutboxConfig)
            ],
            [
                CreatePersistenceStore(
                    "Store-Shared",
                    typeof(PersistenceOwnerA),
                    typeof(PersistenceContextA),
                    inboxRepository,
                    new Mock<IPlatformOutboxBusMessageRepository>().Object)
            ],
            [
                new PlatformMessageBusStoreBinding(new PlatformMessageBusStoreKey("Store-Shared"), typeof(ApplicationLaneB), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(new PlatformMessageBusStoreKey("Store-Shared"), typeof(ApplicationLaneA), typeof(PersistenceOwnerA))
            ],
            isStrictCompositionValidationEnabled: true);
    }

    private static PlatformMessageBusStoreRegistry CreateRegistryWithoutRuntimeStores()
    {
        return new PlatformMessageBusStoreRegistry(
            [CreateLane("Default", typeof(ApplicationLaneA), "LegacyHost", _ => new PlatformInboxConfig(), new PlatformOutboxConfig())],
            [
                new PlatformPersistenceMessageBusStoreRegistration(
                    new PlatformMessageBusStoreKey("Default"),
                    typeof(PersistenceOwnerA),
                    typeof(PersistenceContextA),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    isRuntimeEnabled: false)
            ],
            []);
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateLane(
        string storeKey,
        Type applicationModuleType,
        string applicationName,
        Func<IServiceProvider, PlatformInboxConfig> inboxConfigFactory,
        PlatformOutboxConfig outboxConfig)
    {
        return new PlatformMessageBusApplicationLaneRegistration(
            new PlatformMessageBusStoreKey(storeKey),
            applicationModuleType,
            applicationName,
            typeof(PlatformMessageBusWorkerFanOutTests).Assembly,
            inboxConfigFactory,
            _ => outboxConfig);
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePersistenceStore(
        string storeKey,
        Type ownerType,
        Type contextType,
        IPlatformInboxBusMessageRepository inboxRepository,
        IPlatformOutboxBusMessageRepository outboxRepository)
    {
        return new PlatformPersistenceMessageBusStoreRegistration(
            new PlatformMessageBusStoreKey(storeKey),
            ownerType,
            contextType,
            typeof(IPlatformInboxBusMessageRepository),
            typeof(IPlatformOutboxBusMessageRepository),
            typeof(IPlatformUnitOfWorkManager),
            _ => inboxRepository,
            _ => outboxRepository,
            _ => null);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Repository / DI doubles
    // ---------------------------------------------------------------------------------------------------------------

    private static PlatformOutboxConfig FastOutboxConfig()
    {
        return new PlatformOutboxConfig
        {
            ProcessSendMessageRetryCount = 0,
            ProcessSendMessageRetryDelaySeconds = 0,
            CheckToProcessTriggerIntervalTimeSeconds = 0
        };
    }

    private static PlatformInboxConfig FastInboxConfig(int pageSize = 1000)
    {
        return new PlatformInboxConfig
        {
            ProcessConsumeMessageRetryCount = 0,
            ProcessConsumeMessageRetryDelaySeconds = 0,
            CheckToProcessTriggerIntervalTimeSeconds = 0,
            GetCanHandleMessageGroupedByConsumerIdPrefixesPageSize = pageSize
        };
    }

    private static Expression<Func<IPlatformOutboxBusMessageRepository, Task<List<string>>>> OutboxIdQuery()
    {
        return repository => repository.GetAllAsync(
            It.IsAny<Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<string>>>(),
            It.IsAny<CancellationToken>(),
            It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>());
    }

    private static Expression<Func<IPlatformInboxBusMessageRepository, Task<List<string>>>> InboxIdQuery()
    {
        return repository => repository.GetAllAsync(
            It.IsAny<Func<IQueryable<PlatformInboxBusMessage>, IQueryable<string>>>(),
            It.IsAny<CancellationToken>(),
            It.IsAny<Expression<Func<PlatformInboxBusMessage, object?>>[]>());
    }

    /// <summary>
    /// An outbox repository whose candidate-id page is <paramref name="messageIds" /> (empty by default) and whose
    /// lease query never finds a row to lease, so the sender pages without sending.
    /// </summary>
    private static Mock<IPlatformOutboxBusMessageRepository> CreateOutboxRepository(Func<List<string>>? messageIds = null)
    {
        var uowManager = new Mock<IPlatformUnitOfWorkManager>();
        uowManager
            .Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task<List<PlatformOutboxBusMessage>>>>(), It.IsAny<bool>()))
            .Returns((Func<Task<List<PlatformOutboxBusMessage>>> taskFn, bool _) => taskFn());

        var repository = new Mock<IPlatformOutboxBusMessageRepository>();
        repository.Setup(item => item.UowManager()).Returns(uowManager.Object);
        repository.Setup(OutboxIdQuery()).ReturnsAsync(() => messageIds?.Invoke() ?? []);
        repository
            .Setup(item => item.GetAllAsync(
                It.IsAny<Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<PlatformOutboxBusMessage>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()))
            .ReturnsAsync(() => []);
        return repository;
    }

    private static Mock<IPlatformOutboxBusMessageRepository> CreateQueryableOutboxRepository(List<PlatformOutboxBusMessage> messages)
    {
        var repository = CreateOutboxRepository();
        repository.Setup(OutboxIdQuery()).ReturnsAsync(
            (Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<string>> query, CancellationToken _, Expression<Func<PlatformOutboxBusMessage, object?>>[] _) =>
                query(messages.AsQueryable()).ToList());
        repository.Setup(item => item.GetAllAsync(
                It.IsAny<Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<PlatformOutboxBusMessage>>>(),
                It.IsAny<CancellationToken>(), It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()))
            .ReturnsAsync((Func<IQueryable<PlatformOutboxBusMessage>, IQueryable<PlatformOutboxBusMessage>> query, CancellationToken _, Expression<Func<PlatformOutboxBusMessage, object?>>[] _) =>
                query(messages.AsQueryable()).ToList());
        repository.Setup(item => item.AnyAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Expression<Func<PlatformOutboxBusMessage, bool>> query, CancellationToken _) => messages.Any(query.Compile()));
        // The ping loop is an external persistence operation, not the claim/ordering rule under test.
        repository.Setup(item => item.GetAllAsync(It.IsAny<Expression<Func<PlatformOutboxBusMessage, bool>>>(),
                It.IsAny<CancellationToken>(), It.IsAny<Expression<Func<PlatformOutboxBusMessage, object?>>[]>()))
            .ReturnsAsync([]);
        return repository;
    }

    /// <inheritdoc cref="CreateOutboxRepository" />
    private static Mock<IPlatformInboxBusMessageRepository> CreateInboxRepository(Func<List<string>>? messageIds = null)
    {
        var uowManager = new Mock<IPlatformUnitOfWorkManager>();
        uowManager
            .Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task<List<PlatformInboxBusMessage>>>>(), It.IsAny<bool>()))
            .Returns((Func<Task<List<PlatformInboxBusMessage>>> taskFn, bool _) => taskFn());

        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository.Setup(item => item.UowManager()).Returns(uowManager.Object);
        repository.Setup(InboxIdQuery()).ReturnsAsync(() => messageIds?.Invoke() ?? []);
        repository
            .Setup(item => item.GetAllAsync(
                It.IsAny<Func<IQueryable<PlatformInboxBusMessage>, IQueryable<PlatformInboxBusMessage>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<PlatformInboxBusMessage, object?>>[]>()))
            .ReturnsAsync(() => []);
        return repository;
    }

    private static int CountOutboxIdQueries(Mock<IPlatformOutboxBusMessageRepository> repository) => CountIdQueries(repository);

    private static int CountInboxIdQueries(Mock<IPlatformInboxBusMessageRepository> repository) => CountIdQueries(repository);

    private static int CountIdQueries(Mock repository)
    {
        return repository.Invocations.Count(invocation =>
            invocation.Method.Name == "GetAllAsync" &&
            invocation.Method.IsGenericMethod &&
            invocation.Method.GetGenericArguments()[0] == typeof(string));
    }

    private static int CountPredicates<TMessage>(Mock repository) => GetCompiledPredicates<TMessage>(repository).Count;

    /// <summary>
    /// The cleanup predicates passed to <c>CountAsync</c>, in call order (every cleanup phase counts first).
    /// </summary>
    private static List<Func<TMessage, bool>> GetCompiledPredicates<TMessage>(Mock repository)
    {
        return repository.Invocations
            .Where(invocation => invocation.Method.Name == "CountAsync")
            .Select(invocation => invocation.Arguments[0])
            .OfType<Expression<Func<TMessage, bool>>>()
            .Select(expression => expression.Compile())
            .ToList();
    }

    private static List<PlatformInboxBusMessage> CreateInboxRows(IEnumerable<string?> forApplicationNames)
    {
        var expiredCreatedDate = DateTime.UtcNow.AddDays(-400);

        return forApplicationNames
            .SelectMany(forApplicationName => new[]
                {
                    PlatformInboxBusMessage.ConsumeStatuses.Processed,
                    PlatformInboxBusMessage.ConsumeStatuses.Ignored,
                    PlatformInboxBusMessage.ConsumeStatuses.Failed
                }
                .Select(status => new PlatformInboxBusMessage
                {
                    ForApplicationName = forApplicationName,
                    ConsumeStatus = status,
                    CreatedDate = expiredCreatedDate
                }))
            .ToList();
    }

    private sealed class UnqualifiedResolutionCounter
    {
        private int inbox;
        private int outbox;

        public int Inbox => inbox;
        public int Outbox => outbox;

        public void IncrementInbox() => Interlocked.Increment(ref inbox);
        public void IncrementOutbox() => Interlocked.Increment(ref outbox);
    }

    private static ServiceProvider BuildServiceProviderWithUnqualifiedRepositories(
        IPlatformInboxBusMessageRepository? inboxRepository = null,
        IPlatformOutboxBusMessageRepository? outboxRepository = null,
        UnqualifiedResolutionCounter? counter = null)
    {
        var services = new ServiceCollection();

        if (inboxRepository != null)
        {
            services.AddScoped(_ =>
            {
                counter?.IncrementInbox();
                return inboxRepository;
            });
        }

        if (outboxRepository != null)
        {
            services.AddScoped(_ =>
            {
                counter?.IncrementOutbox();
                return outboxRepository;
            });
        }

        return services.BuildServiceProvider();
    }

    /// <summary>
    /// Polls <paramref name="condition" /> until it holds; returns false when it never held within the timeout.
    /// </summary>
    private static async Task<bool> WaitUntilAsync(Func<bool> condition)
    {
        var deadline = DateTime.UtcNow + BackgroundWaitTimeout;

        while (!condition())
        {
            if (DateTime.UtcNow > deadline)
                return false;

            await Task.Delay(20);
        }

        return true;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Private state inspection (composition shape only)
    // ---------------------------------------------------------------------------------------------------------------

    private static int GetPrivateRouteCount(object worker, Type workerType, string methodName)
    {
        return GetPrivateRoutes(worker, workerType, methodName).Count;
    }

    private static List<string> GetPrivateRouteStoreKeys(object worker, Type workerType, string methodName)
    {
        return GetPrivateRoutes(worker, workerType, methodName)
            .Select(route =>
                ((PlatformMessageBusStoreDescriptor)route.GetType().GetProperty("Descriptor")!.GetValue(route)!)
                .StoreKey.Value)
            .ToList();
    }

    private static List<string> GetPrivateRouteLaneNames(object worker, Type workerType, string methodName)
    {
        return GetPrivateRoutes(worker, workerType, methodName)
            .Select(route =>
                ((PlatformMessageBusApplicationLaneRegistration)route.GetType().GetProperty("Lane")!.GetValue(route)!)
                .ApplicationName)
            .ToList();
    }

    private static List<object> GetPrivateRoutes(object worker, Type workerType, string methodName)
    {
        var method = workerType.GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic);
        method.Should().NotBeNull();

        var routes = method!.Invoke(worker, null) as IEnumerable;
        routes.Should().NotBeNull();
        return routes!.Cast<object>().ToList();
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Test workers
    // ---------------------------------------------------------------------------------------------------------------

    private sealed class TestOutboxWorker : PlatformSendOutboxBusMessageHostedService
    {
        private readonly Action<PlatformOutboxBusMessage>? sendAction;

        public TestOutboxWorker(
            IServiceProvider serviceProvider,
            IPlatformMessageBusStoreRegistry? registry,
            PlatformOutboxConfig? legacyConfig = null,
            ILoggerFactory? loggerFactory = null,
            Action<PlatformOutboxBusMessage>? sendAction = null)
            : base(
                serviceProvider,
                loggerFactory ?? NullLoggerFactory.Instance,
                CreateApplicationSettingContext(),
                legacyConfig ?? new PlatformOutboxConfig { MaxParallelProcessingMessagesCount = 1 },
                new Mock<IPlatformRootServiceProvider>().Object,
                registry)
        {
            this.sendAction = sendAction;
        }

        protected override Task SendMessageToBusAsync(IServiceScope scope, PlatformOutboxBusMessage toHandleOutboxMessage, CancellationToken cancellationToken)
        {
            if (sendAction == null) return base.SendMessageToBusAsync(scope, toHandleOutboxMessage, cancellationToken);
            sendAction(toHandleOutboxMessage);
            return Task.CompletedTask;
        }

        public bool HasRepository() => HasOutboxEventBusMessageRepositoryRegistered();
        public TimeSpan TriggerInterval() => ProcessTriggerIntervalTime();
        public Task RunIntervalAsync(CancellationToken cancellationToken) => IntervalProcessAsync(cancellationToken);
        public Task SendAsync(CancellationToken cancellationToken) => SendOutboxEventBusMessages(cancellationToken);

        public Task<List<PlatformOutboxBusMessage>> PopAsync(string prefix, int pageSize, CancellationToken cancellationToken) =>
            PopToHandleOutboxEventBusMessages(prefix, pageSize, cancellationToken);
    }

    private sealed class TestInboxWorker : PlatformConsumeInboxBusMessageHostedService
    {
        public TestInboxWorker(IServiceProvider serviceProvider, IPlatformMessageBusStoreRegistry? registry, PlatformInboxConfig? legacyConfig = null)
            : base(
                serviceProvider,
                NullLoggerFactory.Instance,
                CreateApplicationSettingContext(),
                CreateEmptyMessageBusScanner(),
                legacyConfig ?? new PlatformInboxConfig { MaxParallelProcessingMessagesCount = 1 },
                new PlatformMessageBusConfig(),
                registry)
        {
        }

        public bool HasRepository() => HasInboxEventBusMessageRepositoryRegistered();
        public TimeSpan TriggerInterval() => ProcessTriggerIntervalTime();
        public Task RunIntervalAsync(CancellationToken cancellationToken) => IntervalProcessAsync(cancellationToken);

        public Task<List<PlatformInboxBusMessage>> PopAsync(string prefix, int pageSize, CancellationToken cancellationToken) =>
            PopToHandleInboxEventBusMessages(prefix, pageSize, cancellationToken);

        private static IPlatformMessageBusScanner CreateEmptyMessageBusScanner()
        {
            var scanner = new Mock<IPlatformMessageBusScanner>();
            scanner.Setup(item => item.ScanAllDefinedConsumerTypes()).Returns([]);
            return scanner.Object;
        }
    }

    private sealed class TestOutboxCleaner : PlatformOutboxBusMessageCleanerHostedService
    {
        public TestOutboxCleaner(IServiceProvider serviceProvider, IPlatformMessageBusStoreRegistry? registry, ILoggerFactory? loggerFactory = null)
            : base(serviceProvider, loggerFactory ?? NullLoggerFactory.Instance, CreateApplicationSettingContext(), new PlatformOutboxConfig(), registry)
        {
        }

        public bool HasRepository() => HasOutboxEventBusMessageRepositoryRegistered();
        public TimeSpan TriggerInterval() => ProcessTriggerIntervalTime();
        public Task RunIntervalAsync(CancellationToken cancellationToken) => IntervalProcessAsync(cancellationToken);
    }

    private sealed class TestInboxCleaner : PlatformInboxBusMessageCleanerHostedService
    {
        public TestInboxCleaner(IServiceProvider serviceProvider, IPlatformMessageBusStoreRegistry? registry)
            : base(serviceProvider, NullLoggerFactory.Instance, CreateApplicationSettingContext(), new PlatformInboxConfig(), registry)
        {
        }

        public bool HasRepository() => HasInboxEventBusMessageRepositoryRegistered();
        public Task RunIntervalAsync(CancellationToken cancellationToken) => IntervalProcessAsync(cancellationToken);
    }

    private sealed class ThrowingIntervalService : PlatformIntervalHostingBackgroundService
    {
        private int intervalProcessCount;

        public ThrowingIntervalService(IServiceProvider serviceProvider) : base(serviceProvider, NullLoggerFactory.Instance)
        {
        }

        public int IntervalProcessCount => intervalProcessCount;

        public override bool LogIntervalProcessInformation => false;

        protected override Task IntervalProcessAsync(CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref intervalProcessCount);
            return Task.CompletedTask;
        }

        protected override TimeSpan ProcessTriggerIntervalTime() => throw new InvalidOperationException("interval state not ready");

        protected override TimeSpan FallbackProcessTriggerIntervalTime() => TimeSpan.FromMilliseconds(10);
    }

    private sealed class CapturingLoggerFactory : ILoggerFactory
    {
        public ConcurrentQueue<(LogLevel Level, string Message)> Entries { get; } = new();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(Entries);

        public void AddProvider(ILoggerProvider provider)
        {
        }

        public void Dispose()
        {
        }
    }

    private sealed class CapturingLogger(ConcurrentQueue<(LogLevel Level, string Message)> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            entries.Enqueue((logLevel, formatter(state, exception)));
        }
    }

    private static IPlatformApplicationSettingContext CreateApplicationSettingContext()
    {
        var context = new Mock<IPlatformApplicationSettingContext>();
        context.SetupGet(item => item.ApplicationName).Returns("LegacyHost");
        context.SetupGet(item => item.ApplicationAssembly).Returns(typeof(PlatformMessageBusWorkerFanOutTests).Assembly);
        return context.Object;
    }

    private sealed class ApplicationLaneA { }
    private sealed class ApplicationLaneB { }
    private sealed class PersistenceOwnerA { }
    private sealed class PersistenceOwnerB { }
    private sealed class PersistenceContextA { }
    private sealed class PersistenceContextB { }
}
