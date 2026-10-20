#region

using Easy.Platform.Common.Extensions;
using Easy.Platform.MongoDB;
using Easy.Platform.MongoDB.Migration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

#endregion

namespace PlatformExampleApp.IntegrationTests.Migrations;

/// <summary>
/// Lifecycle tests for the mongo migration status ledger — TC-MONGOMIGSTATUS-001/003/004/006/007.
/// </summary>
/// <remarks>
/// <para>
/// <b>What is under test.</b> That <c>PlatformMongoDbContext.Migrate()</c> decides what to run from the ledger row's <c>Status</c>
/// rather than from the row's existence, and that the transitions an operator reads in the database are the ones the feature promises.
/// The assertions therefore read the real collection through the real driver — a mocked collection would assert the mock, and the
/// mongo LINQ translation of <c>ProcessedExpr()</c> is precisely the part most likely to break.
/// </para>
/// <para>
/// <b>Every counter assertion is a DELTA around the explicit <c>Migrate()</c> call, never an absolute value.</b> The test host's own
/// startup already ran <c>Migrate()</c> and incremented the counter before any test body executes, and the suite is additive by
/// design (it is re-run against the same database, never a pristine one). An absolute-count assertion would pass exactly once.
/// </para>
/// <para>
/// <b>Shared mutable state, and why the counter assertions are one-sided.</b> These tests mutate the SAME fixture ledger row and the
/// SAME <c>RunCount</c> marker. Sharing between the two migration test CLASSES is safe: both declare
/// <c>[Collection(TextSnippetIntegrationTestCollection.Name)]</c>, and one xUnit collection runs strictly sequentially.
/// <para>
/// But this project has THREE collections, and xUnit runs DIFFERENT collections in PARALLEL. Exactly ONE of the other two shares this
/// ledger: <c>TextSnippetCrossServiceIntegrationTestCollection</c>, whose producer/consumer modules derive from
/// <c>TextSnippetIntegrationTestAspNetCoreModule</c> and therefore run <c>UseDbType=MongoDb</c> against the same TextSnippet database.
/// <c>TextSnippetWebAppFactoryCollection</c> does NOT — <c>TextSnippetWebApplicationFactory.cs:47-51</c> forces
/// <c>UseDbType=Postgres</c>, so its host never touches the mongo ledger. (Stated precisely because the conclusion below is right for
/// the wrong reason if all three are assumed to collide.) The cross-service hosts scan the same assembly, so they discover the same
/// fixture executor: if one initialises while a test here has the row set to a pending status, IT can run the migration and bump
/// <c>RunCount</c> too.
/// </para>
/// <para>
/// Hence the rule from the project's own testing lessons — <i>assert the outcome your system OWNS, never a count any co-running
/// process could also have written</i>. "The body executed" (<c>RunCount</c> increased by AT LEAST one) is owned by this test.
/// "Executed exactly once across the whole database" is not, so it is deliberately NOT asserted; a `.Be(before + 1)` here would be
/// green when run alone and flaky the instant another collection's host booted in the same window. The exact-equality assertion is
/// kept only where it stays true regardless of who acted: the skip half of TC-004, where a <c>Processed</c> row makes EVERY process
/// skip, so the counter must not move at all.
/// </para>
/// </para>
/// <para>
/// <b>Each test writes its own precondition.</b> Migrations are once-per-database by nature, so a test that assumed "this migration
/// has never run" would pass on a clean database and fail on every subsequent run. Each test forces the ledger row into the state it
/// needs before acting.
/// </para>
/// </remarks>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Migration")]
public class MongoMigrationStatusLifecycleIntegrationTests : TextSnippetIntegrationTestBase
{
    private const string FixtureMigrationName = "20260812000000_AlwaysRunnableTestMigrationForMongo";
    private const string RunMarkerCollectionName = "testMigrationRunMarkers";
    private const string RunMarkerId = "AlwaysRunnableTestMigrationForMongo";
    private const string RunCountFieldName = "RunCount";
    private const string ObservedStatusDuringRunFieldName = "ObservedStatusDuringRun";

