using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Timing;
using Easy.Platform.MongoDB;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.IntegrationTests.Migrations;

/// <summary>
/// Technical contract: ordinary concurrent initialization preserves every declared system index and publishes
/// one completion marker. Each case owns a fresh database and two independently scoped contexts using the real driver.
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Persistence")]
public sealed class MongoIndexInitializationConcurrencyIntegrationTests : TextSnippetIntegrationTestBase
{
    private static readonly TimeSpan BarrierTimeout = TimeSpan.FromSeconds(30);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "MongoSystemIndexInitialization")]
    public async Task OrdinaryInitialization_WithCapturedMissingSentinel_ShouldPreserveCompletedPeerIndexes(bool shareMigrationLedger)
    {
        await WithOwnedDatabaseAsync(async (database, firstServices, secondServices) =>
        {
            using var missingChecks = new CapturedResultBarrier(4);
            using var delayed = CreateContext(database, firstServices, shareMigrationLedger, collectionBarrier: missingChecks);
            using var winner = CreateContext(database, secondServices, shareMigrationLedger);

            var delayedInitialization = delayed.EnsureIndexesAsync();

            try
            {
                // All four real queries have ALREADY returned false. Pausing before those queries would miss the race:
                // the delayed initializer would merely see its peer's marker and never take the destructive branch.
                await missingChecks.AllCaptured.WaitAsync(BarrierTimeout);
                await winner.EnsureIndexesAsync();
                var completed = await ReadSentinelAsync(winner);

                missingChecks.Release();
                await delayedInitialization;

                await AssertDeclaredIndexesAsync(delayed);
                await AssertSingleCompletedSentinelAsync(delayed, completed.CreatedDate);

                // Exercise the normal startup entry point after completion too. This context has no migration executors.
                await delayed.Migrate();
                await AssertDeclaredIndexesAsync(delayed);
                await AssertSingleCompletedSentinelAsync(delayed, completed.CreatedDate);
                await AssertDuplicateNamesRejectedAsync(delayed);
            }
            finally
            {
                missingChecks.Release();
                await delayedInitialization;
            }
        });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "MongoSystemIndexInitialization")]
    public async Task OrdinaryInitialization_WithConcurrentCompletion_ShouldPublishOneProcessedSentinel(bool shareMigrationLedger)
    {
        await WithOwnedDatabaseAsync(async (database, firstServices, secondServices) =>
        {
            using var completionChecks = new CapturedResultBarrier(2);
            using var first = CreateContext(database, firstServices, shareMigrationLedger, completionBarrier: completionChecks);
            using var second = CreateContext(database, secondServices, shareMigrationLedger, completionBarrier: completionChecks);

            var firstInitialization = first.EnsureIndexesAsync();
            var secondInitialization = second.EnsureIndexesAsync();
            var bothInitializations = Task.WhenAll(firstInitialization, secondInitialization);

            try
            {
                // Both contexts finished their real index builds and captured a missing completion marker.
                await completionChecks.AllCaptured.WaitAsync(BarrierTimeout);
                completionChecks.Release();
                await bothInitializations;

                var completed = await ReadSentinelAsync(first);
                await AssertDeclaredIndexesAsync(first);
                await AssertSingleCompletedSentinelAsync(first, completed.CreatedDate);

                await Task.WhenAll(first.EnsureIndexesAsync(), second.EnsureIndexesAsync());
                await AssertSingleCompletedSentinelAsync(first, completed.CreatedDate);
                await AssertDuplicateNamesRejectedAsync(first);
            }
            finally
            {
                completionChecks.Release();
                await bothInitializations;
            }
        });
    }

    [Fact]
    [Trait("TechnicalSpec", "MongoSystemIndexInitialization")]
    public async Task OrdinaryInitialization_WithStaleCompletionDecision_ShouldRetainThePeerCompletionTimestamp()
    {
        await WithOwnedDatabaseAsync(async (database, firstServices, secondServices) =>
        {
            using var missingCompletion = new CapturedResultBarrier(1);
            using var delayed = CreateContext(database, firstServices, shareMigrationLedger: false, completionBarrier: missingCompletion);
            using var winner = CreateContext(database, secondServices, shareMigrationLedger: false);
            var delayedInitialization = delayed.EnsureIndexesAsync();

            try
            {
                await missingCompletion.AllCaptured.WaitAsync(BarrierTimeout);
                await winner.EnsureIndexesAsync();
                var completed = await ReadSentinelAsync(winner);

                // BSON dates have millisecond precision. Establish a distinct clock value before the stale publication
                // resumes, so changing SetOnInsert to Set cannot pass merely because both writes share one millisecond.
                using var clockBudget = new CancellationTokenSource(BarrierTimeout);
                while (Clock.UtcNow <= completed.CreatedDate.AddMilliseconds(1))
                {
                    clockBudget.Token.ThrowIfCancellationRequested();
                    await Task.Yield();
                }

                missingCompletion.Release();
                await delayedInitialization;

                await AssertSingleCompletedSentinelAsync(delayed, completed.CreatedDate);
                await AssertDeclaredIndexesAsync(delayed);
            }
            finally
            {
                missingCompletion.Release();
                await delayedInitialization;
            }
        });
    }

    [Fact]
    [Trait("TechnicalSpec", "MongoSystemIndexInitialization")]
    public async Task OrdinaryInitialization_WhenDeclaredIndexConflicts_ShouldPropagateErrorWithoutCompletion()
    {
        await WithOwnedDatabaseAsync(async (database, firstServices, _) =>
        {
            using var context = CreateContext(database, firstServices, shareMigrationLedger: false);

            // A partially initialized/older database can have the same key with incompatible options.
            // Ordinary startup must expose that conflict instead of deleting it or reporting completion.
            await context.MigrationHistoryCollection.Indexes.CreateOneAsync(
                new CreateIndexModel<PlatformMongoMigrationHistory>(
                    Builders<PlatformMongoMigrationHistory>.IndexKeys.Ascending(row => row.Name)));

            var initialize = () => context.EnsureIndexesAsync();

            await initialize.Should().ThrowAsync<MongoCommandException>();
            (await context.MigrationHistoryCollection.CountDocumentsAsync(row => row.Name == IndexInitializationContext.EnsureIndexesMigrationName))
                .Should().Be(0, "a failed index build must not publish completion");
            var indexes = await (await context.MigrationHistoryCollection.Indexes.ListAsync()).ToListAsync();
            indexes.Single(index => index["name"] == "Name_1").GetValue("unique", false).AsBoolean.Should().BeFalse(
                "ordinary startup must preserve an incompatible existing index for explicit operator repair");
        });
    }

    [Fact]
    [Trait("TechnicalSpec", "MongoSystemIndexInitialization")]
    public async Task ExplicitRecreation_WithLegacySentinel_ShouldPreserveItsOriginalFields()
    {
        await WithOwnedDatabaseAsync(async (database, firstServices, _) =>
        {
            using var context = CreateContext(database, firstServices, shareMigrationLedger: false);
            await context.EnsureIndexesAsync();
            var before = await ReadSentinelAsync(context);
            var rawHistory = database.GetCollection<BsonDocument>(context.MigrationHistoryCollectionName);
            var sentinel = Builders<BsonDocument>.Filter.Eq(nameof(PlatformMongoMigrationHistory.Name), IndexInitializationContext.EnsureIndexesMigrationName);

            // Legacy markers genuinely lack these fields; an explicit index rebuild must not rewrite historical rows.
            await rawHistory.UpdateOneAsync(sentinel, Builders<BsonDocument>.Update
                .Unset(nameof(PlatformMongoMigrationHistory.Status))
                .Unset(nameof(PlatformMongoMigrationHistory.RowKind)));
            await context.EnsureIndexesAsync(recreate: true);

            var after = await rawHistory.Find(sentinel).SingleAsync();
            after.Contains(nameof(PlatformMongoMigrationHistory.Status)).Should().BeFalse();
            after.Contains(nameof(PlatformMongoMigrationHistory.RowKind)).Should().BeFalse();
            (await ReadSentinelAsync(context)).CreatedDate.Should().Be(before.CreatedDate);
            await AssertDeclaredIndexesAsync(context);
        });
    }

    private static async Task AssertDeclaredIndexesAsync(IndexInitializationContext context)
    {
        await AssertIndexesAsync(context.MigrationHistoryCollection, ["Name_1", "Status_1"], uniqueName: true);
        await AssertIndexesAsync(context.DataMigrationHistoryCollection, ["Name_1", "Status_1"], uniqueName: true);
        await AssertIndexesAsync(context.InboxBusMessageCollection,
        [
            "ConsumeStatus_1_ForApplicationName_1_CreatedDate_1_NextRetryProcessAfter_1",
            "ConsumeStatus_1_ForApplicationName_1_CreatedDate_1_LastConsumeDate_1",
            "ConsumeStatus_1_ForApplicationName_1_CreatedDate_1_LastProcessingPingDate_1",
            "ConsumeStatus_1_CreatedDate_1",
            "_id_1_ConsumeStatus_1_CreatedDate_1",
            "ConsumeStatus_1_ForApplicationName_1_CreatedDate_1"
        ]);
        await AssertIndexesAsync(context.OutboxBusMessageCollection,
        [
            "SendStatus_1_CreatedDate_1",
            "_id_1_SendStatus_1_CreatedDate_1",
            "SendStatus_1_CreatedDate_1_NextRetryProcessAfter_1",
            "SendStatus_1_CreatedDate_1_LastProcessingPingDate_1",
            "SendStatus_1_CreatedDate_1_LastSendDate_1"
        ]);
    }

    private static async Task AssertIndexesAsync<TEntity>(IMongoCollection<TEntity> collection, string[] expectedNames, bool uniqueName = false)
    {
        var indexes = await (await collection.Indexes.ListAsync()).ToListAsync();
        indexes.Select(index => index["name"].AsString).Should().BeEquivalentTo(expectedNames.Append("_id_"),
            "every declared index must survive a peer's ordinary initialization in {0}", collection.CollectionNamespace);

        foreach (var name in expectedNames)
        {
            var index = indexes.Single(item => item["name"] == name);
            var expectedKeys = new BsonDocument(name[..^2].Split("_1_").Select(field => new BsonElement(field, 1)));
            index["key"].AsBsonDocument.Equals(expectedKeys).Should().BeTrue("index field order and direction are part of the query contract");
            index.GetValue("unique", false).AsBoolean.Should().Be(uniqueName && name == "Name_1",
                "only the ledger Name index is declared unique");
        }
    }

    private static async Task AssertSingleCompletedSentinelAsync(IndexInitializationContext context, DateTime createdDate)
    {
        var rows = await context.MigrationHistoryCollection
            .Find(row => row.Name == IndexInitializationContext.EnsureIndexesMigrationName).ToListAsync();
        rows.Should().ContainSingle("concurrent successful initializers must converge on one completion marker");
        rows.Single().Status.Should().Be(PlatformMongoMigrationHistory.Statuses.Processed);
        rows.Single().RowKind.Should().Be(PlatformMongoMigrationHistory.MongoMigrationRowKind);
        rows.Single().CreatedDate.Should().Be(createdDate, "later initialization must retain the first completion timestamp");
    }

    private static Task<PlatformMongoMigrationHistory> ReadSentinelAsync(IndexInitializationContext context)
    {
        return context.MigrationHistoryCollection.Find(row => row.Name == IndexInitializationContext.EnsureIndexesMigrationName).SingleAsync();
    }

    private static async Task AssertDuplicateNamesRejectedAsync(IndexInitializationContext context)
    {
        var duplicateSentinel = () => context.MigrationHistoryCollection.InsertOneAsync(
            new PlatformMongoMigrationHistory(IndexInitializationContext.EnsureIndexesMigrationName));
        (await duplicateSentinel.Should().ThrowAsync<MongoWriteException>()).Which.WriteError.Category.Should().Be(ServerErrorCategory.DuplicateKey);

        var name = $"DuplicateGuard_{Ulid.NewUlid()}";
        await context.DataMigrationHistoryCollection.InsertOneAsync(new PlatformDataMigrationHistory { Name = name });
        var duplicateDataMigration = () => context.DataMigrationHistoryCollection.InsertOneAsync(new PlatformDataMigrationHistory { Name = name });
        (await duplicateDataMigration.Should().ThrowAsync<MongoWriteException>()).Which.WriteError.Category.Should().Be(ServerErrorCategory.DuplicateKey);
    }

    private async Task WithOwnedDatabaseAsync(Func<IMongoDatabase, IServiceProvider, IServiceProvider, Task> body)
    {
        await ExecuteWithServicesAsync(async services =>
        {
            var client = services.GetRequiredService<IPlatformMongoClient<TextSnippetDbContext>>().MongoClient;
            var databaseName = $"PlatformIndexInit_{Ulid.NewUlid()}";
            using var firstScope = services.CreateScope();
            using var secondScope = services.CreateScope();

            try
            {
                await body(client.GetDatabase(databaseName), firstScope.ServiceProvider, secondScope.ServiceProvider);
            }
            finally
            {
                // This uniquely named database belongs exclusively to this case; no application/test-run state is reset.
                await client.DropDatabaseAsync(databaseName);
            }
        });
    }

    private static IndexInitializationContext CreateContext(
        IMongoDatabase database,
        IServiceProvider services,
        bool shareMigrationLedger,
        CapturedResultBarrier? collectionBarrier = null,
        CapturedResultBarrier? completionBarrier = null)
    {
        return new IndexInitializationContext(
            new PlatformMongoDatabase<IndexInitializationContext>(database),
            services.GetRequiredService<ILoggerFactory>(),
            services.GetRequiredService<IPlatformApplicationRequestContextAccessor>(),
            new PlatformPersistenceConfiguration<IndexInitializationContext>(),
            services.GetRequiredService<IPlatformRootServiceProvider>(),
            services.GetRequiredService<IPlatformApplicationSettingContext>(),
            shareMigrationLedger,
            collectionBarrier,
            completionBarrier);
    }

    private sealed class CapturedResultBarrier(int expectedCaptures) : IDisposable
    {
        private readonly TaskCompletionSource allCaptured = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource released = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int captureCount;

        public Task AllCaptured => allCaptured.Task;

        public async Task CaptureAsync()
        {
            if (Interlocked.Increment(ref captureCount) == expectedCaptures)
                allCaptured.TrySetResult();

            await released.Task.WaitAsync(BarrierTimeout);
        }

        public void Release() => released.TrySetResult();

        public void Dispose() => Release();
    }

    private sealed class IndexInitializationContext(
        IPlatformMongoDatabase<IndexInitializationContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<IndexInitializationContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        bool shareMigrationLedger,
        CapturedResultBarrier? collectionBarrier,
        CapturedResultBarrier? completionBarrier)
        : PlatformMongoDbContext<IndexInitializationContext>(database, loggerFactory, requestContextAccessor, persistenceConfiguration,
            rootServiceProvider, applicationSettingContext)
    {
        private readonly AsyncLocal<CollectionCheck?> currentCollectionCheck = new();
        private int completedCollections;

        protected override string PlatformSystemCollectionNamePrefix => "Initializer_";

        public override string DataMigrationHistoryCollectionName =>
            shareMigrationLedger ? MigrationHistoryCollectionName : base.DataMigrationHistoryCollectionName;

        public override Task InternalEnsureIndexesAsync(bool recreate = false) => Task.CompletedTask;

        public override Task EnsureMigrationHistoryCollectionIndexesAsync(bool recreate = false) =>
            RunCollectionAsync(() => base.EnsureMigrationHistoryCollectionIndexesAsync(recreate));

        public override Task EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(bool recreate = false) =>
            RunCollectionAsync(() => base.EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(recreate));

        public override Task EnsureInboxBusMessageCollectionIndexesAsync(bool recreate = false) =>
            RunCollectionAsync(() => base.EnsureInboxBusMessageCollectionIndexesAsync(recreate));

        public override Task EnsureOutboxBusMessageCollectionIndexesAsync(bool recreate = false) =>
            RunCollectionAsync(() => base.EnsureOutboxBusMessageCollectionIndexesAsync(recreate));

        protected override async Task<bool> IsEnsureIndexesMigrationExecuted()
        {
            var exists = await base.IsEnsureIndexesMigrationExecuted();
            var collectionCheck = currentCollectionCheck.Value;

            if (!exists && collectionBarrier != null && collectionCheck is { Captured: false })
            {
                collectionCheck.Captured = true;
                await collectionBarrier.CaptureAsync();
            }

            if (!exists && completionBarrier != null && collectionCheck == null && Volatile.Read(ref completedCollections) == 4)
                await completionBarrier.CaptureAsync();

            return exists;
        }

        private async Task RunCollectionAsync(Func<Task> ensureIndexes)
        {
            var previous = currentCollectionCheck.Value;
            currentCollectionCheck.Value = new CollectionCheck();

            try
            {
                await ensureIndexes();
                Interlocked.Increment(ref completedCollections);
            }
            finally
            {
                currentCollectionCheck.Value = previous;
            }
        }

        private sealed class CollectionCheck
        {
            public bool Captured { get; set; }
        }
    }
}
