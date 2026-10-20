using Easy.Platform.MongoDB.Migration;
using MongoDB.Bson;
using MongoDB.Driver;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo.Migrations;

/// <summary>
/// Permanent, always-eligible migration executor that exists so the mongo migration status lifecycle can be tested end to end
/// (TC-MONGOMIGSTATUS-001/003/004/006). It is NOT a demo of how to write a migration — see <see cref="DemoMigrationForMongo" /> for that.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why it must live in this assembly.</b> <c>PlatformMongoDbContext.ScanAllMigrationExecutors</c> scans
/// <c>GetType().Assembly</c> — the DbContext's assembly. An executor declared in the test project would never be discovered, so the
/// tests would exercise nothing.
/// </para>
/// <para>
/// <b>Why it has no <see cref="ExpirationDate" /> and no <see cref="OnlyForDbInitBeforeDate" />.</b> Both would make it ineligible:
/// an expired executor is filtered out by <c>IsExpired()</c> and an init-date-gated one is skipped on any fresh database — which is
/// exactly why <see cref="DemoMigrationForMongo" /> cannot serve as the fixture.
/// </para>
/// <para>
/// <b>Why the body increments a counter instead of doing nothing — this is load-bearing, do NOT "simplify" it to
/// <c>Task.CompletedTask</c>.</b> With a no-op body, a migration that was wrongly re-run and one that was correctly skipped leave
/// BYTE-IDENTICAL state: <c>Status</c> ends at <c>Processed</c> either way, and <c>CreatedDate</c> is written by <c>SetOnInsert</c>
/// so it never moves. The skip assertion in TC-MONGOMIGSTATUS-004 could then never fail, and would be testing nothing. The counter
/// is the only observable that distinguishes the two outcomes.
/// </para>
/// <para>
/// <b>Why a database counter rather than a static field.</b> The assertion must hold no matter WHICH process ran the migration, so
/// the evidence has to live in the database, not in the test process's memory.
/// </para>
/// <para>
/// <b>Harmless in ordinary use.</b> Its only write is one <c>$inc</c> upsert into a dedicated test-only collection that no
/// application code reads, so running it on every example-app startup costs nothing and corrupts nothing.
/// </para>
/// </remarks>
internal sealed class AlwaysRunnableTestMigrationForMongo : PlatformMongoMigrationExecutor<TextSnippetDbContext>
{
    /// <summary>
    /// Collection holding the run-counter marker document. Deliberately not mapped as an entity — see <see cref="InternalExecute" />.
    /// </summary>
    public const string RunMarkerCollectionName = "testMigrationRunMarkers";

    /// <summary>
    /// Fixed <c>_id</c> of the single marker document, so every run targets the same row and the counter is cumulative.
    /// </summary>
    public const string RunMarkerId = "AlwaysRunnableTestMigrationForMongo";

    /// <summary>
    /// Field incremented once per execution. Tests assert a DELTA around an explicit <c>Migrate()</c> call, never an absolute value —
    /// the test host's own startup runs <c>Migrate()</c> and increments this before any test body executes.
    /// </summary>
    public const string RunCountFieldName = "RunCount";

    /// <summary>
    /// Status this migration's OWN ledger row carried at the moment its body was running, captured from inside the body.
    /// </summary>
    /// <remarks>
    /// <b>This is the only way the feature's headline promise is falsifiable.</b> "A row is visible as <c>Processing</c> WHILE the body
    /// runs" cannot be observed after the fact — by the time any assertion runs, the row has already moved to <c>Processed</c>, so every
    /// terminal-state assertion stays green even if the claim write were deleted outright (mutation-proven: removing it left all nine
    /// tests passing). Only the body itself is inside the window, so only the body can witness it.
    /// <br />
    /// It is safe against a co-running host for the same reason the run counter is: it records what the process EXECUTING the migration
    /// saw about the row IT claimed. Any process that reaches this body must have won the lease, so the observed value is
    /// <c>Processing</c> no matter which process wrote it.
    /// </remarks>
    public const string ObservedStatusDuringRunFieldName = "ObservedStatusDuringRun";

    public override string Name => "20260812000000_AlwaysRunnableTestMigrationForMongo";

    protected override async Task InternalExecute(TextSnippetDbContext dbContext)
    {
        var observedStatusDuringRun = await dbContext
            .MigrationHistoryCollection.Find(p => p.Name == Name)
            .Project(p => p.Status)
            .FirstOrDefaultAsync();

        // Untyped BsonDocument collection on purpose: the typed GetCollection<T>() helper requires a mapped entity type, which would
        // pull a test-only type into the production BSON class map.
        await dbContext
            .Database.GetCollection<BsonDocument>(RunMarkerCollectionName)
            .UpdateOneAsync(
                Builders<BsonDocument>.Filter.Eq("_id", RunMarkerId),
                Builders<BsonDocument>
                    .Update.Inc(RunCountFieldName, 1)
                    .Set(ObservedStatusDuringRunFieldName, observedStatusDuringRun?.ToString() ?? "null"),
                new UpdateOptions { IsUpsert = true }
            );
    }
}