    /// <summary>
    /// TC-MONGOMIGSTATUS-003 — a successful run leaves the row <c>Processed</c>, preserves the ORIGINAL <c>CreatedDate</c>
    /// (proving the ledger write is a field-level update, not a document replace), and actually executes the body (<c>RunCount</c> +1).
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-003")]
    public async Task Migrate_WhenRowIsPending_ShouldMarkProcessedExecuteBodyAndPreserveCreatedDate()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            // Arrange — force the fixture row to a pending state and capture the state to compare against
            await SetFixtureStatusAsync(dbContext, PlatformMongoMigrationHistory.Statuses.New);
            var createdDateBefore = (await GetFixtureRowAsync(dbContext))!.CreatedDate;
            var runCountBefore = await GetRunCountAsync(dbContext);

            // Act
            await dbContext.Migrate();

            // Assert — the migration ran exactly once and the ledger records completion
            await IntegrationTestHelper.WaitUntilAsync(async () =>
            {
                var row = await GetFixtureRowAsync(dbContext);

                row.Should().NotBeNull("Migrate must write a ledger row for an executed migration");
                row!.Status.Should().Be(
                    PlatformMongoMigrationHistory.Statuses.Processed,
                    "a migration whose body completed must end at Processed so it is not executed again");
                row.CreatedDate.Should().BeCloseTo(
                    createdDateBefore,
                    TimeSpan.FromMilliseconds(1),
                    "CreatedDate records when the migration FIRST ran; a re-run must not overwrite it (SetOnInsert, not a replace)");

                (await GetRunCountAsync(dbContext)).Should().BeGreaterThanOrEqualTo(
                    runCountBefore + 1,
                    "a pending migration must have its body EXECUTED. At-least-one rather than exactly-one: a host booting in "
                        + "another xUnit collection shares this database and could legitimately run the same pending migration, so "
                        + "an exact count would assert the developer's environment instead of the system (see class remarks)");

                // THE headline promise of this feature, and the only assertion in the suite that can fail if the Processing write is
                // removed. Every other assertion reads the row AFTER the migration finished, by which point it says Processed whether or
                // not it was ever claimed — so deleting the claim left all nine tests green until this was added. The fixture body
                // records what its own ledger row said WHILE it was running; nothing outside the body can see that window.
                (await GetObservedStatusDuringRunAsync(dbContext)).Should().Be(
                    PlatformMongoMigrationHistory.Statuses.Processing.ToString(),
                    "a migration must be visible as Processing in the ledger WHILE its body runs — that visibility is the entire point "
                        + "of writing the row before the body instead of after it, and it is what lets an operator see a hung migration");
            });
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-004 — the core promise, in both directions:
    /// a <c>Processed</c> row is skipped, and setting it back to <c>New</c> makes it execute again.
    /// </summary>
    /// <remarks>
    /// The <c>RunCount</c> delta is the load-bearing assertion on BOTH halves. Asserting only on <c>Status</c>/<c>CreatedDate</c>
    /// would be unfalsifiable for the skip half: a wrongly re-run migration also ends at <c>Processed</c> with an unchanged
    /// <c>CreatedDate</c>, so those fields cannot distinguish "skipped" from "re-run".
    /// <para>
    /// The two halves assert differently on purpose. The skip half uses exact equality because a <c>Processed</c> row makes EVERY
    /// process skip — the counter must not move no matter who was running. The re-run half uses at-least-one because a co-running
    /// host in another xUnit collection could also act on the now-pending row (see class remarks). The skip half is therefore the
    /// half that actually protects the feature's core promise, and it is the stronger of the two.
    /// </para>
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-004")]
    public async Task Migrate_ShouldSkipProcessedRow_AndReExecuteAfterStatusResetToNew()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            // === Skip half ===
            await SetFixtureStatusAsync(dbContext, PlatformMongoMigrationHistory.Statuses.Processed);
            var runCountBeforeSkip = await GetRunCountAsync(dbContext);

            await dbContext.Migrate();

            (await GetRunCountAsync(dbContext)).Should().Be(
                runCountBeforeSkip,
                "a Processed migration must NOT be executed again — an unchanged run counter is the only proof of that, "
                    + "since a wrongly re-run migration would leave identical Status and CreatedDate");

            // === Re-run half — the operator's manual recovery procedure ===
            await SetFixtureStatusAsync(dbContext, PlatformMongoMigrationHistory.Statuses.New);
            var runCountBeforeReRun = await GetRunCountAsync(dbContext);

            await dbContext.Migrate();

            await IntegrationTestHelper.WaitUntilAsync(async () =>
            {
                (await GetRunCountAsync(dbContext)).Should().BeGreaterThanOrEqualTo(
                    runCountBeforeReRun + 1,
                    "setting a row back to New must make the migration execute again — this is the documented manual re-run procedure. "
                        + "At-least-one because a co-running host could also act on the pending row (see class remarks); the skip half "
                        + "above is what proves a Processed row is NOT re-run, and that one IS exact");

                (await GetFixtureRowAsync(dbContext))!.Status.Should().Be(
                    PlatformMongoMigrationHistory.Statuses.Processed,
                    "the re-run must complete and return the row to Processed");
            });
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-006 — a row left at <c>Processing</c> (the state a process crash leaves behind) re-executes on the next
    /// startup and converges to <c>Processed</c>. This is the automatic crash recovery the design buys by making Processing
    /// non-blocking; without it an operator would have to delete the row by hand.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-006")]
    public async Task Migrate_WhenRowStuckInProcessing_ShouldReExecuteAndConvergeToProcessed()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            // Arrange — simulate a process that died mid-migration
            await SetFixtureStatusAsync(dbContext, PlatformMongoMigrationHistory.Statuses.Processing);
            var runCountBefore = await GetRunCountAsync(dbContext);

            // Act
            await dbContext.Migrate();

            // Assert
            await IntegrationTestHelper.WaitUntilAsync(async () =>
            {
                (await GetRunCountAsync(dbContext)).Should().BeGreaterThanOrEqualTo(
                    runCountBefore + 1,
                    "a migration abandoned at Processing must re-run — recovery must not require manual DB surgery. At-least-one "
                        + "because a co-running host could also recover the same abandoned row (see class remarks)");

                (await GetFixtureRowAsync(dbContext))!.Status.Should().Be(
                    PlatformMongoMigrationHistory.Statuses.Processed,
                    "the recovered run must complete normally");
            });
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-001 — the backward-compatibility guarantee. A row written before status tracking existed has NO
    /// <c>Status</c> field at all; it must be read as processed and never re-executed.
    /// </summary>
    /// <remarks>
    /// The precondition is written with an untyped <c>$unset</c> so the field is GENUINELY ABSENT — writing through the typed
    /// collection would re-add the property's <c>New</c> default and the test would assert nothing. Absence is re-read and asserted
    /// before acting, so a broken arrangement fails loudly instead of silently weakening the test.
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-001")]
    public async Task Migrate_WhenLegacyRowHasNoStatusField_ShouldTreatAsProcessedAndNotReExecute()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();
            var rawHistory = dbContext.Database.GetCollection<BsonDocument>(dbContext.MigrationHistoryCollectionName);
            var byName = Builders<BsonDocument>.Filter.Eq(nameof(PlatformMongoMigrationHistory.Name), FixtureMigrationName);

            // Arrange — make the row genuinely legacy-shaped, then PROVE it is
            await SetFixtureStatusAsync(dbContext, PlatformMongoMigrationHistory.Statuses.Processed);
            await rawHistory.UpdateOneAsync(byName, Builders<BsonDocument>.Update.Unset(nameof(PlatformMongoMigrationHistory.Status)));

            var arranged = await rawHistory.Find(byName).FirstOrDefaultAsync();
            arranged.Should().NotBeNull("the fixture ledger row must exist before this test can mean anything");
            arranged.Contains(nameof(PlatformMongoMigrationHistory.Status)).Should().BeFalse(
                "the arrangement must produce a document with the Status field ABSENT — otherwise this test proves nothing");

            var runCountBefore = await GetRunCountAsync(dbContext);

            // Act
            await dbContext.Migrate();

            // Assert — untouched: not re-run, and not "upgraded" by writing a Status onto it
            (await GetRunCountAsync(dbContext)).Should().Be(
                runCountBefore,
                "a legacy row without a Status field means 'written before status tracking existed, already applied' — "
                    + "re-running it would re-execute historical migrations across every deployed database");

            var after = await rawHistory.Find(byName).FirstOrDefaultAsync();
            after.Contains(nameof(PlatformMongoMigrationHistory.Status)).Should().BeFalse(
                "a skipped legacy row must not be written to at all");
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-007 — the <c>EnsureIndexesAsync</c> sentinel row is written <c>Processed</c> (not left at the entity's
    /// <c>New</c> default, which would read as "pending" to an operator), and the one-shot index gate still short-circuits so a
    /// second <c>Migrate()</c> does not drop and rebuild indexes.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-007")]
    public async Task Migrate_EnsureIndexesSentinel_ShouldBeProcessedAndGateShouldStillShortCircuit()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();
            var sentinelName = PlatformMongoDbContext<TextSnippetDbContext>.EnsureIndexesMigrationName;

            var sentinelBefore = await dbContext.MigrationHistoryCollection.Find(p => p.Name == sentinelName).FirstOrDefaultAsync();
            sentinelBefore.Should().NotBeNull("the test host's startup Migrate() must have written the sentinel row");

            // Asserted through the PRODUCTION expression rather than against a hard-coded Processed, for two reasons.
            // (1) Correctness on a pre-existing database: Status is a new field and the change is deliberately a pure schema addition
            //     with no backfill, so on a db created by an older build the sentinel has NO Status at all. null legitimately means
            //     "legacy row, treat as applied" — and because EnsureIndexesAsync only writes the sentinel behind its already-closed
            //     one-shot gate, no re-run would ever repair it. Demanding exactly Processed made this test fail permanently for any
            //     developer with a persisted local mongo volume, which is an artefact of the assertion, not a defect in the feature.
            // (2) No loss of strength: the real intent is "an operator must never see the sentinel as pending", and ProcessedExpr() is
            //     the single definition of that. New / Processing / Failed all still fail this assertion, so the guard against leaving
            //     the row at the entity's New default is fully intact — and if ProcessedExpr() ever changes, this test follows it
            //     instead of silently drifting from the contract it exists to protect.
            sentinelBefore.Is(PlatformMongoMigrationHistory.ProcessedExpr())
                .Should()
                .BeTrue(
                    "the sentinel records work that already completed, so it must never read as pending to an operator; left at the New "
                        + "default (or at Processing/Failed) it would. Actual status: {0}",
                    sentinelBefore.Status?.ToString() ?? "null (legacy row written before status tracking existed)");

            // Act — a second Migrate() must find the gate already closed
            await dbContext.Migrate();

            // Assert — the gate short-circuited: the sentinel was not rewritten and the unique Name index still stands
            var sentinelAfter = await dbContext.MigrationHistoryCollection.Find(p => p.Name == sentinelName).FirstOrDefaultAsync();
            sentinelAfter.CreatedDate.Should().BeCloseTo(
                sentinelBefore.CreatedDate,
                TimeSpan.FromMilliseconds(1),
                "a re-run must not re-insert the sentinel — that would mean EnsureIndexesAsync dropped and rebuilt every index");

            var indexes = await (await dbContext.MigrationHistoryCollection.Indexes.ListAsync()).ToListAsync();
            indexes
                .Any(index => index["key"].AsBsonDocument.Contains(nameof(PlatformMongoMigrationHistory.Name)))
                .Should()
                .BeTrue("the unique Name index must survive a second Migrate()");

            // The Status index is a stated goal of this change, and it is created OUTSIDE the one-shot EnsureIndexesAsync gate precisely
            // so already-initialised databases get it too. Without this assertion nothing distinguishes "created on every startup as
            // designed" from "only ever created on a fresh database", which is the case that actually matters in production.
            indexes
                .Any(index => index["key"].AsBsonDocument.Contains(nameof(PlatformMongoMigrationHistory.Status)))
                .Should()
                .BeTrue(
                    "NotExecutedMigrationExecutors filters this collection by Status on every startup, so the Status index must exist on "
                        + "an already-initialised database — not only on one built by a fresh EnsureIndexesAsync");
        });
    }

    private static Task<PlatformMongoMigrationHistory?> GetFixtureRowAsync(TextSnippetDbContext dbContext)
    {
        return dbContext.MigrationHistoryCollection.Find(p => p.Name == FixtureMigrationName).FirstOrDefaultAsync()!;
    }

    /// <summary>
    /// Forces the fixture ledger row into a known state, creating it if this database has never run the fixture migration, so every
    /// test starts from its own explicit precondition instead of assuming anything about database history.
    /// </summary>
    private static async Task SetFixtureStatusAsync(TextSnippetDbContext dbContext, PlatformMongoMigrationHistory.Statuses status)
    {
        await dbContext.MigrationHistoryCollection.UpdateOneAsync(
            p => p.Name == FixtureMigrationName,
            Builders<PlatformMongoMigrationHistory>
                .Update.Set(p => p.Status, status)
                // Set, not SetOnInsert: this row IS a mongo-migration row, and the claim only addresses rows carrying that stamp. On a
                // database whose fixture row predates the stamp, SetOnInsert would leave it unstamped and every "must re-run" assertion
                // below would fail for a reason unrelated to what it tests. Also clears any lease left by an interrupted earlier run —
                // the arrangement's job is to produce the stated precondition, not to inherit yesterday's.
                .Set(p => p.RowKind, PlatformMongoMigrationHistory.MongoMigrationRowKind)
                .Set(p => p.LastProcessingPingTime, null)
                .Set(p => p.ConcurrencyUpdateToken, null)
                .SetOnInsert(p => p.Name, FixtureMigrationName)
                .SetOnInsert(p => p.CreatedDate, DateTime.UtcNow),
            new UpdateOptions { IsUpsert = true }
        );
    }

    /// <summary>
    /// Reads the fixture migration's cumulative run counter. Returns 0 when the marker document does not exist yet, so the first
    /// run on a fresh database behaves like any other.
    /// </summary>
    private static async Task<int> GetRunCountAsync(TextSnippetDbContext dbContext)
    {
        var marker = await GetRunMarkerAsync(dbContext);

        return marker == null || !marker.Contains(RunCountFieldName) ? 0 : marker[RunCountFieldName].ToInt32();
    }

    /// <summary>
    /// Reads the status the fixture migration's own ledger row carried at the moment its body last ran, as recorded from INSIDE the body.
    /// Returns <c>null</c> when the body has never run against this database.
    /// </summary>
    private static async Task<string?> GetObservedStatusDuringRunAsync(TextSnippetDbContext dbContext)
    {
        var marker = await GetRunMarkerAsync(dbContext);

        return marker == null || !marker.Contains(ObservedStatusDuringRunFieldName) ? null : marker[ObservedStatusDuringRunFieldName].AsString;
    }

    private static Task<BsonDocument> GetRunMarkerAsync(TextSnippetDbContext dbContext)
    {
        return dbContext
            .Database.GetCollection<BsonDocument>(RunMarkerCollectionName)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", RunMarkerId))
            .FirstOrDefaultAsync();
    }
}
